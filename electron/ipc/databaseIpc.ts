import { ipcMain } from 'electron';
import { DatabaseService } from '../services/databaseService';
import { HashiCorpVaultService } from '../services/hashicorpVaultService';

export const registerDatabaseIpc = (
  databaseService: DatabaseService,
  hashicorpVaultService: HashiCorpVaultService
) => {
  /* ================= Database Protocol Handlers ================= */
  ipcMain.handle('db:connect', async (_, options) => {
    const { server, vaultConfig } = options;
    if (server.authType === 'hashicorpVault' && server.vaultSecretPath && vaultConfig) {
      const res = await hashicorpVaultService.fetchSecret(vaultConfig, server.vaultSecretPath, server.vaultKeyName || 'password');
      if (res.success && res.secret) {
        server.password = res.secret;
      } else {
        return { success: false, error: `Lỗi kết nối HashiCorp Vault: ${res.error}` };
      }
    }
    return databaseService.connect(options);
  });

  ipcMain.handle('db:list-databases', async (_, { sessionId, dbType }) => {
    return databaseService.listDatabases(sessionId, dbType);
  });

  ipcMain.handle('db:list-tables', async (_, { sessionId, dbType, dbName }) => {
    return databaseService.listTables(sessionId, dbType, dbName);
  });

  ipcMain.handle('db:execute-query', async (_, { sessionId, dbType, queryStr, dbName }) => {
    return databaseService.executeQuery(sessionId, dbType, queryStr, dbName);
  });

  ipcMain.handle('db:disconnect', async (_, sessionId: string) => {
    return databaseService.disconnect(sessionId);
  });
};
