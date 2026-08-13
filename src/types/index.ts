export type Environment = 'DEV' | 'STAGING' | 'PRODUCTION';
export type Protocol = 'SSH' | 'SFTP' | 'RDP' | 'DATABASE' | 'S3';
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

  // Jump Host / Bastion Host chain (supports multi-hop 1-3 layers)
  jumpHostIds?: string[];

  // S3 Specific Fields
  s3Options?: {
    region: string;
    endpoint?: string;
    forcePathStyle?: boolean;
    accessKeyId?: string;
    secretAccessKey?: string;
  };

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

export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface OTPEntry {
  id: string;
  issuer?: string;
  accountName: string;
  secretKey: string;
  algorithm?: string;
  digits?: number;
  period?: number;
  createdAt: number;
}

export interface SSHTunnelConfig {
  id: string;
  name: string;
  serverId: string;
  mode: 'LOCAL' | 'REMOTE' | 'DYNAMIC';
  localHost?: string;
  localPort: number;
  dstHost?: string;
  dstPort?: number;
  autoStart?: boolean;
  createdAt: number;
}

export interface TunnelTrafficStats {
  tunnelId: string;
  status: 'ACTIVE' | 'CONNECTING' | 'ERROR' | 'STOPPED';
  bytesRead: number; // Download / Received
  bytesWritten: number; // Upload / Transferred
  speedKbps: number;
  activeConnections: number;
  error?: string;
}

export interface CommandSnippet {
  id: string;
  title: string;
  type: 'SSH' | 'DATABASE';
  content: string;
  description?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MultiExecResult {
  targetId: string;
  targetName: string;
  hostOrDb: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  output: string;
  executionTimeMs: number;
  error?: string;
}

export interface VaultData {
  servers: ServerConfig[];
  keys: SSHKey[];
  passwords?: PasswordEntry[];
  otps?: OTPEntry[];
  tunnels?: SSHTunnelConfig[];
  snippets?: CommandSnippet[];
  hashicorpVault?: HashiCorpVaultConfig;
  settings?: TerminalSettings;
}

export interface AuditLogEntry {
  id: string;
  sessionId: string;
  targetId?: string;
  targetName: string;
  protocol: 'SSH' | 'SFTP' | 'RDP' | 'DATABASE' | 'S3';
  user: string;
  commandOrQuery: string;
  status: 'SUCCESS' | 'ERROR';
  executionTimeMs?: number;
  timestamp: number;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  hmacChecksum?: string; // SHA-256 HMAC Checksum for tamper protection (ISO 27001 / SOC 2)
  isTamperEvident?: boolean;
  castData?: Array<[number, string, string]>; // asciinema v2 frames: [time_offset, 'o'|'i', data]
}

export interface TabItem {
  id: string;
  title: string;
  type: 'SSH' | 'SFTP' | 'RDP' | 'DATABASE' | 'S3_EXPLORER' | 'KEY_MANAGER' | 'SETTINGS' | 'SERVER_FORM' | 'PASSWORD_MANAGER' | 'OTP_MANAGER' | 'TUNNEL_MANAGER' | 'MULTI_EXEC_MANAGER' | 'AUDIT_LOG_MANAGER' | 'ERD_SCHEMA_DIFF' | 'VISUAL_QUERY_BUILDER' | 'DATA_PUMP' | 'DOCKER_K8S' | 'CLOUD_EXPLORER' | 'LOG_AGGREGATOR' | 'CUSTOM_CONNECTOR' | 'NET_DIAGNOSTICS';
  serverId?: string;
  server?: ServerConfig;
}

export interface TeamSyncConfig {
  provider: 'GIST' | 'S3';
  gistId?: string;
  gistToken?: string;
  s3Endpoint?: string;
  s3Region?: string;
  s3Bucket?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Path?: string;
}

export interface PluginField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'boolean';
  required?: boolean;
  default?: any;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  fields: PluginField[];
}

export interface TerminalSettings {
  fontSize: number;
  fontFamily: string;
  theme: 'dracula' | 'one-dark' | 'monokai' | 'solarized-dark';
  cursorBlink: boolean;
  scrollback: number;
  language?: 'vi' | 'en';
  teamSync?: TeamSyncConfig;
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
