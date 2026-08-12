import React, { useState, useEffect, useRef } from 'react';
import { ServerConfig, TerminalSettings } from '../types';
import { 
  Box, Layers, RefreshCw, Terminal, FileText, Play, Square, RotateCcw, 
  Search, CheckCircle, AlertCircle, Server, ChevronRight, ChevronDown, 
  Sliders, Settings, Download, Trash2, Maximize2, Minimize2, Activity,
  Database, ShieldAlert, Cpu, HardDrive
} from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface DockerK8sPanelProps {
  servers: ServerConfig[];
  onOpenExecTerminal?: (server: ServerConfig, execCmd: string) => void;
  settings?: TerminalSettings;
}

// Interfaces
interface ResourceItem {
  id: string;
  name: string;
  type: string;
  image?: string;
  status: 'running' | 'stopped' | 'CrashLoopBackOff' | 'active' | 'exited';
  cpu: number;
  memory: number;
  ip?: string;
  ports?: string;
  age: string;
}

export const DockerK8sPanel: React.FC<DockerK8sPanelProps> = ({
  servers,
  onOpenExecTerminal,
  settings
}) => {
  const { t } = useTranslation(settings);
  const sshServers = servers.filter((s) => s.protocol === 'SSH');

  // Core UI States
  const [activePlatform, setActivePlatform] = useState<'DOCKER' | 'K8S'>('DOCKER');
  const [selectedServerId, setSelectedServerId] = useState<string>(sshServers[0]?.id || '');
  const [selectedK8sContext, setSelectedK8sContext] = useState<string>('gke_production_cluster');
  const [selectedK8sNamespace, setSelectedK8sNamespace] = useState<string>('default');
  const [selectedDockerHost, setSelectedDockerHost] = useState<string>('local_socket');

  // Sidebar navigation selection
  const [selectedResourceType, setSelectedResourceType] = useState<string>('containers');
  const [sidebarExpandedKeys, setSidebarExpandedKeys] = useState<Record<string, boolean>>({
    docker: true,
    k8s: true,
    workloads: true
  });

  // Table & Toolbar States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRowIds, setSelectedRowIds] = useState<Record<string, boolean>>({});
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Bottom Drawer States
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState<boolean>(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'logs' | 'terminal' | 'yaml' | 'metrics'>('logs');
  const [logsRegex, setLogsRegex] = useState<string>('');
  const [autoScrollLogs, setAutoScrollLogs] = useState<boolean>(true);
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    'Welcome to OmniTerminal Interactive Container Agent',
    'Session initialized. Type commands to execute inside selected container...'
  ]);
  const [yamlContent, setYamlContent] = useState<string>('');
  const [metricHistory, setMetricHistory] = useState<{ cpu: number[]; memory: number[] }>({
    cpu: [12, 18, 15, 25, 30, 22, 28, 35, 42, 38],
    memory: [45, 46, 45, 48, 49, 48, 50, 52, 53, 52]
  });

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: ResourceItem } | null>(null);

  // Logs stream ref
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  // Raw mock database
  const [dockerResources, setDockerResources] = useState<Record<string, ResourceItem[]>>({
    containers: [
      { id: 'c102a39f', name: 'nginx-ingress-gateway', type: 'Container', image: 'nginx:alpine', status: 'running', cpu: 12, memory: 128, ip: '172.17.0.2', ports: '80:80, 443:443', age: '2d' },
      { id: 'f87b2011', name: 'redis-cache-cluster', type: 'Container', image: 'redis:7-alpine', status: 'running', cpu: 4, memory: 64, ip: '172.17.0.3', ports: '6379:6379', age: '5d' },
      { id: 'a912e45d', name: 'postgres-db-primary', type: 'Container', image: 'postgres:15', status: 'running', cpu: 18, memory: 512, ip: '172.17.0.4', ports: '5432:5432', age: '10d' },
      { id: 'b5510c8e', name: 'payment-microservice-api', type: 'Container', image: 'node:18-slim', status: 'stopped', cpu: 0, memory: 0, ip: '172.17.0.5', ports: '3000:3000', age: '1d' }
    ],
    images: [
      { id: 'img-nginx', name: 'nginx:alpine', type: 'Image', status: 'active', cpu: 0, memory: 0, age: '15d', ports: '23.4 MB' },
      { id: 'img-redis', name: 'redis:7-alpine', type: 'Image', status: 'active', cpu: 0, memory: 0, age: '30d', ports: '32.1 MB' },
      { id: 'img-postgres', name: 'postgres:15', type: 'Image', status: 'active', cpu: 0, memory: 0, age: '45d', ports: '379 MB' }
    ],
    volumes: [
      { id: 'vol-postgres', name: 'pg_data_vol', type: 'Volume', status: 'active', cpu: 0, memory: 0, age: '10d', ports: 'Local /var/lib/postgresql/data' },
      { id: 'vol-redis', name: 'redis_config_vol', type: 'Volume', status: 'active', cpu: 0, memory: 0, age: '5d', ports: 'Local /data' }
    ],
    networks: [
      { id: 'net-bridge', name: 'bridge', type: 'Network', status: 'active', cpu: 0, memory: 0, age: '60d', ports: 'bridge / local' },
      { id: 'net-overlay', name: 'app_overlay_net', type: 'Network', status: 'active', cpu: 0, memory: 0, age: '12d', ports: 'overlay / swarm' }
    ]
  });

  const [k8sResources, setK8sResources] = useState<Record<string, ResourceItem[]>>({
    pods: [
      { id: 'pod-auth', name: 'auth-service-589f6d79b-4k2x9', type: 'Pod', image: 'auth-service:v1.4.2', status: 'running', cpu: 15, memory: 256, ip: '10.244.1.15', age: '3d' },
      { id: 'pod-pay', name: 'payment-gateway-7c4d989f-8m1l2', type: 'Pod', image: 'payment-gateway:v2.1', status: 'running', cpu: 22, memory: 312, ip: '10.244.2.42', age: '5d' },
      { id: 'pod-worker', name: 'background-worker-6b8c9d-9q5z1', type: 'Pod', image: 'worker:latest', status: 'CrashLoopBackOff', cpu: 0, memory: 0, ip: '10.244.1.88', age: '1d' },
      { id: 'pod-front', name: 'frontend-nextjs-84b79c-3t7v4', type: 'Pod', image: 'nextjs-app:v3.0.1', status: 'running', cpu: 8, memory: 180, ip: '10.244.2.19', age: '7d' }
    ],
    deployments: [
      { id: 'dep-auth', name: 'auth-service', type: 'Deployment', image: 'Replicas: 2/2', status: 'active', cpu: 15, memory: 512, age: '30d' },
      { id: 'dep-payment', name: 'payment-gateway', type: 'Deployment', image: 'Replicas: 1/1', status: 'active', cpu: 22, memory: 312, age: '25d' },
      { id: 'dep-worker', name: 'background-worker', type: 'Deployment', image: 'Replicas: 0/1 (Degraded)', status: 'CrashLoopBackOff', cpu: 0, memory: 0, age: '12d' }
    ],
    statefulsets: [
      { id: 'sts-db', name: 'postgres-db-stateful', type: 'StatefulSet', image: 'Replicas: 1/1', status: 'active', cpu: 18, memory: 512, age: '15d' }
    ],
    services: [
      { id: 'svc-auth', name: 'auth-service-svc', type: 'Service', image: 'ClusterIP / Port 80', status: 'active', cpu: 0, memory: 0, ip: '10.96.42.11', age: '30d' },
      { id: 'svc-payment', name: 'payment-svc', type: 'Service', image: 'LoadBalancer / Port 443', status: 'active', cpu: 0, memory: 0, ip: '34.120.45.99', age: '25d' }
    ],
    ingress: [
      { id: 'ing-main', name: 'main-routing-ingress', type: 'Ingress', image: 'nginx-ingress', status: 'active', cpu: 0, memory: 0, ip: 'api.omniterminal.dev', age: '30d' }
    ],
    configmaps: [
      { id: 'cm-app', name: 'app-global-config', type: 'ConfigMap', image: 'Keys: 8', status: 'active', cpu: 0, memory: 0, age: '45d' },
      { id: 'sec-db', name: 'database-credentials-secret', type: 'Secret', image: 'Keys: 3 (Encrypted)', status: 'active', cpu: 0, memory: 0, age: '45d' }
    ]
  });

  // Simulated live logs
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  useEffect(() => {
    if (selectedResource) {
      setLiveLogs([
        `[${new Date().toLocaleTimeString()}] [INFO] Starting diagnostics for ${selectedResource.name}...`,
        `[${new Date().toLocaleTimeString()}] [DEBUG] Fetching properties of type: ${selectedResource.type}`,
        `[${new Date().toLocaleTimeString()}] [INFO] Port binding check: OK`,
        `[${new Date().toLocaleTimeString()}] [WARN] Memory utilization currently at ${selectedResource.memory}MB`
      ]);

      setYamlContent(
        `apiVersion: v1\nkind: ${selectedResource.type}\nmetadata:\n  name: ${selectedResource.name}\n  namespace: ${selectedK8sNamespace}\n  labels:\n    app: ${selectedResource.name.split('-')[0]}\n    managed-by: omniterminal\nspec:\n  containers:\n  - name: primary\n    image: ${selectedResource.image || 'unknown'}\n    ports:\n    - containerPort: 80\n    resources:\n      limits:\n        cpu: "500m"\n        memory: "512Mi"\n`
      );
    } else {
      setLiveLogs(['Select a resource from the table to inspect logs...']);
      setYamlContent('# Select a resource to inspect YAML manifest');
    }
  }, [selectedResource]);

  // Periodic updates for Metrics and Logs
  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedResource && selectedResource.status === 'running') {
        // Update Sparkline Data
        setMetricHistory(prev => {
          const nextCpu = [...prev.cpu.slice(1), Math.max(5, Math.min(95, prev.cpu[prev.cpu.length - 1] + (Math.random() * 10 - 5)))];
          const nextMem = [...prev.memory.slice(1), Math.max(10, Math.min(100, prev.memory[prev.memory.length - 1] + (Math.random() * 4 - 2)))];
          return { cpu: nextCpu, memory: nextMem };
        });

        // Append log line
        setLiveLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [STREAM] CPU usage: ${metricHistory.cpu[metricHistory.cpu.length - 1].toFixed(1)}% | MEM: ${metricHistory.memory[metricHistory.memory.length - 1].toFixed(1)}%`
        ]);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [selectedResource, metricHistory]);

  // Scroll to logs end
  useEffect(() => {
    if (autoScrollLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveLogs, autoScrollLogs]);

  // Trigger Refresh
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 700);
  };

  // Keyboard shortcut listener for Command Palette (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('resource-quick-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Selection handlers
  const toggleRowSelection = (id: string) => {
    setSelectedRowIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAllRows = (items: ResourceItem[]) => {
    const allSelected = items.every(item => selectedRowIds[item.id]);
    const updated: Record<string, boolean> = {};
    if (!allSelected) {
      items.forEach(item => {
        updated[item.id] = true;
      });
    }
    setSelectedRowIds(updated);
  };

  const handleBulkAction = (action: 'start' | 'stop' | 'delete') => {
    const ids = Object.keys(selectedRowIds).filter(k => selectedRowIds[k]);
    if (ids.length === 0) return;
    alert(`Bulk ${action} triggered for resources: ${ids.join(', ')}`);
    setSelectedRowIds({});
  };

  // Context Menu Action Handlers
  const handleContextMenuAction = (action: string, item: ResourceItem) => {
    alert(`Triggered "${action}" on ${item.name}`);
    setContextMenu(null);
  };

  // Simulated Exec Terminal input handler
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput;
    setTerminalHistory(prev => [
      ...prev,
      `$ ${cmd}`,
      cmd === 'clear' ? '' : `executing inside container context: running command '${cmd}'... OK.`
    ]);
    setTerminalInput('');
  };

  // Tree items rendering helpers
  const toggleSidebarNode = (key: string) => {
    setSidebarExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Get filtered items
  const getCurrentItems = (): ResourceItem[] => {
    const source = activePlatform === 'DOCKER' ? dockerResources : k8sResources;
    const items = source[selectedResourceType] || [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.image && item.image.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  };

  const currentItems = getCurrentItems();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
      
      {/* 3-Pane Layout Main Workspace Grid */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        
        {/* ========================================================================= */}
        {/* PANE 1: RESOURCE NAVIGATION SIDEBAR (LEFT) */}
        {/* ========================================================================= */}
        <div style={{ 
          width: '280px', 
          borderRight: '1px solid var(--border-subtle)', 
          backgroundColor: 'var(--bg-secondary)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflowY: 'auto' 
        }}>
          
          {/* Top Switcher (Docker vs K8s Platform selectors) */}
          <div style={{ display: 'flex', padding: '12px', borderBottom: '1px solid var(--border-subtle)', gap: '8px' }}>
            <button 
              onClick={() => { setActivePlatform('DOCKER'); setSelectedResourceType('containers'); }}
              style={{
                flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', border: 'none',
                backgroundColor: activePlatform === 'DOCKER' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: activePlatform === 'DOCKER' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Box size={14} /> Docker
            </button>
            <button 
              onClick={() => { setActivePlatform('K8S'); setSelectedResourceType('pods'); }}
              style={{
                flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', border: 'none',
                backgroundColor: activePlatform === 'K8S' ? '#c084fc' : 'var(--bg-tertiary)',
                color: activePlatform === 'K8S' ? '#fff' : 'var(--text-muted)',
                fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              <Layers size={14} /> K8s Cluster
            </button>
          </div>

          {/* Context Selector panel depending on activePlatform */}
          <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activePlatform === 'DOCKER' ? (
              <>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>DOCKER CONNECTION</label>
                <select 
                  className="input-field"
                  value={selectedDockerHost} 
                  onChange={(e) => setSelectedDockerHost(e.target.value)}
                  style={{ width: '100%', height: '30px', fontSize: '0.78rem', padding: '4px' }}
                >
                  <option value="local_socket">Local UNIX Socket (/var/run/docker.sock)</option>
                  {sshServers.map(s => (
                    <option key={s.id} value={`ssh_${s.id}`}>SSH Tunnel: {s.name} ({s.host})</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>KUBE CONTEXT & NAMESPACE</label>
                <select 
                  className="input-field" 
                  value={selectedK8sContext}
                  onChange={(e) => setSelectedK8sContext(e.target.value)}
                  style={{ width: '100%', height: '30px', fontSize: '0.78rem', marginBottom: '6px', padding: '4px' }}
                >
                  <option value="gke_production_cluster">GKE Production Cluster (AWS/GCP)</option>
                  <option value="minikube">Minikube Local Dev Context</option>
                  <option value="k3s_pi_cluster">K3s Raspberry Pi Cluster</option>
                </select>
                <select 
                  className="input-field" 
                  value={selectedK8sNamespace}
                  onChange={(e) => setSelectedK8sNamespace(e.target.value)}
                  style={{ width: '100%', height: '30px', fontSize: '0.78rem', padding: '4px' }}
                >
                  <option value="all">Namespace: [ All Namespaces ]</option>
                  <option value="default">Namespace: default</option>
                  <option value="production">Namespace: production</option>
                  <option value="kube-system">Namespace: kube-system</option>
                </select>
              </>
            )}
          </div>

          {/* Tree View Resource Navigation */}
          <div style={{ padding: '12px' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '10px' }}>RESOURCES EXPLORER</div>
            
            {activePlatform === 'DOCKER' ? (
              <div>
                <div 
                  onClick={() => toggleSidebarNode('docker')} 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 4px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  {sidebarExpandedKeys['docker'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Box size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span>Docker Daemon</span>
                </div>
                {sidebarExpandedKeys['docker'] && (
                  <div style={{ paddingLeft: '20px' }}>
                    <div 
                      onClick={() => setSelectedResourceType('containers')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'containers' ? 'var(--accent-primary)' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'containers' ? 'rgba(59, 130, 246, 0.08)' : 'transparent', fontWeight: selectedResourceType === 'containers' ? 600 : 400 }}
                    >
                      🐳 Containers ({dockerResources.containers.length})
                    </div>
                    <div 
                      onClick={() => setSelectedResourceType('images')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'images' ? 'var(--accent-primary)' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'images' ? 'rgba(59, 130, 246, 0.08)' : 'transparent', fontWeight: selectedResourceType === 'images' ? 600 : 400 }}
                    >
                      💾 Images ({dockerResources.images.length})
                    </div>
                    <div 
                      onClick={() => setSelectedResourceType('volumes')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'volumes' ? 'var(--accent-primary)' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'volumes' ? 'rgba(59, 130, 246, 0.08)' : 'transparent', fontWeight: selectedResourceType === 'volumes' ? 600 : 400 }}
                    >
                      📁 Volumes ({dockerResources.volumes.length})
                    </div>
                    <div 
                      onClick={() => setSelectedResourceType('networks')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'networks' ? 'var(--accent-primary)' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'networks' ? 'rgba(59, 130, 246, 0.08)' : 'transparent', fontWeight: selectedResourceType === 'networks' ? 600 : 400 }}
                    >
                      🔌 Networks ({dockerResources.networks.length})
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div 
                  onClick={() => toggleSidebarNode('k8s')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 4px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  {sidebarExpandedKeys['k8s'] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Layers size={14} style={{ color: '#c084fc' }} />
                  <span>Kubernetes Cluster</span>
                </div>
                {sidebarExpandedKeys['k8s'] && (
                  <div style={{ paddingLeft: '16px' }}>
                    <div 
                      onClick={() => toggleSidebarNode('workloads')}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 4px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem' }}
                    >
                      {sidebarExpandedKeys['workloads'] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      <span>Workloads</span>
                    </div>
                    {sidebarExpandedKeys['workloads'] && (
                      <div style={{ paddingLeft: '16px' }}>
                        <div 
                          onClick={() => setSelectedResourceType('pods')}
                          style={{ padding: '4px 6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.75rem', color: selectedResourceType === 'pods' ? '#c084fc' : 'var(--text-dim)', backgroundColor: selectedResourceType === 'pods' ? 'rgba(192, 132, 252, 0.08)' : 'transparent', fontWeight: selectedResourceType === 'pods' ? 600 : 400 }}
                        >
                          ⬢ Pods ({k8sResources.pods.length})
                        </div>
                        <div 
                          onClick={() => setSelectedResourceType('deployments')}
                          style={{ padding: '4px 6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.75rem', color: selectedResourceType === 'deployments' ? '#c084fc' : 'var(--text-dim)', backgroundColor: selectedResourceType === 'deployments' ? 'rgba(192, 132, 252, 0.08)' : 'transparent', fontWeight: selectedResourceType === 'deployments' ? 600 : 400 }}
                        >
                          🚀 Deployments ({k8sResources.deployments.length})
                        </div>
                        <div 
                          onClick={() => setSelectedResourceType('statefulsets')}
                          style={{ padding: '4px 6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.75rem', color: selectedResourceType === 'statefulsets' ? '#c084fc' : 'var(--text-dim)', backgroundColor: selectedResourceType === 'statefulsets' ? 'rgba(192, 132, 252, 0.08)' : 'transparent', fontWeight: selectedResourceType === 'statefulsets' ? 600 : 400 }}
                        >
                          💾 StatefulSets ({k8sResources.statefulsets.length})
                        </div>
                      </div>
                    )}
                    
                    <div 
                      onClick={() => setSelectedResourceType('services')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'services' ? '#c084fc' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'services' ? 'rgba(192, 132, 252, 0.08)' : 'transparent' }}
                    >
                      🔗 Services ({k8sResources.services.length})
                    </div>
                    <div 
                      onClick={() => setSelectedResourceType('ingress')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'ingress' ? '#c084fc' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'ingress' ? 'rgba(192, 132, 252, 0.08)' : 'transparent' }}
                    >
                      🌉 Ingress ({k8sResources.ingress.length})
                    </div>
                    <div 
                      onClick={() => setSelectedResourceType('configmaps')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'configmaps' ? '#c084fc' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'configmaps' ? 'rgba(192, 132, 252, 0.08)' : 'transparent' }}
                    >
                      ⚙️ ConfigMaps & Secrets ({k8sResources.configmaps.length})
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANE 2: MAIN RESOURCE VIEW (MIDDLE/RIGHT) */}
        {/* ========================================================================= */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          
          {/* Resource Toolbar */}
          <div style={{ 
            padding: '12px 20px', 
            borderBottom: '1px solid var(--border-subtle)', 
            backgroundColor: 'var(--bg-secondary)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
                <input 
                  id="resource-quick-search"
                  type="text" 
                  placeholder="Filter resources... (Ctrl+K)" 
                  className="input-field" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', height: '32px', width: '100%', fontSize: '0.78rem' }}
                />
              </div>
              
              <select
                className="input-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '140px', height: '32px', fontSize: '0.78rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="running">Running</option>
                <option value="stopped">Stopped / Exited</option>
                <option value="CrashLoopBackOff">CrashLoopBackOff</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={() => handleBulkAction('start')} 
                className="btn-secondary" 
                style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Play size={12} style={{ color: 'var(--accent-success)' }} /> Start
              </button>
              <button 
                onClick={() => handleBulkAction('stop')} 
                className="btn-secondary" 
                style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Square size={12} style={{ color: 'var(--accent-danger)' }} /> Stop
              </button>
              <button 
                onClick={() => handleBulkAction('delete')} 
                className="btn-secondary" 
                style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={12} style={{ color: 'var(--accent-danger)' }} /> Delete
              </button>

              <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-subtle)' }} />

              <button 
                className="btn-secondary" 
                onClick={handleRefresh} 
                disabled={loading} 
                style={{ height: '32px', padding: '0 12px' }}
              >
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Interactive Data Table */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '10px 16px', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        checked={currentItems.length > 0 && currentItems.every(item => selectedRowIds[item.id])}
                        onChange={() => toggleAllRows(currentItems)}
                      />
                    </th>
                    <th style={{ padding: '10px 16px' }}>NAME</th>
                    <th style={{ padding: '10px 16px' }}>IMAGE / SPEC</th>
                    <th style={{ padding: '10px 16px' }}>STATUS</th>
                    <th style={{ padding: '10px 16px' }}>CPU / MEM</th>
                    <th style={{ padding: '10px 16px' }}>IP / ADDRESS</th>
                    <th style={{ padding: '10px 16px' }}>AGE</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '40px', textShadow: 'none', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No resources found matching filters.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedResource(item)}
                        onDoubleClick={() => {
                          setSelectedResource(item);
                          if (item.type === 'Container' || item.type === 'Pod') {
                            setDrawerActiveTab('terminal');
                            setIsDrawerCollapsed(false);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, item });
                        }}
                        style={{ 
                          borderBottom: '1px solid var(--border-subtle)', 
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          backgroundColor: selectedResource?.id === item.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={!!selectedRowIds[item.id]} 
                            onChange={() => toggleRowSelection(item.id)}
                          />
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                          <span style={{ color: activePlatform === 'DOCKER' ? 'var(--accent-primary)' : '#c084fc' }}>{item.name}</span>
                          {item.id.length < 10 && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>{item.id}</div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.74rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.image || '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              backgroundColor: item.status === 'running' || item.status === 'active' ? 'rgba(34, 197, 94, 0.12)' : item.status === 'CrashLoopBackOff' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(156, 163, 175, 0.12)',
                              color: item.status === 'running' || item.status === 'active' ? 'var(--accent-success)' : item.status === 'CrashLoopBackOff' ? 'var(--accent-danger)' : 'var(--text-muted)',
                              border: '1px solid currentColor'
                            }}
                          >
                            ● {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.76rem' }}>
                          {item.cpu > 0 || item.memory > 0 ? (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span>{item.cpu}% CPU</span>
                              <span style={{ color: 'var(--text-dim)' }}>|</span>
                              <span>{item.memory}MB</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                          {item.ip || item.ports || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>{item.age}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {(item.type === 'Container' || item.type === 'Pod') && (
                              <button
                                className="btn-secondary"
                                onClick={() => {
                                  setSelectedResource(item);
                                  setDrawerActiveTab('terminal');
                                  setIsDrawerCollapsed(false);
                                }}
                                style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                title="Interactive Shell"
                              >
                                <Terminal size={12} />
                              </button>
                            )}
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setSelectedResource(item);
                                setDrawerActiveTab('logs');
                                setIsDrawerCollapsed(false);
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                              title="Logs"
                            >
                              <FileText size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PANE 3: BOTTOM INSPECTION DRAWER (COLLAPSIBLE) */}
          {/* ========================================================================= */}
          <div style={{ 
            borderTop: '1px solid var(--border-subtle)', 
            backgroundColor: 'var(--bg-secondary)',
            height: isDrawerCollapsed ? '38px' : '320px',
            transition: 'height 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Drawer Header (Collapse button & tab switchers) */}
            <div style={{ 
              height: '38px', 
              backgroundColor: 'var(--bg-tertiary)', 
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '0 16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '100%' }}>
                <button 
                  onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }}
                >
                  {isDrawerCollapsed ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginRight: '16px' }}>
                  INSPECTOR: {selectedResource ? selectedResource.name : '(No Resource Selected)'}
                </span>

                {!isDrawerCollapsed && (
                  <div style={{ display: 'flex', gap: '4px', height: '100%' }}>
                    <button 
                      onClick={() => setDrawerActiveTab('logs')}
                      style={{
                        padding: '0 12px', border: 'none', height: '100%', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        backgroundColor: drawerActiveTab === 'logs' ? 'var(--bg-secondary)' : 'transparent',
                        color: drawerActiveTab === 'logs' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        borderBottom: drawerActiveTab === 'logs' ? '2px solid var(--accent-primary)' : 'none'
                      }}
                    >
                      Logs Stream
                    </button>
                    <button 
                      onClick={() => setDrawerActiveTab('terminal')}
                      style={{
                        padding: '0 12px', border: 'none', height: '100%', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        backgroundColor: drawerActiveTab === 'terminal' ? 'var(--bg-secondary)' : 'transparent',
                        color: drawerActiveTab === 'terminal' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        borderBottom: drawerActiveTab === 'terminal' ? '2px solid var(--accent-primary)' : 'none'
                      }}
                    >
                      Terminal Shell
                    </button>
                    <button 
                      onClick={() => setDrawerActiveTab('yaml')}
                      style={{
                        padding: '0 12px', border: 'none', height: '100%', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        backgroundColor: drawerActiveTab === 'yaml' ? 'var(--bg-secondary)' : 'transparent',
                        color: drawerActiveTab === 'yaml' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        borderBottom: drawerActiveTab === 'yaml' ? '2px solid var(--accent-primary)' : 'none'
                      }}
                    >
                      YAML / Inspect
                    </button>
                    <button 
                      onClick={() => setDrawerActiveTab('metrics')}
                      style={{
                        padding: '0 12px', border: 'none', height: '100%', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        backgroundColor: drawerActiveTab === 'metrics' ? 'var(--bg-secondary)' : 'transparent',
                        color: drawerActiveTab === 'metrics' ? 'var(--accent-primary)' : 'var(--text-muted)',
                        borderBottom: drawerActiveTab === 'metrics' ? '2px solid var(--accent-primary)' : 'none'
                      }}
                    >
                      Metrics
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  title={isDrawerCollapsed ? "Expand Inspector" : "Collapse Inspector"}
                >
                  {isDrawerCollapsed ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
                </button>
              </div>
            </div>

            {/* Drawer Body content (Visible only if not collapsed) */}
            {!isDrawerCollapsed && (
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-tertiary)' }}>
                
                {/* 1. Logs Tab Content */}
                {drawerActiveTab === 'logs' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Log Filter header bar */}
                    <div style={{ display: 'flex', padding: '6px 16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <Search size={12} style={{ color: 'var(--text-dim)' }} />
                        <input 
                          type="text" 
                          placeholder="Regex Filter..." 
                          value={logsRegex} 
                          onChange={(e) => setLogsRegex(e.target.value)}
                          style={{
                            border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none', width: '200px'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={autoScrollLogs} 
                            onChange={(e) => setAutoScrollLogs(e.target.checked)} 
                          />
                          Auto-scroll
                        </label>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const blob = new Blob([liveLogs.join('\n')], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${selectedResource ? selectedResource.name : 'resource'}-logs.txt`;
                            a.click();
                          }}
                        >
                          <Download size={11} /> Download
                        </button>
                      </div>
                    </div>
                    {/* Log Output Console */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#a7f3d0' }}>
                      {liveLogs
                        .filter(line => !logsRegex || new RegExp(logsRegex, 'i').test(line))
                        .map((line, idx) => (
                          <div key={idx} style={{ lineHeight: '1.4' }}>{line}</div>
                        ))
                      }
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}

                {/* 2. Interactive Terminal Tab Content */}
                {drawerActiveTab === 'terminal' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#f3f4f6' }}>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {terminalHistory.map((line, idx) => (
                        <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>{line}</div>
                      ))}
                    </div>
                    <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '6px' }}>
                      <span style={{ color: 'var(--accent-primary)', marginRight: '6px', fontWeight: 600 }}>$</span>
                      <input 
                        type="text" 
                        value={terminalInput} 
                        onChange={(e) => setTerminalInput(e.target.value)}
                        placeholder="Type shell command (e.g. ls, df -h, env) and press Enter..."
                        style={{
                          flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.75rem', fontFamily: 'monospace'
                        }}
                      />
                    </form>
                  </div>
                )}

                {/* 3. YAML / Inspect Tab Content */}
                {drawerActiveTab === 'yaml' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Monaco style editor container */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.75rem', backgroundColor: 'var(--bg-tertiary)', color: '#cbd5e1' }}>
                      <textarea
                        value={yamlContent}
                        onChange={(e) => setYamlContent(e.target.value)}
                        style={{
                          width: '100%', height: '100%', background: 'transparent', border: 'none', color: '#e2e8f0', outline: 'none', fontFamily: 'monospace', fontSize: '0.75rem', resize: 'none'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* 4. Resource Metrics Tab Content */}
                {drawerActiveTab === 'metrics' && (
                  <div style={{ display: 'flex', padding: '16px', gap: '16px', height: '100%', overflowY: 'auto' }}>
                    
                    {/* CPU Metrics Card */}
                    <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Cpu size={12} style={{ color: 'var(--accent-primary)' }} /> CPU UTILIZATION
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {metricHistory.cpu[metricHistory.cpu.length - 1].toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* SVG CPU Sparkline */}
                      <div style={{ flex: 1, minHeight: '60px' }}>
                        <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                          <defs>
                            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path 
                            d={`M 0 30 ${metricHistory.cpu.map((val, idx) => `L ${(idx / (metricHistory.cpu.length - 1)) * 100} ${30 - (val / 100) * 30}`).join(' ')} L 100 30 Z`} 
                            fill="url(#cpuGrad)" 
                          />
                          <path 
                            d={metricHistory.cpu.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / (metricHistory.cpu.length - 1)) * 100} ${30 - (val / 100) * 30}`).join(' ')} 
                            fill="none" 
                            stroke="var(--accent-primary)" 
                            strokeWidth="1.5" 
                          />
                        </svg>
                      </div>
                    </div>

                    {/* RAM Metrics Card */}
                    <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Activity size={12} style={{ color: '#c084fc' }} /> MEMORY ALLOCATION
                        </span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {metricHistory.memory[metricHistory.memory.length - 1].toFixed(1)}%
                        </span>
                      </div>

                      {/* SVG Memory Sparkline */}
                      <div style={{ flex: 1, minHeight: '60px' }}>
                        <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                          <defs>
                            <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <path 
                            d={`M 0 30 ${metricHistory.memory.map((val, idx) => `L ${(idx / (metricHistory.memory.length - 1)) * 100} ${30 - (val / 100) * 30}`).join(' ')} L 100 30 Z`} 
                            fill="url(#memGrad)" 
                          />
                          <path 
                            d={metricHistory.memory.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / (metricHistory.memory.length - 1)) * 100} ${30 - (val / 100) * 30}`).join(' ')} 
                            fill="none" 
                            stroke="#c084fc" 
                            strokeWidth="1.5" 
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

        </div>

      </div>

      {/* Context Menu Overlay */}
      {contextMenu && (
        <>
          <div 
            onClick={() => setContextMenu(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
          />
          <div style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-lg)',
            padding: '4px 0',
            zIndex: 99999,
            minWidth: '150px'
          }}>
            {activePlatform === 'DOCKER' ? (
              <>
                <div onClick={() => handleContextMenuAction('Restart', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>🔄 Restart</div>
                <div onClick={() => handleContextMenuAction('Pause', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>⏸ Pause</div>
                <div onClick={() => handleContextMenuAction('Inspect', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>🔍 Inspect</div>
                <div onClick={() => handleContextMenuAction('Commit Image', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>💾 Commit Image</div>
                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
                <div onClick={() => handleContextMenuAction('Prune', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--accent-danger)', cursor: 'pointer' }}>🧹 Prune</div>
              </>
            ) : (
              <>
                <div onClick={() => handleContextMenuAction('Scale Replicas', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>⚖️ Scale Replicas</div>
                <div onClick={() => handleContextMenuAction('Restart Rollout', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>🔄 Restart Rollout</div>
                <div onClick={() => handleContextMenuAction('Port-Forward', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>🚇 Port-Forward</div>
                <div onClick={() => handleContextMenuAction('View Events', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>📋 View Events</div>
                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
                <div onClick={() => handleContextMenuAction('Delete', contextMenu.item)} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--accent-danger)', cursor: 'pointer' }}>❌ Delete</div>
              </>
            )}
          </div>
        </>
      )}

    </div>
  );
};
