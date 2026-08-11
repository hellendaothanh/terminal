import React, { useState } from 'react';
import { ServerConfig, TerminalSettings } from '../types';
import { Database, Download, Upload, Shield, FileText, CheckCircle, RefreshCw, Lock } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface DataPumpProps {
  servers: ServerConfig[];
  settings?: TerminalSettings;
}

export const DataPump: React.FC<DataPumpProps> = ({ servers, settings }) => {
  const { t } = useTranslation(settings);
  const dbServers = servers.filter((s) => s.protocol === 'DATABASE');
  const [selectedServerId, setSelectedServerId] = useState<string>(dbServers[0]?.id || '');
  const [mode, setMode] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
  const [format, setFormat] = useState<'SQL' | 'JSON' | 'PARQUET'>('SQL');
  const [enableEncryption, setEnableEncryption] = useState<boolean>(true);
  const [encryptionPassphrase, setEncryptionPassphrase] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const handleStartPump = () => {
    if (enableEncryption && !encryptionPassphrase) {
      alert(t('dpAlertPassphrase'));
      return;
    }

    setProcessing(true);
    setProgress(10);
    setStatusMessage(`${t('dpStatusInitializing')} (${mode === 'EXPORT' ? 'Dump' : 'Restore'})...`);

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setProcessing(false);
          setStatusMessage(
            mode === 'EXPORT'
              ? `${t('dpStatusExportSuccess')} ${format} ${enableEncryption ? '(AES-256)' : ''}`
              : t('dpStatusImportSuccess')
          );
          return 100;
        }
        return p + 20;
      });
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)', padding: '20px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={22} style={{ color: 'var(--env-dev)' }} />
          <span>{t('dpTitle')}</span>
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {t('dpDesc')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1 }}>
        {/* Configuration Panel */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {t('dpConfigTitle')}
          </h3>

          {/* Mode Switcher */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{t('dpModeLabel')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMode('EXPORT')}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: mode === 'EXPORT' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: mode === 'EXPORT' ? 'var(--bg-tertiary)' : 'transparent',
                  color: mode === 'EXPORT' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} /> Export / Dump
              </button>

              <button
                type="button"
                onClick={() => setMode('IMPORT')}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: mode === 'IMPORT' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: mode === 'IMPORT' ? 'var(--bg-tertiary)' : 'transparent',
                  color: mode === 'IMPORT' ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Upload size={14} /> Import / Restore
              </button>
            </div>
          </div>

          {/* Target DB Server */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{t('dpTargetDb')}</label>
            <select className="input-field" value={selectedServerId} onChange={(e) => setSelectedServerId(e.target.value)} style={{ height: '36px', fontSize: '0.82rem' }}>
              {dbServers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.dbType} - {s.host}:{s.port})</option>
              ))}
            </select>
          </div>

          {/* Format Picker */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{t('dpFormatLabel')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['SQL', 'JSON', 'PARQUET'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setFormat(fmt)}
                  style={{
                    padding: '8px',
                    borderRadius: '4px',
                    border: format === fmt ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: format === fmt ? 'var(--bg-tertiary)' : 'transparent',
                    color: format === fmt ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {fmt} {fmt === 'PARQUET' ? '(Columnar)' : fmt === 'SQL' ? '(DDL+DML)' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Encryption Option */}
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
              <input type="checkbox" checked={enableEncryption} onChange={(e) => setEnableEncryption(e.target.checked)} />
              <Lock size={14} style={{ color: 'var(--accent-warning)' }} />
              <span>{t('dpEncryptLabel')}</span>
            </label>

            {enableEncryption && (
              <input
                type="password"
                className="input-field"
                placeholder={t('dpPassphrasePlaceholder')}
                value={encryptionPassphrase}
                onChange={(e) => setEncryptionPassphrase(e.target.value)}
                style={{ height: '34px', fontSize: '0.8rem' }}
              />
            )}
          </div>

          <button className="btn-primary" onClick={handleStartPump} disabled={processing} style={{ height: '38px', marginTop: '10px', justifyContent: 'center' }}>
            {processing ? <RefreshCw size={14} className="spin" /> : mode === 'EXPORT' ? <Download size={14} /> : <Upload size={14} />}
            <span>{processing ? t('dpProcessing') : mode === 'EXPORT' ? t('dpStartExport') : t('dpStartImport')}</span>
          </button>
        </div>

        {/* Execution & Stream Status Panel */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>
            {t('dpMonitorTitle')}
          </h3>

          {processing || progress > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t('dpProgressLabel')}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{progress}%</span>
                </div>
                <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent-primary)', transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {statusMessage && (
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: '#a7f3d0', fontFamily: 'monospace' }}>
                  {statusMessage}
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
              <Shield size={40} style={{ marginBottom: '12px' }} />
              <p style={{ fontSize: '0.85rem' }}>{t('dpStartPrompt')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
