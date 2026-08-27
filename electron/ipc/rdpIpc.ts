import { ipcMain, BrowserWindow } from 'electron';
import { RDPService } from '../services/rdpService';
import { HashiCorpVaultService } from '../services/hashicorpVaultService';
import type { IpcContext } from './context';

export const registerRdpIpc = (
  rdpService: RDPService,
  hashicorpVaultService: HashiCorpVaultService,
  ctx: IpcContext
) => {
  /* ================= RDP Protocol Handlers ================= */
  ipcMain.handle('rdp:connect', async (_, options) => {
    const mainWindow = ctx.getWindow();
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
    return rdpService.connect(mainWindow, options);
  });

  ipcMain.handle('rdp:resize', (_, { sessionId, width, height }) => {
    const mainWindow = ctx.getWindow();
    if (mainWindow) {
      rdpService.updateResolution(sessionId, width, height, mainWindow);
    }
  });

  ipcMain.handle('rdp:disconnect', (_, sessionId: string) => {
    rdpService.disconnect(sessionId);
  });
};
