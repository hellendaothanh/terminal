import React from 'react';
import { ServerConfig, Protocol } from '../types';
import { Server, Terminal, FolderOpen, Monitor, Plus, ShieldCheck, Tag, Layers, Globe, Edit2 } from 'lucide-react';

interface DashboardProps {
  servers: ServerConfig[];
  onConnect: (server: ServerConfig, protocol: Protocol) => void;
  onAddServer: () => void;
  onEditServer: (server: ServerConfig) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  servers,
  onConnect,
  onAddServer,
  onEditServer
}) => {
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
            Bảng Điều Khiển Hạ Tầng Server
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Quản trị tập trung các kết nối SSH, SFTP/SCP và Remote Desktop (RDP) đa nền tảng.
          </p>
        </div>

        <button className="btn-primary" onClick={onAddServer}>
          <Plus size={16} />
          <span>Thêm Máy Chủ Mới</span>
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
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Tổng Số Server</div>
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
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Môi Trường DEV</div>
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
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--env-staging)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--env-staging)' }}>{stagingCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Môi Trường STAGING</div>
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
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--env-prod)' }}>{prodCount}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Môi Trường PRODUCTION</div>
          </div>
        </div>
      </div>

      {/* Quick Connect Server Grid */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px' }}>
        Kết Nối Nhanh (Quick Connection Center)
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
          <h4 style={{ color: 'var(--text-main)', marginBottom: '6px' }}>Chưa Có Máy Chủ Nào Trong Kho Dữ Liệu</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Bắt đầu bằng cách thêm thông tin máy chủ SSH hoặc RDP mới.
          </p>
          <button className="btn-primary" onClick={onAddServer}>Thêm Máy Chủ Mới</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {servers.map((s) => (
            <div
              key={s.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>{s.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge badge-${s.environment.toLowerCase()}`}>{s.environment}</span>
                    <button
                      onClick={() => onEditServer(s)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Chỉnh sửa thông tin máy chủ"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                  <Globe size={14} />
                  <span>{s.username}@{s.host}:{s.port}</span>
                </div>

                {s.tags && s.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {s.tags.map((t) => (
                      <span key={t} className="tag-pill">#{t}</span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                {s.protocol === 'RDP' ? (
                  <button
                    onClick={() => onConnect(s, 'RDP')}
                    className="btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Monitor size={15} />
                    <span>Mở RDP</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onConnect(s, 'SSH')}
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', backgroundColor: 'var(--env-dev)' }}
                    >
                      <Terminal size={15} />
                      <span>Mở SSH</span>
                    </button>
                    <button
                      onClick={() => onConnect(s, 'SFTP')}
                      className="btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <FolderOpen size={15} />
                      <span>Mở SFTP</span>
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
};
