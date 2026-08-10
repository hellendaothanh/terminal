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
  const [keyName, setKeyName] = useState('');
  const [keyType, setKeyType] = useState<'RSA-4096' | 'Ed25519'>('Ed25519');
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopyPublic = (publicKey: string, id: string) => {
    navigator.clipboard.writeText(publicKey);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
          {/* Key Generator Form */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} style={{ color: 'var(--accent-primary)' }} />
              {t('generateNewKey')}
            </h4>

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

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Passphrase (Optional)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ height: '36px' }}>
                <span>{loading ? t('testing') : t('generateKeyBtn')}</span>
              </button>
            </form>
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
                        <span>{copiedId === k.id ? 'Copied' : t('copyCode')}</span>
                      </button>
                      <button
                        onClick={() => onDeleteKey(k.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
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
