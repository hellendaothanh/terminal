import React from 'react';
import { PlusCircle } from 'lucide-react';

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999
};

interface ModalShellProps {
  width: number;
  children: React.ReactNode;
}

const ModalShell: React.FC<ModalShellProps> = ({ width, children }) => (
  <div style={overlayStyle}>
    <div style={{
      backgroundColor: 'var(--bg-secondary)',
      border: '1px solid var(--border-focus)',
      borderRadius: 'var(--radius-md)',
      padding: '24px',
      width: `${width}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: 'var(--shadow-lg)'
    }}>
      {children}
    </div>
  </div>
);

const labelStyle: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--text-muted)' };
const inputStyle: React.CSSProperties = { width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' };
const cancelButtonStyle: React.CSSProperties = { height: '32px', fontSize: '0.75rem' };
const confirmButtonStyle: React.CSSProperties = { height: '32px', fontSize: '0.75rem', backgroundColor: '#c084fc', borderColor: '#c084fc' };

/* -------------------------- Install Helm Modal ------------------------- */

interface HelmInstallModalProps {
  isOpen: boolean;
  language?: 'vi' | 'en';
  releaseName: string;
  onReleaseNameChange: (value: string) => void;
  chartName: string;
  onChartNameChange: (value: string) => void;
  version: string;
  onVersionChange: (value: string) => void;
  values: string;
  onValuesChange: (value: string) => void;
  onCancel: () => void;
  onInstall: () => void;
}

export const HelmInstallModal: React.FC<HelmInstallModalProps> = ({
  isOpen,
  language,
  releaseName,
  onReleaseNameChange,
  chartName,
  onChartNameChange,
  version,
  onVersionChange,
  values,
  onValuesChange,
  onCancel,
  onInstall
}) => {
  if (!isOpen) return null;
  const isVi = language === 'vi';

  return (
    <ModalShell width={450}>
      <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <PlusCircle style={{ color: '#c084fc' }} size={20} />
        {isVi ? 'Cài đặt Helm Chart' : 'Install Helm Chart'}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Release Name *</label>
          <input
            type="text"
            className="input-field"
            value={releaseName}
            onChange={(e) => onReleaseNameChange(e.target.value)}
            placeholder="e.g. my-nginx"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Chart Reference *</label>
          <input
            type="text"
            className="input-field"
            value={chartName}
            onChange={(e) => onChartNameChange(e.target.value)}
            placeholder="e.g. bitnami/nginx"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Chart Version</label>
          <input
            type="text"
            className="input-field"
            value={version}
            onChange={(e) => onVersionChange(e.target.value)}
            placeholder="e.g. 15.1.2"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Values (YAML)</label>
          <textarea
            className="input-field"
            rows={4}
            value={values}
            onChange={(e) => onValuesChange(e.target.value)}
            style={{ width: '100%', fontSize: '0.78rem', marginTop: '4px', fontFamily: 'monospace', resize: 'vertical' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
        <button className="btn-secondary" onClick={onCancel} style={cancelButtonStyle}>
          {isVi ? 'Hủy' : 'Cancel'}
        </button>
        <button className="btn-primary" onClick={onInstall} disabled={!releaseName} style={confirmButtonStyle}>
          {isVi ? 'Cài Đặt' : 'Install'}
        </button>
      </div>
    </ModalShell>
  );
};

/* -------------------------- Upgrade Helm Modal ------------------------- */

interface HelmUpgradeModalProps {
  isOpen: boolean;
  language?: 'vi' | 'en';
  targetName?: string;
  version: string;
  onVersionChange: (value: string) => void;
  onCancel: () => void;
  onUpgrade: () => void;
}

export const HelmUpgradeModal: React.FC<HelmUpgradeModalProps> = ({
  isOpen,
  language,
  targetName,
  version,
  onVersionChange,
  onCancel,
  onUpgrade
}) => {
  if (!isOpen) return null;
  const isVi = language === 'vi';

  return (
    <ModalShell width={400}>
      <h3 style={{ margin: 0, color: 'var(--text-main)' }}>
        🚀 {isVi ? `Nâng cấp: ${targetName}` : `Upgrade: ${targetName}`}
      </h3>

      <div>
        <label style={labelStyle}>Target Chart Version *</label>
        <input
          type="text"
          className="input-field"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
          placeholder="e.g. 15.2.0"
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn-secondary" onClick={onCancel} style={cancelButtonStyle}>
          {isVi ? 'Hủy' : 'Cancel'}
        </button>
        <button className="btn-primary" onClick={onUpgrade} disabled={!version} style={confirmButtonStyle}>
          {isVi ? 'Nâng Cấp' : 'Upgrade'}
        </button>
      </div>
    </ModalShell>
  );
};

/* -------------------------- Rollback Helm Modal ------------------------ */

interface HelmRollbackModalProps {
  isOpen: boolean;
  language?: 'vi' | 'en';
  targetName?: string;
  revision: string;
  onRevisionChange: (value: string) => void;
  onCancel: () => void;
  onRollback: () => void;
}

export const HelmRollbackModal: React.FC<HelmRollbackModalProps> = ({
  isOpen,
  language,
  targetName,
  revision,
  onRevisionChange,
  onCancel,
  onRollback
}) => {
  if (!isOpen) return null;
  const isVi = language === 'vi';

  return (
    <ModalShell width={400}>
      <h3 style={{ margin: 0, color: 'var(--text-main)' }}>
        ⏮ {isVi ? `Rollback: ${targetName}` : `Rollback: ${targetName}`}
      </h3>

      <div>
        <label style={labelStyle}>Target Revision *</label>
        <select
          className="input-field"
          value={revision}
          onChange={(e) => onRevisionChange(e.target.value)}
          style={inputStyle}
        >
          <option value="1">Revision 1</option>
          <option value="2">Revision 2</option>
          <option value="3">Revision 3</option>
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button className="btn-secondary" onClick={onCancel} style={cancelButtonStyle}>
          {isVi ? 'Hủy' : 'Cancel'}
        </button>
        <button className="btn-primary" onClick={onRollback} style={confirmButtonStyle}>
          {isVi ? 'Rollback' : 'Rollback'}
        </button>
      </div>
    </ModalShell>
  );
};
