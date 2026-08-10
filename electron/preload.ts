import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  /* Vault & Security APIs */
  vaultCheckStatus: () => ipcRenderer.invoke('vault:check-status'),
  vaultInit: (passphrase: string) => ipcRenderer.invoke('vault:init', passphrase),
  vaultUnlock: (passphrase: string) => ipcRenderer.invoke('vault:unlock', passphrase),
  vaultGetData: () => ipcRenderer.invoke('vault:get-data'),
  vaultSaveData: (data: any) => ipcRenderer.invoke('vault:save-data', data),
  vaultLock: () => ipcRenderer.invoke('vault:lock'),
  vaultGenerateKey: (type: 'RSA-4096' | 'Ed25519') => ipcRenderer.invoke('vault:generate-key', type),
  hashicorpVaultTest: (config: any) => ipcRenderer.invoke('vault:hashicorp-test', config),
  hashicorpVaultFetchSecret: (config: any, secretPath: string, keyName?: string) => ipcRenderer.invoke('vault:hashicorp-fetch-secret', { config, secretPath, keyName }),

  /* AI APIs */
  aiTestKey: (settings: any) => ipcRenderer.invoke('ai:test-key', settings),
  aiChat: (settings: any, userPrompt: string, history: any[], contextSnippet?: string) => ipcRenderer.invoke('ai:chat', { settings, userPrompt, history, contextSnippet }),

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

  /* RDP APIs */
  rdpConnect: (options: any) => ipcRenderer.invoke('rdp:connect', options),
  rdpResize: (sessionId: string, width: number, height: number) => ipcRenderer.invoke('rdp:resize', { sessionId, width, height }),
  rdpDisconnect: (sessionId: string) => ipcRenderer.invoke('rdp:disconnect', sessionId),
  onRdpStatus: (callback: (event: any, payload: any) => void) => {
    ipcRenderer.on('rdp:status', callback);
    return () => ipcRenderer.removeListener('rdp:status', callback);
  },

  /* File Dialog APIs */
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
  saveFileDialog: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:save-file', { defaultName, content })
});
