import React from 'react';
import { ChevronRight, ChevronDown, Globe, Edit2, Trash2, Database, Monitor, Terminal, Folder, Copy, Cloud } from 'lucide-react';
import { ServerConfig, Environment, Protocol } from '../../types';

interface ServerListSectionProps {
  filteredServers: ServerConfig[];
  environments: Environment[];
  groupedServers: Record<string, ServerConfig[]>;
  selectedEnv: string;
  collapsedEnvs: Record<string, boolean>;
  toggleEnvCollapse: (env: string) => void;
  onConnect: (server: ServerConfig, protocol: Protocol) => void;
  onEditServer: (server: ServerConfig) => void;
  onDeleteServer: (id: string) => void;
  onCloneServer?: (server: ServerConfig) => void;
  t: (key: any) => string;
}

export const ServerListSection: React.FC<ServerListSectionProps> = ({
  filteredServers,
  environments,
  groupedServers,
  selectedEnv,
  collapsedEnvs,
  toggleEnvCollapse,
  onConnect,
  onEditServer,
  onDeleteServer,
  onCloneServer,
  t
}) => {
  return (
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
                          {onCloneServer && (
                            <button
                              onClick={() => onCloneServer(server)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
                              title="Clone Server"
                            >
                              <Copy size={13} />
                            </button>
                          )}
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
                        ) : server.protocol === 'S3' ? (
                          <button
                            onClick={() => onConnect(server, 'S3')}
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              backgroundColor: 'rgba(234, 179, 8, 0.15)',
                              color: 'var(--accent-warning)',
                              border: '1px solid rgba(234, 179, 8, 0.3)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                            title={t('connectS3')}
                          >
                            <Cloud size={12} />
                            <span>S3</span>
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
  );
};
