import { Client, ConnectConfig, utils } from 'ssh2';
import { BrowserWindow } from 'electron';
import { ServerConfig, SSHKey } from '../../src/types';

export interface SSHSessionOptions {
  sessionId: string;
  server: ServerConfig;
  key?: SSHKey;
  jumpChain?: { server: ServerConfig; key?: SSHKey }[];
  cols?: number;
  rows?: number;
}

export class SSHService {
  private activeSessions: Map<string, { client: Client; stream: any }> = new Map();

  private buildConnectConfig(server: ServerConfig, key?: SSHKey): { config: ConnectConfig; error?: string } {
    const connectConfig: ConnectConfig = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 20000,
      keepaliveInterval: 10000,
      tryKeyboard: true
    };

    if (server.authType === 'privateKey' && key) {
      let needPassphrase = false;
      try {
        const parsed = utils.parseKey(key.privateKey);
        if (parsed instanceof Error) throw parsed;
      } catch (e) {
        if (key.passphrase) {
          try {
            const parsed = utils.parseKey(key.privateKey, key.passphrase);
            if (parsed instanceof Error) throw parsed;
            needPassphrase = true;
          } catch (err: any) {
            let msg = `Không thể phân tích Private Key: ${err.message}`;
            if (err.message.includes('Unsupported key format') && key.privateKey.includes('BEGIN OPENSSH PRIVATE KEY')) {
              msg = 'Khóa Ed25519 (OpenSSH) có mật khẩu không được hỗ trợ giải mã trên hệ điều hành này.';
            }
            return { config: connectConfig, error: msg };
          }
        } else {
          return { config: connectConfig, error: 'Khóa SSH yêu cầu mật khẩu giải mã (Passphrase) nhưng chưa được cung cấp.' };
        }
      }
      connectConfig.privateKey = key.privateKey;
      if (needPassphrase && key.passphrase) {
        connectConfig.passphrase = key.passphrase;
      }
    } else if (server.password) {
      connectConfig.password = server.password;
    }

    return { config: connectConfig };
  }

  public async connect(
    window: BrowserWindow,
    options: SSHSessionOptions
  ): Promise<{ success: boolean; error?: string }> {
    const { sessionId, server, key, jumpChain = [], cols = 80, rows = 24 } = options;

    return new Promise(async (resolve) => {
      try {
        let currentStream: any = null;
        let currentClient: Client | null = null;
        const clientsToClean: Client[] = [];

        // If there are Jump Hosts in chain
        if (jumpChain && jumpChain.length > 0) {
          for (let i = 0; i < jumpChain.length; i++) {
            const hop = jumpChain[i];
            const nextTargetHost = i === jumpChain.length - 1 ? server.host : jumpChain[i + 1].server.host;
            const nextTargetPort = i === jumpChain.length - 1 ? (server.port || 22) : (jumpChain[i + 1].server.port || 22);

            const hopClient = new Client();
            clientsToClean.push(hopClient);
            const { config: hopCfg, error: hopErr } = this.buildConnectConfig(hop.server, hop.key);
            if (hopErr) return resolve({ success: false, error: `[Bastion Hop ${i + 1} (${hop.server.name})] ${hopErr}` });

            if (currentStream) {
              hopCfg.sock = currentStream;
            }

            hopClient.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
              finish(prompts.map(() => hop.server.password || ''));
            });

            await new Promise<void>((resHop, rejHop) => {
              hopClient.on('ready', () => {
                hopClient.forwardOut('127.0.0.1', 0, nextTargetHost, nextTargetPort, (err, stream) => {
                  if (err) return rejHop(new Error(`ForwardOut failed on Hop ${i + 1} (${hop.server.name}): ${err.message}`));
                  currentStream = stream;
                  currentClient = hopClient;
                  resHop();
                });
              });
              hopClient.on('error', (err) => rejHop(new Error(`Bastion Hop ${i + 1} (${hop.server.name}) error: ${err.message}`)));
              hopClient.connect(hopCfg);
            });
          }
        }

        // Final Destination SSH Client
        const finalClient = new Client();
        const { config: finalCfg, error: finalErr } = this.buildConnectConfig(server, key);
        if (finalErr) return resolve({ success: false, error: finalErr });

        if (currentStream) {
          finalCfg.sock = currentStream;
        }

        finalClient.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
          finish(prompts.map(() => server.password || ''));
        });

        finalClient.on('ready', () => {
          finalClient.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
            if (err) {
              finalClient.end();
              return resolve({ success: false, error: err.message });
            }

            this.activeSessions.set(sessionId, { client: finalClient, stream });

            stream.on('data', (data: Buffer) => {
              if (!window.isDestroyed()) {
                window.webContents.send('ssh:data', { sessionId, data: data.toString('utf8') });
              }
            });

            stream.on('close', () => {
              this.activeSessions.delete(sessionId);
              clientsToClean.forEach((c) => { try { c.end(); } catch (e) {} });
              if (!window.isDestroyed()) {
                window.webContents.send('ssh:closed', { sessionId });
              }
            });

            stream.stderr.on('data', (data: Buffer) => {
              if (!window.isDestroyed()) {
                window.webContents.send('ssh:data', { sessionId, data: data.toString('utf8') });
              }
            });

            resolve({ success: true });
          });
        });

        finalClient.on('error', (err) => {
          this.activeSessions.delete(sessionId);
          clientsToClean.forEach((c) => { try { c.end(); } catch (e) {} });
          resolve({ success: false, error: err.message });
        });

        finalClient.connect(finalCfg);
      } catch (err: any) {
        resolve({ success: false, error: err.message || 'Bastion Jump Host connection failed' });
      }
    });
  }

  public write(sessionId: string, data: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session && session.stream) {
      session.stream.write(data);
    }
  }

  public resize(sessionId: string, cols: number, rows: number): void {
    const session = this.activeSessions.get(sessionId);
    if (session && session.stream) {
      session.stream.setWindow(rows, cols, 0, 0);
    }
  }

  public disconnect(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      try {
        session.stream.end();
        session.client.end();
      } catch (e) {
        // ignore
      }
      this.activeSessions.delete(sessionId);
    }
  }

  public disconnectAll(): void {
    for (const [sessionId] of this.activeSessions) {
      this.disconnect(sessionId);
    }
  }

  public executeCommand(
    server: ServerConfig,
    command: string,
    key?: SSHKey
  ): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const client = new Client();
      let resolved = false;
      let executionTimeoutId: NodeJS.Timeout | null = null;

      const safeResolve = (res: { success: boolean; output?: string; error?: string }) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(connectionTimeoutId);
          if (executionTimeoutId) clearTimeout(executionTimeoutId);
          try {
            client.end();
          } catch (e) {}
          resolve(res);
        }
      };

      // 25 seconds connection phase timeout
      const connectionTimeoutId = setTimeout(() => {
        safeResolve({ success: false, error: 'SSH connection attempt timed out after 25 seconds.' });
      }, 25000);

      const connectConfig: ConnectConfig = {
        host: server.host,
        port: server.port || 22,
        username: server.username,
        readyTimeout: 20000,
        keepaliveInterval: 10000,
        tryKeyboard: true
      };

      if (server.authType === 'privateKey' && key) {
        let needPassphrase = false;
        try {
          const parsed = utils.parseKey(key.privateKey);
          if (parsed instanceof Error) throw parsed;
        } catch (e) {
          if (key.passphrase) {
            try {
              const parsed = utils.parseKey(key.privateKey, key.passphrase);
              if (parsed instanceof Error) throw parsed;
              needPassphrase = true;
            } catch (err: any) {
              return safeResolve({ success: false, error: 'Cannot parse privateKey: ' + err.message });
            }
          } else {
            return safeResolve({ success: false, error: 'Khóa SSH yêu cầu Passphrase.' });
          }
        }
        connectConfig.privateKey = key.privateKey;
        if (needPassphrase && key.passphrase) {
          connectConfig.passphrase = key.passphrase;
        }
      } else if (server.password) {
        connectConfig.password = server.password;
      }

      client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        finish(prompts.map(() => server.password || ''));
      });

      client.on('error', (err) => {
        safeResolve({ success: false, error: err.message });
      });

      (client as any).on('close', (hadError: boolean) => {
        safeResolve({ success: false, error: hadError ? 'Connection closed due to transmission error' : 'Connection closed' });
      });

      (client as any).on('end', () => {
        safeResolve({ success: false, error: 'Connection ended' });
      });

      (client as any).on('timeout', () => {
        safeResolve({ success: false, error: 'Connection timed out' });
      });

      client.on('ready', () => {
        // Connection successful: clear connection phase timer
        clearTimeout(connectionTimeoutId);

        // Start 60 seconds command execution phase timer
        executionTimeoutId = setTimeout(() => {
          safeResolve({ success: false, error: 'Command execution timed out after 60 seconds.' });
        }, 60000);

        client.exec(command, (err, stream) => {
          if (err) {
            return safeResolve({ success: false, error: err.message });
          }

          let output = '';
          let errorOutput = '';

          stream.on('data', (data: Buffer) => {
            output += data.toString('utf8');
          });

          stream.stderr.on('data', (data: Buffer) => {
            errorOutput += data.toString('utf8');
          });

          stream.on('close', (code: number) => {
            if (code === 0) {
              safeResolve({ success: true, output: output || 'Executing command finished with exit code 0.' });
            } else {
              safeResolve({ success: false, output: output, error: errorOutput || `Process exited with code ${code}` });
            }
          });
        });
      });

      try {
        client.connect(connectConfig);
      } catch (err: any) {
        safeResolve({ success: false, error: err.message });
      }
    });
  }
}
