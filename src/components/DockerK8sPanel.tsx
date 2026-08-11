import React, { useState, useEffect } from 'react';
import { ServerConfig, TerminalSettings } from '../types';
import { Box, Layers, RefreshCw, Terminal, FileText, Play, Square, RotateCcw, Search, CheckCircle, AlertCircle, Server } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface DockerK8sPanelProps {
  servers: ServerConfig[];
  onOpenExecTerminal?: (server: ServerConfig, execCmd: string) => void;
  settings?: TerminalSettings;
}

interface ContainerItem {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'exited' | 'paused';
  created: string;
  ports: string;
}

interface K8sPodItem {
  name: string;
  namespace: string;
  status: 'Running' | 'Pending' | 'Failed' | 'CrashLoopBackOff';
  restarts: number;
  age: string;
  ip: string;
}

export const DockerK8sPanel: React.FC<DockerK8sPanelProps> = ({
  servers,
  onOpenExecTerminal,
  settings
}) => {
  const { t } = useTranslation(settings);
  const sshServers = servers.filter((s) => s.protocol === 'SSH');
  const [selectedServerId, setSelectedServerId] = useState<string>(sshServers[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'DOCKER' | 'K8S'>('DOCKER');
  const [loading, setLoading] = useState<boolean>(false);
  const [logsModalItem, setLogsModalItem] = useState<string | null>(null);
  const [logsContent, setLogsContent] = useState<string>('');

  const [containers, setContainers] = useState<ContainerItem[]>([
    { id: 'c102a39f', name: 'nginx-ingress-gateway', image: 'nginx:alpine', status: 'running', created: '2 days ago', ports: '80:80, 443:443' },
    { id: 'f87b2011', name: 'redis-cache-cluster', image: 'redis:7-alpine', status: 'running', created: '5 days ago', ports: '6379:6379' },
    { id: 'a912e45d', name: 'postgres-db-primary', image: 'postgres:15', status: 'running', created: '10 days ago', ports: '5432:5432' },
    { id: 'b5510c8e', name: 'payment-microservice-api', image: 'node:18-slim', status: 'exited', created: '1 hour ago', ports: '3000:3000' }
  ]);

  const [pods, setPods] = useState<K8sPodItem[]>([
    { name: 'auth-service-589f6d79b-4k2x9', namespace: 'default', status: 'Running', restarts: 0, age: '3d', ip: '10.244.1.15' },
    { name: 'payment-gateway-7c4d989f-8m1l2', namespace: 'production', status: 'Running', restarts: 1, age: '5d', ip: '10.244.2.42' },
    { name: 'background-worker-6b8c9d-9q5z1', namespace: 'default', status: 'CrashLoopBackOff', restarts: 14, age: '1d', ip: '10.244.1.88' },
    { name: 'frontend-nextjs-84b79c-3t7v4', namespace: 'production', status: 'Running', restarts: 0, age: '7d', ip: '10.244.2.19' }
  ]);

  const fetchLiveItems = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    fetchLiveItems();
  }, [selectedServerId, activeTab]);

  const handleOpenLogs = (name: string) => {
    setLogsModalItem(name);
    setLogsContent(
      `[${new Date().toISOString()}] INFO: Application initialized successfully.\n` +
      `[${new Date().toISOString()}] INFO: Listening on port 8080...\n` +
      `[${new Date().toISOString()}] DEBUG: Database connection pool established.\n` +
      `[${new Date().toISOString()}] WARN: Memory consumption reached 68% thresholds.\n` +
      `[${new Date().toISOString()}] INFO: Processing incoming GET /api/v1/healthcheck HTTP/1.1 200 OK`
    );
  };

  const handleExec = (name: string, isK8s: boolean) => {
    const srv = sshServers.find((s) => s.id === selectedServerId);
    if (srv && onOpenExecTerminal) {
      const execCmd = isK8s ? `kubectl exec -it ${name} -- /bin/sh` : `docker exec -it ${name} /bin/sh`;
      onOpenExecTerminal(srv, execCmd);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)', padding: '20px', overflowY: 'auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Box size={22} style={{ color: 'var(--env-dev)' }} />
            <span>{t('dkTitle')}</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t('dkDesc')}
          </p>
        </div>

        {/* Server Selector & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select
            className="input-field"
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            style={{ width: '260px', height: '36px', fontSize: '0.82rem' }}
          >
            {sshServers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.username}@{s.host})
              </option>
            ))}
          </select>

          <button className="btn-secondary" onClick={fetchLiveItems} disabled={loading} style={{ height: '36px' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>{t('dkRefreshBtn')}</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('DOCKER')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'DOCKER' ? 'var(--accent-primary)' : 'var(--bg-secondary)',
            color: activeTab === 'DOCKER' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Box size={16} />
          <span>{t('dkContainersTab')} ({containers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('K8S')}
          style={{
            padding: '8px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            backgroundColor: activeTab === 'K8S' ? '#c084fc' : 'var(--bg-secondary)',
            color: activeTab === 'K8S' ? '#fff' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Layers size={16} />
          <span>{t('dkPodsTab')} ({pods.length})</span>
        </button>
      </div>

      {/* Content Table View */}
      {activeTab === 'DOCKER' ? (
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 16px' }}>CONTAINER ID / NAME</th>
                <th style={{ padding: '10px 16px' }}>IMAGE</th>
                <th style={{ padding: '10px 16px' }}>STATUS</th>
                <th style={{ padding: '10px 16px' }}>PORTS</th>
                <th style={{ padding: '10px 16px' }}>CREATED</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }}>{t('dkActionsHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                    <div style={{ color: 'var(--accent-primary)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{c.id}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{c.image}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: c.status === 'running' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: c.status === 'running' ? 'var(--accent-success)' : 'var(--accent-danger)',
                        border: '1px solid currentColor'
                      }}
                    >
                      ● {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{c.ports}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{c.created}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleExec(c.name, false)}
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title={t('dkExecShellTitle')}
                      >
                        <Terminal size={12} /> Exec Shell
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleOpenLogs(c.name)}
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title={t('dkLogsTitle')}
                      >
                        <FileText size={12} /> Logs
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* K8s Pods Table View */
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 16px' }}>POD NAME</th>
                <th style={{ padding: '10px 16px' }}>NAMESPACE</th>
                <th style={{ padding: '10px 16px' }}>STATUS</th>
                <th style={{ padding: '10px 16px' }}>POD IP</th>
                <th style={{ padding: '10px 16px' }}>RESTARTS</th>
                <th style={{ padding: '10px 16px' }}>AGE</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }}>{t('dkActionsHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {pods.map((p) => (
                <tr key={p.name} style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-main)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#c084fc', fontFamily: 'monospace' }}>{p.name}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem' }}>{p.namespace}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: p.status === 'Running' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: p.status === 'Running' ? 'var(--accent-success)' : 'var(--accent-danger)',
                        border: '1px solid currentColor'
                      }}
                    >
                      ● {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{p.ip}</td>
                  <td style={{ padding: '12px 16px' }}>{p.restarts}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{p.age}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleExec(p.name, true)}
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title={t('dkKubectlExecTitle')}
                      >
                        <Terminal size={12} /> kubectl exec
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleOpenLogs(p.name)}
                        style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <FileText size={12} /> Logs
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Logs Viewer Modal */}
      {logsModalItem && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '700px', backgroundColor: 'var(--bg-secondary)' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Real-time Logs: {logsModalItem}</h3>
              </div>
              <button onClick={() => setLogsModalItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <textarea
                readOnly
                value={logsContent}
                style={{
                  width: '100%',
                  height: '300px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: '#a7f3d0',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  padding: '12px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
