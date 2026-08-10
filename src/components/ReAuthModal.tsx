import React, { useState } from 'react';
import { ServerConfig } from '../types';
import { KeyRound, AlertTriangle, RefreshCw, X, ShieldCheck } from 'lucide-react';

interface ReAuthModalProps {
  isOpen: boolean;
  server: ServerConfig;
  errorMsg: string;
  onRetry: (newPassword: string, saveToVault: boolean) => void;
  onClose: () => void;
}

export const ReAuthModal: React.FC<ReAuthModalProps> = ({
  isOpen,
  server,
  errorMsg,
  onRetry,
  onClose
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [saveToVault, setSaveToVault] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    onRetry(newPassword, saveToVault);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-warning)' }}>
            <AlertTriangle size={20} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Xác Thực Thất Bại - Nhập Lại Mật Khẩu
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-warning)',
              fontSize: '0.82rem',
              lineHeight: '1.4'
            }}>
              Không thể kết nối tới <strong>{server.username}@{server.host}</strong>.<br />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Lỗi chi tiết: {errorMsg}</span>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Nhập Mật Khẩu Mới Cho Server
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Nhập mật khẩu SSH / RDP đúng..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  required
                  style={{ paddingLeft: '36px' }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={saveToVault}
                onChange={(e) => setSaveToVault(e.target.checked)}
              />
              <span>Cập nhật và lưu mật khẩu mới này vào Kho Dữ Liệu (Vault)</span>
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Hủy Bỏ</button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--accent-warning)' }}>
              <RefreshCw size={15} />
              <span>Thử Kết Nối Lại</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
