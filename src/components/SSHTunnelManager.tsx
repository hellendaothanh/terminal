import React, { useState, useEffect } from 'react';
import { SSHTunnelConfig, ServerConfig, SSHKey, TunnelTrafficStats } from '../types';
import { Plus, Search, Edit2, Trash2, Network, Play, Square, Activity, ArrowRight, Server, Laptop, Globe, RefreshCw, Zap } from 'lucide-react';

import { TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface SSHTunnelManagerProps {
  tunnels: SSHTunnelConfig[];
  servers: ServerConfig[];
  keys: SSHKey[];
  onSaveTunnel: (tunnel: SSHTunnelConfig) => void;
  onDeleteTunnel: (id: string) => void;
  settings?: TerminalSettings;
}

export const SSHTunnelManager: React.FC<SSHTunnelManagerProps> = ({
  tunnels,
  servers,
  keys,
  onSaveTunnel,
  onDeleteTunnel,
  settings
}) => {
  const { t } = useTranslation(settings);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SSHTunnelConfig>>({
    mode: 'LOCAL',
    localHost: '127.0.0.1',
    localPort: 8080,
    dstHost: '127.0.0.1',
    dstPort: 80
  });

  const [stats, setStats] = useState<Record<string, TunnelTrafficStats>>({});
  const [selectedTunnelId, setSelectedTunnelId] = useState<string | null>(null);

  // Poll traffic stats every second
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await window.api.tunnelGetStats();
        setStats(res || {});
      } catch (e) {
        console.error('Error fetching tunnel stats:', e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredTunnels = tunnels.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.localPort.toString().includes(searchQuery) ||
      (t.dstHost && t.dstHost.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenModal = (tunnel?: SSHTunnelConfig) => {
    if (tunnel) {
      setFormData(tunnel);
      setEditingId(tunnel.id);
    } else {
      setFormData({
        name: '',
        serverId: servers[0]?.id || '',
        mode: 'LOCAL',
        localHost: '127.0.0.1',
        localPort: 8080,
        dstHost: '127.0.0.1',
        dstPort: 80
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.serverId || !formData.localPort) {
      alert('Vui lòng nhập đầy đủ Tên đường hầm, Máy chủ và Cổng local.');
      return;
    }

    const entry: SSHTunnelConfig = {
      id: editingId || crypto.randomUUID(),
      name: formData.name,
      serverId: formData.serverId,
      mode: formData.mode || 'LOCAL',
      localHost: formData.localHost || '127.0.0.1',
      localPort: Number(formData.localPort),
      dstHost: formData.dstHost,
      dstPort: formData.dstPort ? Number(formData.dstPort) : undefined,
      createdAt: formData.createdAt || Date.now()
    };

    onSaveTunnel(entry);
    setIsModalOpen(false);
  };

  const handleToggleTunnel = async (tunnel: SSHTunnelConfig) => {
    const currentStat = stats[tunnel.id];
    const isRunning = currentStat && (currentStat.status === 'ACTIVE' || currentStat.status === 'CONNECTING');

    if (isRunning) {
      await window.api.tunnelStop(tunnel.id);
    } else {
      const serverChain: ServerConfig[] = [];
      const keyChain: any[] = [];

      const currentServer = servers.find((s) => s.id === tunnel.serverId);
      if (!currentServer) {
        alert('Máy chủ không tồn tại.');
        return;
      }

      if (currentServer.jumpHostIds && currentServer.jumpHostIds.length > 0) {
        for (const jId of currentServer.jumpHostIds) {
          const jSrv = servers.find(s => s.id === jId);
          if (jSrv) {
            serverChain.push(jSrv);
            keyChain.push(keys.find(k => k.id === jSrv.privateKeyId));
          }
        }
      }
      
      serverChain.push(currentServer);
      keyChain.push(keys.find(k => k.id === currentServer.privateKeyId));

      const res = await window.api.tunnelStart(tunnel, serverChain, keyChain);
      if (!res.success) {
        alert(`${t('tunnelCreateErrorPrefix')} ${res.error}`);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const selectedTunnel = tunnels.find((t) => t.id === selectedTunnelId) || filteredTunnels[0];

  const buildServerChain = (tunnel: SSHTunnelConfig | null) => {
    if (!tunnel) return [];
    const chain: ServerConfig[] = [];
    const currentServer = servers.find((s) => s.id === tunnel.serverId);
    if (!currentServer) return [];
    
    if (currentServer.jumpHostIds && currentServer.jumpHostIds.length > 0) {
      for (const jId of currentServer.jumpHostIds) {
        const jSrv = servers.find(s => s.id === jId);
        if (jSrv) chain.push(jSrv);
      }
    }
    chain.push(currentServer);
    return chain;
  };

  const serverChainForCanvas = buildServerChain(selectedTunnel);
  const selectedServer = serverChainForCanvas[serverChainForCanvas.length - 1];
  const selectedStat = selectedTunnel ? stats[selectedTunnel.id] : null;
  const isSelectedActive = selectedStat?.status === 'ACTIVE';

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-main)', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            <Network size={22} style={{ color: 'var(--accent-primary)' }} />
            {t('tunnelTitle')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {t('tunnelSubtitle')}
          </p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> {t('addTunnel')}
        </button>
      </div>

      {/* Main Grid: Left List, Right Visualizer Canvas */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left Column: Tunnel List */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '16px', overflow: 'hidden' }}>
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <input
              type="text"
              className="input-field"
              placeholder={t('searchTunnels')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredTunnels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('noTunnelsFound')}
              </div>
            ) : (
              filteredTunnels.map((tunnel) => {
                const stat = stats[tunnel.id];
                const isActive = stat?.status === 'ACTIVE';
                const isConnecting = stat?.status === 'CONNECTING';
                const isSelected = selectedTunnel?.id === tunnel.id;

                return (
                  <div
                    key={tunnel.id}
                    onClick={() => setSelectedTunnelId(tunnel.id)}
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-surface)' : 'var(--bg-tertiary)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{tunnel.name}</span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            tunnel.mode === 'LOCAL' ? 'rgba(59, 130, 246, 0.2)' : tunnel.mode === 'REMOTE' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: tunnel.mode === 'LOCAL' ? 'var(--accent-primary)' : tunnel.mode === 'REMOTE' ? '#c084fc' : 'var(--accent-success)'
                        }}
                      >
                        {tunnel.mode}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      {tunnel.mode === 'DYNAMIC' ? (
                        <span>SOCKS5 Proxy on <strong>127.0.0.1:{tunnel.localPort}</strong></span>
                      ) : tunnel.mode === 'LOCAL' ? (
                        <span>:{tunnel.localPort} ➔ {tunnel.dstHost}:{tunnel.dstPort}</span>
                      ) : (
                        <span>SSH Server Port :{tunnel.dstPort || tunnel.localPort} ➔ Local :{tunnel.localPort}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? 'var(--accent-success)' : isConnecting ? 'var(--accent-warning)' : 'var(--text-dim)'
                          }}
                        />
                        <span style={{ color: isActive ? 'var(--accent-success)' : 'var(--text-dim)' }}>
                          {isActive ? `${stat.speedKbps} Kb/s` : isConnecting ? 'Connecting...' : 'Stopped'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTunnel(tunnel);
                          }}
                          style={{
                            backgroundColor: isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: isActive ? 'var(--accent-danger)' : 'var(--accent-success)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isActive ? <Square size={12} /> : <Play size={12} />}
                          <span>{isActive ? 'Stop' : 'Start'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(tunnel);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t('confirmDeleteTunnel'))) onDeleteTunnel(tunnel.id);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Traffic Flow Visualizer Canvas */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {selectedTunnel ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {t('flowDiagramTitle')} {selectedTunnel.name}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {t('bastionServerLabel')} {selectedServer ? `${selectedServer.name} (${selectedServer.host})` : t('noServerAttached')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('speedLabel')}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isSelectedActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                      {selectedStat?.speedKbps || 0} KB/s
                    </div>
                  </div>
                </div>
              </div>

              {/* Visualizer Flow Canvas Diagram */}
              <div
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  padding: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Node 1: Client App */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '150px', zIndex: 2 }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '2px solid var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      boxShadow: isSelectedActive ? '0 0 20px rgba(59, 130, 246, 0.4)' : 'none'
                    }}
                  >
                    <Laptop size={30} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Client App</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 500 }}>
                      127.0.0.1:{selectedTunnel.localPort}
                    </div>
                  </div>
                </div>

                {/* Dynamically render jump hosts and bastion */}
                {serverChainForCanvas.map((srv, idx) => (
                  <React.Fragment key={srv.id + '_' + idx}>
                    {/* Connection Pipeline (between Client/Previous Node and Current Node) */}
                    <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border-subtle)', margin: '0 20px', position: 'relative', borderRadius: '2px' }}>
                      {isSelectedActive && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-3px',
                            width: '40px',
                            height: '10px',
                            borderRadius: '5px',
                            backgroundColor: 'var(--accent-primary)',
                            boxShadow: '0 0 10px var(--accent-primary)',
                            animation: `pulseFlow 2s infinite linear ${idx * 0.5}s`
                          }}
                        />
                      )}
                    </div>
                    
                    {/* Node */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '150px', zIndex: 2 }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          backgroundColor: idx < serverChainForCanvas.length - 1 ? 'rgba(234, 179, 8, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          border: idx < serverChainForCanvas.length - 1 ? '2px solid #eab308' : '2px solid #c084fc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: idx < serverChainForCanvas.length - 1 ? '#eab308' : '#c084fc',
                          boxShadow: isSelectedActive ? (idx < serverChainForCanvas.length - 1 ? '0 0 20px rgba(234, 179, 8, 0.4)' : '0 0 20px rgba(168, 85, 247, 0.4)') : 'none'
                        }}
                      >
                        {idx < serverChainForCanvas.length - 1 ? <ArrowRight size={30} /> : <Server size={30} />}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{srv.name}</div>
                        <div style={{ fontSize: '0.75rem', color: idx < serverChainForCanvas.length - 1 ? '#eab308' : '#c084fc', fontWeight: 500 }}>
                          {srv.host}:{srv.port || 22}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}

                {/* Animated Connection Pipeline 2 (Only if NOT Dynamic) */}
                {selectedTunnel.mode !== 'DYNAMIC' && (
                  <>
                    <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--border-subtle)', margin: '0 20px', position: 'relative', borderRadius: '2px' }}>
                      {isSelectedActive && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-3px',
                            width: '40px',
                            height: '10px',
                            borderRadius: '5px',
                            backgroundColor: 'var(--accent-success)',
                            boxShadow: '0 0 10px var(--accent-success)',
                            animation: `pulseFlow 2s infinite linear ${serverChainForCanvas.length * 0.5}s`
                          }}
                        />
                      )}
                    </div>

                    {/* Node 3: Target Resource */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '150px', zIndex: 2 }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          border: '2px solid var(--accent-success)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-success)',
                          boxShadow: isSelectedActive ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none'
                        }}
                      >
                        <Globe size={30} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Target Resource</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', fontWeight: 500 }}>
                          {selectedTunnel.dstHost}:{selectedTunnel.dstPort}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Bottom Real-time Traffic Counters Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '20px' }}>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{t('activeConnections')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {selectedStat?.activeConnections || 0}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{t('bytesReceived')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {formatBytes(selectedStat?.bytesRead || 0)}
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{t('bytesTransferred')}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-success)' }}>
                    {formatBytes(selectedStat?.bytesWritten || 0)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {t('selectTunnelPrompt')}
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit Tunnel */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '460px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{editingId ? t('editTunnel') : t('createTunnelModalTitle')}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('tunnelNameLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <input type="text" className="input-field" placeholder="Ex: Forward Local MySQL, SOCKS5 VPN" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('selectBastionLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <select className="input-field" value={formData.serverId || ''} onChange={(e) => setFormData({ ...formData, serverId: e.target.value })}>
                  {servers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('forwardingModeLabel')}</label>
                <select className="input-field" value={formData.mode || 'LOCAL'} onChange={(e) => setFormData({ ...formData, mode: e.target.value as any })}>
                  <option value="LOCAL">Local Forwarding (-L local_port:dst_host:dst_port)</option>
                  <option value="REMOTE">Remote Forwarding (-R remote_port:local_host:local_port)</option>
                  <option value="DYNAMIC">Dynamic Forwarding / SOCKS5 Proxy (-D local_port)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('localPortLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <input type="number" className="input-field" placeholder="Ex: 8080, 1080" value={formData.localPort || ''} onChange={(e) => setFormData({ ...formData, localPort: Number(e.target.value) })} />
              </div>

              {formData.mode !== 'DYNAMIC' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('targetHostLabel')}</label>
                    <input type="text" className="input-field" placeholder="127.0.0.1 or 192.168.1.100" value={formData.dstHost || ''} onChange={(e) => setFormData({ ...formData, dstHost: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('targetPortLabel')}</label>
                    <input type="number" className="input-field" placeholder="Ex: 3306, 80" value={formData.dstPort || ''} onChange={(e) => setFormData({ ...formData, dstPort: Number(e.target.value) })} />
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-tertiary)' }}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={handleSave}>{t('saveTunnelBtn')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Pulse Keyframes CSS */}
      <style>{`
        @keyframes pulseFlow {
          0% { left: 0%; opacity: 0.3; }
          50% { opacity: 1; }
          100% { left: 60%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
