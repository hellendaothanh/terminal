import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, Check, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface CommandGuardApprovalModalProps {
  isOpen: boolean;
  commandOrQuery: string;
  riskLevel: 'HIGH' | 'MEDIUM';
  onApprove: () => void;
  onCancel: () => void;
}

export const CommandGuardApprovalModal: React.FC<CommandGuardApprovalModalProps> = ({
  isOpen,
  commandOrQuery,
  riskLevel,
  onApprove,
  onCancel
}) => {
  const [authMethod, setAuthMethod] = useState<'passphrase' | 'otp'>('passphrase');
  const [passphrase, setPassphrase] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authMethod === 'passphrase') {
      if (!passphrase) {
        setError('Vui lòng nhập Master Passphrase để phê duyệt lệnh!');
        return;
      }
      // Verify master passphrase via API or simulation
      onApprove();
    } else {
      if (!otpCode || otpCode.trim().length !== 6) {
        setError('Mã OTP không hợp lệ (phải gồm 6 chữ số)!');
        return;
      }
      onApprove();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ width: '480px', border: '1px solid var(--accent-danger)' }}>
        {/* Header */}
        <div className="modal-header" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-danger)' }}>
            <ShieldAlert size={22} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
              ⚠️ Command Guard: Phê Duyệt Lệnh Nguy Hiểm
            </h3>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.78rem' }}>
              <strong>CẢNH BÁO BẢO MẬT:</strong> Hệ thống phát hiện bạn sắp thực thi câu lệnh có mức độ rủi ro <strong style={{ textTransform: 'uppercase' }}>{riskLevel}</strong>. Yêu cầu xác thực bảo mật trước khi tiếp tục.
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Nội dung câu lệnh yêu cầu phê duyệt:
              </label>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#a7f3d0', border: '1px solid var(--border-subtle)', wordBreak: 'break-all' }}>
                {commandOrQuery}
              </div>
            </div>

            {/* Auth Method Switcher */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Phương thức xác thực phê duyệt:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAuthMethod('passphrase')}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: authMethod === 'passphrase' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: authMethod === 'passphrase' ? 'var(--bg-tertiary)' : 'transparent',
                    color: authMethod === 'passphrase' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Lock size={14} /> Master Passphrase
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMethod('otp')}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: authMethod === 'otp' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: authMethod === 'otp' ? 'var(--bg-tertiary)' : 'transparent',
                    color: authMethod === 'otp' ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <KeyRound size={14} /> Mã Xác Thực OTP
                </button>
              </div>
            </div>

            {authMethod === 'passphrase' ? (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Nhập Master Passphrase:
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Master Passphrase giải mã Vault..."
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoFocus
                />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Nhập Mã Xác Thực OTP (6 Chữ Số):
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ví dụ: 123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Hủy / Hủy Bỏ Lệnh
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--accent-danger)' }}>
              <Check size={14} />
              <span>Xác Nhận & Cho Phép Chạy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
