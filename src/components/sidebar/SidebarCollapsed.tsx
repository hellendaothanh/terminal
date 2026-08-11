import React from 'react';
import { Environment } from '../../types';

interface SidebarCollapsedProps {
  selectedEnv: string;
  onSelectEnv: (env: Environment | 'ALL') => void;
  environments: Environment[];
  t: (key: any) => string;
}

export const SidebarCollapsed: React.FC<SidebarCollapsedProps> = ({
  selectedEnv,
  onSelectEnv,
  environments,
  t
}) => {
  return (
    <div style={{
      width: '50px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '12px',
      gap: '12px',
      userSelect: 'none',
      height: '100%'
    }}>
      {/* Mini Env Badges */}
      <button
        onClick={() => onSelectEnv('ALL')}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          fontSize: '0.65rem',
          fontWeight: 700,
          border: selectedEnv === 'ALL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
          backgroundColor: selectedEnv === 'ALL' ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
          color: selectedEnv === 'ALL' ? 'var(--accent-primary)' : 'var(--text-muted)',
          cursor: 'pointer'
        }}
        title={t('allEnvs')}
      >
        ALL
      </button>

      {environments.map((env) => (
        <button
          key={env}
          onClick={() => onSelectEnv(env)}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            fontSize: '0.65rem',
            fontWeight: 700,
            border: selectedEnv === env ? '1px solid currentColor' : '1px solid var(--border-subtle)',
            backgroundColor: selectedEnv === env ? 'var(--bg-surface)' : 'var(--bg-tertiary)',
            color: env === 'DEV' ? 'var(--env-dev)' : env === 'STAGING' ? 'var(--env-staging)' : 'var(--env-prod)',
            cursor: 'pointer'
          }}
          title={env}
        >
          {env.substring(0, 3)}
        </button>
      ))}
    </div>
  );
};
