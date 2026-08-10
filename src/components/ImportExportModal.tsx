import React, { useState } from 'react';
import { VaultData, TerminalSettings } from '../types';
import { ArrowUpDown, Download, Upload, FileText, Check, X, AlertCircle } from 'lucide-react';
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = async () => {
    try {
      const jsonStr = JSON.stringify(vaultData, null, 2);
      const success = await window.api.saveFileDialog('omni_servers_backup.json', jsonStr);
      if (success) {
        setStatusMessage('Export JSON succeeded!');
      }
    } catch (err: any) {
      setStatusMessage(`Export error: ${err.message}`);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = 'ID,Name,Host,Port,Protocol,Username,Environment,Tags\n';
      const rows = vaultData.servers
        .map((s) => `"${s.id}","${s.name}","${s.host}",${s.port},"${s.protocol}","${s.username}","${s.environment}","${(s.tags || []).join(';')}"`)
        .join('\n');
      const csvStr = headers + rows;
      const success = await window.api.saveFileDialog('omni_servers.csv', csvStr);
      if (success) {
        setStatusMessage('Export CSV succeeded!');
      }
    } catch (err: any) {
      setStatusMessage(`Export CSV error: ${err.message}`);
    }
  };

  const handleImportJSON = async () => {
    try {
      const file = await window.api.openFileDialog();
      if (file) {
        const importedData: VaultData = JSON.parse(file.content);
        if (Array.isArray(importedData.servers)) {
          onImportVaultData(importedData);
          setStatusMessage('Import succeeded!');
        } else {
          setStatusMessage('Invalid JSON format.');
        }
      }
    } catch (err: any) {
      setStatusMessage(`File error: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ArrowUpDown size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('importExportTitle')}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {statusMessage && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-primary)',
              fontSize: '0.85rem'
            }}>
              {statusMessage}
            </div>
          )}

          {/* Export Options */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} style={{ color: 'var(--accent-success)' }} />
              {t('exportData')}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {t('exportDesc')}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={handleExportJSON} style={{ fontSize: '0.8rem' }}>
                <Download size={14} />
                <span>Export JSON</span>
              </button>
              <button className="btn-secondary" onClick={handleExportCSV} style={{ fontSize: '0.8rem' }}>
                <FileText size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Import Options */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={16} style={{ color: 'var(--accent-primary)' }} />
              {t('importData')}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {t('importDesc')}
            </p>
            <button className="btn-primary" onClick={handleImportJSON} style={{ fontSize: '0.8rem' }}>
              <Upload size={14} />
              <span>{t('chooseFile')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
