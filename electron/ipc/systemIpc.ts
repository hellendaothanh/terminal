import { ipcMain, dialog, app, shell } from 'electron';
import fs from 'fs';
import { DockerK8sService } from '../services/dockerK8sService';
import { NetDiagnosticsService } from '../services/netDiagnosticsService';
import type { IpcContext } from './context';

export const registerSystemIpc = (
  dockerK8sService: DockerK8sService,
  netDiagnosticsService: NetDiagnosticsService,
  ctx: IpcContext
) => {
  /* ================= Docker & K8s Explorer ================= */
  ipcMain.handle('docker-k8s:list-resources', async (_, { platform, resourceType, namespace }) => {
    return dockerK8sService.listResources(platform, resourceType, namespace);
  });

  ipcMain.handle('docker-k8s:execute-action', async (_, { platform, resourceType, action, nameOrId }) => {
    return dockerK8sService.executeAction(platform, resourceType, action, nameOrId);
  });

  /* ================= Native Dialog Handlers ================= */
  ipcMain.handle('dialog:open-file', async () => {
    const mainWindow = ctx.getWindow();
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
    const mainWindow = ctx.getWindow();
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

  /* ================= Network Diagnostics Handlers ================= */
  ipcMain.handle('net:diagnose', async (_, { tool, host, options }) => {
    try {
      if (tool === 'ping') {
        return await netDiagnosticsService.ping(host, options?.packets);
      } else if (tool === 'dns') {
        return await netDiagnosticsService.dnsLookup(host, options?.dnsType);
      } else if (tool === 'ports') {
        return await netDiagnosticsService.scanPorts(host, options?.portsList);
      } else if (tool === 'traceroute') {
        return await netDiagnosticsService.traceroute(host, options?.maxHops);
      } else if (tool === 'mtr') {
        return await netDiagnosticsService.mtr(host, options?.count);
      }
      return 'Unknown diagnostic tool';
    } catch (e: any) {
      return `Diagnostics error: ${e.message}`;
    }
  });

  /* ================= App Update Handlers ================= */
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:open-url', async (_, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });
};
