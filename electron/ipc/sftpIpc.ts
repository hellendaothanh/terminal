import { ipcMain } from 'electron';
import { SFTPService } from '../services/sftpService';
import { HashiCorpVaultService } from '../services/hashicorpVaultService';
import type { IpcContext } from './context';

export const registerSftpIpc = (
  sftpService: SFTPService,
  hashicorpVaultService: HashiCorpVaultService,
  ctx: IpcContext
) => {
  /* ================= SFTP Protocol Handlers ================= */
  ipcMain.handle('sftp:connect', async (_, options) => {
    const { server, vaultConfig } = options;
    if (server.authType === 'hashicorpVault' && server.vaultSecretPath && vaultConfig) {
      const res = await hashicorpVaultService.fetchSecret(vaultConfig, server.vaultSecretPath, server.vaultKeyName || 'password');
      if (res.success && res.secret) {
        server.password = res.secret;
      } else {
        return { success: false, error: `Lỗi kết nối HashiCorp Vault: ${res.error}` };
      }
    }
    return sftpService.connect(options);
  });

  ipcMain.handle('sftp:list', async (_, { sessionId, remotePath }) => {
    return sftpService.listFiles(sessionId, remotePath);
  });

  ipcMain.handle('sftp:download', async (_, { sessionId, remotePath, localPath }) => {
    const mainWindow = ctx.getWindow();
    if (!mainWindow) return { success: false, error: 'No main window' };
    return sftpService.downloadFile(mainWindow, sessionId, remotePath, localPath);
  });

  ipcMain.handle('sftp:upload', async (_, { sessionId, localPath, remotePath }) => {
    const mainWindow = ctx.getWindow();
    if (!mainWindow) return { success: false, error: 'No main window' };
    return sftpService.uploadFile(mainWindow, sessionId, localPath, remotePath);
  });

  ipcMain.handle('sftp:mkdir', async (_, { sessionId, remotePath }) => {
    return sftpService.mkdir(sessionId, remotePath);
  });

  ipcMain.handle('sftp:delete', async (_, { sessionId, remotePath, isDir }) => {
    return sftpService.deleteFile(sessionId, remotePath, isDir);
  });

  ipcMain.handle('sftp:disconnect', async (_, sessionId: string) => {
    return sftpService.disconnect(sessionId);
  });
};
