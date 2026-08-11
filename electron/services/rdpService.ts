import { BrowserWindow } from 'electron';
import net from 'net';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { app } from 'electron';
import { ServerConfig } from '../../src/types';

export interface RDPSessionOptions {
  sessionId: string;
  server: ServerConfig;
  width: number;
  height: number;
}

export class RDPService {
  private activeSessions: Map<string, { options: RDPSessionOptions; isConnected: boolean }> = new Map();

  public connect(
    window: BrowserWindow,
    options: RDPSessionOptions
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const { sessionId, server, width, height } = options;
      const host = server.host;
      const port = server.port || 3389;

      // 1. Pre-flight check: Verify Password
      if (server.authType === 'password' && (!server.password || server.password.trim() === '')) {
        return resolve({
          success: false,
          error: 'Mật khẩu RDP chưa được thiết lập. Vui lòng nhập mật khẩu máy chủ Windows.'
        });
      }

      // 2. Real TCP Socket Connection Test to target host:port
      const socket = new net.Socket();
      socket.setTimeout(6000);

      socket.on('connect', () => {
        socket.destroy();

        // TCP Port is OPEN and responsive!
        this.activeSessions.set(sessionId, {
          options,
          isConnected: true
        });

        // Launch Native RDP Client with stored credentials
        this.launchNativeRDP(server, width, height);

        if (!window.isDestroyed()) {
          window.webContents.send('rdp:status', {
            sessionId,
            connected: true,
            resolution: { width, height },
            info: `Đã kết nối thành công tới máy chủ RDP ${host}:${port}`
          });
        }

        resolve({ success: true });
      });

      socket.on('timeout', () => {
        socket.destroy();
        this.activeSessions.delete(sessionId);
        const errStr = `Kết nối RDP thất bại: Cổng ${port} trên ${host} không phản hồi (Timeout). Vui lòng kiểm tra IP và Firewall.`;
        if (!window.isDestroyed()) {
          window.webContents.send('rdp:status', {
            sessionId,
            connected: false,
            info: errStr
          });
        }
        resolve({ success: false, error: errStr });
      });

      socket.on('error', (err) => {
        socket.destroy();
        this.activeSessions.delete(sessionId);
        const errStr = `Không thể kết nối RDP tới ${host}:${port} (${err.message}). Vui lòng kiểm tra địa chỉ IP.`;
        if (!window.isDestroyed()) {
          window.webContents.send('rdp:status', {
            sessionId,
            connected: false,
            info: errStr
          });
        }
        resolve({ success: false, error: errStr });
      });

      socket.connect(port, host);
    });
  }

  private launchNativeRDP(server: ServerConfig, width: number, height: number): void {
    try {
      const host = server.host;
      const port = server.port || 3389;
      const username = server.username || 'Administrator';
      const password = server.password || '';

      const rdpContent = [
        `full address:s:${host}:${port}`,
        `username:s:${username}`,
        `smart sizing:i:1`,
        `dynamic resolution:i:1`,
        `session bpp:i:32`,
        `prompt for credentials:i:0`,
        `screen mode id:i:2`,
        `use multimon:i:0`,
        `authentication level:i:2`
      ].join('\r\n');

      const tempDir = app.getPath('temp');
      const rdpFilePath = path.join(tempDir, `omni_session_${server.id}.rdp`);
      fs.writeFileSync(rdpFilePath, rdpContent, 'utf8');

      if (process.platform === 'win32') {
        // Windows: Pre-load credential using cmdkey so mstsc logs in automatically without asking for password
        if (password) {
          const safePass = password.replace(/"/g, '""');
          exec(`cmdkey /generic:TERMSRV/${host} /user:${username} /pass:"${safePass}"`, () => {
            exec(`mstsc "${rdpFilePath}"`);
          });
        } else {
          exec(`mstsc "${rdpFilePath}"`);
        }
      } else if (process.platform === 'darwin') {
        // macOS: Save credential to macOS Keychain using security CLI so Microsoft Remote Desktop can auto-authenticate
        if (password) {
          const safePass = password.replace(/"/g, '\\"');
          const keychainCmd = `security add-generic-password -a "${username}" -s "TERMSRV/${host}" -w "${safePass}" -U`;
          exec(keychainCmd, () => {
            exec(`open "${rdpFilePath}"`, (err) => {
              if (err) {
                exec(`open "rdp://full%20address=s:${host}:${port}&username=s:${username}"`);
              }
            });
          });
        } else {
          exec(`open "${rdpFilePath}"`, (err) => {
            if (err) {
              exec(`open "rdp://full%20address=s:${host}:${port}&username=s:${username}"`);
            }
          });
        }
      }
    } catch (e) {
      console.error('Lỗi khởi chạy Native RDP Client:', e);
    }
  }

  public updateResolution(sessionId: string, width: number, height: number, window: BrowserWindow): void {
    const session = this.activeSessions.get(sessionId);
    if (session && session.isConnected) {
      session.options.width = width;
      session.options.height = height;
      if (!window.isDestroyed()) {
        window.webContents.send('rdp:status', {
          sessionId,
          connected: true,
          resolution: { width, height },
          info: `Đã điều chỉnh độ phân giải RDP: ${width}x${height}`
        });
      }
    }
  }

  public disconnect(sessionId: string): void {
    this.activeSessions.delete(sessionId);
  }
}
