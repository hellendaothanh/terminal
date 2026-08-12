import React, { useState, useEffect } from 'react';
import { ServerConfig, Protocol, TerminalSettings } from '../types';
import { Cloud, Server, RefreshCw, Terminal, Monitor, Plus, CheckCircle, Trash2, PlusCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface CloudExplorerProps {
  onImportCloudInstanceAsServer?: (serverData: Partial<ServerConfig>) => void;
  onConnectServer?: (server: ServerConfig, protocol: Protocol) => void;
  settings?: TerminalSettings;
}

interface CloudInstance {
  id: string;
  provider: 'AWS' | 'GCP' | 'AZURE';
  name: string;
  region: string;
  publicIp: string;
  privateIp: string;
  state: 'running' | 'stopped' | 'terminated';
  instanceType: string;
  os: 'Linux' | 'Windows';
}

export const CloudExplorer: React.FC<CloudExplorerProps> = ({
  onImportCloudInstanceAsServer,
  onConnectServer,
  settings
}) => {
  const { t } = useTranslation(settings);
  const [selectedProvider, setSelectedProvider] = useState<'ALL' | 'AWS' | 'GCP' | 'AZURE'>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [instances, setInstances] = useState<CloudInstance[]>([]);

  // Add Instance Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newProvider, setNewProvider] = useState<'AWS' | 'GCP' | 'AZURE'>('AWS');
  const [newRegion, setNewRegion] = useState<string>('us-east-1');
  const [newPublicIp, setNewPublicIp] = useState<string>('');
  const [newPrivateIp, setNewPrivateIp] = useState<string>('172.31.0.10');
  const [newInstanceType, setNewInstanceType] = useState<string>('t3.micro');
  const [newOs, setNewOs] = useState<'Linux' | 'Windows'>('Linux');

  const fetchInstances = async () => {
    setLoading(true);
    try {
      const data = await window.api.cloudListInstances();
      setInstances(data || []);
    } catch (err) {
      console.error('Failed to load cloud instances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const handleSyncCloud = () => {
    fetchInstances();
  };

  const handleAddInstance = async () => {
    if (!newName.trim() || !newPublicIp.trim()) return;
    const newItem: CloudInstance = {
      id: 'cloud_' + Math.random().toString(36).substr(2, 9),
      provider: newProvider,
      name: newName,
      region: newRegion,
      publicIp: newPublicIp,
      privateIp: newPrivateIp,
      state: 'running',
      instanceType: newInstanceType,
      os: newOs
    };
    await window.api.cloudAddInstance(newItem);
    await fetchInstances();
    setShowAddModal(false);
    // Reset form fields
    setNewName('');
    setNewPublicIp('');
    setNewPrivateIp('172.31.0.10');
    setNewInstanceType('t3.micro');
  };

  const handleDeleteInstance = async (id: string) => {
    const isVi = settings?.language === 'vi';
    if (confirm(isVi ? 'Bạn có chắc chắn muốn xóa VM này khỏi Cloud Explorer?' : 'Are you sure you want to delete this VM instance?')) {
      await window.api.cloudDeleteInstance(id);
      await fetchInstances();
    }
  };

  const handleQuickConnect = (instance: CloudInstance) => {
    const protocol: Protocol = instance.os === 'Windows' ? 'RDP' : 'SSH';
    const serverObj: ServerConfig = {
      id: 'cloud_' + instance.id,
      name: `[${instance.provider}] ${instance.name}`,
      host: instance.publicIp,
      port: protocol === 'RDP' ? 3389 : 22,
      protocol: protocol,
      username: instance.os === 'Windows' ? 'Administrator' : 'ubuntu',
      authType: 'password',
      environment: 'PRODUCTION',
      tags: ['Cloud', instance.provider, instance.region],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (onImportCloudInstanceAsServer) {
      onImportCloudInstanceAsServer(serverObj);
    }
    if (onConnectServer) {
      onConnectServer(serverObj, protocol);
    }
  };

  const filteredInstances = instances.filter((i) => selectedProvider === 'ALL' || i.provider === selectedProvider);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)', padding: '20px', overflowY: 'auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cloud size={22} style={{ color: 'var(--accent-primary)' }} />
            <span>{t('ceTitle')}</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t('ceDesc')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={() => setShowAddModal(true)} style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} />
            <span>{settings?.language === 'vi' ? 'Thêm Instance' : 'Add Instance'}</span>
          </button>
          
          <button className="btn-primary" onClick={handleSyncCloud} disabled={loading} style={{ height: '36px' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>{t('ceSyncBtn')}</span>
          </button>
        </div>
      </div>

      {/* Provider Selector */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px' }}>
        {(['ALL', 'AWS', 'GCP', 'AZURE'] as const).map((prov) => (
          <button
            key={prov}
            onClick={() => setSelectedProvider(prov)}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: selectedProvider === prov ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: selectedProvider === prov ? '#fff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            {prov === 'ALL' ? t('ceAllCloud') : prov}
          </button>
        ))}
      </div>

      {/* Instance Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredInstances.map((instance) => (
          <div
            key={instance.id}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: instance.provider === 'AWS' ? 'rgba(245, 158, 11, 0.2)' : instance.provider === 'GCP' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                    color: instance.provider === 'AWS' ? '#f59e0b' : instance.provider === 'GCP' ? '#3b82f6' : '#c084fc'
                  }}
                >
                  {instance.provider} ({instance.os})
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', fontWeight: 600 }}>● {instance.state}</span>
                  <button 
                    onClick={() => handleDeleteInstance(instance.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '2px' }}
                    title="Delete Instance"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                {instance.name}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Public IP: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{instance.publicIp}</strong></div>
                <div>Private IP: <span style={{ fontFamily: 'monospace' }}>{instance.privateIp}</span></div>
                <div>Region: {instance.region}</div>
                <div>Type: {instance.instanceType}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
              <button
                className="btn-primary"
                onClick={() => handleQuickConnect(instance)}
                style={{ width: '100%', height: '34px', fontSize: '0.8rem', justifyContent: 'center' }}
              >
                {instance.os === 'Windows' ? <Monitor size={14} /> : <Terminal size={14} />}
                <span>{t('ceConnectBtn')} {instance.os === 'Windows' ? 'RDP' : 'SSH'} 1-Click</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Cloud Instance Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-focus)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            width: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle style={{ color: 'var(--accent-primary)' }} size={20} />
              {settings?.language === 'vi' ? 'Thêm Cloud Instance' : 'Add Cloud Instance'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Name *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. prod-web-vm"
                  style={{ width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cloud Provider</label>
                <select 
                  className="input-field" 
                  value={newProvider}
                  onChange={(e: any) => setNewProvider(e.target.value)}
                  style={{ width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
                >
                  <option value="AWS">AWS</option>
                  <option value="GCP">GCP</option>
                  <option value="AZURE">AZURE</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Region</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  placeholder="e.g. us-east-1"
                  style={{ width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Public IP *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newPublicIp}
                  onChange={(e) => setNewPublicIp(e.target.value)}
                  placeholder="e.g. 54.210.12.89"
                  style={{ width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Private IP</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newPrivateIp}
                  onChange={(e) => setNewPrivateIp(e.target.value)}
                  placeholder="e.g. 172.31.0.10"
                  style={{ width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Instance Type</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newInstanceType}
                  onChange={(e) => setNewInstanceType(e.target.value)}
                  placeholder="e.g. t3.micro"
                  style={{ width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Operating System</label>
                <select 
                  className="input-field" 
                  value={newOs}
                  onChange={(e: any) => setNewOs(e.target.value)}
                  style={{ width: '100%', height: '32px', fontSize: '0.8rem', marginTop: '4px' }}
                >
                  <option value="Linux">Linux</option>
                  <option value="Windows">Windows</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button className="btn-secondary" onClick={() => setShowAddModal(false)} style={{ height: '32px', fontSize: '0.75rem' }}>
                {settings?.language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button className="btn-primary" onClick={handleAddInstance} disabled={!newName || !newPublicIp} style={{ height: '32px', fontSize: '0.75rem' }}>
                {settings?.language === 'vi' ? 'Lưu' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
