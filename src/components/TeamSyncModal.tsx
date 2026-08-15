import React, { useState, useEffect } from 'react';
import { VaultData, TerminalSettings, TeamSyncConfig } from '../types';
import { Cloud, Lock, Download, Upload, AlertCircle, CheckCircle2, Server, Database } from 'lucide-react';

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface TeamSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultData: VaultData;
  settings: TerminalSettings;
  onSaveSettings: (settings: TerminalSettings) => void;
  onMergeVaultData: (data: VaultData) => void;
}

export const TeamSyncModal: React.FC<TeamSyncModalProps> = ({
  isOpen,
  onClose,
  vaultData,
  settings,
  onSaveSettings,
  onMergeVaultData
}) => {
  const isVi = settings.language === 'vi';
  const [provider, setProvider] = useState<'GIST' | 'S3'>(settings.teamSync?.provider || 'GIST');
  
  // Gist config
  const [gistId, setGistId] = useState(settings.teamSync?.gistId || '');
  const [gistToken, setGistToken] = useState(settings.teamSync?.gistToken || '');
  
  // S3 config
  const [s3Endpoint, setS3Endpoint] = useState(settings.teamSync?.s3Endpoint || '');
  const [s3Region, setS3Region] = useState(settings.teamSync?.s3Region || 'us-east-1');
  const [s3Bucket, setS3Bucket] = useState(settings.teamSync?.s3Bucket || '');
  const [s3AccessKey, setS3AccessKey] = useState(settings.teamSync?.s3AccessKey || '');
  const [s3SecretKey, setS3SecretKey] = useState(settings.teamSync?.s3SecretKey || '');
  const [s3Path, setS3Path] = useState(settings.teamSync?.s3Path || 'omni_vault.enc.json');

  const [teamPassphrase, setTeamPassphrase] = useState('');
  
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'loading'; text: string } | null>(null);

  if (!isOpen) return null;

  const saveConfigToSettings = () => {
    const newConfig: TeamSyncConfig = {
      provider,
      gistId,
      gistToken,
      s3Endpoint,
      s3Region,
      s3Bucket,
      s3AccessKey,
      s3SecretKey,
      s3Path
    };
    onSaveSettings({ ...settings, teamSync: newConfig });
    return newConfig;
  };

  const handlePush = async () => {
    setStatusMessage(null);
    if (!teamPassphrase) {
      setStatusMessage({ type: 'error', text: isVi ? 'Vui lòng nhập Team Passphrase để mã hóa.' : 'Please enter the Team Passphrase to encrypt.' });
      return;
    }

    try {
      setStatusMessage({ type: 'loading', text: isVi ? 'Đang mã hóa Vault...' : 'Encrypting Vault...' });
      const exportRes = await window.api.vaultExportEncrypted(vaultData, teamPassphrase);
      
      if (!exportRes.success || !exportRes.jsonContent) {
        throw new Error(exportRes.error || (isVi ? 'Mã hóa Vault thất bại.' : 'Vault encryption failed.'));
      }

      const config = saveConfigToSettings();
      setStatusMessage({ type: 'loading', text: isVi ? 'Đang Push lên Cloud...' : 'Pushing to Cloud...' });
      
      const pushRes = await window.api.syncPush(config, exportRes.jsonContent);
      if (!pushRes.success) {
        throw new Error(pushRes.error || (isVi ? 'Push lên Cloud thất bại.' : 'Push to Cloud failed.'));
      }

      setStatusMessage({ type: 'success', text: isVi ? 'Đẩy (Push) lên Cloud thành công! Dữ liệu của bạn đã được mã hóa an toàn.' : 'Push to Cloud successful! Your data has been securely encrypted.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handlePull = async () => {
    setStatusMessage(null);
    if (!teamPassphrase) {
      setStatusMessage({ type: 'error', text: isVi ? 'Vui lòng nhập Team Passphrase để giải mã.' : 'Please enter the Team Passphrase to decrypt.' });
      return;
    }

    try {
      const config = saveConfigToSettings();
      setStatusMessage({ type: 'loading', text: isVi ? 'Đang Pull từ Cloud...' : 'Pulling from Cloud...' });
      
      const pullRes = await window.api.syncPull(config);
      if (!pullRes.success || !pullRes.encryptedPayload) {
        throw new Error(pullRes.error || (isVi ? 'Kéo từ Cloud thất bại.' : 'Pulling from Cloud failed.'));
      }

      setStatusMessage({ type: 'loading', text: isVi ? 'Đang giải mã và Merge (Gộp)...' : 'Decrypting and Merging...' });
      
      const importRes = await window.api.vaultImportEncrypted(pullRes.encryptedPayload, teamPassphrase);
      
      if (!importRes.success || !importRes.data) {
        throw new Error(importRes.error || (isVi ? 'Giải mã hoặc import thất bại. Vui lòng kiểm tra lại Team Passphrase.' : 'Decryption or import failed. Please verify the Team Passphrase.'));
      }

      // Execute Merge
      onMergeVaultData(importRes.data);
      
      setStatusMessage({ type: 'success', text: isVi ? 'Pull và Merge thành công!' : 'Pull and Merge successful!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', backgroundColor: 'var(--bg-primary)' }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Cloud size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              Team Cloud Sync (E2EE)
            </h3>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setProvider('GIST')}
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', border: provider === 'GIST' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                backgroundColor: provider === 'GIST' ? 'rgba(52, 211, 153, 0.1)' : 'var(--bg-secondary)',
                color: provider === 'GIST' ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600
              }}
            >
              <GithubIcon size={20} /> GitHub Gist
            </button>
            <button
              onClick={() => setProvider('S3')}
              style={{
                flex: 1, padding: '12px', borderRadius: '8px', border: provider === 'S3' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                backgroundColor: provider === 'S3' ? 'rgba(52, 211, 153, 0.1)' : 'var(--bg-secondary)',
                color: provider === 'S3' ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600
              }}
            >
              <Database size={20} /> S3 Storage
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {provider === 'GIST' ? (
              <>
                <div className="form-group">
                  <label>Gist ID</label>
                  <input type="text" value={gistId} onChange={e => setGistId(e.target.value)} placeholder="e.g. 5f3d4a..." className="input-field" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {isVi 
                      ? 'Mở GitHub Gist, tạo mới một gist với tên file bất kỳ, sau đó copy ID trên URL.' 
                      : 'Open GitHub Gist, create a new gist with any filename, then copy the ID from the URL.'}
                  </span>
                </div>
                <div className="form-group">
                  <label>GitHub Personal Access Token (PAT)</label>
                  <input type="password" value={gistToken} onChange={e => setGistToken(e.target.value)} placeholder="ghp_..." className="input-field" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {isVi ? 'Cần quyền "gist".' : 'Requires "gist" scope/permission.'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>S3 Bucket</label>
                    <input type="text" value={s3Bucket} onChange={e => setS3Bucket(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Region</label>
                    <input type="text" value={s3Region} onChange={e => setS3Region(e.target.value)} placeholder="us-east-1" className="input-field" />
                  </div>
                </div>
                <div className="form-group">
                  <label>{isVi ? 'Endpoint URL (Tuỳ chọn cho MinIO / DO Spaces)' : 'Endpoint URL (Optional for MinIO / DO Spaces)'}</label>
                  <input type="text" value={s3Endpoint} onChange={e => setS3Endpoint(e.target.value)} placeholder="https://..." className="input-field" />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Access Key</label>
                    <input type="text" value={s3AccessKey} onChange={e => setS3AccessKey(e.target.value)} className="input-field" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Secret Key</label>
                    <input type="password" value={s3SecretKey} onChange={e => setS3SecretKey(e.target.value)} className="input-field" />
                  </div>
                </div>
                <div className="form-group">
                  <label>{isVi ? 'File Path trên S3' : 'File Path on S3'}</label>
                  <input type="text" value={s3Path} onChange={e => setS3Path(e.target.value)} placeholder="team/omni_vault.enc.json" className="input-field" />
                </div>
              </>
            )}
          </div>

          <div style={{ backgroundColor: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '16px', borderRadius: '8px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-success)' }}>
                <Lock size={16} /> Team Passphrase (E2E Encryption)
              </label>
              <input 
                type="password" 
                value={teamPassphrase} 
                onChange={e => setTeamPassphrase(e.target.value)} 
                placeholder={isVi ? 'Mật khẩu mã hóa E2E chung cho cả team...' : 'Shared E2E encryption passphrase for the team...'} 
                className="input-field" 
                style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                {isVi 
                  ? 'Mật khẩu này không được lưu lại, bạn phải nhập mỗi khi Push hoặc Pull. Toàn bộ thông tin kết nối và mật khẩu máy chủ sẽ được mã hóa chuẩn AES-256-GCM.' 
                  : 'This passphrase is not saved; you must enter it every time you Push or Pull. All connection data and server credentials will be encrypted using standard AES-256-GCM.'}
              </span>
            </div>
          </div>

          {statusMessage && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                border: statusMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : statusMessage.type === 'error' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                color: statusMessage.type === 'success' ? 'var(--accent-success)' : statusMessage.type === 'error' ? 'var(--accent-danger)' : '#60a5fa',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 500
              }}
            >
              {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontWeight: 500 }}
          >
            {isVi ? 'Đóng' : 'Close'}
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handlePull}
              disabled={statusMessage?.type === 'loading'}
              style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} /> Pull (Merge)
            </button>
            <button
              onClick={handlePush}
              disabled={statusMessage?.type === 'loading'}
              style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Upload size={16} /> Push to Cloud
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
