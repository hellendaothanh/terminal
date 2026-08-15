import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  /* Vault & Security APIs */
  vaultCheckStatus: (dbPath: string | null) => ipcRenderer.invoke('vault:check-status', dbPath),
  vaultInit: (dbPath: string, passphrase: string, keyFileContent?: string) => ipcRenderer.invoke('vault:init', { dbPath, passphrase, keyFileContent }),
  vaultUnlock: (dbPath: string, passphrase: string, keyFileContent?: string) => ipcRenderer.invoke('vault:unlock', { dbPath, passphrase, keyFileContent }),
  vaultGetData: () => ipcRenderer.invoke('vault:get-data'),
  vaultSaveData: (data: any) => ipcRenderer.invoke('vault:save-data', data),
  vaultLock: () => ipcRenderer.invoke('vault:lock'),
  vaultExportEncrypted: (vaultData: any, passphrase: string) => ipcRenderer.invoke('vault:export-encrypted', { vaultData, passphrase }),
  vaultImportEncrypted: (fileContent: string, passphrase?: string) => ipcRenderer.invoke('vault:import-encrypted', { fileContent, passphrase }),
  vaultGenerateKey: (type: 'RSA-4096' | 'Ed25519') => ipcRenderer.invoke('vault:generate-key', type),
  vaultDerivePublicKey: (privateKey: string, passphrase?: string) => ipcRenderer.invoke('vault:derive-public-key', { privateKey, passphrase }),
  hashicorpVaultTest: (config: any) => ipcRenderer.invoke('vault:hashicorp-test', config),
  hashicorpVaultFetchSecret: (config: any, secretPath: string, keyName?: string) => ipcRenderer.invoke('vault:hashicorp-fetch-secret', { config, secretPath, keyName }),
  hashicorpGetSecret: async (secretPath: string, keyName?: string) => {
    const res = await ipcRenderer.invoke('vault:hashicorp-fetch-secret', { config: null, secretPath, keyName });
    return res?.secret || null;
  },

  /* OTP Helper APIs */
  otpGenerate: (secretKey: string) => ipcRenderer.invoke('otp:generate', secretKey),
  otpTimeRemaining: () => ipcRenderer.invoke('otp:time-remaining'),

  /* Log Aggregator APIs */
  logStartStream: (streamId: string, serverChain: any[], keyChain: any[], filePath: string) => ipcRenderer.invoke('log:start', { streamId, serverChain, keyChain, filePath }),
  logStopStream: (streamId: string) => ipcRenderer.invoke('log:stop', streamId),
  onLogData: (callback: (streamId: string, data: string) => void) => {
    const wrapper = (_event: any, payload: { streamId: string, data: string }) => callback(payload.streamId, payload.data);
    ipcRenderer.on('log-stream-data', wrapper);
  },
  removeLogDataListener: (callback: (streamId: string, data: string) => void) => {
    // Note: To properly remove listeners in Electron, the wrapper reference must match,
    // but typically we can just clear all listeners for the component on unmount.
    ipcRenderer.removeAllListeners('log-stream-data');
  },

  /* Team Sync APIs */
  syncPush: (config: any, encryptedPayload: string) => ipcRenderer.invoke('sync:push', { config, encryptedPayload }),
  syncPull: (config: any) => ipcRenderer.invoke('sync:pull', config),

  /* Plugin APIs */
  pluginList: () => ipcRenderer.invoke('plugin:list'),
  pluginInstall: (filePath: string) => ipcRenderer.invoke('plugin:install', filePath),
  pluginUninstall: (pluginId: string) => ipcRenderer.invoke('plugin:uninstall', pluginId),
  pluginInvoke: (pluginId: string, action: string, args: any) => ipcRenderer.invoke('plugin:invoke', { pluginId, action, args }),

  /* SSH Tunnel APIs */
  tunnelStart: (config: any, server: any, keyObj?: any) => ipcRenderer.invoke('tunnel:start', { config, server, key: keyObj }),
  tunnelStop: (tunnelId: string) => ipcRenderer.invoke('tunnel:stop', tunnelId),
  tunnelGetStats: () => ipcRenderer.invoke('tunnel:get-stats'),

  /* Multi-Exec Parallel APIs */
  multiExecSsh: (targetServers: any[], commandStr: string, keys: any[], vaultConfig?: any) => ipcRenderer.invoke('multi-exec:ssh', { targetServers, commandStr, keys, vaultConfig }),
  multiExecDb: (targetServers: any[], queryStr: string) => ipcRenderer.invoke('multi-exec:db', { targetServers, queryStr }),

  /* Audit Log APIs */
  auditList: () => ipcRenderer.invoke('audit:list'),
  auditLogCommand: (entry: any) => ipcRenderer.invoke('audit:log-command', entry),
  auditGetCast: (logId: string) => ipcRenderer.invoke('audit:get-cast', logId),
  auditExport: (logId: string, format: 'cast' | 'txt') => ipcRenderer.invoke('audit:export', { logId, format }),

  /* AI & DevOps Playbook APIs */
  aiTestKey: (settings: any) => ipcRenderer.invoke('ai:test-key', settings),
  aiChat: (settings: any, userPrompt: string, history: any[], contextSnippet?: string) => ipcRenderer.invoke('ai:chat', { settings, userPrompt, history, contextSnippet }),
  aiSendMessage: async (prompt: string, aiConfig: any) => {
    const res = await ipcRenderer.invoke('ai:chat', { settings: aiConfig, userPrompt: prompt, history: [] });
    return res?.reply || res?.error || 'No response from AI.';
  },
  aiGeneratePlaybook: (settings: any, userPrompt: string, contextSnippet?: string, targetServerInfo?: string) =>
    ipcRenderer.invoke('ai:generate-playbook', { settings, userPrompt, contextSnippet, targetServerInfo }),
  playbookExecuteStep: (server: any, command: string, key?: any, vaultConfig?: any) =>
    ipcRenderer.invoke('playbook:execute-step', { server, command, key, vaultConfig }),
  serverInspectTelemetry: (server: any, key?: any, vaultConfig?: any) =>
    ipcRenderer.invoke('server:inspect-telemetry', { server, key, vaultConfig }),

  /* Database APIs */
  dbConnect: (options: any) => ipcRenderer.invoke('db:connect', options),
  dbListDatabases: (sessionId: string, dbType: string) => ipcRenderer.invoke('db:list-databases', { sessionId, dbType }),
  dbListTables: (sessionId: string, dbType: string, dbName?: string) => ipcRenderer.invoke('db:list-tables', { sessionId, dbType, dbName }),
  dbExecuteQuery: (sessionId: string, dbType: string, queryStr: string, dbName?: string) => ipcRenderer.invoke('db:execute-query', { sessionId, dbType, queryStr, dbName }),
  dbDisconnect: (sessionId: string) => ipcRenderer.invoke('db:disconnect', sessionId),

  /* SSH APIs */
  sshConnect: (options: any) => ipcRenderer.invoke('ssh:connect', options),
  sshWrite: (sessionId: string, data: string) => ipcRenderer.invoke('ssh:write', { sessionId, data }),
  sshResize: (sessionId: string, cols: number, rows: number) => ipcRenderer.invoke('ssh:resize', { sessionId, cols, rows }),
  sshDisconnect: (sessionId: string) => ipcRenderer.invoke('ssh:disconnect', sessionId),
  onSshData: (callback: (event: any, payload: { sessionId: string; data: string }) => void) => {
    ipcRenderer.on('ssh:data', callback);
    return () => ipcRenderer.removeListener('ssh:data', callback);
  },
  onSshClosed: (callback: (event: any, payload: { sessionId: string }) => void) => {
    ipcRenderer.on('ssh:closed', callback);
    return () => ipcRenderer.removeListener('ssh:closed', callback);
  },

  /* SFTP APIs */
  sftpConnect: (options: any) => ipcRenderer.invoke('sftp:connect', options),
  sftpList: (sessionId: string, remotePath: string) => ipcRenderer.invoke('sftp:list', { sessionId, remotePath }),
  sftpDownload: (sessionId: string, remotePath: string, localPath: string) => ipcRenderer.invoke('sftp:download', { sessionId, remotePath, localPath }),
  sftpUpload: (sessionId: string, localPath: string, remotePath: string) => ipcRenderer.invoke('sftp:upload', { sessionId, localPath, remotePath }),
  sftpMkdir: (sessionId: string, remotePath: string) => ipcRenderer.invoke('sftp:mkdir', { sessionId, remotePath }),
  sftpDelete: (sessionId: string, remotePath: string, isDir: boolean) => ipcRenderer.invoke('sftp:delete', { sessionId, remotePath, isDir }),
  sftpDisconnect: (sessionId: string) => ipcRenderer.invoke('sftp:disconnect', sessionId),
  onSftpProgress: (callback: (event: any, payload: { sessionId: string; type: 'upload' | 'download'; fileName: string; transferred: number; total: number; percentage: number }) => void) => {
    ipcRenderer.on('sftp:progress', callback);
    return () => ipcRenderer.removeListener('sftp:progress', callback);
  },

  /* S3 APIs */
  s3Connect: (sessionId: string, options: any) => ipcRenderer.invoke('s3:connect', { sessionId, options }),
  s3List: (sessionId: string, remotePath: string) => ipcRenderer.invoke('s3:list', { sessionId, remotePath }),
  s3Download: (sessionId: string, remotePath: string, localPath: string) => ipcRenderer.invoke('s3:download', { sessionId, remotePath, localPath }),
  s3Upload: (sessionId: string, localPath: string, remotePath: string) => ipcRenderer.invoke('s3:upload', { sessionId, localPath, remotePath }),
  s3Mkdir: (sessionId: string, remotePath: string) => ipcRenderer.invoke('s3:mkdir', { sessionId, remotePath }),
  s3Delete: (sessionId: string, remotePath: string, isDir: boolean) => ipcRenderer.invoke('s3:delete', { sessionId, remotePath, isDir }),
  s3Disconnect: (sessionId: string) => ipcRenderer.invoke('s3:disconnect', sessionId),
  onS3Progress: (callback: (event: any, payload: { sessionId: string; type: 'upload' | 'download'; fileName: string; transferred: number; total: number; percentage: number }) => void) => {
    ipcRenderer.on('s3:progress', callback);
    return () => ipcRenderer.removeListener('s3:progress', callback);
  },

  /* Docker & K8s APIs */
  dockerK8sListResources: (platform: 'DOCKER' | 'K8S', resourceType: string, namespace?: string) => ipcRenderer.invoke('docker-k8s:list-resources', { platform, resourceType, namespace }),
  dockerK8sExecuteAction: (platform: 'DOCKER' | 'K8S', resourceType: string, action: string, nameOrId: string) => ipcRenderer.invoke('docker-k8s:execute-action', { platform, resourceType, action, nameOrId }),

  /* Cloud Explorer APIs */
  cloudListInstances: () => ipcRenderer.invoke('cloud:list-instances'),
  cloudAddInstance: (instance: any) => ipcRenderer.invoke('cloud:add-instance', instance),
  cloudDeleteInstance: (instanceId: string) => ipcRenderer.invoke('cloud:delete-instance', instanceId),

  /* RDP APIs */
  rdpConnect: (options: any) => ipcRenderer.invoke('rdp:connect', options),
  rdpResize: (sessionId: string, width: number, height: number) => ipcRenderer.invoke('rdp:resize', { sessionId, width, height }),
  rdpDisconnect: (sessionId: string) => ipcRenderer.invoke('rdp:disconnect', sessionId),
  onRdpStatus: (callback: (event: any, payload: any) => void) => {
    ipcRenderer.on('rdp:status', callback);
    return () => ipcRenderer.removeListener('rdp:status', callback);
  },

  /* Network Diagnostics APIs */
  netDiagnose: (tool: string, host: string, options?: any) => ipcRenderer.invoke('net:diagnose', { tool, host, options }),

  /* File Dialog APIs */
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
  saveFileDialog: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:save-file', { defaultName, content }),

  /* App Updates APIs */
  appVersion: () => ipcRenderer.invoke('app:version'),
  appOpenUrl: (url: string) => ipcRenderer.invoke('app:open-url', url)
});
