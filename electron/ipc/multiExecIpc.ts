import { ipcMain } from 'electron';
import { SSHService } from '../services/sshService';
import { DatabaseService } from '../services/databaseService';
import { HashiCorpVaultService } from '../services/hashicorpVaultService';

export const registerMultiExecIpc = (
  sshService: SSHService,
  databaseService: DatabaseService,
  hashicorpVaultService: HashiCorpVaultService
) => {
  /* ================= Multi-Exec Handlers ================= */
  ipcMain.handle('multi-exec:ssh', async (_, { targetServers, commandStr, keys, vaultConfig }) => {
    const promises = targetServers.map(async (server: any) => {
      let keyObj = (keys && Array.isArray(keys)) ? keys.find((k: any) => k.id === server.privateKeyId) : undefined;
      if (!keyObj && keys && Array.isArray(keys) && keys.length > 0) {
        keyObj = keys[0];
      }
      const startTime = Date.now();
      try {
        if (server.authType === 'hashicorpVault' && server.vaultSecretPath && vaultConfig) {
          const vaultRes = await hashicorpVaultService.fetchSecret(vaultConfig, server.vaultSecretPath, server.vaultKeyName || 'password');
          if (vaultRes.success && vaultRes.secret) {
            server.password = vaultRes.secret;
          }
        }
        const res = await sshService.executeCommand(server, commandStr, keyObj);
        return {
          targetId: server.id,
          targetName: server.name,
          hostOrDb: `${server.username}@${server.host}:${server.port}`,
          status: res.success ? 'SUCCESS' : 'ERROR',
          output: res.output || res.error || '',
          executionTimeMs: Date.now() - startTime,
          error: res.error
        };
      } catch (e: any) {
        return {
          targetId: server.id,
          targetName: server.name,
          hostOrDb: `${server.username}@${server.host}:${server.port}`,
          status: 'ERROR',
          output: e.message,
          executionTimeMs: Date.now() - startTime,
          error: e.message
        };
      }
    });
    return Promise.all(promises);
  });

  ipcMain.handle('multi-exec:db', async (_, { targetServers, queryStr }) => {
    const promises = targetServers.map(async (server: any) => {
      const startTime = Date.now();
      const sessionId = 'multiexec_' + server.id + '_' + Date.now();
      try {
        const connRes = await databaseService.connect({ sessionId, server });
        if (!connRes.success) {
          return {
            targetId: server.id,
            targetName: server.name,
            hostOrDb: `${server.dbType}://${server.host}:${server.port}/${server.dbName || ''}`,
            status: 'ERROR',
            output: `Lỗi kết nối CSDL: ${connRes.error}`,
            executionTimeMs: Date.now() - startTime,
            error: connRes.error
          };
        }

        const queryRes = await databaseService.executeQuery(sessionId, server.dbType, queryStr, server.dbName);
        await databaseService.disconnect(sessionId);

        return {
          targetId: server.id,
          targetName: server.name,
          hostOrDb: `${server.dbType}://${server.host}:${server.port}/${server.dbName || ''}`,
          status: queryRes.error ? 'ERROR' : 'SUCCESS',
          output: queryRes.error
            ? queryRes.error
            : `Rows (${queryRes.rowCount}):\n` + JSON.stringify(queryRes.rows || [], null, 2),
          executionTimeMs: Date.now() - startTime,
          error: queryRes.error
        };
      } catch (e: any) {
        return {
          targetId: server.id,
          targetName: server.name,
          hostOrDb: `${server.dbType}://${server.host}:${server.port}/${server.dbName || ''}`,
          status: 'ERROR',
          output: e.message,
          executionTimeMs: Date.now() - startTime,
          error: e.message
        };
      }
    });
    return Promise.all(promises);
  });
};
