import React, { useState } from 'react';
import { ServerConfig, Protocol, TerminalSettings } from '../types';
import { Cloud, Server, RefreshCw, Terminal, Monitor, Plus, CheckCircle, ExternalLink, Globe } from 'lucide-react';
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
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [connectedCloud, setConnectedCloud] = useState<boolean>(true);

  const [instances, setInstances] = useState<CloudInstance[]>([
    { id: 'i-0a12b34c56d78', provider: 'AWS', name: 'prod-api-cluster-node-1', region: 'us-east-1 (N. Virginia)', publicIp: '54.210.12.89', privateIp: '172.31.16.4', state: 'running', instanceType: 't3.xlarge', os: 'Linux' },
    { id: 'i-0f98e76d54c32', provider: 'AWS', name: 'prod-bastion-host', region: 'us-east-1 (N. Virginia)', publicIp: '3.88.45.102', privateIp: '172.31.32.10', state: 'running', instanceType: 't3.micro', os: 'Linux' },
    { id: 'gcp-vm-102938', provider: 'GCP', name: 'gcp-bigdata-spark-master', region: 'asia-southeast1 (Singapore)', publicIp: '34.87.110.45', privateIp: '10.148.0.2', state: 'running', instanceType: 'e2-standard-4', os: 'Linux' },
    { id: 'azure-vm-445566', provider: 'AZURE', name: 'win-rdp-jump-server', region: 'eastus2 (East US 2)', publicIp: '20.120.44.18', privateIp: '10.0.1.5', state: 'running', instanceType: 'Standard_D2s_v3', os: 'Windows' }
  ]);

  const handleSyncCloud = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
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

        <button className="btn-primary" onClick={handleSyncCloud} disabled={loading} style={{ height: '36px' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>{t('ceSyncBtn')}</span>
        </button>
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

                <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', fontWeight: 600 }}>● {instance.state}</span>
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
    </div>
  );
};
