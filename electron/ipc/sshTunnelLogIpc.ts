import { ipcMain } from 'electron';
import { SSHService } from '../services/sshService';
import { SSHTunnelService } from '../services/SSHTunnelService';
import { LogTailService } from '../services/logTailService';
import { HashiCorpVaultService } from '../services/hashicorpVaultService';

export const registerSshTunnelLogIpc = (
  sshService: SSHService,
  tunnelService: SSHTunnelService,
  logTailService: LogTailService,
  hashicorpVaultService: HashiCorpVaultService,
  getWindow: () => import('electron').BrowserWindow | null
) => {
  /* ================= SSH Tunnel Handlers ================= */
  ipcMain.handle('tunnel:start', async (_, { config, serverChain, keyChain }) => {
    return tunnelService.startTunnel(config, serverChain, keyChain);
  });

  ipcMain.handle('tunnel:stop', async (_, tunnelId: string) => {
    return tunnelService.stopTunnel(tunnelId);
  });

  ipcMain.handle('tunnel:get-stats', async () => {
    return tunnelService.getStats();
  });

  /* ================= Log Aggregator Handlers ================= */
  ipcMain.handle('log:start', async (event, { streamId, serverChain, keyChain, filePath }) => {
    return logTailService.startStream(streamId, serverChain, keyChain, filePath, event.sender);
  });

  ipcMain.handle('log:stop', async (_, streamId: string) => {
    return logTailService.stopStream(streamId);
  });

  /* ================= SSH Protocol Handlers ================= */
  ipcMain.handle('ssh:connect', async (_, options) => {
    const mainWindow = getWindow();
    if (!mainWindow) return { success: false, error: 'No main window' };
    const { server, vaultConfig } = options;
    if (server.authType === 'hashicorpVault' && server.vaultSecretPath && vaultConfig) {
      const res = await hashicorpVaultService.fetchSecret(vaultConfig, server.vaultSecretPath, server.vaultKeyName || 'password');
      if (res.success && res.secret) {
        server.password = res.secret;
      } else {
        return { success: false, error: `Lỗi kết nối HashiCorp Vault: ${res.error}` };
      }
    }
    return sshService.connect(mainWindow, options);
  });

  ipcMain.handle('ssh:write', (_, { sessionId, data }) => {
    sshService.write(sessionId, data);
  });

  ipcMain.handle('ssh:resize', (_, { sessionId, cols, rows }) => {
    sshService.resize(sessionId, cols, rows);
  });

  ipcMain.handle('ssh:disconnect', (_, sessionId: string) => {
    sshService.disconnect(sessionId);
  });
};
