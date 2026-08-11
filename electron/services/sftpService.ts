import SftpClient from 'ssh2-sftp-client';
import { BrowserWindow } from 'electron';
import { ServerConfig, SSHKey, RemoteFile } from '../../src/types';

export interface SFTPOptions {
  sessionId: string;
  server: ServerConfig;
  key?: SSHKey;
}

export class SFTPService {
  private activeClients: Map<string, SftpClient> = new Map();

  public async connect(options: SFTPOptions): Promise<{ success: boolean; error?: string }> {
    const { sessionId, server, key } = options;
    const client = new SftpClient();

    const connectConfig: SftpClient.ConnectOptions = {
      host: server.host,
      port: server.port || 22,
      username: server.username,
      readyTimeout: 20000,
      tryKeyboard: true
    };

    if (server.authType === 'privateKey' && key) {
      let needPassphrase = false;
      try {
        const { utils } = require('ssh2');
        // Try parsing without passphrase first
        const parsed = utils.parseKey(key.privateKey);
        if (parsed instanceof Error) {
          throw parsed;
        }
      } catch (e) {
        // Try parsing with passphrase if available
        if (key.passphrase) {
          try {
            const { utils } = require('ssh2');
            const parsed = utils.parseKey(key.privateKey, key.passphrase);
            if (parsed instanceof Error) {
              throw parsed;
            }
            needPassphrase = true;
          } catch (err: any) {
            console.error('[SFTP] Failed to parse private key with passphrase:', err.message);
            let msg = `Không thể phân tích Private Key: ${err.message}`;
            if (err.message.includes('Unsupported key format') && key.privateKey.includes('BEGIN OPENSSH PRIVATE KEY')) {
               msg = 'Khóa Ed25519 (OpenSSH) có mật khẩu không được hỗ trợ giải mã trên hệ điều hành này. Vui lòng chọn "Sinh Khóa Mới", hoặc dùng lệnh: ssh-keygen -p -f <file_key> để gỡ mật khẩu khóa cũ.';
            }
            return { success: false, error: msg };
          }
        } else {
          console.error('[SFTP] Private key requires passphrase but none was provided.');
          return { success: false, error: 'Khóa SSH yêu cầu mật khẩu giải mã (Passphrase) nhưng chưa được cung cấp.' };
        }
      }
      connectConfig.privateKey = key.privateKey;
      if (needPassphrase && key.passphrase) {
        connectConfig.passphrase = key.passphrase;
      }
    } else if (server.password) {
      connectConfig.password = server.password;
    }

    try {
      await client.connect(connectConfig);
      this.activeClients.set(sessionId, client);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async listFiles(sessionId: string, remotePath: string): Promise<{ success: boolean; files?: RemoteFile[]; path?: string; error?: string }> {
    const client = this.activeClients.get(sessionId);
    if (!client) {
      return { success: false, error: 'SFTP Client chưa kết nối.' };
    }

    try {
      const targetPath = remotePath || '.';
      const list = await client.list(targetPath);
      const files: RemoteFile[] = list.map((item) => ({
        name: item.name,
        size: item.size,
        type: item.type as any,
        modifyTime: item.modifyTime,
        rights: item.rights,
        owner: item.owner,
        group: item.group
      }));

      const pwd = await client.realPath(targetPath);
      return { success: true, files, path: pwd };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async downloadFile(
    window: BrowserWindow,
    sessionId: string,
    remotePath: string,
    localPath: string
  ): Promise<{ success: boolean; error?: string }> {
    const client = this.activeClients.get(sessionId);
    if (!client) return { success: false, error: 'Client không khả dụng.' };

    const fileName = remotePath.split('/').pop() || 'file';

    try {
      await client.fastGet(remotePath, localPath, {
        step: (total_transferred: number, chunk: number, total: number) => {
          if (!window.isDestroyed()) {
            const percentage = total > 0 ? Math.round((total_transferred / total) * 100) : 0;
            window.webContents.send('sftp:progress', {
              sessionId,
              type: 'download',
              fileName,
              transferred: total_transferred,
              total,
              percentage
            });
          }
        }
      });

      if (!window.isDestroyed()) {
        window.webContents.send('sftp:progress', {
          sessionId,
          type: 'download',
          fileName,
          transferred: 100,
          total: 100,
          percentage: 100
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async uploadFile(
    window: BrowserWindow,
    sessionId: string,
    localPath: string,
    remotePath: string
  ): Promise<{ success: boolean; error?: string }> {
    const client = this.activeClients.get(sessionId);
    if (!client) return { success: false, error: 'Client không khả dụng.' };

    const fileName = localPath.split('/').pop() || 'file';

    try {
      await client.fastPut(localPath, remotePath, {
        step: (total_transferred: number, chunk: number, total: number) => {
          if (!window.isDestroyed()) {
            const percentage = total > 0 ? Math.round((total_transferred / total) * 100) : 0;
            window.webContents.send('sftp:progress', {
              sessionId,
              type: 'upload',
              fileName,
              transferred: total_transferred,
              total,
              percentage
            });
          }
        }
      });

      if (!window.isDestroyed()) {
        window.webContents.send('sftp:progress', {
          sessionId,
          type: 'upload',
          fileName,
          transferred: 100,
          total: 100,
          percentage: 100
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async mkdir(sessionId: string, remotePath: string): Promise<{ success: boolean; error?: string }> {
    const client = this.activeClients.get(sessionId);
    if (!client) return { success: false, error: 'Client không khả dụng.' };

    try {
      await client.mkdir(remotePath, true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async deleteFile(sessionId: string, remotePath: string, isDir: boolean): Promise<{ success: boolean; error?: string }> {
    const client = this.activeClients.get(sessionId);
    if (!client) return { success: false, error: 'Client không khả dụng.' };

    try {
      if (isDir) {
        await client.rmdir(remotePath, true);
      } else {
        await client.delete(remotePath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public async disconnect(sessionId: string): Promise<void> {
    const client = this.activeClients.get(sessionId);
    if (client) {
      try {
        await client.end();
      } catch (e) {
        // ignore
      }
      this.activeClients.delete(sessionId);
    }
  }
}
