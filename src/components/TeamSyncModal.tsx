import React, { useState, useEffect } from 'react';
import { VaultData, TerminalSettings, TeamSyncConfig } from '../types';
import { Cloud, Lock, Github, Download, Upload, AlertCircle, CheckCircle2, Server, Database } from 'lucide-react';

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
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập Team Passphrase để mã hóa.' });
      return;
    }

    try {
      setStatusMessage({ type: 'loading', text: 'Đang mã hóa Vault...' });
      const exportRes = await window.api.vaultExportEncrypted(vaultData, teamPassphrase);
      
      if (!exportRes.success || !exportRes.jsonContent) {
        throw new Error(exportRes.error || 'Mã hóa Vault thất bại.');
      }

      const config = saveConfigToSettings();
      setStatusMessage({ type: 'loading', text: 'Đang Push lên Cloud...' });
      
      const pushRes = await window.api.syncPush(config, exportRes.jsonContent);
      if (!pushRes.success) {
        throw new Error(pushRes.error || 'Push lên Cloud thất bại.');
      }

      setStatusMessage({ type: 'success', text: 'Đẩy (Push) lên Cloud thành công! Dữ liệu của bạn đã được mã hóa an toàn.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handlePull = async () => {
    setStatusMessage(null);
    if (!teamPassphrase) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập Team Passphrase để giải mã.' });
      return;
    }

    try {
      const config = saveConfigToSettings();
      setStatusMessage({ type: 'loading', text: 'Đang Pull từ Cloud...' });
      
      const pullRes = await window.api.syncPull(config);
      if (!pullRes.success || !pullRes.encryptedPayload) {
        throw new Error(pullRes.error || 'Kéo từ Cloud thất bại.');
      }

      setStatusMessage({ type: 'loading', text: 'Đang giải mã và Merge (Gộp)...' });
      
      const importRes = await window.api.vaultImportEncrypted(pullRes.encryptedPayload, teamPassphrase);
      
      if (!importRes.success || !importRes.data) {
        throw new Error(importRes.error || 'Giải mã hoặc import thất bại. Vui lòng kiểm tra lại Team Passphrase.');
      }

      // Execute Merge
      onMergeVaultData(importRes.data);
      
      setStatusMessage({ type: 'success', text: 'Pull và Merge thành công!' });
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
              <Github size={20} /> GitHub Gist
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Mở GitHub Gist, tạo mới một gist với tên file bất kỳ, sau đó copy ID trên URL.</span>
                </div>
                <div className="form-group">
                  <label>GitHub Personal Access Token (PAT)</label>
                  <input type="password" value={gistToken} onChange={e => setGistToken(e.target.value)} placeholder="ghp_..." className="input-field" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Cần quyền "gist".</span>
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
                  <label>Endpoint URL (Tuỳ chọn cho MinIO / DO Spaces)</label>
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
                  <label>File Path trên S3</label>
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
                placeholder="Mật khẩu mã hóa E2E chung cho cả team..." 
                className="input-field" 
                style={{ borderColor: 'rgba(52, 211, 153, 0.4)' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', display: 'block' }}>
                Mật khẩu này không được lưu lại, bạn phải nhập mỗi khi Push hoặc Pull. Toàn bộ thông tin kết nối và mật khẩu máy chủ sẽ được mã hóa chuẩn AES-256-GCM.
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
            Đóng
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
