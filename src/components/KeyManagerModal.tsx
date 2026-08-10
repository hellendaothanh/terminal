import React, { useState } from 'react';
import { SSHKey } from '../types';
import { Key, Plus, Copy, Trash2, X, Check, ShieldCheck } from 'lucide-react';

interface KeyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  keys: SSHKey[];
  onSaveKey: (key: SSHKey) => void;
  onDeleteKey: (keyId: string) => void;
}

export const KeyManagerModal: React.FC<KeyManagerModalProps> = ({
  isOpen,
  onClose,
  keys,
  onSaveKey,
  onDeleteKey
}) => {
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
      alert(`Tạo khóa thất bại: ${err.message}`);
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
              Trình Quản Lý Kho Khóa Bảo Mật (SSH Key Vault)
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
              Tạo Cặp Khóa Mới (Generate Public/Private Key Pair)
            </h4>

            <form onSubmit={handleGenerateKey} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr auto', gap: '10px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Tên Khóa</label>
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
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Thuật Toán</label>
                <select
                  className="input-field"
                  value={keyType}
                  onChange={(e) => setKeyType(e.target.value as any)}
                >
                  <option value="Ed25519">Ed25519 (Khuyên dùng)</option>
                  <option value="RSA-4096">RSA 4096-bit</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Passphrase (Tùy chọn)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Bảo vệ private key"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ height: '36px' }}>
                {loading ? 'Đang tạo...' : 'Tạo Khóa'}
              </button>
            </form>
          </div>

          {/* Stored Key List */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px' }}>
              Danh Sách Khóa Trong Kho Dữ Liệu ({keys.length})
            </h4>

            {keys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                Chưa có SSH Key nào. Hãy tạo cặp khóa đầu tiên ở trên.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                {keys.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <ShieldCheck size={16} style={{ color: 'var(--accent-success)' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{k.name}</span>
                        <span className="tag-pill">{k.type}</span>
                        {k.passphrase && <span style={{ fontSize: '0.7rem', color: 'var(--accent-warning)' }}>🔒 Passphrase</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Public Key: {k.publicKey.slice(0, 45)}...
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleCopyPublic(k.publicKey, k.id)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        title="Copy Public Key để dán vào server"
                      >
                        {copiedId === k.id ? <Check size={14} style={{ color: 'var(--accent-success)' }} /> : <Copy size={14} />}
                        <span>{copiedId === k.id ? 'Đã Copy' : 'Copy Public'}</span>
                      </button>

                      <button
                        className="btn-danger"
                        onClick={() => onDeleteKey(k.id)}
                        style={{ padding: '4px 8px' }}
                        title="Xóa khóa này khỏi kho"
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

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};
