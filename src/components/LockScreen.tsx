import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, ArrowRight, AlertCircle, Globe, Database, FileKey, FolderOpen, Plus, Check } from 'lucide-react';
import { Language } from '../i18n/translations';
import { useTranslation } from '../i18n/useTranslation';

interface LockScreenProps {
  hasVault: boolean;
  onUnlock: (dbPath: string, passphrase: string, keyFileContent?: string) => Promise<boolean>;
  onInitVault: (dbPath: string, passphrase: string, keyFileContent?: string) => Promise<boolean>;
  language?: Language;
  onToggleLanguage?: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  hasVault: _unused_hasVault,
  onUnlock,
  onInitVault,
  language = 'vi',
  onToggleLanguage
}) => {
  const [dbPath, setDbPath] = useState(localStorage.getItem('omni_vault_db_path') || '');
  const [dbExists, setDbExists] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [useKeyFile, setUseKeyFile] = useState(false);
  const [keyPath, setKeyPath] = useState('');
  const [keyContent, setKeyContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { t } = useTranslation({ fontSize: 14, fontFamily: '', theme: 'one-dark', cursorBlink: true, scrollback: 5000, language });

  // Check if database exists at the chosen dbPath
  useEffect(() => {
    if (dbPath) {
      window.api.vaultCheckStatus(dbPath).then((status) => {
        setDbExists(status.hasVault);
      }).catch(() => {
        setDbExists(false);
      });
    } else {
      setDbExists(false);
    }
    setError(null);
    setSuccessMsg(null);
  }, [dbPath]);

  const handleSelectDb = async () => {
    setError(null);
    try {
      const res = await window.api.openFileDialog();
      if (res && res.path) {
        setDbPath(res.path);
        localStorage.setItem('omni_vault_db_path', res.path);
      }
    } catch (err: any) {
      setError(err.message || 'Error opening database file.');
    }
  };

  const handleCreateDb = async () => {
    setError(null);
    try {
      const res = await window.api.saveFileDialog('omni_vault.enc', '');
      if (res) {
        setDbPath(res);
        localStorage.setItem('omni_vault_db_path', res);
      }
    } catch (err: any) {
      setError(err.message || 'Error creating database file.');
    }
  };

  const handleSelectKeyFile = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await window.api.openFileDialog();
      if (res && res.path) {
        setKeyPath(res.path);
        setKeyContent(res.content);
      }
    } catch (err: any) {
      setError(err.message || 'Error opening key file.');
    }
  };

  const handleCreateKeyFile = async () => {
    setError(null);
    setSuccessMsg(null);
    try {
      // Generate 256-bit random hex key
      const randomKey = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const res = await window.api.saveFileDialog('omni_vault.key', randomKey);
      if (res) {
        setKeyPath(res);
        setKeyContent(randomKey);
        setSuccessMsg(t('successCreateKeyFile'));
      }
    } catch (err: any) {
      setError(err.message || 'Error generating key file.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!dbPath) {
      setError(t('noDbSelected'));
      return;
    }

    if (!passphrase.trim()) {
      setError(t('passphraseRequired'));
      return;
    }

    if (useKeyFile && !keyContent) {
      setError(t('keyFileRequired'));
      return;
    }

    setLoading(true);
    try {
      if (!dbExists) {
        if (passphrase !== confirmPassphrase) {
          setError(t('passphraseMismatch'));
          setLoading(false);
          return;
        }
        if (passphrase.length < 6) {
          setError(t('passphraseMinLength'));
          setLoading(false);
          return;
        }
        const success = await onInitVault(dbPath, passphrase, useKeyFile ? keyContent : undefined);
        if (!success) setError(t('initVaultFailed'));
      } else {
        const success = await onUnlock(dbPath, passphrase, useKeyFile ? keyContent : undefined);
        if (!success) setError(t('incorrectPassphrase'));
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeDb = () => {
    setDbPath('');
    setKeyPath('');
    setKeyContent('');
    setPassphrase('');
    setConfirmPassphrase('');
    setUseKeyFile(false);
    setError(null);
    setSuccessMsg(null);
  };

  // 1. Initial State: No DB Selected
  if (!dbPath) {
    return (
      <div style={containerStyle}>
        {onToggleLanguage && <LanguageButton language={language} onToggleLanguage={onToggleLanguage} />}

        <div style={cardStyle}>
          <div style={iconContainerStyle}>
            <Database size={32} />
          </div>

          <h2 style={titleStyle}>{t('welcomeTitle')}</h2>
          <p style={descStyle}>{t('welcomeDesc')}</p>

          {error && <ErrorAlert message={error} />}

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={handleSelectDb} className="btn-primary" style={actionBtnStyle}>
              <FolderOpen size={16} />
              <span>{t('selectDbFileBtn')}</span>
            </button>
            <button onClick={handleCreateDb} className="btn-secondary" style={actionBtnStyle}>
              <Plus size={16} />
              <span>{t('createDbFileBtn')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Unlock / Init State: DB Path selected
  return (
    <div style={containerStyle}>
      {onToggleLanguage && <LanguageButton language={language} onToggleLanguage={onToggleLanguage} />}

      <div style={cardStyle}>
        <div style={iconContainerStyle}>
          {dbExists ? <Lock size={32} /> : <ShieldCheck size={32} />}
        </div>

        <h2 style={titleStyle}>
          {dbExists ? t('unlockTitle') : t('initTitle')}
        </h2>
        <p style={descStyle}>
          {dbExists ? t('unlockDesc') : t('initDesc')}
        </p>

        {/* Selected DB Path Display */}
        <div style={dbPathContainerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Database</span>
            <span style={dbPathTextStyle} title={dbPath}>{dbPath}</span>
          </div>
          <button onClick={handleChangeDb} style={changeDbBtnStyle}>
            {t('changeDbFileBtn')}
          </button>
        </div>

        {error && <ErrorAlert message={error} />}
        {successMsg && <SuccessAlert message={successMsg} />}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>
              {t('passphraseLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••••••"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoFocus
                style={{ paddingLeft: '38px', width: '100%' }}
              />
              <KeyRound size={16} style={inputIconStyle} />
            </div>
          </div>

          {!dbExists && (
            <div>
              <label style={labelStyle}>
                {t('confirmPassphraseLabel')}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••••••"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  style={{ paddingLeft: '38px', width: '100%' }}
                />
                <KeyRound size={16} style={inputIconStyle} />
              </div>
            </div>
          )}

          {/* KeePass Key File Section */}
          <div style={checkboxWrapperStyle}>
            <input
              type="checkbox"
              id="useKeyFile"
              checked={useKeyFile}
              onChange={(e) => {
                setUseKeyFile(e.target.checked);
                if (!e.target.checked) {
                  setKeyPath('');
                  setKeyContent('');
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="useKeyFile" style={checkboxLabelStyle}>
              {t('useKeyFileCheckbox')}
            </label>
          </div>

          {useKeyFile && (
            <div style={keyFileSectionStyle}>
              {keyPath ? (
                <div style={keyPathWrapperStyle}>
                  <FileKey size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <span style={keyPathTextStyle} title={keyPath}>{keyPath}</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', marginBottom: '8px' }}>
                  {t('keyFileRequired')}
                </span>
              )}

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button type="button" onClick={handleSelectKeyFile} className="btn-secondary" style={{ flex: 1, fontSize: '0.75rem', padding: '6px 12px' }}>
                  <FolderOpen size={12} />
                  <span>{t('selectKeyFileBtn')}</span>
                </button>

                {!dbExists && (
                  <button type="button" onClick={handleCreateKeyFile} className="btn-secondary" style={{ flex: 1, fontSize: '0.75rem', padding: '6px 12px', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                    <Plus size={12} />
                    <span>{t('createKeyFileBtn')}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
          >
            <span>{dbExists ? t('unlockBtn') : t('createVaultBtn')}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};

// Styling definitions to maintain clean dark-theme aesthetics
const containerStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  width: '100vw',
  backgroundColor: 'var(--bg-primary)',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.08), transparent 70%)',
  position: 'relative'
};

const cardStyle: React.CSSProperties = {
  width: '420px',
  padding: '36px',
  borderRadius: 'var(--radius-lg)',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-subtle)',
  boxShadow: 'var(--shadow-lg)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const iconContainerStyle: React.CSSProperties = {
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
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  fontWeight: 600,
  color: 'var(--text-main)',
  marginBottom: '8px',
  textAlign: 'center'
};

const descStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
  textAlign: 'center',
  marginBottom: '24px',
  lineHeight: '1.4'
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
  display: 'block',
  marginBottom: '6px'
};

const inputIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  top: '10px',
  color: 'var(--text-dim)'
};

const actionBtnStyle: React.CSSProperties = {
  width: '100%',
  justifyContent: 'center',
  padding: '10px',
  gap: '8px',
  fontWeight: 600
};

const dbPathContainerStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: 'var(--bg-primary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '16px'
};

const dbPathTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-main)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '220px'
};

const changeDbBtnStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--accent-primary)',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  padding: '4px 8px',
  borderRadius: 'var(--radius-sm)',
  transition: 'background-color 0.2s',
  whiteSpace: 'nowrap'
};

const checkboxWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginTop: '4px',
  cursor: 'pointer'
};

const checkboxLabelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--text-main)',
  cursor: 'pointer',
  userSelect: 'none'
};

const keyFileSectionStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px dashed var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start'
};

const keyPathWrapperStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '8px',
  backgroundColor: 'var(--bg-primary)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--border-subtle)',
  marginBottom: '8px'
};

const keyPathTextStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--text-main)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flex: 1
};

// Sub-components for localization and alerts
const LanguageButton: React.FC<{ language: Language; onToggleLanguage: () => void }> = ({ language, onToggleLanguage }) => (
  <button
    type="button"
    onClick={onToggleLanguage}
    style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      height: '36px',
      padding: '0 12px',
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-main)',
      fontSize: '0.85rem',
      fontWeight: 600,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: 'var(--shadow-sm)'
    }}
    title="Đổi Ngôn Ngữ / Change Language"
  >
    <Globe size={16} style={{ color: 'var(--accent-primary)' }} />
    <span>{language === 'vi' ? '🇻🇳 Tiếng Việt' : '🇺🇸 English'}</span>
  </button>
);

const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
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
    <AlertCircle size={16} style={{ flexShrink: 0 }} />
    <span>{message}</span>
  </div>
);

const SuccessAlert: React.FC<{ message: string }> = ({ message }) => (
  <div style={{
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent-success, #10b981)',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px'
  }}>
    <Check size={16} style={{ flexShrink: 0 }} />
    <span>{message}</span>
  </div>
);
