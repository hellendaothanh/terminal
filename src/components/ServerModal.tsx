import React, { useState, useEffect } from 'react';
import { ServerConfig, SSHKey, Protocol, AuthType, Environment, DBType, TerminalSettings } from '../types';
import { Server, X, Shield, Check, AlertCircle, RefreshCw, Database, Activity } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (server: Partial<ServerConfig>) => void;
  editingServer?: ServerConfig | null;
  keys: SSHKey[];
  availableServers?: ServerConfig[];
  settings?: TerminalSettings;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingServer,
  keys,
  availableServers = [],
  settings
}) => {
  const { t } = useTranslation(settings);
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [protocol, setProtocol] = useState<Protocol>('SSH');
  const [username, setUsername] = useState('root');
  const [authType, setAuthType] = useState<AuthType>('password');
  const [password, setPassword] = useState('');
  const [privateKeyId, setPrivateKeyId] = useState('');
  const [vaultSecretPath, setVaultSecretPath] = useState('');
  const [vaultKeyName, setVaultKeyName] = useState('password');
  const [dbType, setDbType] = useState<DBType>('MySQL');
  const [dbName, setDbName] = useState('');
  const [environment, setEnvironment] = useState<Environment>('DEV');
  const [tagsInput, setTagsInput] = useState('');
  const [jumpHostIds, setJumpHostIds] = useState<string[]>([]);
  
  // S3 Specific Options
  const [s3Region, setS3Region] = useState('us-east-1');
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [s3ForcePathStyle, setS3ForcePathStyle] = useState(false);

  // Vault secret test preview state
  const [testSecretStatus, setTestSecretStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({ testing: false });

  // Network Diagnostics States
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticsTool, setDiagnosticsTool] = useState<'ping' | 'dns' | 'ports' | 'traceroute' | 'mtr'>('ping');
  const [diagnosticsOutput, setDiagnosticsOutput] = useState('');
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [pingPackets, setPingPackets] = useState(4);
  const [dnsType, setDnsType] = useState('A');
  const [portsList, setPortsList] = useState('22, 80, 443, 3389, 3306, 5432');
  const [maxHops, setMaxHops] = useState(20);
  const [mtrCount, setMtrCount] = useState(5);

  useEffect(() => {
    if (editingServer) {
      setName(editingServer.name);
      setHost(editingServer.host);
      setPort(editingServer.port);
      setProtocol(editingServer.protocol);
      setUsername(editingServer.username);
      setAuthType(editingServer.authType || 'password');
      setPassword(editingServer.password || '');
      setPrivateKeyId(editingServer.privateKeyId || '');
      setVaultSecretPath(editingServer.vaultSecretPath || '');
      setVaultKeyName(editingServer.vaultKeyName || 'password');
      setDbType(editingServer.dbType || 'MySQL');
      setDbName(editingServer.dbName || '');
      setEnvironment(editingServer.environment);
      setTagsInput(editingServer.tags ? editingServer.tags.join(', ') : '');
      setJumpHostIds(editingServer.jumpHostIds || []);
      
      if (editingServer.s3Options) {
        setS3Region(editingServer.s3Options.region || 'us-east-1');
        setS3Endpoint(editingServer.s3Options.endpoint || '');
        setS3ForcePathStyle(editingServer.s3Options.forcePathStyle || false);
      }
    } else {
      setName('');
      setHost('');
      setPort(22);
      setProtocol('SSH');
      setUsername('root');
      setAuthType('password');
      setPassword('');
      setPrivateKeyId('');
      setVaultSecretPath('');
      setVaultKeyName('password');
      setDbType('MySQL');
      setDbName('');
      setEnvironment('DEV');
      setTagsInput('');
      setJumpHostIds([]);
      setS3Region('us-east-1');
      setS3Endpoint('');
      setS3ForcePathStyle(false);
    }
    // Reset diagnostics state on reopen
    setShowDiagnostics(false);
    setDiagnosticsOutput('');
  }, [editingServer, isOpen]);

  if (!isOpen) return null;

  const handleProtocolChange = (p: Protocol) => {
    setProtocol(p);
    if (p === 'SSH' || p === 'SFTP') setPort(22);
    else if (p === 'RDP') setPort(3389);
    else if (p === 'DATABASE') {
      if (dbType === 'MySQL') setPort(3306);
      else if (dbType === 'PostgreSQL') setPort(5432);
      else if (dbType === 'Redis') setPort(6379);
      else if (dbType === 'MongoDB') setPort(27017);
    }
  };

  const handleDbTypeChange = (db: DBType) => {
    setDbType(db);
    if (db === 'MySQL') setPort(3306);
    else if (db === 'PostgreSQL') setPort(5432);
    else if (db === 'Redis') setPort(6379);
    else if (db === 'MongoDB') setPort(27017);
  };

  const handleTestVaultSecret = async () => {
    if (!vaultSecretPath) return;
    setTestSecretStatus({ testing: true });
    try {
      const secretVal = await window.api.hashicorpGetSecret(vaultSecretPath, vaultKeyName);
      if (secretVal) {
        setTestSecretStatus({ testing: false, success: true, message: `Successfully fetched! Key length: ${secretVal.length} chars` });
      } else {
        setTestSecretStatus({ testing: false, success: false, message: 'Key not found in secret path.' });
      }
    } catch (err: any) {
      setTestSecretStatus({ testing: false, success: false, message: err.message || 'Connection to Vault failed.' });
    }
  };

  const handleRunDiagnostics = async () => {
    if (!host) {
      setDiagnosticsOutput('Vui lòng nhập Host/IP của máy chủ trước khi chạy chẩn đoán.');
      return;
    }
    setDiagnosticsLoading(true);
    setDiagnosticsOutput(`[${new Date().toLocaleTimeString()}] Đang khởi chạy chẩn đoán ${diagnosticsTool.toUpperCase()} tới ${host}...\n`);
    try {
      const options = {
        packets: pingPackets,
        dnsType,
        portsList,
        maxHops,
        count: mtrCount
      };
      const result = await window.api.netDiagnose(diagnosticsTool, host, options);
      setDiagnosticsOutput(prev => prev + result);
    } catch (err: any) {
      setDiagnosticsOutput(prev => prev + `Lỗi: ${err.message || err}`);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    onSave({
      id: editingServer?.id,
      name,
      host,
      port,
      protocol,
      username,
      authType,
      password: authType === 'password' ? password : undefined,
      privateKeyId: authType === 'privateKey' ? privateKeyId : undefined,
      vaultSecretPath: authType === 'hashicorpVault' ? vaultSecretPath : undefined,
      vaultKeyName: authType === 'hashicorpVault' ? vaultKeyName : undefined,
      dbType: protocol === 'DATABASE' ? dbType : undefined,
      dbName: protocol === 'DATABASE' ? dbName : undefined,
      jumpHostIds: protocol === 'SSH' || protocol === 'SFTP' ? jumpHostIds : undefined,
      s3Options: protocol === 'S3' ? {
        region: s3Region,
        endpoint: s3Endpoint || undefined,
        forcePathStyle: s3ForcePathStyle
      } : undefined,
      environment,
      tags
    });

    onClose();
  };

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content"
        style={{
          width: showDiagnostics ? '1080px' : '580px',
          maxWidth: '95vw',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Server size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {editingServer ? t('editServerTitle') : t('addServerTitle')}
            </h3>
            <button
              type="button"
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="btn-secondary"
              style={{
                fontSize: '0.72rem',
                padding: '3px 8px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: showDiagnostics ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                color: showDiagnostics ? 'var(--accent-primary)' : 'var(--text-muted)'
              }}
            >
              <Activity size={12} />
              {showDiagnostics ? 'Đóng Chẩn Đoán' : 'Chẩn Đoán Mạng'}
            </button>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div 
            className="modal-body" 
            style={{ 
              display: 'flex', 
              flexDirection: showDiagnostics ? 'row' : 'column', 
              gap: '20px', 
              maxHeight: '70vh', 
              overflowY: 'auto' 
            }}
          >
            {/* COLUMN 1: Server Configurations Form */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: showDiagnostics ? '480px' : 'auto' }}>
              {/* Connection Protocol Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('connectionProtocol')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                  {(['SSH', 'SFTP', 'RDP', 'DATABASE', 'S3'] as Protocol[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleProtocolChange(p)}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: protocol === p ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: protocol === p ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                        color: protocol === p ? 'var(--accent-primary)' : 'var(--text-muted)'
                      }}
                    >
                      {p === 'DATABASE' ? '🗄️ Database' : p === 'S3' ? '☁️ S3' : p}
                    </button>
                  ))}
                </div>
              </div>

              {/* DB Engine Sub-Type (When Protocol is DATABASE) */}
              {protocol === 'DATABASE' && (
                <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        {t('dbEngineType')}
                      </label>
                      <select
                        className="input-field"
                        value={dbType}
                        onChange={(e) => handleDbTypeChange(e.target.value as DBType)}
                      >
                        <option value="MySQL">MySQL / MariaDB (3306)</option>
                        <option value="PostgreSQL">PostgreSQL (5432)</option>
                        <option value="Redis">Redis Cache (6379)</option>
                        <option value="MongoDB">MongoDB (27017)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        {t('defaultDbName')}
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. production_db"
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Info: Name & Host & Port */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    {protocol === 'S3' ? 'Access Key ID' : t('serverName')}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={protocol === 'S3' ? 'AKIA...' : 'e.g. Web Server Production'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {protocol !== 'S3' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      {t('hostIp')}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="192.168.1.100 or domain.com"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      required
                    />
                  </div>
                )}

                {protocol !== 'S3' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      {t('port')}
                    </label>
                    <input
                      type="number"
                      className="input-field"
                      value={port}
                      onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                      required
                    />
                  </div>
                )}
              </div>

              {/* Username */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {protocol === 'S3' ? 'Access Key ID' : t('username')}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={protocol === 'S3' ? "AKIA..." : "root, ubuntu, Administrator, postgres..."}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {protocol === 'S3' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      S3 Region
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      placeholder="us-east-1"
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Endpoint (Optional)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={s3Endpoint}
                      onChange={(e) => setS3Endpoint(e.target.value)}
                      placeholder="https://s3.us-east-1.amazonaws.com"
                    />
                  </div>
                </div>
              )}
              
              {protocol === 'S3' && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={s3ForcePathStyle}
                      onChange={(e) => setS3ForcePathStyle(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    Use Force Path Style (Required for MinIO)
                  </label>
                </div>
              )}

              {/* Authentication Method Options */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('authMethod')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setAuthType('password')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: authType === 'password' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      backgroundColor: authType === 'password' ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                      color: authType === 'password' ? 'var(--accent-primary)' : 'var(--text-muted)'
                    }}
                  >
                    {t('directPassword')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthType('privateKey')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: authType === 'privateKey' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      backgroundColor: authType === 'privateKey' ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                      color: authType === 'privateKey' ? 'var(--accent-primary)' : 'var(--text-muted)'
                    }}
                  >
                    {t('privateKeyOption')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAuthType('hashicorpVault')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: authType === 'hashicorpVault' ? '1px solid #c084fc' : '1px solid var(--border-subtle)',
                      backgroundColor: authType === 'hashicorpVault' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-tertiary)',
                      color: authType === 'hashicorpVault' ? '#c084fc' : 'var(--text-muted)'
                    }}
                  >
                    {t('hashicorpVaultOption')}
                  </button>
                </div>

                {/* Dynamic Auth Fields */}
                {authType === 'password' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      {protocol === 'S3' ? 'Secret Access Key' : t('password')}
                    </label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                )}

                {authType === 'privateKey' && (
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      {t('privateKeyOption')}
                    </label>
                    <select
                      className="input-field"
                      value={privateKeyId}
                      onChange={(e) => setPrivateKeyId(e.target.value)}
                    >
                      <option value="">{t('selectSshKey')}</option>
                      {keys.map((k) => (
                        <option key={k.id} value={k.id}>
                          🔑 {k.name} ({k.type})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {authType === 'hashicorpVault' && (
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                        {t('vaultSecretPath')}
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="secret/data/production/web-server"
                        value={vaultSecretPath}
                        onChange={(e) => setVaultSecretPath(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          {t('vaultKeyName')}
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="password or private_key"
                          value={vaultKeyName}
                          onChange={(e) => setVaultKeyName(e.target.value)}
                          required
                        />
                      </div>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleTestVaultSecret}
                        disabled={testSecretStatus.testing || !vaultSecretPath}
                        style={{ height: '36px', fontSize: '0.75rem' }}
                      >
                        {testSecretStatus.testing ? <RefreshCw size={13} className="spin" /> : <Shield size={13} />}
                        <span>{testSecretStatus.testing ? t('testing') : t('testVaultSecret')}</span>
                      </button>
                    </div>

                    {testSecretStatus.message && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: testSecretStatus.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {testSecretStatus.success ? <Check size={13} /> : <AlertCircle size={13} />}
                        <span>{testSecretStatus.message}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bastion Host / Jump Host Chain Configuration */}
              {(protocol === 'SSH' || protocol === 'SFTP') && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                    🌉 Cấu Hình Jump Host / Bastion Server (Multi-hop Tunnel 1-3 lớp)
                  </label>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Chọn 1 đến 3 máy chủ Bastion trung gian để tạo đường hầm SSH nhảy cóc tự động vào máy chủ trong mạng nội bộ Private Subnet.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[0, 1, 2].map((hopIndex) => {
                      const currentHopId = jumpHostIds[hopIndex] || '';
                      const candidateServers = availableServers.filter(
                        (s) => s.id !== editingServer?.id && (s.protocol === 'SSH' || s.protocol === 'SFTP')
                      );

                      return (
                        <div key={hopIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', width: '85px' }}>
                            Hop {hopIndex + 1}:
                          </span>
                          <select
                            className="input-field"
                            value={currentHopId}
                            onChange={(e) => {
                              const newIds = [...jumpHostIds];
                              if (e.target.value) {
                                newIds[hopIndex] = e.target.value;
                              } else {
                                newIds.splice(hopIndex, 1);
                              }
                              setJumpHostIds(newIds.filter(Boolean));
                            }}
                            style={{ height: '34px', fontSize: '0.8rem', flex: 1 }}
                          >
                            <option value="">-- Không sử dụng Hop {hopIndex + 1} --</option>
                            {candidateServers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.username}@{s.host}:{s.port})
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Environment Selection */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('envLabel')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEnvironment('DEV')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: environment === 'DEV' ? '1px solid var(--env-dev)' : '1px solid var(--border-subtle)',
                      backgroundColor: environment === 'DEV' ? 'var(--bg-tertiary)' : 'transparent',
                      color: 'var(--env-dev)'
                    }}
                  >
                    {t('envDev')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('STAGING')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: environment === 'STAGING' ? '1px solid var(--env-staging)' : '1px solid var(--border-subtle)',
                      backgroundColor: environment === 'STAGING' ? 'var(--bg-tertiary)' : 'transparent',
                      color: 'var(--env-staging)'
                    }}
                  >
                    {t('envStaging')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('PRODUCTION')}
                    style={{
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: environment === 'PRODUCTION' ? '1px solid var(--env-prod)' : '1px solid var(--border-subtle)',
                      backgroundColor: environment === 'PRODUCTION' ? 'var(--bg-tertiary)' : 'transparent',
                      color: 'var(--env-prod)'
                    }}
                  >
                    {t('envProduction')}
                  </button>
                </div>
              </div>

              {/* Tags Input */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('tagsInputLabel')}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="web, production, Nginx, Docker..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>

            {/* COLUMN 2: Network Diagnostics Suite (Visible when toggled) */}
            {showDiagnostics && (
              <div 
                style={{
                  width: '480px',
                  borderLeft: '1px solid var(--border-subtle)',
                  paddingLeft: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  minWidth: '400px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} style={{ color: 'var(--accent-primary)' }} />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Bộ Chẩn Đoán Mạng & Kết Nối
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target Host/IP:</span>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={host} 
                    onChange={(e) => setHost(e.target.value)} 
                    placeholder="e.g. 192.168.1.100 or domain.com"
                    style={{ fontSize: '0.8rem', height: '32px' }}
                  />
                </div>

                {/* Diagnostics Tools selector tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {(['ping', 'dns', 'ports', 'traceroute', 'mtr'] as const).map(tool => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => setDiagnosticsTool(tool)}
                      style={{
                        padding: '6px 2px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: diagnosticsTool === tool ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        backgroundColor: diagnosticsTool === tool ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                        color: diagnosticsTool === tool ? 'var(--accent-primary)' : 'var(--text-muted)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {tool === 'ports' ? 'Scan' : tool}
                    </button>
                  ))}
                </div>

                {/* Tool-specific configuration controls */}
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                  {diagnosticsTool === 'ping' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Số gói tin (Packets):</span>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={pingPackets} 
                        onChange={(e) => setPingPackets(parseInt(e.target.value) || 4)} 
                        style={{ width: '60px', height: '24px', padding: '2px 4px' }} 
                      />
                    </div>
                  )}
                  {diagnosticsTool === 'dns' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Loại bản ghi (DNS Type):</span>
                      <select 
                        className="input-field" 
                        value={dnsType} 
                        onChange={(e) => setDnsType(e.target.value)} 
                        style={{ width: '80px', height: '24px', padding: '2px 4px' }}
                      >
                        <option value="A">A</option>
                        <option value="AAAA">AAAA</option>
                        <option value="MX">MX</option>
                        <option value="TXT">TXT</option>
                        <option value="CNAME">CNAME</option>
                      </select>
                    </div>
                  )}
                  {diagnosticsTool === 'ports' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>Danh sách cổng quét (Ports):</span>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={portsList} 
                        onChange={(e) => setPortsList(e.target.value)} 
                        placeholder="22, 80, 443, 3389..."
                        style={{ width: '100%', height: '26px', padding: '2px 4px' }} 
                      />
                    </div>
                  )}
                  {diagnosticsTool === 'traceroute' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Hops tối đa (Max Hops):</span>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={maxHops} 
                        onChange={(e) => setMaxHops(parseInt(e.target.value) || 20)} 
                        style={{ width: '60px', height: '24px', padding: '2px 4px' }} 
                      />
                    </div>
                  )}
                  {diagnosticsTool === 'mtr' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Số chu kỳ quét (Cycles):</span>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={mtrCount} 
                        onChange={(e) => setMtrCount(parseInt(e.target.value) || 5)} 
                        style={{ width: '60px', height: '24px', padding: '2px 4px' }} 
                      />
                    </div>
                  )}
                </div>

                {/* Run Button */}
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRunDiagnostics}
                  disabled={diagnosticsLoading}
                  style={{ width: '100%', height: '32px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {diagnosticsLoading ? <RefreshCw size={14} className="spin" /> : <Activity size={14} />}
                  <span>{diagnosticsLoading ? 'Đang kiểm tra kết nối...' : 'Khởi chạy chẩn đoán'}</span>
                </button>

                {/* Console Output */}
                <div style={{ flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Kết quả chẩn đoán:</span>
                  <textarea
                    readOnly
                    value={diagnosticsOutput}
                    style={{
                      flex: 1,
                      backgroundColor: 'var(--bg-tertiary)',
                      color: '#34d399',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px',
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {t('saveServer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
