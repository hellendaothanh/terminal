import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { VaultService } from './services/vaultService';
import { SSHService } from './services/sshService';
import { SFTPService } from './services/sftpService';
import { S3Service } from './services/s3Service';
import { RDPService } from './services/rdpService';
import { HashiCorpVaultService } from './services/hashicorpVaultService';
import { DatabaseService } from './services/databaseService';
import { AIService } from './services/aiService';
import { SSHTunnelService } from './services/SSHTunnelService';
import { AuditLogService } from './services/AuditLogService';
import { LogTailService } from './services/logTailService';
import { TeamSyncService } from './services/teamSyncService';
import { PluginService } from './services/pluginService';
import { NetDiagnosticsService } from './services/netDiagnosticsService';
import { DockerK8sService } from './services/dockerK8sService';

import { registerVaultIpc } from './ipc/vaultIpc';
import { registerSshTunnelLogIpc } from './ipc/sshTunnelLogIpc';
import { registerMultiExecIpc } from './ipc/multiExecIpc';
import { registerAuditSyncPluginIpc } from './ipc/auditSyncPluginIpc';
import { registerAiPlaybookIpc } from './ipc/aiPlaybookIpc';
import { registerDatabaseIpc } from './ipc/databaseIpc';
import { registerSftpIpc } from './ipc/sftpIpc';
import { registerS3CloudIpc } from './ipc/s3CloudIpc';
import { registerRdpIpc } from './ipc/rdpIpc';
import { registerSystemIpc } from './ipc/systemIpc';

let mainWindow: BrowserWindow | null = null;
const vaultService = new VaultService();
const sshService = new SSHService();
const sftpService = new SFTPService();
const s3Service = new S3Service();
const rdpService = new RDPService();
const hashicorpVaultService = new HashiCorpVaultService();
const databaseService = new DatabaseService();
const aiService = new AIService();
const tunnelService = new SSHTunnelService();
const auditLogService = new AuditLogService();
const logTailService = new LogTailService();
const teamSyncService = new TeamSyncService();
const pluginService = new PluginService();
const netDiagnosticsService = new NetDiagnosticsService();
const dockerK8sService = new DockerK8sService();

app.name = 'OmniTerminal';

function createWindow() {
  const iconPath = process.platform === 'darwin'
    ? path.join(__dirname, '../public/icon.icns')
    : path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'OmniTerminal - Server Management Hub',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f131a',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
  app.setName('OmniTerminal');

  if (process.platform === 'darwin' && app.dock) {
    const dockIconPath = path.join(__dirname, '../public/icon.png');
    if (fs.existsSync(dockIconPath)) {
      app.dock.setIcon(dockIconPath);
    }
  }

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
  const ctx = { getWindow: () => mainWindow };

  registerVaultIpc(vaultService);
  registerSshTunnelLogIpc(sshService, tunnelService, logTailService, hashicorpVaultService, ctx.getWindow);
  registerMultiExecIpc(sshService, databaseService, hashicorpVaultService);
  registerAuditSyncPluginIpc(auditLogService, teamSyncService, pluginService, hashicorpVaultService);
  registerAiPlaybookIpc(aiService, sshService, hashicorpVaultService);
  registerDatabaseIpc(databaseService, hashicorpVaultService);
  registerSftpIpc(sftpService, hashicorpVaultService, ctx);
  registerS3CloudIpc(s3Service, ctx.getWindow);
  registerRdpIpc(rdpService, hashicorpVaultService, ctx);
  registerSystemIpc(dockerK8sService, netDiagnosticsService, ctx);
}
