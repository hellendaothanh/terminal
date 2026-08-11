import React, { useState } from 'react';
import {
  Server,
  Plus,
  Terminal,
  Folder,
  Monitor,
  Database,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Layers,
  Tag,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  KeyRound,
  Shield
} from 'lucide-react';
import { ServerConfig, Environment, Protocol, TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface SidebarProps {
  servers: ServerConfig[];
  selectedEnv: Environment | 'ALL';
  onSelectEnv: (env: Environment | 'ALL') => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  searchQuery: string;
  onConnect: (server: ServerConfig, protocol: Protocol) => void;
  onAddServer: () => void;
  onEditServer: (server: ServerConfig) => void;
  onDeleteServer: (serverId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  settings?: TerminalSettings;
  onOpenPasswords?: () => void;
  onOpenOTPs?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  servers,
  selectedEnv,
  onSelectEnv,
  selectedTag,
  onSelectTag,
  searchQuery,
  onConnect,
  onAddServer,
  onEditServer,
  onDeleteServer,
  isCollapsed = false,
  onToggleCollapse,
  settings,
  onOpenPasswords,
  onOpenOTPs
}) => {
  const { t } = useTranslation(settings);
  const [collapsedEnvs, setCollapsedEnvs] = useState<Record<string, boolean>>({});

  const toggleEnvCollapse = (envKey: string) => {
    setCollapsedEnvs((prev) => ({ ...prev, [envKey]: !prev[envKey] }));
  };

  // Filter servers by Search & Environment & Tag
  const filteredServers = servers.filter((s) => {
    const matchesSearch =
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.host.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.tags && s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesEnv = selectedEnv === 'ALL' || s.environment === selectedEnv;
    const matchesTag = selectedTag === null || (s.tags && s.tags.includes(selectedTag));

    return matchesSearch && matchesEnv && matchesTag;
  });

  // Group servers by environment
  const environments: Environment[] = ['DEV', 'STAGING', 'PRODUCTION'];
  const groupedServers: Record<string, ServerConfig[]> = {
    DEV: filteredServers.filter((s) => s.environment === 'DEV'),
    STAGING: filteredServers.filter((s) => s.environment === 'STAGING'),
    PRODUCTION: filteredServers.filter((s) => s.environment === 'PRODUCTION')
  };

  // Unique tags
  const allTags = Array.from(new Set(servers.flatMap((s) => s.tags || [])));

  // If sidebar is collapsed into a 50px mini-bar
  if (isCollapsed) {
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
        userSelect: 'none'
      }}>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: 'var(--radius-sm)'
            }}
            title={t('expandSidebar')}
          >
            <PanelLeftOpen size={20} />
          </button>
        )}

        <button
          onClick={onAddServer}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title={t('addServer')}
        >
          <Plus size={18} />
        </button>

        <div style={{ width: '30px', height: '1px', backgroundColor: 'var(--border-subtle)' }} />

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
  }

  return (
    <div style={{
      width: '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      userSelect: 'none'
    }}>
      {/* Header Section */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Server size={18} />
          </div>
          <div>
            <h1 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{t('servers')}</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredServers.length} / {servers.length} Servers</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="btn-primary"
            onClick={onAddServer}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title={t('addServer')}
          >
            <Plus size={16} />
            <span>+</span>
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px'
              }}
              title={t('collapseSidebar')}
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Environment Filters */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} />
          <span>{t('environment')}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onSelectEnv('ALL')}
            style={{
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              border: selectedEnv === 'ALL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              backgroundColor: selectedEnv === 'ALL' ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
              color: selectedEnv === 'ALL' ? 'var(--accent-primary)' : 'var(--text-muted)'
            }}
          >
            {t('allEnvs')}
          </button>
          {environments.map((env) => (
            <button
              key={env}
              onClick={() => onSelectEnv(env)}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: selectedEnv === env ? '1px solid currentColor' : '1px solid var(--border-subtle)',
                backgroundColor: selectedEnv === env ? 'var(--bg-surface)' : 'var(--bg-tertiary)',
                color: env === 'DEV' ? 'var(--env-dev)' : env === 'STAGING' ? 'var(--env-staging)' : 'var(--env-prod)'
              }}
            >
              {env}
            </button>
          ))}
        </div>
      </div>

      {/* Tags Section */}
      {allTags.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={14} />
            <span>{t('tags')}</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxHeight: '70px', overflowY: 'auto' }}>
            {selectedTag && (
              <button
                onClick={() => onSelectTag(null)}
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {t('clearTag')}
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: selectedTag === tag ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: selectedTag === tag ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                  color: selectedTag === tag ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Server Tree List Grouped by Environments */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {filteredServers.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            {t('noServersFound')}
          </div>
        ) : (
          environments.map((env) => {
            const envServers = groupedServers[env];
            if (envServers.length === 0 && selectedEnv !== 'ALL') return null;
            if (envServers.length === 0) return null;

            const isCollapsed = collapsedEnvs[env];

            return (
              <div key={env} style={{ marginBottom: '12px' }}>
                {/* Environment Group Header */}
                <div
                  onClick={() => toggleEnvCollapse(env)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: env === 'DEV' ? 'var(--env-dev)' : env === 'STAGING' ? 'var(--env-staging)' : 'var(--env-prod)',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span>{env}</span>
                  </div>
                  <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{envServers.length}</span>
                </div>

                {/* Servers under Environment */}
                {!isCollapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', paddingLeft: '8px' }}>
                    {envServers.map((server) => (
                      <div
                        key={server.id}
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                              {server.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Globe size={11} />
                              <span>{server.username}@{server.host}:{server.port}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={() => onEditServer(server)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
                              title={t('editServer')}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => onDeleteServer(server.id)}
                              style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px' }}
                              title={t('deleteServer')}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Quick Connection Action Buttons */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {server.protocol === 'DATABASE' ? (
                            <button
                              onClick={() => onConnect(server, 'DATABASE')}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                color: '#c084fc',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                              title={t('manageDb')}
                            >
                              <Database size={12} />
                              <span>{server.dbType || 'DB'}</span>
                            </button>
                          ) : server.protocol === 'RDP' ? (
                            <button
                              onClick={() => onConnect(server, 'RDP')}
                              style={{
                                flex: 1,
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                color: 'var(--accent-primary)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                              title={t('connectRdp')}
                            >
                              <Monitor size={12} />
                              <span>RDP</span>
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => onConnect(server, 'SSH')}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                  color: 'var(--accent-primary)',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title={t('connectSsh')}
                              >
                                <Terminal size={12} />
                                <span>SSH</span>
                              </button>

                              <button
                                onClick={() => onConnect(server, 'SFTP')}
                                style={{
                                  flex: 1,
                                  padding: '4px 8px',
                                  fontSize: '0.75rem',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  color: 'var(--accent-success)',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '4px'
                                }}
                                title={t('openSftp')}
                              >
                                <Folder size={12} />
                                <span>SFTP</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Security Management Section (Expanded Only) */}
      {!isCollapsed && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Shield size={14} />
            <span>Bảo Mật (Security)</span>
          </div>
          <button
            onClick={onOpenPasswords}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
          >
            <KeyRound size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Mật Khẩu (Passwords)</span>
          </button>
          
          <button
            onClick={onOpenOTPs}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
          >
            <Shield size={16} style={{ color: 'var(--accent-success)' }} />
            <span>Mã Xác Thực (OTP)</span>
          </button>
        </div>
      )}
    </div>
  );
};
