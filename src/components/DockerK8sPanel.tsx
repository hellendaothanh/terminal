import React, { useState, useEffect, useRef } from 'react';
import { ServerConfig, TerminalSettings } from '../types';
import {
  Box, Layers, RefreshCw, Terminal, FileText, Play, Square,
  Search, ChevronRight, ChevronDown,
  Trash2, Maximize2, Minimize2,
  Plus
} from 'lucide-react';
import { INITIAL_DOCKER_RESOURCES, INITIAL_K8S_RESOURCES } from './docker-k8s/constants';
import type { ResourceItem } from './docker-k8s/types';
import { LogsTab, TerminalTab, YamlTab, MetricsTab } from './docker-k8s/DrawerTabs';
import { HelmInstallModal, HelmUpgradeModal, HelmRollbackModal } from './docker-k8s/HelmModals';

interface DockerK8sPanelProps {
  servers: ServerConfig[];
  onOpenExecTerminal?: (server: ServerConfig, execCmd: string) => void;
  settings?: TerminalSettings;
}

export const DockerK8sPanel: React.FC<DockerK8sPanelProps> = ({
  servers,
  settings
}) => {
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

  // Helm & CRD States
  const [showInstallHelmModal, setShowInstallHelmModal] = useState(false);
  const [helmReleaseName, setHelmReleaseName] = useState('');
  const [helmChartName, setHelmChartName] = useState('bitnami/nginx');
  const [helmVersion, setHelmVersion] = useState('15.1.2');
  const [helmValues, setHelmValues] = useState('replicaCount: 2\nservice:\n  type: ClusterIP\n  port: 80');

  const [showUpgradeHelmModal, setShowUpgradeHelmModal] = useState(false);
  const [targetUpgradeItem, setTargetUpgradeItem] = useState<ResourceItem | null>(null);
  const [upgradeVersion, setUpgradeVersion] = useState('');

  const [showRollbackHelmModal, setShowRollbackHelmModal] = useState(false);
  const [targetRollbackItem, setTargetRollbackItem] = useState<ResourceItem | null>(null);
  const [rollbackRevision, setRollbackRevision] = useState('1');

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
  const [dockerResources, setDockerResources] = useState<Record<string, ResourceItem[]>>(INITIAL_DOCKER_RESOURCES);

  const [k8sResources, setK8sResources] = useState<Record<string, ResourceItem[]>>(INITIAL_K8S_RESOURCES);

  // Simulated live logs
  const [liveLogs, setLiveLogs] = useState<string[]>([]);

  useEffect(() => {
    if (selectedResource) {
      if (selectedResource.type === 'HelmRelease') {
        setLiveLogs([
          `REVISION\tUPDATED\t\t\t\tSTATUS\t\tCHART\t\t\tAPP VERSION\tDESCRIPTION`,
          `1\t\tMon Aug 10 14:02:11 2026\tsuperseded\tingress-nginx-4.8.2\t1.9.3\t\tInstall complete`,
          `2\t\tTue Aug 11 09:30:15 2026\tdeployed\tingress-nginx-4.8.3\t1.9.4\t\tUpgrade complete`
        ]);
        setYamlContent(
          `# Helm Values for ${selectedResource.name}\nreplicaCount: 2\nimage:\n  repository: ingress-nginx/controller\n  tag: v1.9.4\n  pullPolicy: IfNotPresent\nservice:\n  type: LoadBalancer\n  ports:\n    http: 80\n    https: 443\n`
        );
      } else if (selectedResource.type === 'CRD') {
        setLiveLogs([
          `[${new Date().toLocaleTimeString()}] [INFO] CustomResourceDefinition ${selectedResource.name} status: Active`,
          `[${new Date().toLocaleTimeString()}] [INFO] API group: cert-manager.io`,
          `[${new Date().toLocaleTimeString()}] [INFO] Custom Resource Count: 14`
        ]);
        setYamlContent(
          `apiVersion: apiextensions.k8s.io/v1\nkind: CustomResourceDefinition\nmetadata:\n  name: ${selectedResource.name}\nspec:\n  group: cert-manager.io\n  names:\n    kind: Certificate\n    listKind: CertificateList\n    plural: certificates\n    singular: certificate\n  scope: Namespaced\n  versions:\n  - name: v1\n    served: true\n    storage: true\n    schema:\n      openAPIV3Schema:\n        type: object\n        properties:\n          spec:\n            type: object\n            properties:\n              secretName:\n                type: string\n              dnsNames:\n                type: array\n                items:\n                  type: string\n`
        );
      } else {
        setLiveLogs([
          `[${new Date().toLocaleTimeString()}] [INFO] Starting diagnostics for ${selectedResource.name}...`,
          `[${new Date().toLocaleTimeString()}] [DEBUG] Fetching properties of type: ${selectedResource.type}`,
          `[${new Date().toLocaleTimeString()}] [INFO] Port binding check: OK`,
          `[${new Date().toLocaleTimeString()}] [WARN] Memory utilization currently at ${selectedResource.memory}MB`
        ]);
        setYamlContent(
          `apiVersion: v1\nkind: ${selectedResource.type}\nmetadata:\n  name: ${selectedResource.name}\n  namespace: ${selectedK8sNamespace}\n  labels:\n    app: ${selectedResource.name.split('-')[0]}\n    managed-by: omniterminal\nspec:\n  containers:\n  - name: primary\n    image: ${selectedResource.image || 'unknown'}\n    ports:\n    - containerPort: 80\n    resources:\n      limits:\n        cpu: "500m"\n        memory: "512Mi"\n`
        );
      }
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

  const [isSimulated, setIsSimulated] = useState<boolean>(true);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await window.api.dockerK8sListResources(activePlatform, selectedResourceType, selectedK8sNamespace);
      setIsSimulated(res.isSimulated);
      if (activePlatform === 'DOCKER') {
        setDockerResources(prev => ({
          ...prev,
          [selectedResourceType]: res.resources
        }));
      } else {
        setK8sResources(prev => ({
          ...prev,
          [selectedResourceType]: res.resources
        }));
      }
    } catch (err) {
      console.error('Failed to fetch resources', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [activePlatform, selectedResourceType, selectedK8sNamespace, selectedK8sContext, selectedDockerHost]);

  // Trigger Refresh
  const handleRefresh = () => {
    fetchResources();
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

  const handleBulkAction = async (action: 'start' | 'stop' | 'delete') => {
    const ids = Object.keys(selectedRowIds).filter(k => selectedRowIds[k]);
    if (ids.length === 0) return;
    setLoading(true);
    for (const id of ids) {
      await window.api.dockerK8sExecuteAction(activePlatform, selectedResourceType, action, id);
    }
    setSelectedRowIds({});
    await fetchResources();
    alert(`Bulk ${action} completed.`);
  };

  // Context Menu Action Handlers
  const handleContextMenuAction = async (action: string, item: ResourceItem) => {
    setLoading(true);
    const res = await window.api.dockerK8sExecuteAction(activePlatform, selectedResourceType, action, item.id);
    await fetchResources();
    alert(res.message);
    setContextMenu(null);
  };

  const handleInstallHelm = async () => {
    if (!helmReleaseName.trim()) return;
    setLoading(true);
    await window.api.dockerK8sExecuteAction('K8S', 'helmReleases', 'install', helmReleaseName);
    await fetchResources();
    setShowInstallHelmModal(false);
    setHelmReleaseName('');
    alert(settings?.language === 'vi' ? `Cài đặt Helm Release "${helmReleaseName}" thành công!` : `Helm Release "${helmReleaseName}" installed successfully!`);
  };

  const handleUpgradeHelm = async () => {
    if (!targetUpgradeItem || !upgradeVersion.trim()) return;
    setLoading(true);
    await window.api.dockerK8sExecuteAction('K8S', 'helmReleases', 'upgrade', targetUpgradeItem.name);
    await fetchResources();
    setShowUpgradeHelmModal(false);
    setTargetUpgradeItem(null);
    setUpgradeVersion('');
    alert(settings?.language === 'vi' ? `Nâng cấp Helm Release thành công!` : `Helm Release upgraded successfully!`);
  };

  const handleRollbackHelm = async () => {
    if (!targetRollbackItem) return;
    setLoading(true);
    await window.api.dockerK8sExecuteAction('K8S', 'helmReleases', 'rollback', targetRollbackItem.name);
    await fetchResources();
    setShowRollbackHelmModal(false);
    setTargetRollbackItem(null);
    alert(settings?.language === 'vi' ? `Rollback Helm Release về Revision ${rollbackRevision} thành công!` : `Helm Release rolled back to Revision ${rollbackRevision} successfully!`);
  };

  const handleUninstallHelm = async (item: ResourceItem) => {
    const isVi = settings?.language === 'vi';
    if (confirm(isVi ? `Bạn có chắc chắn muốn gỡ cài đặt Helm release "${item.name}"?` : `Are you sure you want to uninstall Helm release "${item.name}"?`)) {
      setLoading(true);
      await window.api.dockerK8sExecuteAction('K8S', 'helmReleases', 'delete', item.name);
      await fetchResources();
      alert(isVi ? `Gỡ cài đặt Helm release "${item.name}" thành công.` : `Helm release "${item.name}" uninstalled successfully.`);
    }
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
                    
                    <div 
                      onClick={() => setSelectedResourceType('helmReleases')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'helmReleases' ? '#c084fc' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'helmReleases' ? 'rgba(192, 132, 252, 0.08)' : 'transparent' }}
                    >
                      ⛵ Helm Releases ({(k8sResources.helmReleases || []).length})
                    </div>
                    
                    <div 
                      onClick={() => setSelectedResourceType('crds')}
                      style={{ padding: '6px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.78rem', color: selectedResourceType === 'crds' ? '#c084fc' : 'var(--text-muted)', backgroundColor: selectedResourceType === 'crds' ? 'rgba(192, 132, 252, 0.08)' : 'transparent' }}
                    >
                      📜 CRDs ({(k8sResources.crds || []).length})
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

              <div style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 600,
                backgroundColor: isSimulated ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                color: isSimulated ? 'var(--accent-warning)' : 'var(--accent-success)',
                border: '1px solid currentColor',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '32px'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                  display: 'inline-block'
                }} />
                <span>
                  {isSimulated 
                    ? (settings?.language === 'vi' ? '⚠️ Giả lập' : '⚠️ Simulated')
                    : (settings?.language === 'vi' ? '🔌 Kết nối trực tiếp' : '🔌 Live')
                  }
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {selectedResourceType === 'helmReleases' && (
                <button 
                  onClick={() => setShowInstallHelmModal(true)} 
                  className="btn-primary" 
                  style={{ height: '32px', padding: '0 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={12} /> {settings?.language === 'vi' ? 'Cài Đặt Chart' : 'Install Chart'}
                </button>
              )}
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
                
                {/* Drawer Tab Contents */}
                {drawerActiveTab === 'logs' && (
                  <LogsTab
                    logs={liveLogs}
                    logsRegex={logsRegex}
                    onLogsRegexChange={setLogsRegex}
                    autoScroll={autoScrollLogs}
                    onAutoScrollChange={setAutoScrollLogs}
                    resourceName={selectedResource?.name}
                    logsEndRef={logsEndRef}
                  />
                )}

                {drawerActiveTab === 'terminal' && (
                  <TerminalTab
                    history={terminalHistory}
                    input={terminalInput}
                    onInputChange={setTerminalInput}
                    onSubmit={handleTerminalSubmit}
                  />
                )}

                {drawerActiveTab === 'yaml' && (
                  <YamlTab content={yamlContent} onChange={setYamlContent} />
                )}

                {drawerActiveTab === 'metrics' && (
                  <MetricsTab metricHistory={metricHistory} />
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
                {contextMenu.item.type === 'HelmRelease' ? (
                  <>
                    <div onClick={() => { setTargetUpgradeItem(contextMenu.item); setUpgradeVersion(contextMenu.item.image?.match(/Version:\s*([\d.]+)/)?.[1] || '15.1.2'); setShowUpgradeHelmModal(true); setContextMenu(null); }} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>🚀 {settings?.language === 'vi' ? 'Nâng Cấp Release' : 'Upgrade Release'}</div>
                    <div onClick={() => { setTargetRollbackItem(contextMenu.item); setRollbackRevision('1'); setShowRollbackHelmModal(true); setContextMenu(null); }} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>⏮ {settings?.language === 'vi' ? 'Rollback Release' : 'Rollback Release'}</div>
                    <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />
                    <div onClick={() => { handleUninstallHelm(contextMenu.item); setContextMenu(null); }} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--accent-danger)', cursor: 'pointer' }}>❌ {settings?.language === 'vi' ? 'Gỡ Cài Đặt Release' : 'Uninstall Release'}</div>
                  </>
                ) : contextMenu.item.type === 'CRD' ? (
                  <>
                    <div onClick={() => { setSelectedResource(contextMenu.item); setDrawerActiveTab('yaml'); setIsDrawerCollapsed(false); setContextMenu(null); }} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>🔍 {settings?.language === 'vi' ? 'Xem Manifest CRD' : 'Inspect CRD Spec'}</div>
                    <div onClick={() => { alert(settings?.language === 'vi' ? `Đang tải các tài nguyên tùy biến (Custom Resources) của: ${contextMenu.item.name}` : `Viewing Custom Resources for: ${contextMenu.item.name}`); setContextMenu(null); }} style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-main)', cursor: 'pointer' }}>📋 {settings?.language === 'vi' ? 'Xem Custom Resources' : 'View Custom Resources'}</div>
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
              </>
            )}
          </div>
        </>
      )}

      {/* Helm Release Modals */}
      <HelmInstallModal
        isOpen={showInstallHelmModal}
        language={settings?.language}
        releaseName={helmReleaseName}
        onReleaseNameChange={setHelmReleaseName}
        chartName={helmChartName}
        onChartNameChange={setHelmChartName}
        version={helmVersion}
        onVersionChange={setHelmVersion}
        values={helmValues}
        onValuesChange={setHelmValues}
        onCancel={() => setShowInstallHelmModal(false)}
        onInstall={handleInstallHelm}
      />

      <HelmUpgradeModal
        isOpen={showUpgradeHelmModal}
        language={settings?.language}
        targetName={targetUpgradeItem?.name}
        version={upgradeVersion}
        onVersionChange={setUpgradeVersion}
        onCancel={() => setShowUpgradeHelmModal(false)}
        onUpgrade={handleUpgradeHelm}
      />

      <HelmRollbackModal
        isOpen={showRollbackHelmModal}
        language={settings?.language}
        targetName={targetRollbackItem?.name}
        revision={rollbackRevision}
        onRevisionChange={setRollbackRevision}
        onCancel={() => setShowRollbackHelmModal(false)}
        onRollback={handleRollbackHelm}
      />

    </div>
  );
};
