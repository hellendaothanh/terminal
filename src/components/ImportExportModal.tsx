import React, { useState } from 'react';
import { VaultData, TerminalSettings } from '../types';
import { Shield, Download, Upload, Eye, EyeOff, X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultData: VaultData;
  onImportVaultData: (data: VaultData) => void;
  settings?: TerminalSettings;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  vaultData,
  onImportVaultData,
  settings
}) => {
  const { t } = useTranslation(settings);
  const [activeTab, setActiveTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');

  // Export State
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [confirmExportPassphrase, setConfirmExportPassphrase] = useState('');
  const [showExportPass, setShowExportPass] = useState(false);

  // Import State
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isEncryptedFile, setIsEncryptedFile] = useState(false);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [showImportPass, setShowImportPass] = useState(false);

  // Status/Error Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExportEncrypted = async () => {
    setStatusMessage(null);
    if (!exportPassphrase) {
      setStatusMessage({ type: 'error', text: t('alertPassphraseTooShort') });
      return;
    }
    if (exportPassphrase.length < 6) {
      setStatusMessage({ type: 'error', text: t('alertPassphraseTooShort') });
      return;
    }
    if (exportPassphrase !== confirmExportPassphrase) {
      setStatusMessage({ type: 'error', text: t('alertPassphraseMismatch') });
      return;
    }

    try {
      const dataToExport = {
        ...vaultData,
        settings: settings
      };
      const res = await window.api.vaultExportEncrypted(dataToExport, exportPassphrase);
      if (res.success && res.jsonContent) {
        const saved = await window.api.saveFileDialog('omni_vault_backup.enc.json', res.jsonContent);
        if (saved) {
          setStatusMessage({ type: 'success', text: t('exportEncryptedSuccessAlert') });
          setExportPassphrase('');
          setConfirmExportPassphrase('');
        }
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Export failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleSelectImportFile = async () => {
    setStatusMessage(null);
    try {
      const file = await window.api.openFileDialog();
      if (file && file.content) {
        setSelectedFileName(file.path || 'backup.enc.json');
        setSelectedFileContent(file.content);

        // Test if file is encrypted payload
        try {
          const parsed = JSON.parse(file.content);
          if (parsed.encrypted) {
            setIsEncryptedFile(true);
          } else {
            setIsEncryptedFile(false);
          }
        } catch {
          setIsEncryptedFile(false);
        }
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleImportDecrypt = async () => {
    setStatusMessage(null);
    if (!selectedFileContent) {
      setStatusMessage({ type: 'error', text: t('alertSelectFileFirst') });
      return;
    }

    try {
      const res = await window.api.vaultImportEncrypted(selectedFileContent, importPassphrase);
      if (res.success && res.data) {
        onImportVaultData(res.data);
        setStatusMessage({ type: 'success', text: t('importEncryptedSuccessAlert') });
        setSelectedFileContent(null);
        setSelectedFileName('');
        setImportPassphrase('');
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Decrypt import failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('importExportTitle')}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Tab Selection */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '16px' }}>
            <button
              onClick={() => { setActiveTab('EXPORT'); setStatusMessage(null); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'EXPORT' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'EXPORT' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.9rem',
                paddingBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={15} /> {t('tabExportEncrypted')}
            </button>

            <button
              onClick={() => { setActiveTab('IMPORT'); setStatusMessage(null); }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'IMPORT' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                color: activeTab === 'IMPORT' ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.9rem',
                paddingBottom: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Upload size={15} /> {t('tabImportEncrypted')}
            </button>
          </div>

          {/* Feedback Message Banner */}
          {statusMessage && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: statusMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: statusMessage.type === 'success' ? 'var(--accent-success)' : 'var(--accent-danger)',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: EXPORT ENCRYPTED BACKUP */}
          {activeTab === 'EXPORT' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                All passwords, SSH private keys, OTP secrets, and server entries will be encrypted using <strong>AES-256-GCM + PBKDF2</strong> with your secret passphrase.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  {t('exportPassphraseLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showExportPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder={t('exportPassphrasePlaceholder')}
                    value={exportPassphrase}
                    onChange={(e) => setExportPassphrase(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button className="btn-secondary" onClick={() => setShowExportPass(!showExportPass)} style={{ padding: '0 12px' }}>
                    {showExportPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  {t('confirmExportPassphraseLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span>
                </label>
                <input
                  type={showExportPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder={t('exportPassphrasePlaceholder')}
                  value={confirmExportPassphrase}
                  onChange={(e) => setConfirmExportPassphrase(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn-primary" onClick={handleExportEncrypted} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={16} /> {t('exportBtn')}
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: IMPORT & DECRYPT BACKUP */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  {t('selectBackupFileLabel')}
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button className="btn-secondary" onClick={handleSelectImportFile} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Upload size={14} /> {t('browseFileBtn')}
                  </button>
                  <span style={{ fontSize: '0.82rem', color: selectedFileName ? 'var(--text-main)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFileName || 'No file selected'}
                  </span>
                </div>
              </div>

              {isEncryptedFile && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                    {t('importPassphraseLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type={showImportPass ? 'text' : 'password'}
                      className="input-field"
                      placeholder={t('importPassphrasePlaceholder')}
                      value={importPassphrase}
                      onChange={(e) => setImportPassphrase(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button className="btn-secondary" onClick={() => setShowImportPass(!showImportPass)} style={{ padding: '0 12px' }}>
                      {showImportPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn-primary" onClick={handleImportDecrypt} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> {t('importDecryptBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
