import { Client, ConnectConfig, utils } from 'ssh2';
import { BrowserWindow } from 'electron';
import { ServerConfig, SSHKey } from '../../src/types';

export interface SSHSessionOptions {
  sessionId: string;
  server: ServerConfig;
  key?: SSHKey;
  cols?: number;
  rows?: number;
}

export class SSHService {
  private activeSessions: Map<string, { client: Client; stream: any }> = new Map();

  public connect(
    window: BrowserWindow,
    options: SSHSessionOptions
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const { sessionId, server, key, cols = 80, rows = 24 } = options;
      const client = new Client();

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
          // Try parsing without passphrase first
          const parsed = utils.parseKey(key.privateKey);
          if (parsed instanceof Error) {
            throw parsed;
          }
          console.log(`[SSH] Private key parsed successfully (no passphrase needed). Algorithm:`, (parsed as any).type);
        } catch (e) {
          // If parsing without passphrase fails, try parsing with passphrase if available
          if (key.passphrase) {
            try {
              const parsed = utils.parseKey(key.privateKey, key.passphrase);
              if (parsed instanceof Error) {
                throw parsed;
              }
              console.log(`[SSH] Private key parsed successfully (with passphrase). Algorithm:`, (parsed as any).type);
              needPassphrase = true;
            } catch (err: any) {
              console.error('[SSH] Failed to parse private key with passphrase:', err.message);
              let msg = `Không thể phân tích Private Key: ${err.message}`;
              if (err.message.includes('Unsupported key format') && key.privateKey.includes('BEGIN OPENSSH PRIVATE KEY')) {
                 msg = 'Khóa Ed25519 (OpenSSH) có mật khẩu không được hỗ trợ giải mã trên hệ điều hành này. Vui lòng chọn "Sinh Khóa Mới", hoặc dùng lệnh: ssh-keygen -p -f <file_key> để gỡ mật khẩu khóa cũ.';
              }
              return resolve({ success: false, error: msg });
            }
          } else {
            console.error('[SSH] Private key requires passphrase but none was provided.');
            return resolve({ success: false, error: 'Khóa SSH yêu cầu mật khẩu giải mã (Passphrase) nhưng chưa được cung cấp.' });
          }
        }
        connectConfig.privateKey = key.privateKey;
        if (needPassphrase && key.passphrase) {
          connectConfig.passphrase = key.passphrase;
        }
      } else if (server.password) {
        connectConfig.password = server.password;
      }

      // Handle PAM / Keyboard-Interactive Authentication (Required for Ubuntu/Debian/CentOS OpenSSH)
      client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
        finish(prompts.map(() => server.password || ''));
      });

      client.on('ready', () => {
        client.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
          if (err) {
            client.end();
            return resolve({ success: false, error: err.message });
          }

          this.activeSessions.set(sessionId, { client, stream });

          stream.on('data', (data: Buffer) => {
            if (!window.isDestroyed()) {
              window.webContents.send('ssh:data', { sessionId, data: data.toString('utf8') });
            }
          });

          stream.on('close', () => {
            this.activeSessions.delete(sessionId);
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

      client.on('error', (err) => {
        this.activeSessions.delete(sessionId);
        resolve({ success: false, error: err.message });
      });

      client.connect(connectConfig);
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
      const connectConfig: ConnectConfig = {
        host: server.host,
        port: server.port || 22,
        username: server.username,
        readyTimeout: 15000,
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
              return resolve({ success: false, error: 'Cannot parse privateKey: ' + err.message });
            }
          } else {
            return resolve({ success: false, error: 'Khóa SSH yêu cầu Passphrase.' });
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
        resolve({ success: false, error: err.message });
      });

      client.on('ready', () => {
        client.exec(command, (err, stream) => {
          if (err) {
            client.end();
            return resolve({ success: false, error: err.message });
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
            client.end();
            if (code === 0) {
              resolve({ success: true, output: output || 'Executing command finished with exit code 0.' });
            } else {
              resolve({ success: false, output: output, error: errorOutput || `Process exited with code ${code}` });
            }
          });
        });
      });

      client.connect(connectConfig);
    });
  }
}
