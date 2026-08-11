import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { VaultService } from './services/vaultService';
import { SSHService } from './services/sshService';
import { SFTPService } from './services/sftpService';
import { RDPService } from './services/rdpService';
import { HashiCorpVaultService } from './services/hashicorpVaultService';
import { DatabaseService } from './services/databaseService';
import { AIService } from './services/aiService';
import { SSHTunnelService } from './services/SSHTunnelService';
import { AuditLogService } from './services/AuditLogService';

let mainWindow: BrowserWindow | null = null;
const vaultService = new VaultService();
const sshService = new SSHService();
const sftpService = new SFTPService();
const rdpService = new RDPService();
const hashicorpVaultService = new HashiCorpVaultService();
const databaseService = new DatabaseService();
const aiService = new AIService();
const tunnelService = new SSHTunnelService();
const auditLogService = new AuditLogService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'OmniTerminal - Server Management Hub',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f131a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    sshService.disconnectAll();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers() {
  /* ================= Local Vault Encrypted Storage ================= */
  ipcMain.handle('vault:check-status', async () => {
    return {
      hasVault: vaultService.hasVault(),
      isUnlocked: vaultService.isUnlocked()
    };
  });

  ipcMain.handle('vault:init', async (_, passphrase: string) => {
    return vaultService.initVault(passphrase);
  });

  ipcMain.handle('vault:unlock', async (_, passphrase: string) => {
    return vaultService.unlockVault(passphrase);
  });

  ipcMain.handle('vault:get-data', async () => {
    return vaultService.getVaultData();
  });

  ipcMain.handle('vault:save-data', async (_, data) => {
    return vaultService.saveVaultData(data);
  });

  ipcMain.handle('vault:lock', () => {
    vaultService.lock();
    return { success: true };
  });

  ipcMain.handle('vault:generate-key', (_, type: 'RSA-4096' | 'Ed25519') => {
    return vaultService.generateKeyPair(type);
  });

  ipcMain.handle('vault:derive-public-key', (_, { privateKey, passphrase }) => {
    return vaultService.derivePublicKey(privateKey, passphrase);
  });

  /* ================= OTP Handlers ================= */
  ipcMain.handle('otp:generate', (_, secretKey: string) => {
    try {
      const { authenticator } = require('otplib');
      return { success: true, code: authenticator.generate(secretKey) };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('otp:time-remaining', () => {
    try {
      const { authenticator } = require('otplib');
      return authenticator.timeRemaining();
    } catch (e) {
      return 30;
    }
  });

  /* ================= SSH Tunnel Handlers ================= */
  ipcMain.handle('tunnel:start', async (_, { config, server, key }) => {
    return tunnelService.startTunnel(config, server, key);
  });

  ipcMain.handle('tunnel:stop', async (_, tunnelId: string) => {
    return tunnelService.stopTunnel(tunnelId);
  });

  ipcMain.handle('tunnel:get-stats', async () => {
    return tunnelService.getStats();
  });

  /* ================= Multi-Exec Handlers ================= */
  ipcMain.handle('multi-exec:ssh', async (_, { targetServers, commandStr, keys }) => {
    const promises = targetServers.map(async (server: any) => {
      const keyObj = keys.find((k: any) => k.id === server.privateKeyId);
      const startTime = Date.now();
      try {
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

  /* ================= AI Assistant Handlers ================= */
  ipcMain.handle('ai:test-key', async (_, settings) => {
    return aiService.testApiKey(settings);
  });

  ipcMain.handle('ai:chat', async (_, { settings, userPrompt, history, contextSnippet }) => {
    return aiService.chatCompletion(settings, userPrompt, history, contextSnippet);
  });

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

  /* ================= SSH Protocol Handlers ================= */
  ipcMain.handle('ssh:connect', async (_, options) => {
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
    if (!mainWindow) return { success: false, error: 'No main window' };
    return sftpService.downloadFile(mainWindow, sessionId, remotePath, localPath);
  });

  ipcMain.handle('sftp:upload', async (_, { sessionId, localPath, remotePath }) => {
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

  /* ================= RDP Protocol Handlers ================= */
  ipcMain.handle('rdp:connect', async (_, options) => {
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
    if (mainWindow) {
      rdpService.updateResolution(sessionId, width, height, mainWindow);
    }
  });

  ipcMain.handle('rdp:disconnect', (_, sessionId: string) => {
    rdpService.disconnect(sessionId);
  });

  /* ================= Native Dialog Handlers ================= */
  ipcMain.handle('dialog:open-file', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    return { path: filePath, content };
  });

  ipcMain.handle('dialog:save-file', async (_, { defaultName, content }) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName
    });
    if (result.canceled || !result.filePath) return null;
    if (content) {
      fs.writeFileSync(result.filePath, content, 'utf8');
    }
    return result.filePath;
  });
}
