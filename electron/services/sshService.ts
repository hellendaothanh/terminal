import { Client, ConnectConfig } from 'ssh2';
import { BrowserWindow } from 'electron';
import { ServerConfig, SSHKey } from '../../src/types';

export interface SSHSessionOptions {
  sessionId: string;
  server: ServerConfig;
  key?: SSHKey;
}

export class SSHService {
  private activeSessions: Map<string, { client: Client; stream: any }> = new Map();

  public connect(
    window: BrowserWindow,
    options: SSHSessionOptions
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const { sessionId, server, key } = options;
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
        connectConfig.privateKey = key.privateKey;
        if (key.passphrase) {
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
        client.shell({ term: 'xterm-256color', cols: 80, rows: 24 }, (err, stream) => {
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
}
