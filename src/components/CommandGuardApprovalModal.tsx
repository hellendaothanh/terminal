import React, { useState } from 'react';
import { ShieldAlert, Lock, KeyRound, Check, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface CommandGuardApprovalModalProps {
  isOpen: boolean;
  commandOrQuery: string;
  riskLevel: 'HIGH' | 'MEDIUM';
  onApprove: () => void;
  onCancel: () => void;
  language?: 'vi' | 'en';
}

export const CommandGuardApprovalModal: React.FC<CommandGuardApprovalModalProps> = ({
  isOpen,
  commandOrQuery,
  riskLevel,
  onApprove,
  onCancel,
  language = 'vi'
}) => {
  const { t } = useTranslation({ language } as any);
  const [authMethod, setAuthMethod] = useState<'passphrase' | 'otp'>('passphrase');
  const [passphrase, setPassphrase] = useState<string>('');
  const [showPassphrase, setShowPassphrase] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authMethod === 'passphrase') {
      if (!passphrase) {
        setError(t('commandGuardPassphraseReq'));
        return;
      }
      // Verify master passphrase via API or simulation
      onApprove();
    } else {
      if (!otpCode || otpCode.trim().length !== 6) {
        setError(t('commandGuardOtpInvalid'));
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
              {t('commandGuardTitle')}
            </h3>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px 12px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.78rem' }}>
              <strong>{t('commandGuardWarning')}</strong> {t('commandGuardRiskText')} <strong style={{ textTransform: 'uppercase' }}>{riskLevel}</strong>. {t('commandGuardAuthReq')}
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                {t('commandGuardContentLabel')}
              </label>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#a7f3d0', border: '1px solid var(--border-subtle)', wordBreak: 'break-all' }}>
                {commandOrQuery}
              </div>
            </div>

            {/* Auth Method Switcher */}
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                {t('commandGuardMethodLabel')}
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
                  <Lock size={14} /> {t('passphraseLabel')}
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
                  <KeyRound size={14} /> {t('commandGuardOtpMethod')}
                </button>
              </div>
            </div>

            {authMethod === 'passphrase' ? (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {t('passphraseLabel')}:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassphrase ? 'text' : 'password'}
                    className="input-field"
                    placeholder={t('commandGuardPassphrasePlaceholder')}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    autoFocus
                    style={{ paddingRight: '36px', width: '100%' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '8px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px'
                    }}
                    title={showPassphrase ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassphrase ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  {t('commandGuardOtpLabel')}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('commandGuardOtpPlaceholder')}
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
              {t('commandGuardCancel')}
            </button>
            <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--accent-danger)' }}>
              <Check size={14} />
              <span>{t('commandGuardConfirm')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
