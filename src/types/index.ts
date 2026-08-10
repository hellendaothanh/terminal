export type Environment = 'DEV' | 'STAGING' | 'PRODUCTION';
export type Protocol = 'SSH' | 'SFTP' | 'RDP' | 'DATABASE';
export type DBType = 'MySQL' | 'PostgreSQL' | 'Redis' | 'MongoDB';
export type AuthType = 'password' | 'privateKey' | 'hashicorpVault';
export type AIProvider = 'gemini' | 'openai' | 'custom';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  enabled: boolean;
}

export interface HashiCorpVaultConfig {
  url: string;
  token?: string;
  roleId?: string;
  secretId?: string;
  namespace?: string;
  authMethod: 'token' | 'approle';
}

export interface ServerConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: Protocol;
  username: string;
  authType: AuthType;
  password?: string;
  privateKeyId?: string;
  passphrase?: string;
  vaultSecretPath?: string;
  vaultKeyName?: string;
  
  // Database Specific Fields
  dbType?: DBType;
  dbName?: string;

  environment: Environment;
  tags: string[];
  rdpWidth?: number;
  rdpHeight?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SSHKey {
  id: string;
  name: string;
  type: 'RSA-4096' | 'Ed25519';
  publicKey: string;
  privateKey: string;
  passphrase?: string;
  createdAt: number;
}

export interface VaultData {
  servers: ServerConfig[];
  keys: SSHKey[];
  hashicorpVault?: HashiCorpVaultConfig;
}

export interface TabItem {
  id: string;
  title: string;
  type: 'SSH' | 'SFTP' | 'RDP' | 'DATABASE' | 'KEY_MANAGER' | 'SETTINGS' | 'SERVER_FORM';
  serverId?: string;
  server?: ServerConfig;
}

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  theme: 'dracula' | 'one-dark' | 'monokai' | 'solarized-dark';
  cursorBlink: boolean;
  scrollback: number;
  hashicorpVault?: HashiCorpVaultConfig;
  ai?: AISettings;
}

export interface RemoteFile {
  name: string;
  size: number;
  type: 'd' | '-' | 'l'; // directory, regular file, symlink
  modifyTime: number;
  rights: {
    user: string;
    group: string;
    other: string;
  };
  owner: number;
  group: number;
}

export interface DBQueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  contextSnippet?: string;
}
