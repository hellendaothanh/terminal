import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';

interface LockScreenProps {
  hasVault: boolean;
  onUnlock: (passphrase: string) => Promise<boolean>;
  onInitVault: (passphrase: string) => Promise<boolean>;
}

export const LockScreen: React.FC<LockScreenProps> = ({ hasVault, onUnlock, onInitVault }) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passphrase.trim()) {
      setError('Vui lòng nhập Master Passphrase.');
      return;
    }

    setLoading(true);
    try {
      if (!hasVault) {
        if (passphrase !== confirmPassphrase) {
          setError('Xác nhận Passphrase không trùng khớp.');
          setLoading(false);
          return;
        }
        if (passphrase.length < 6) {
          setError('Passphrase phải có ít nhất 6 ký tự.');
          setLoading(false);
          return;
        }
        const success = await onInitVault(passphrase);
        if (!success) setError('Không thể khởi tạo kho dữ liệu mã hóa.');
      } else {
        const success = await onUnlock(passphrase);
        if (!success) setError('Master Passphrase không chính xác. Vui lòng thử lại.');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-primary)',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.08), transparent 70%)'
    }}>
      <div style={{
        width: '420px',
        padding: '36px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          color: 'var(--accent-primary)'
        }}>
          {hasVault ? <Lock size={32} /> : <ShieldCheck size={32} />}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
          {hasVault ? 'Mở khóa OmniTerminal' : 'Khởi tạo Master Passphrase'}
        </h2>
        
        <p style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          marginBottom: '24px',
          lineHeight: '1.4'
        }}>
          {hasVault
            ? 'Nhập Master Passphrase để giải mã toàn bộ danh sách server, mật khẩu và SSH private keys của bạn.'
            : 'Tạo Master Passphrase an toàn để bảo vệ kho dữ liệu bằng chuẩn mã hóa AES-256-GCM.'}
        </p>

        {error && (
          <div style={{
            width: '100%',
            padding: '10px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent-danger)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Master Passphrase
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••••••"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoFocus
                style={{ paddingLeft: '38px' }}
              />
              <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
            </div>
          </div>

          {!hasVault && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Xác nhận Passphrase
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••••••"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
          >
            <span>{hasVault ? 'Giải mã kho dữ liệu' : 'Khởi tạo và Bảo mật'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
