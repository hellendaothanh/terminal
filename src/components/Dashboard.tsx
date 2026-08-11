import React from 'react';
import { ServerConfig, Protocol, TerminalSettings } from '../types';
import { Server, Terminal, FolderOpen, Monitor, Plus, ShieldCheck, Tag, Layers, Globe, Edit2, Trash2, Rocket, FileText, Database, Copy } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface DashboardProps {
  servers: ServerConfig[];
  onConnect: (server: ServerConfig, protocol: Protocol) => void;
  onAddServer: () => void;
  onEditServer: (server: ServerConfig) => void;
  onDeleteServer?: (serverId: string) => void;
  onCloneServer?: (server: ServerConfig) => void;
  settings?: TerminalSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({
  servers,
  onConnect,
  onAddServer,
  onEditServer,
  onDeleteServer,
  onCloneServer,
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
      padding: '40px',
      overflowY: 'auto'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header & Quick Action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              {t('welcomeDashboard')}
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              {t('dashboardSubtitle')}
            </p>
          </div>

          <button className="btn-primary" onClick={onAddServer} style={{ height: '40px', padding: '0 20px', borderRadius: '8px' }}>
            <Plus size={18} />
            <span>{t('addServer')}</span>
          </button>
        </div>

        {/* Overview Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
          <div className="hover-glow" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all var(--transition-fast)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Server size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)' }}>{servers.length}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('totalServers')}</div>
            </div>
          </div>

          <div className="hover-glow" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all var(--transition-fast)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: 'var(--env-dev)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--env-dev)' }}>{devCount}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DEV</div>
            </div>
          </div>

          <div className="hover-glow" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all var(--transition-fast)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(234, 179, 8, 0.15)',
              color: 'var(--env-staging)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--env-staging)' }}>{stagingCount}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STAGING</div>
            </div>
          </div>

          <div className="hover-glow" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            transition: 'all var(--transition-fast)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--env-prod)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--env-prod)' }}>{prodCount}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PRODUCTION</div>
            </div>
          </div>
        </div>

        {/* Servers List Grid */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '20px' }}>
          {t('servers')} ({servers.length})
        </h3>

        {servers.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <Rocket size={40} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '10px', fontWeight: 600 }}>Get Started with OmniTerminal</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', maxWidth: '400px', lineHeight: 1.5 }}>
              Your workspace is currently empty. Add your first server to start managing your infrastructure, databases, and deployments.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" onClick={onAddServer} style={{ height: '40px', padding: '0 24px', borderRadius: '8px' }}>
                <Plus size={16} />
                <span>{t('addServer')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {servers.map((server) => (
              <div
                key={server.id}
                className="hover-glow"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {server.name}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-tertiary)',
                      color: server.environment === 'DEV' ? 'var(--env-dev)' : server.environment === 'STAGING' ? 'var(--env-staging)' : 'var(--env-prod)',
                      border: '1px solid currentColor'
                    }}>
                      {server.environment}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Globe size={14} style={{ color: 'var(--text-dim)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{server.username}@{server.host}:{server.port}</span>
                  </div>

                  {server.tags && server.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {server.tags.map((tag) => (
                        <span key={tag} style={{ fontSize: '0.75rem', color: 'var(--text-dim)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <button
                    onClick={() => onConnect(server, server.protocol || 'SSH')}
                    className="btn-primary"
                    style={{ flex: 1, height: '34px', fontSize: '0.8rem', justifyContent: 'center', borderRadius: '6px' }}
                  >
                    <Terminal size={14} />
                    <span>Connect</span>
                  </button>
                  <button
                    onClick={() => onEditServer(server)}
                    className="btn-secondary"
                    style={{ height: '34px', width: '34px', padding: 0, justifyContent: 'center', borderRadius: '6px' }}
                    title={t('editServer')}
                  >
                    <Edit2 size={14} />
                  </button>
                  {onCloneServer && (
                    <button
                      onClick={() => onCloneServer(server)}
                      className="btn-secondary"
                      style={{ height: '34px', width: '34px', padding: 0, justifyContent: 'center', borderRadius: '6px' }}
                      title="Clone Server"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  {onDeleteServer && (
                    <button
                      onClick={() => onDeleteServer(server.id)}
                      className="btn-secondary"
                      style={{ height: '34px', width: '34px', padding: 0, justifyContent: 'center', borderRadius: '6px', color: 'var(--accent-danger)' }}
                      title={t('deleteServer')}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
