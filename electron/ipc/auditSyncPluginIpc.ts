import { ipcMain } from 'electron';
import { AuditLogService } from '../services/AuditLogService';
import { TeamSyncService } from '../services/teamSyncService';
import { PluginService } from '../services/pluginService';
import { HashiCorpVaultService } from '../services/hashicorpVaultService';

export const registerAuditSyncPluginIpc = (
  auditLogService: AuditLogService,
  teamSyncService: TeamSyncService,
  pluginService: PluginService,
  hashicorpVaultService: HashiCorpVaultService
) => {
  /* ================= Audit Log Handlers ================= */
  ipcMain.handle('audit:list', async () => {
    return auditLogService.getList();
  });

  ipcMain.handle('audit:log-command', async (_, entry) => {
    auditLogService.logEntry(entry);
    return { success: true };
  });

  ipcMain.handle('audit:get-cast', async (_, logId: string) => {
    return auditLogService.getCast(logId);
  });

  ipcMain.handle('audit:export', async (_, { logId, format }) => {
    return auditLogService.exportLog(logId, format);
  });

  /* ================= HashiCorp Vault Handlers ================= */
  ipcMain.handle('vault:hashicorp-test', async (_, config) => {
    return hashicorpVaultService.testConnection(config);
  });

  ipcMain.handle('vault:hashicorp-fetch-secret', async (_, { config, secretPath, keyName }) => {
    return hashicorpVaultService.fetchSecret(config, secretPath, keyName);
  });

  /* ================= Team Sync Handlers ================= */
  ipcMain.handle('sync:push', async (_, { config, encryptedPayload }) => {
    return teamSyncService.push(config, encryptedPayload);
  });

  ipcMain.handle('sync:pull', async (_, config) => {
    return teamSyncService.pull(config);
  });

  /* ================= Plugin System Handlers ================= */
  ipcMain.handle('plugin:list', async () => {
    return pluginService.listPlugins();
  });

  ipcMain.handle('plugin:install', async (_, filePath: string) => {
    return pluginService.installPlugin(filePath);
  });

  ipcMain.handle('plugin:uninstall', async (_, pluginId: string) => {
    return pluginService.uninstallPlugin(pluginId);
  });

  ipcMain.handle('plugin:invoke', async (_, { pluginId, action, args }) => {
    return pluginService.invokePlugin(pluginId, action, args);
  });
};
