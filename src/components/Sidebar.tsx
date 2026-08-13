import React, { useState } from 'react';
import { 
  Server, Layers, Tag, Shield, Database, TerminalSquare, 
  Key, FileKey2, FileClock, Network, SplitSquareHorizontal, 
  DatabaseBackup, Activity, Cloud, LayoutGrid, Table2, Blocks, Container
} from 'lucide-react';
import { ServerConfig, Environment, Protocol, TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { ServerListSection } from './sidebar/ServerListSection';

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
  onCloneServer?: (server: ServerConfig) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  settings?: TerminalSettings;
  onOpenPasswords?: () => void;
  onOpenOTPs?: () => void;
  onOpenTunnels?: () => void;
  onOpenMultiExec?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenErdDiff?: () => void;
  onOpenVisualQueryBuilder?: () => void;
  onOpenDataPump?: () => void;
  onOpenDockerK8s?: () => void;
  onOpenCloudExplorer?: () => void;
  onOpenLogAggregator?: () => void;
  onOpenTeamSync?: () => void;
  onOpenPluginManager?: () => void;
  onOpenCustomConnector?: () => void;
  onOpenDiagnostics?: () => void;
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
  onCloneServer,
  isCollapsed = false,
  onToggleCollapse,
  settings,
  onOpenPasswords,
  onOpenOTPs,
  onOpenTunnels,
  onOpenMultiExec,
  onOpenAuditLogs,
  onOpenErdDiff,
  onOpenVisualQueryBuilder,
  onOpenDataPump,
  onOpenDockerK8s,
  onOpenCloudExplorer,
  onOpenLogAggregator,
  onOpenTeamSync,
  onOpenPluginManager,
  onOpenCustomConnector,
  onOpenDiagnostics
}) => {
  const { t } = useTranslation(settings);
  const [activePane, setActivePane] = useState<'SERVERS' | 'SECURITY' | 'DATABASES' | 'DEVOPS'>('SERVERS');
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

  const ActivityIcon = ({ id, icon: Icon, tooltip }: { id: any, icon: any, tooltip: string }) => (
    <div 
      className={`activity-icon ${activePane === id ? 'activity-icon-active' : ''}`}
      onClick={() => {
        setActivePane(id);
        if (isCollapsed && onToggleCollapse) onToggleCollapse(); // Expand if collapsed
      }}
      style={{
        width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        marginBottom: '4px'
      }}
      title={tooltip}
    >
      <Icon size={22} strokeWidth={1.5} />
    </div>
  );

  const ToolButton = ({ icon: Icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px 16px',
        backgroundColor: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer',
        fontSize: '0.85rem', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)',
        transition: 'background-color var(--transition-fast)'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      <Icon size={18} style={{ color: 'var(--accent-primary)' }} />
      <span>{label}</span>
    </button>
  );

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-primary)', userSelect: 'none' }}>
      
      {/* 1. Activity Rail (Leftmost) */}
      <div style={{ 
        width: '54px', 
        borderRight: '1px solid var(--border-subtle)', 
        backgroundColor: 'var(--bg-secondary)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        paddingTop: '12px',
        zIndex: 10
      }}>
        <ActivityIcon id="SERVERS" icon={Server} tooltip={t('servers')} />
        <ActivityIcon id="SECURITY" icon={Shield} tooltip="Security & Identity" />
        <ActivityIcon id="DATABASES" icon={Database} tooltip="Databases & Data" />
        <ActivityIcon id="DEVOPS" icon={TerminalSquare} tooltip="DevOps & Cloud" />
      </div>

      {/* 2. Secondary Panel (Collapsible) */}
      {!isCollapsed && (
        <div style={{ 
          width: '260px', 
          backgroundColor: 'var(--bg-tertiary)', 
          borderRight: '1px solid var(--border-subtle)', 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%'
        }}>
          
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
              {activePane === 'SERVERS' ? t('servers') : activePane === 'SECURITY' ? 'Security & Identity' : activePane === 'DATABASES' ? 'Databases' : 'DevOps & Tools'}
            </h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {activePane === 'SERVERS' && (
              <>
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
                        backgroundColor: selectedEnv === 'ALL' ? 'var(--accent-glow)' : 'var(--bg-secondary)',
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
                          backgroundColor: selectedEnv === env ? 'var(--bg-surface)' : 'var(--bg-secondary)',
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
                            backgroundColor: selectedTag === tag ? 'var(--accent-glow)' : 'var(--bg-secondary)',
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
                <ServerListSection
                  filteredServers={filteredServers}
                  environments={environments}
                  groupedServers={groupedServers}
                  selectedEnv={selectedEnv}
                  collapsedEnvs={collapsedEnvs}
                  toggleEnvCollapse={toggleEnvCollapse}
                  onConnect={onConnect}
                  onEditServer={onEditServer}
                  onDeleteServer={onDeleteServer}
                  onCloneServer={onCloneServer}
                  t={t}
                />
              </>
            )}

            {activePane === 'SECURITY' && (
              <div>
                <ToolButton icon={Key} label={t('passwords') || 'Password Manager'} onClick={onOpenPasswords} />
                <ToolButton icon={FileKey2} label={t('otpAuth') || '2FA (OTP) Manager'} onClick={onOpenOTPs} />
                <ToolButton icon={FileClock} label={t('auditLogs') || 'Session Audit Logs'} onClick={onOpenAuditLogs} />
                <ToolButton icon={Activity} label={t('teamSync') || 'Team Sync'} onClick={onOpenTeamSync} />
                <ToolButton icon={Table2} label={t('erdDiff') || 'ERD & Schema Diff'} onClick={onOpenErdDiff} />
                <ToolButton icon={Activity} label={t('dataPump') || 'Data Pump'} onClick={onOpenDataPump} />
                <ToolButton icon={Blocks} label="Custom Connectors (Plugins)" onClick={onOpenCustomConnector} />
              </div>
            )}

            {activePane === 'DATABASES' && (
              <div>
                <ToolButton icon={SplitSquareHorizontal} label={t('erdDiff') || 'ERD & Schema Diff'} onClick={onOpenErdDiff} />
                <ToolButton icon={LayoutGrid} label={t('visualQueryBuilder') || 'Visual Query Builder'} onClick={onOpenVisualQueryBuilder} />
                <ToolButton icon={TerminalSquare} label={t('multiExec') || 'Multi-Exec & Snippets'} onClick={onOpenMultiExec} />
                <ToolButton icon={DatabaseBackup} label={t('dataPump') || 'Data Pump Stream'} onClick={onOpenDataPump} />
              </div>
            )}

            {activePane === 'DEVOPS' && (
              <div>
                <ToolButton icon={Container} label={t('dockerK8s') || 'Docker & K8s Explorer'} onClick={onOpenDockerK8s} />
                <ToolButton icon={Cloud} label={t('cloudExplorer') || 'S3 Cloud Explorer'} onClick={onOpenCloudExplorer} />
                <ToolButton icon={Network} label={t('sshTunnels') || 'SSH Tunnels & Forwarding'} onClick={onOpenTunnels} />
                <ToolButton icon={TerminalSquare} label={t('multiExec') || 'Batch Exec (Multi-Exec)'} onClick={onOpenMultiExec} />
                <ToolButton icon={Activity} label={t('netDiagnostics') || 'Network Diagnostics'} onClick={onOpenDiagnostics} />
                <ToolButton icon={Activity} label={t('multiLogTail') || 'Multi-Log Tail'} onClick={onOpenLogAggregator} />
                <ToolButton icon={Blocks} label={t('pluginManager') || 'Plugin Manager'} onClick={onOpenPluginManager} />
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
