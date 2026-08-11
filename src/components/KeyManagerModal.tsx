import React, { useState } from 'react';
import { SSHKey, TerminalSettings } from '../types';
import { Key, Plus, Copy, Trash2, X, Check, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface KeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  keys: SSHKey[];
  onSaveKey: (key: SSHKey) => void;
  onDeleteKey: (keyId: string) => void;
  settings?: TerminalSettings;
}

export const KeyManagerModal: React.FC<KeyManagerModalProps> = ({
  isOpen,
  onClose,
  keys,
  onSaveKey,
  onDeleteKey,
  settings
}) => {
  const { t } = useTranslation(settings);
  const [activeTab, setActiveTab] = useState<'generate' | 'import'>('generate');
  const [keyName, setKeyName] = useState('');
  const [keyType, setKeyType] = useState<'RSA-4096' | 'Ed25519'>('Ed25519');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPrivateId, setCopiedPrivateId] = useState<string | null>(null);

  // Import key state
  const [importKeyName, setImportKeyName] = useState('');
  const [importPrivateKey, setImportPrivateKey] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');

  if (!isOpen) return null;

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setLoading(true);
    try {
      const generated = await window.api.vaultGenerateKey(keyType);
      const newKey: SSHKey = {
        id: 'key_' + Date.now(),
        name: keyName.trim(),
        type: keyType,
        publicKey: generated.publicKey,
        privateKey: generated.privateKey,
        passphrase: passphrase || undefined,
        createdAt: Date.now()
      };

      onSaveKey(newKey);
      setKeyName('');
      setPassphrase('');
    } catch (err: any) {
      alert(`Error creating key: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImportKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importKeyName.trim() || !importPrivateKey.trim()) return;

    setLoading(true);
    try {
      const derived = await window.api.vaultDerivePublicKey(
        importPrivateKey.trim(),
        importPassphrase || undefined
      );

      const newKey: SSHKey = {
        id: 'key_' + Date.now(),
        name: importKeyName.trim(),
        type: derived.type,
        publicKey: derived.publicKey,
        privateKey: derived.privateKey,
        passphrase: importPassphrase || undefined,
        createdAt: Date.now()
      };

      onSaveKey(newKey);
      setImportKeyName('');
      setImportPrivateKey('');
      setImportPassphrase('');
    } catch (err: any) {
      alert(`Error importing key: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      
      if (text.startsWith('PuTTY-User-Key-File')) {
        alert(
          t('puttyKeyWarning') || 
          'Tệp khóa PuTTY (.ppk) không được hỗ trợ trực tiếp. Vui lòng chuyển đổi sang định dạng OpenSSH (PEM) bằng công cụ PuTTYgen (Conversions -> Export OpenSSH Key) trước khi import.'
        );
        return;
      }

      setImportPrivateKey(text);
      if (!importKeyName) {
        setImportKeyName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyPublic = (publicKey: string, id: string) => {
    navigator.clipboard.writeText(publicKey);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyPrivate = (privateKey: string, id: string) => {
    navigator.clipboard.writeText(privateKey);
    setCopiedPrivateId(id);
    setTimeout(() => setCopiedPrivateId(null), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} style={{ color: 'var(--accent-warning)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('keyManagerTitle')}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Key Generator & Import Tab Wrapper */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', gap: '15px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('generate')}
                style={{
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'generate' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'generate' ? 'var(--text-main)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                {t('generateKeyTab')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                style={{
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'import' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === 'import' ? 'var(--text-main)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                {t('importKeyTab')}
              </button>
            </div>

            {activeTab === 'generate' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <form onSubmit={handleGenerateKey} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('keyName')}</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. id_ed25519_prod"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('keyType')}</label>
                    <select
                      className="input-field"
                      value={keyType}
                      onChange={(e) => setKeyType(e.target.value as any)}
                    >
                      <option value="Ed25519">Ed25519 (Recommend)</option>
                      <option value="RSA-4096">RSA (4096-bit)</option>
                    </select>
                  </div>
                  {/* Passphrase field removed for generated keys as they are secured by the vault automatically */}

                  <button type="submit" className="btn-primary" disabled={loading} style={{ height: '36px' }}>
                    <span>{loading ? t('testing') : t('generateKeyBtn')}</span>
                  </button>
                </form>

                {/* Warning/Tip Text based on Key Type */}
                <div style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                  {keyType === 'RSA-4096' ? (
                    <span style={{ color: 'var(--accent-warning)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ⚠️ {t('rsaWarning')}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ✨ {t('ed25519Tip')}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleImportKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t('keyName')}</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. imported_key"
                      value={importKeyName}
                      onChange={(e) => setImportKeyName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Passphrase (Optional)</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Passphrase"
                      value={importPassphrase}
                      onChange={(e) => setImportPassphrase(e.target.value)}
                    />
                  </div>
                </div>

                 <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('privateKeyLabel')}</label>
                    <label style={{
                      fontSize: '0.75rem',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 500
                    }}>
                      <span>{t('chooseFileBtn')}</span>
                      <input
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        accept=".pem,.key,.pub,id_*,*"
                      />
                    </label>
                  </div>
                  <textarea
                    className="input-field"
                    style={{
                      height: '100px',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      resize: 'vertical',
                      whiteSpace: 'pre',
                      lineHeight: '1.2'
                    }}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                    value={importPrivateKey}
                    onChange={(e) => setImportPrivateKey(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={loading} style={{ height: '36px' }}>
                    <span>{loading ? t('testing') : t('importKeyBtn')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Key List Section */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
              {t('keyDetails')} ({keys.length})
            </h4>

            {keys.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                {t('noKeysFound')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                {keys.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={16} style={{ color: 'var(--accent-success)' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{k.name}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-surface)', color: 'var(--accent-primary)', border: '1px solid var(--border-subtle)' }}>
                          {k.type}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', fontFamily: 'monospace', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {k.publicKey}
                      </div>
                    </div>

                     <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleCopyPublic(k.publicKey, k.id)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        title={t('copyPublicKey')}
                      >
                        {copiedId === k.id ? <Check size={14} style={{ color: 'var(--accent-success)' }} /> : <Copy size={14} />}
                        <span>{copiedId === k.id ? 'Copied Pub' : 'Public Key'}</span>
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleCopyPrivate(k.privateKey, k.id)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        title={t('copyPrivateKey')}
                      >
                        {copiedPrivateId === k.id ? <Check size={14} style={{ color: 'var(--accent-success)' }} /> : <Key size={14} />}
                        <span>{copiedPrivateId === k.id ? 'Copied Priv' : 'Private Key'}</span>
                      </button>
                      <button
                        onClick={() => onDeleteKey(k.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title={t('deleteKey')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
