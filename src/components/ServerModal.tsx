import React, { useState, useEffect } from 'react';
import { ServerConfig, SSHKey, Protocol, AuthType, Environment, DBType } from '../types';
import { Server, X, Shield, Check, AlertCircle, RefreshCw, Database } from 'lucide-react';

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (server: Partial<ServerConfig>) => void;
  editingServer?: ServerConfig | null;
  keys: SSHKey[];
}

export const ServerModal: React.FC<ServerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingServer,
  keys
}) => {
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

  // Vault secret test preview state
  const [testSecretStatus, setTestSecretStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({ testing: false });

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
    }
    setTestSecretStatus({ testing: false });
  }, [editingServer, isOpen]);

  if (!isOpen) return null;

  const handleProtocolChange = (p: Protocol) => {
    setProtocol(p);
    if (p === 'RDP') setPort(3389);
    else if (p === 'DATABASE') setPort(3306);
    else setPort(22);
  };

  const handleDbTypeChange = (type: DBType) => {
    setDbType(type);
    if (type === 'MySQL') setPort(3306);
    else if (type === 'PostgreSQL') setPort(5432);
    else if (type === 'Redis') setPort(6379);
    else if (type === 'MongoDB') setPort(27017);
  };

  const handleTestVaultSecret = async () => {
    if (!vaultSecretPath) return;
    setTestSecretStatus({ testing: true });
    try {
      const res = await window.api.hashicorpVaultFetchSecret(null, vaultSecretPath, vaultKeyName);
      if (res.success) {
        setTestSecretStatus({ testing: false, success: true, message: `Lấy secret từ HashiCorp Vault thành công!` });
      } else {
        setTestSecretStatus({ testing: false, success: false, message: res.error || 'Lỗi lấy secret từ Vault.' });
      }
    } catch (e: any) {
      setTestSecretStatus({ testing: false, success: false, message: e.message });
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
      environment,
      tags
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {editingServer ? 'Chỉnh Sửa Thông Tin Máy Chủ / CSDL' : 'Thêm Máy Chủ / CSDL Mới'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Protocol Selector */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Giao Thức / Loại Máy Chủ
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['SSH', 'SFTP', 'RDP', 'DATABASE'] as Protocol[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleProtocolChange(p)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      border: protocol === p ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      backgroundColor: protocol === p ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                      color: protocol === p ? 'var(--accent-primary)' : 'var(--text-muted)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '0.82rem'
                    }}
                  >
                    {p === 'DATABASE' && <Database size={14} />}
                    <span>{p}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Database Engine Type & Default Database Name */}
            {protocol === 'DATABASE' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Loại Cơ Sở Dữ Liệu (DB Engine)
                  </label>
                  <select
                    className="input-field"
                    value={dbType}
                    onChange={(e) => handleDbTypeChange(e.target.value as DBType)}
                  >
                    <option value="MySQL">MySQL / MariaDB</option>
                    <option value="PostgreSQL">PostgreSQL</option>
                    <option value="Redis">Redis Cache</option>
                    <option value="MongoDB">MongoDB</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Tên Database Mặc Định
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
            )}

            {/* Name & Host & Port */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Tên Kết Nối</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. MySQL Master Production"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Host / Địa chỉ IP</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="192.168.1.100"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Port</label>
                <input
                  type="number"
                  className="input-field"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 22)}
                  required
                />
              </div>
            </div>

            {/* Auth Type & User Credentials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Username / DB User</label>
                <input
                  type="text"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Phương Thức Xác Thực</label>
                <select
                  className="input-field"
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as AuthType)}
                >
                  <option value="password">Mật Khẩu Trực Tiếp (Password)</option>
                  <option value="privateKey">Khóa Khóa SSH (Private Key)</option>
                  <option value="hashicorpVault">🔐 HashiCorp Vault (Bảo Mật Cao)</option>
                </select>
              </div>
            </div>

            {authType === 'password' ? (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Mật Khẩu CSDL</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : authType === 'privateKey' ? (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Chọn SSH Key từ Vault</label>
                <select
                  className="input-field"
                  value={privateKeyId}
                  onChange={(e) => setPrivateKeyId(e.target.value)}
                >
                  <option value="">-- Chọn Khóa SSH --</option>
                  {keys.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name} ({k.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* HashiCorp Vault Secret Configuration */
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '0.88rem', fontWeight: 600 }}>
                  <Shield size={16} />
                  <span>Cấu Hình Lấy Secret Từ HashiCorp Vault</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Secret Path (Đường dẫn Secret trên Vault)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. secret/data/db/mysql-prod"
                      value={vaultSecretPath}
                      onChange={(e) => setVaultSecretPath(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                      Key Name
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="password"
                      value={vaultKeyName}
                      onChange={(e) => setVaultKeyName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleTestVaultSecret}
                    disabled={testSecretStatus.testing || !vaultSecretPath}
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    {testSecretStatus.testing ? <RefreshCw size={13} className="spin" /> : <Shield size={13} />}
                    <span>{testSecretStatus.testing ? 'Đang thử...' : 'Thử Lấy Secret từ Vault'}</span>
                  </button>

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
              </div>
            )}

            {/* Environment & Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Môi Trường</label>
                <select
                  className="input-field"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as Environment)}
                >
                  <option value="DEV">DEV (Phát triển)</option>
                  <option value="STAGING">STAGING (Thử nghiệm)</option>
                  <option value="PRODUCTION">PRODUCTION (Vận hành)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Thẻ Tag (Phân cách bởi dấu phẩy)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="mysql, production, db"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Lưu Máy Chủ / CSDL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
