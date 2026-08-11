import React from 'react';
import {
  Shield,
  ChevronDown,
  ChevronRight,
  KeyRound,
  ShieldAlert,
  Database,
  Network,
  Code2,
  Box,
  Cloud
} from 'lucide-react';

interface SecurityToolsSectionProps {
  isSecurityExpanded: boolean;
  setIsSecurityExpanded: (expanded: boolean) => void;
  onOpenPasswords?: () => void;
  onOpenOTPs?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenErdDiff?: () => void;
  onOpenVisualQueryBuilder?: () => void;
  onOpenDataPump?: () => void;
  onOpenTunnels?: () => void;
  onOpenMultiExec?: () => void;
  onOpenDockerK8s?: () => void;
  onOpenCloudExplorer?: () => void;
  t: (key: any) => string;
}

export const SecurityToolsSection: React.FC<SecurityToolsSectionProps> = ({
  isSecurityExpanded,
  setIsSecurityExpanded,
  onOpenPasswords,
  onOpenOTPs,
  onOpenAuditLogs,
  onOpenErdDiff,
  onOpenVisualQueryBuilder,
  onOpenDataPump,
  onOpenTunnels,
  onOpenMultiExec,
  onOpenDockerK8s,
  onOpenCloudExplorer,
  t
}) => {
  return (
    <div style={{
      marginTop: 'auto',
      borderTop: '1px solid var(--border-subtle)',
      padding: '12px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxHeight: '400px',
      overflowY: 'auto'
    }}>
      <div
        onClick={() => setIsSecurityExpanded(!isSecurityExpanded)}
        style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          color: 'var(--text-dim)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '6px',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={14} />
          <span>{t('securitySection')}</span>
        </div>
        {isSecurityExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </div>

      {isSecurityExpanded && (
        <>
          {/* Group 1: Security & Access */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: '4px', letterSpacing: '0.05em' }}>
              {t('secSecurityGroup')}
            </div>
            <button
              onClick={onOpenPasswords}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <KeyRound size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('passwords')}</span>
            </button>
            <button
              onClick={onOpenOTPs}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Shield size={14} style={{ color: 'var(--accent-success)' }} />
              <span>{t('otpAuth')}</span>
            </button>
            <button
              onClick={onOpenAuditLogs}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <ShieldAlert size={14} style={{ color: 'var(--accent-danger)' }} />
              <span>{t('auditLogs')}</span>
            </button>
          </div>

          {/* Group 2: Database Management */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: '4px', letterSpacing: '0.05em' }}>
              {t('secDatabaseGroup')}
            </div>
            <button
              onClick={onOpenErdDiff}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Database size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('erdDiff')}</span>
            </button>
            <button
              onClick={onOpenVisualQueryBuilder}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Database size={14} style={{ color: '#c084fc' }} />
              <span>{t('visualQueryBuilder')}</span>
            </button>
            <button
              onClick={onOpenDataPump}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Database size={14} style={{ color: 'var(--env-dev)' }} />
              <span>{t('dataPump')}</span>
            </button>
          </div>

          {/* Group 3: Infrastructure & DevOps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, paddingLeft: '4px', letterSpacing: '0.05em' }}>
              {t('secInfrastructureGroup')}
            </div>
            <button
              onClick={onOpenTunnels}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Network size={14} style={{ color: '#c084fc' }} />
              <span>{t('sshTunnels')}</span>
            </button>
            <button
              onClick={onOpenMultiExec}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Code2 size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('multiExec')}</span>
            </button>
            <button
              onClick={onOpenDockerK8s}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Box size={14} style={{ color: 'var(--env-dev)' }} />
              <span>{t('dockerK8s')}</span>
            </button>
            <button
              onClick={onOpenCloudExplorer}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
            >
              <Cloud size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{t('cloudExplorer')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
