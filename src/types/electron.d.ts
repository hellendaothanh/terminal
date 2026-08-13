export interface ElectronAPI {
  vaultCheckStatus: (dbPath: string | null) => Promise<{ hasVault: boolean; isUnlocked: boolean }>;
  vaultInit: (dbPath: string, passphrase: string, keyFileContent?: string) => Promise<{ success: boolean; error?: string }>;
  vaultUnlock: (dbPath: string, passphrase: string, keyFileContent?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  vaultGetData: () => Promise<any>;
  vaultSaveData: (data: any) => Promise<{ success: boolean; error?: string }>;
  vaultLock: () => Promise<{ success: boolean }>;
  vaultExportEncrypted: (vaultData: any, passphrase: string) => Promise<{ success: boolean; jsonContent?: string; error?: string }>;
  vaultImportEncrypted: (fileContent: string, passphrase?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  vaultGenerateKey: (type: 'RSA-4096' | 'Ed25519') => Promise<{ publicKey: string; privateKey: string }>;
  vaultDerivePublicKey: (privateKey: string, passphrase?: string) => Promise<{ publicKey: string; privateKey: string; type: 'RSA-4096' | 'Ed25519' }>;
  hashicorpVaultTest: (config: any) => Promise<{ success: boolean; version?: string; error?: string }>;
  hashicorpVaultFetchSecret: (config: any, secretPath: string, keyName?: string) => Promise<{ success: boolean; secret?: string; error?: string }>;
  hashicorpGetSecret: (secretPath: string, keyName?: string) => Promise<string | null>;

  logStartStream: (streamId: string, serverChain: any[], keyChain: any[], filePath: string) => Promise<{ success: boolean; error?: string }>;
  logStopStream: (streamId: string) => Promise<{ success: boolean }>;
  onLogData: (callback: (streamId: string, data: string) => void) => void;
  removeLogDataListener: (callback: (streamId: string, data: string) => void) => void;

  // Team Sync
  syncPush: (config: any, encryptedPayload: string) => Promise<{ success: boolean; error?: string }>;
  syncPull: (config: any) => Promise<{ success: boolean; encryptedPayload?: string; error?: string }>;

  // Plugins
  pluginList: () => Promise<{ success: boolean; plugins?: any[]; error?: string }>;
  pluginInstall: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  pluginUninstall: (pluginId: string) => Promise<{ success: boolean; error?: string }>;
  pluginInvoke: (pluginId: string, action: string, args: any) => Promise<{ success: boolean; data?: any; error?: string }>;

  toggleTheme: () => void;
  otpGenerate: (secretKey: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  otpTimeRemaining: () => Promise<number>;

  tunnelStart: (config: any, serverChain: any[], keyChain: any[]) => Promise<{ success: boolean; error?: string }>;
  tunnelStop: (tunnelId: string) => Promise<{ success: boolean }>;
  tunnelGetStats: () => Promise<Record<string, any>>;

  multiExecSsh: (targetServers: any[], commandStr: string, keys: any[], vaultConfig?: any) => Promise<any[]>;
  multiExecDb: (targetServers: any[], queryStr: string) => Promise<any[]>;

  auditList: () => Promise<any[]>;
  auditLogCommand: (entry: any) => Promise<{ success: boolean }>;
  auditGetCast: (logId: string) => Promise<any>;
  auditExport: (logId: string, format: 'cast' | 'txt') => Promise<{ success: boolean; path?: string; error?: string }>;

  aiTestKey: (settings: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  aiChat: (settings: any, userPrompt: string, history: any[], contextSnippet?: string) => Promise<{ success: boolean; reply?: string; error?: string }>;
  aiSendMessage: (prompt: string, aiConfig: any) => Promise<string>;

  dbConnect: (options: any) => Promise<{ success: boolean; error?: string }>;
  dbListDatabases: (sessionId: string, dbType: string) => Promise<{ success: boolean; databases?: string[]; error?: string }>;
  dbListTables: (sessionId: string, dbType: string, dbName?: string) => Promise<{ success: boolean; tables?: string[]; error?: string }>;
  dbExecuteQuery: (sessionId: string, dbType: string, queryStr: string, dbName?: string) => Promise<any>;
  dbDisconnect: (sessionId: string) => Promise<void>;

  sshConnect: (options: any) => Promise<{ success: boolean; error?: string }>;
  sshWrite: (sessionId: string, data: string) => void;
  sshResize: (sessionId: string, cols: number, rows: number) => void;
  sshDisconnect: (sessionId: string) => void;
  onSshData: (callback: (event: any, payload: { sessionId: string; data: string }) => void) => () => void;
  onSshClosed: (callback: (event: any, payload: { sessionId: string }) => void) => () => void;

  sftpConnect: (options: any) => Promise<{ success: boolean; error?: string }>;
  sftpList: (sessionId: string, remotePath: string) => Promise<{ success: boolean; files?: any[]; path?: string; error?: string }>;
  sftpDownload: (sessionId: string, remotePath: string, localPath: string) => Promise<{ success: boolean; error?: string }>;
  sftpUpload: (sessionId: string, localPath: string, remotePath: string) => Promise<{ success: boolean; error?: string }>;
  sftpMkdir: (sessionId: string, remotePath: string) => Promise<{ success: boolean; error?: string }>;
  sftpDelete: (sessionId: string, remotePath: string, isDir: boolean) => Promise<{ success: boolean; error?: string }>;
  sftpDisconnect: (sessionId: string) => Promise<void>;
  onSftpProgress: (callback: (event: any, payload: { sessionId: string; type: 'upload' | 'download'; fileName: string; transferred: number; total: number; percentage: number }) => void) => () => void;

  s3Connect: (sessionId: string, options: any) => Promise<boolean>;
  s3List: (sessionId: string, remotePath: string) => Promise<any[]>;
  s3Download: (sessionId: string, remotePath: string, localPath: string) => Promise<boolean>;
  s3Upload: (sessionId: string, localPath: string, remotePath: string) => Promise<boolean>;
  s3Mkdir: (sessionId: string, remotePath: string) => Promise<boolean>;
  s3Delete: (sessionId: string, remotePath: string, isDir: boolean) => Promise<boolean>;
  s3Disconnect: (sessionId: string) => Promise<boolean>;
  onS3Progress: (callback: (event: any, payload: { sessionId: string; type: 'upload' | 'download'; fileName: string; transferred: number; total: number; percentage: number }) => void) => () => void;

  dockerK8sListResources: (platform: 'DOCKER' | 'K8S', resourceType: string, namespace?: string) => Promise<{ resources: any[]; isSimulated: boolean }>;
  dockerK8sExecuteAction: (platform: 'DOCKER' | 'K8S', resourceType: string, action: string, nameOrId: string) => Promise<{ success: boolean; message: string }>;

  cloudListInstances: () => Promise<any[]>;
  cloudAddInstance: (instance: any) => Promise<boolean>;
  cloudDeleteInstance: (instanceId: string) => Promise<boolean>;

  rdpConnect: (options: any) => Promise<{ success: boolean; error?: string }>;
  rdpResize: (sessionId: string, width: number, height: number) => void;
  rdpDisconnect: (sessionId: string) => void;
  onRdpStatus: (callback: (event: any, payload: any) => void) => () => void;

  netDiagnose: (tool: string, host: string, options?: any) => Promise<string>;

  openFileDialog: () => Promise<{ path: string; content: string } | null>;
  saveFileDialog: (defaultName: string, content: string) => Promise<string | null>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
