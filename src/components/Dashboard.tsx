import React from 'react';
import { ServerConfig, Protocol, TerminalSettings } from '../types';
import { Server, Terminal, FolderOpen, Monitor, Plus, ShieldCheck, Tag, Layers, Globe, Edit2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface DashboardProps {
  servers: ServerConfig[];
  onConnect: (server: ServerConfig, protocol: Protocol) => void;
  onAddServer: () => void;
  onEditServer: (server: ServerConfig) => void;
  settings?: TerminalSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({
  servers,
  onConnect,
  onAddServer,
  onEditServer,
  settings
}) => {
  const { t } = useTranslation(settings);
  const devCount = servers.filter((s) => s.environment === 'DEV').length;
  const stagingCount = servers.filter((s) => s.environment === 'STAGING').length;
  const prodCount = servers.filter((s) => s.environment === 'PRODUCTION').length;

  return (
    <div style={{
      flex: 1,
      height: '100%',
      backgroundColor: 'var(--bg-primary)',
      padding: '24px',
      overflowY: 'auto'
    }}>
      {/* Header & Quick Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
            {t('welcomeDashboard')}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t('dashboardSubtitle')}
          </p>
        </div>

        <button className="btn-primary" onClick={onAddServer}>
          <Plus size={16} />
          <span>{t('addServer')}</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Server size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>{servers.length}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('totalServers')}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            color: 'var(--env-dev)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--env-dev)' }}>{devCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>DEV</div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(234, 179, 8, 0.15)',
            color: 'var(--env-staging)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--env-staging)' }}>{stagingCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>STAGING</div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--env-prod)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--env-prod)' }}>{prodCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PRODUCTION</div>
          </div>
        </div>
      </div>

      {/* Servers List Grid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>
        {t('servers')} ({servers.length})
      </h3>

      {servers.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px border-dashed var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <Server size={40} style={{ color: 'var(--text-dim)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
            {t('noServersFound')}
          </p>
          <button className="btn-primary" onClick={onAddServer}>
            <Plus size={16} />
            <span>{t('addServer')}</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {servers.map((server) => (
            <div
              key={server.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {server.name}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-tertiary)',
                    color: server.environment === 'DEV' ? 'var(--env-dev)' : server.environment === 'STAGING' ? 'var(--env-staging)' : 'var(--env-prod)',
                    border: '1px solid currentColor'
                  }}>
                    {server.environment}
                  </span>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Globe size={13} />
                  <span>{server.username}@{server.host}:{server.port}</span>
                </div>

                {server.tags && server.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {server.tags.map((tag) => (
                      <span key={tag} style={{ fontSize: '0.7rem', color: 'var(--text-dim)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                <button
                  onClick={() => onConnect(server, server.protocol || 'SSH')}
                  className="btn-primary"
                  style={{ flex: 1, height: '32px', fontSize: '0.78rem', justifyContent: 'center' }}
                >
                  <Terminal size={14} />
                  <span>Connect</span>
                </button>
                <button
                  onClick={() => onEditServer(server)}
                  className="btn-secondary"
                  style={{ height: '32px', width: '32px', padding: 0, justifyContent: 'center' }}
                  title={t('editServer')}
                >
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
