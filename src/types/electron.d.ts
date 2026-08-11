export interface ElectronAPI {
  vaultCheckStatus: () => Promise<{ hasVault: boolean; isUnlocked: boolean }>;
  vaultInit: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
  vaultUnlock: (passphrase: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  vaultGetData: () => Promise<any>;
  vaultSaveData: (data: any) => Promise<{ success: boolean; error?: string }>;
  vaultLock: () => Promise<{ success: boolean }>;
  vaultGenerateKey: (type: 'RSA-4096' | 'Ed25519') => Promise<{ publicKey: string; privateKey: string }>;
  vaultDerivePublicKey: (privateKey: string, passphrase?: string) => Promise<{ publicKey: string; privateKey: string; type: 'RSA-4096' | 'Ed25519' }>;
  hashicorpVaultTest: (config: any) => Promise<{ success: boolean; version?: string; error?: string }>;
  hashicorpVaultFetchSecret: (config: any, secretPath: string, keyName?: string) => Promise<{ success: boolean; secret?: string; error?: string }>;
  hashicorpGetSecret: (secretPath: string, keyName?: string) => Promise<string | null>;

  otpGenerate: (secretKey: string) => Promise<{ success: boolean; code?: string; error?: string }>;
  otpTimeRemaining: () => Promise<number>;

  tunnelStart: (config: any, server: any, keyObj?: any) => Promise<{ success: boolean; error?: string }>;
  tunnelStop: (tunnelId: string) => Promise<{ success: boolean }>;
  tunnelGetStats: () => Promise<Record<string, any>>;

  multiExecSsh: (targetServers: any[], commandStr: string, keys: any[]) => Promise<any[]>;
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

  rdpConnect: (options: any) => Promise<{ success: boolean; error?: string }>;
  rdpResize: (sessionId: string, width: number, height: number) => void;
  rdpDisconnect: (sessionId: string) => void;
  onRdpStatus: (callback: (event: any, payload: any) => void) => () => void;

  openFileDialog: () => Promise<{ path: string; content: string } | null>;
  saveFileDialog: (defaultName: string, content: string) => Promise<string | null>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
