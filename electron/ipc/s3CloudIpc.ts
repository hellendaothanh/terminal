import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { S3Service } from '../services/s3Service';

export const registerS3CloudIpc = (s3Service: S3Service, getWindow: () => BrowserWindow | null) => {
  /* ================= S3 ================= */
  ipcMain.handle('s3:connect', async (event, { sessionId, options }) => {
    return s3Service.connect(sessionId, options);
  });

  ipcMain.handle('s3:list', async (event, { sessionId, remotePath }) => {
    return s3Service.list(sessionId, remotePath);
  });

  ipcMain.handle('s3:download', async (event, { sessionId, remotePath, localPath }) => {
    return s3Service.download(sessionId, remotePath, localPath, (transferred, total) => {
      let percentage = 0;
      if (total > 0) percentage = Math.round((transferred / total) * 100);
      const mainWindow = getWindow();
      if (mainWindow) {
        mainWindow.webContents.send('s3:progress', { sessionId, type: 'download', fileName: path.basename(remotePath), transferred, total, percentage });
      }
    });
  });

  ipcMain.handle('s3:upload', async (event, { sessionId, localPath, remotePath }) => {
    return s3Service.upload(sessionId, localPath, remotePath, (transferred, total) => {
      let percentage = 0;
      if (total > 0) percentage = Math.round((transferred / total) * 100);
      const mainWindow = getWindow();
      if (mainWindow) {
        mainWindow.webContents.send('s3:progress', { sessionId, type: 'upload', fileName: path.basename(localPath), transferred, total, percentage });
      }
    });
  });

  ipcMain.handle('s3:mkdir', async (event, { sessionId, remotePath }) => {
    return s3Service.mkdir(sessionId, remotePath);
  });

  ipcMain.handle('s3:delete', async (event, { sessionId, remotePath, isDir }) => {
    return s3Service.delete(sessionId, remotePath, isDir);
  });

  ipcMain.handle('s3:disconnect', async (event, sessionId) => {
    return s3Service.disconnect(sessionId);
  });

  /* ================= Cloud Explorer VM Persistence ================= */
  // NOTE: kept on the app root for backward compatibility with existing installs.
  const instancesFilePath = 'C:\\Devsecops\\terminal\\.instances.json';

  ipcMain.handle('cloud:list-instances', async () => {
    const filePath = instancesFilePath;
    if (!fs.existsSync(filePath)) {
      const defaultInstances = [
        { id: 'i-0a12b34c56d78', provider: 'AWS', name: 'prod-api-cluster-node-1', region: 'us-east-1 (N. Virginia)', publicIp: '54.210.12.89', privateIp: '172.31.16.4', state: 'running', instanceType: 't3.xlarge', os: 'Linux' },
        { id: 'i-0f98e76d54c32', provider: 'AWS', name: 'prod-bastion-host', region: 'us-east-1 (N. Virginia)', publicIp: '3.88.45.102', privateIp: '172.31.32.10', state: 'running', instanceType: 't3.micro', os: 'Linux' },
        { id: 'gcp-vm-102938', provider: 'GCP', name: 'gcp-bigdata-spark-master', region: 'asia-southeast1 (Singapore)', publicIp: '34.87.110.45', privateIp: '10.148.0.2', state: 'running', instanceType: 'e2-standard-4', os: 'Linux' },
        { id: 'azure-vm-445566', provider: 'AZURE', name: 'win-rdp-jump-server', region: 'eastus2 (East US 2)', publicIp: '20.120.44.18', privateIp: '10.0.1.5', state: 'running', instanceType: 'Standard_D2s_v3', os: 'Windows' }
      ];
      fs.writeFileSync(filePath, JSON.stringify(defaultInstances, null, 2));
      return defaultInstances;
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return [];
    }
  });

  ipcMain.handle('cloud:add-instance', async (_, instance) => {
    const filePath = instancesFilePath;
    let list: any[] = [];
    if (fs.existsSync(filePath)) {
      try { list = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
    }
    list.push(instance);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
    return true;
  });

  ipcMain.handle('cloud:delete-instance', async (_, instanceId) => {
    const filePath = instancesFilePath;
    let list: any[] = [];
    if (fs.existsSync(filePath)) {
      try { list = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
    }
    const filtered = list.filter((i: any) => i.id !== instanceId);
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
    return true;
  });
};
