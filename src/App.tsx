import React, { useState, useEffect } from 'react';
import { ServerConfig, SSHKey, VaultData, TabItem, Protocol, Environment, TerminalSettings } from './types';
import { LockScreen } from './components/LockScreen';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { SSHTerminal } from './components/SSHTerminal';
import { SFTPExplorer } from './components/SFTPExplorer';
import { S3Explorer } from './components/S3Explorer';
import { RDPViewer } from './components/RDPViewer';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { Dashboard } from './components/Dashboard';
import { ServerModal } from './components/ServerModal';
import { KeyManagerModal } from './components/KeyManagerModal';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';
import { PasswordManager } from './components/PasswordManager';
import { OTPManager } from './components/OTPManager';
import { SSHTunnelManager } from './components/SSHTunnelManager';
import { MultiExecManager } from './components/MultiExecManager';
import { LogAggregator } from './components/LogAggregator';
import { AuditLogManager } from './components/AuditLogManager';
import { ERDAndSchemaDiff } from './components/ERDAndSchemaDiff';
import { TeamSyncModal } from './components/TeamSyncModal';
import { PluginManagerModal } from './components/PluginManagerModal';
import { CustomConnectorPanel } from './components/CustomConnectorPanel';
import { VisualQueryBuilder } from './components/VisualQueryBuilder';
import { DataPump } from './components/DataPump';
import { DockerK8sPanel } from './components/DockerK8sPanel';
import { CloudExplorer } from './components/CloudExplorer';
import { NetDiagnosticsPanel } from './components/NetDiagnosticsPanel';

export const App: React.FC = () => {
  const [hasVault, setHasVault] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Vault State
  const [vaultData, setVaultData] = useState<VaultData>({ servers: [], keys: [], passwords: [], otps: [], tunnels: [], snippets: [] });

  // Navigation & Search State
  const [selectedEnv, setSelectedEnv] = useState<Environment | 'ALL'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tab Workspace State
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Modal State
  const [isServerModalOpen, setIsServerModalOpen] = useState<boolean>(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [isKeyManagerOpen, setIsKeyManagerOpen] = useState<boolean>(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDataPumpOpen, setIsDataPumpOpen] = useState(false);
  const [isTeamSyncOpen, setIsTeamSyncOpen] = useState(false);
  const [isPluginManagerOpen, setIsPluginManagerOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Terminal Settings
  const [settings, setSettings] = useState<TerminalSettings>(() => {
    const saved = localStorage.getItem('omni_terminal_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          fontSize: 14,
          fontFamily: 'JetBrains Mono, monospace',
          theme: 'one-dark',
          cursorBlink: true,
          scrollback: 5000,
          language: 'vi',
          ...parsed
        };
      } catch (e) {
        console.error('Lỗi tải cài đặt đã lưu:', e);
      }
    }
    return {
      fontSize: 14,
      fontFamily: 'JetBrains Mono, monospace',
      theme: 'one-dark',
      cursorBlink: true,
      scrollback: 5000,
      language: 'vi'
    };
  });

  useEffect(() => {
    localStorage.setItem('omni_terminal_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    // Check initial Vault status
    if (window.api) {
      const savedDbPath = localStorage.getItem('omni_vault_db_path') || null;
      window.api.vaultCheckStatus(savedDbPath).then((status) => {
        setHasVault(status.hasVault);
        setIsUnlocked(status.isUnlocked);
        if (status.isUnlocked) {
          loadVaultData();
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const loadVaultData = async () => {
    try {
      const data = await window.api.vaultGetData();
      setVaultData({
        servers: data?.servers || [],
        keys: data?.keys || [],
        passwords: data?.passwords || [],
        otps: data?.otps || [],
        tunnels: data?.tunnels || [],
        snippets: data?.snippets || []
      });
    } catch (e) {
      console.error('Lỗi khi tải kho dữ liệu:', e);
    }
  };

  const saveVaultData = async (newData: VaultData) => {
    setVaultData(newData);
    await window.api.vaultSaveData(newData);
  };

  const handleImportVaultData = async (importedData: VaultData) => {
    const res = await window.api.vaultSaveData(importedData);
    if (res.success) {
      setVaultData(importedData);
      if (importedData.settings) {
        setSettings(importedData.settings);
      }
      setIsImportExportOpen(false);
    }
  };

  const handleMergeVaultData = async (importedData: VaultData) => {
    if (!vaultData) return;
    
    const newServers = [...(vaultData.servers || [])];
    const newKeys = [...(vaultData.keys || [])];
    
    importedData.servers?.forEach(srv => {
      const idx = newServers.findIndex(s => s.id === srv.id);
      if (idx === -1) newServers.push(srv);
      else newServers[idx] = srv; // overwrite if exists
    });

    importedData.keys?.forEach(k => {
      const idx = newKeys.findIndex(key => key.id === k.id);
      if (idx === -1) newKeys.push(k);
      else newKeys[idx] = k;
    });

    const updatedData = { ...vaultData, servers: newServers, keys: newKeys };
    const saved = await window.api.vaultSaveData(updatedData);
    if (saved.success) {
      setVaultData(updatedData);
    }
  };

  const handleUpdateSettings = (newSettings: TerminalSettings) => {
    setSettings(newSettings);
  };

  const handleInitVault = async (dbPath: string, passphrase: string, keyFileContent?: string): Promise<boolean> => {
    const res = await window.api.vaultInit(dbPath, passphrase, keyFileContent);
    if (res.success) {
      setHasVault(true);
      setIsUnlocked(true);
      await loadVaultData();
      return true;
    }
    return false;
  };

  const handleUnlockVault = async (dbPath: string, passphrase: string, keyFileContent?: string): Promise<boolean> => {
    const res = await window.api.vaultUnlock(dbPath, passphrase, keyFileContent);
    if (res.success && res.data) {
      setIsUnlocked(true);
      setVaultData(res.data);
      return true;
    }
    return false;
  };

  const handleLockVault = async () => {
    await window.api.vaultLock();
    setIsUnlocked(false);
    setTabs([]);
    setActiveTabId(null);
  };

  /* Tab Management */
  const handleConnect = (server: ServerConfig, protocol: Protocol) => {
    const existingCount = tabs.filter(
      (t) => t.serverId === server.id && t.type === protocol
    ).length;

    const title = existingCount > 0
      ? `${protocol}: ${server.name} (${existingCount + 1})`
      : `${protocol}: ${server.name}`;

    const tabId = `${protocol.toLowerCase()}_${server.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let tabType: TabItem['type'] = 'SSH';
    if (protocol === 'SFTP') tabType = 'SFTP';
    else if (protocol === 'RDP') tabType = 'RDP';
    else if (protocol === 'DATABASE') tabType = 'DATABASE';
    else if (protocol === 'S3') tabType = 'S3_EXPLORER';

    const newTab: TabItem = {
      id: tabId,
      title,
      type: tabType,
      serverId: server.id,
      server
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(tabId);
  };

  const handleCloseTab = (tabId: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== tabId);
      if (activeTabId === tabId) {
        const remaining = filtered[filtered.length - 1];
        setActiveTabId(remaining ? remaining.id : null);
      }
      return filtered;
    });
  };

  const handleSaveServer = (serverData: Partial<ServerConfig>) => {
    setVaultData((prev) => {
      let newData: VaultData;
      let updatedServerObj: ServerConfig | null = null;

      if (serverData.id) {
        // Edit existing
        const updated = prev.servers.map((s) => {
          if (s.id === serverData.id) {
            updatedServerObj = { ...s, ...serverData, updatedAt: Date.now() } as ServerConfig;
            return updatedServerObj;
          }
          return s;
        });
        newData = { ...prev, servers: updated };
      } else {
        // Create new
        const newServer: ServerConfig = {
          id: 'srv_' + Date.now(),
          name: serverData.name || 'Server Mới',
          host: serverData.host || '127.0.0.1',
          port: serverData.port || 22,
          protocol: serverData.protocol || 'SSH',
          username: serverData.username || 'root',
          authType: serverData.authType || 'password',
          password: serverData.password,
          privateKeyId: serverData.privateKeyId,
          environment: serverData.environment || 'DEV',
          tags: serverData.tags || [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        newData = { ...prev, servers: [...prev.servers, newServer] };
      }

      window.api.vaultSaveData(newData);

      if (updatedServerObj) {
        setTabs((prevTabs) =>
          prevTabs.map((t) => (t.serverId === serverData.id ? { ...t, server: updatedServerObj! } : t))
        );
      }
      return newData;
    });
    setEditingServer(null);
  };

  const handleUpdateServerPassword = (serverId: string, newPassword: string) => {
    setVaultData((prev) => {
      let updatedServerObj: ServerConfig | null = null;
      const updated = prev.servers.map((s) => {
        if (s.id === serverId) {
          updatedServerObj = { ...s, authType: 'password' as const, password: newPassword, updatedAt: Date.now() };
          return updatedServerObj;
        }
        return s;
      });
      const newData = { ...prev, servers: updated };
      window.api.vaultSaveData(newData);

      if (updatedServerObj) {
        setTabs((prevTabs) =>
          prevTabs.map((t) => (t.serverId === serverId ? { ...t, server: updatedServerObj! } : t))
        );
      }
      return newData;
    });
  };

  const handleDeleteServer = (serverId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa máy chủ này khỏi kho dữ liệu?')) {
      setVaultData((prev) => {
        const updated = prev.servers.filter((s) => s.id !== serverId);
        const newData = { ...prev, servers: updated };
        window.api.vaultSaveData(newData);
        return newData;
      });
    }
  };

  const handleCloneServer = (server: ServerConfig) => {
    setVaultData((prev) => {
      const clonedServer: ServerConfig = {
        ...server,
        id: 'srv_' + Date.now(),
        name: server.name + ' (Copy)',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      const newData = { ...prev, servers: [...prev.servers, clonedServer] };
      window.api.vaultSaveData(newData);
      return newData;
    });
  };

  /* Key Management */
  const handleSaveKey = (key: SSHKey) => {
    const updatedKeys = [...vaultData.keys, key];
    saveVaultData({ ...vaultData, keys: updatedKeys });
  };

  const handleDeleteKey = (keyId: string) => {
    if (confirm('Bạn có chắc muốn xóa SSH Key này?')) {
      const updatedKeys = vaultData.keys.filter((k) => k.id !== keyId);
      saveVaultData({ ...vaultData, keys: updatedKeys });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ color: 'var(--text-muted)' }}>Đang tải hệ thống OmniTerminal...</div>
      </div>
    );
  }

  // Lock Screen view
  if (!isUnlocked) {
    return (
      <LockScreen
        hasVault={hasVault}
        onUnlock={handleUnlockVault}
        onInitVault={handleInitVault}
        language={settings.language || 'vi'}
        onToggleLanguage={() => setSettings((s) => ({ ...s, language: s.language === 'en' ? 'vi' : 'en' }))}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }}>
      {/* TopBar Header */}
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleAI={() => setIsAIOpen((v) => !v)}
        settings={settings}
        onToggleLanguage={() => setSettings((s) => ({ ...s, language: s.language === 'en' ? 'vi' : 'en' }))}
        onAddServer={() => {
          setEditingServer(null);
          setIsServerModalOpen(true);
        }}
      />

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Navigation Sidebar */}
        <Sidebar
          servers={vaultData.servers}
          selectedEnv={selectedEnv}
          onSelectEnv={setSelectedEnv}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          searchQuery={searchQuery}
          onConnect={handleConnect}
          onAddServer={() => {
            setEditingServer(null);
            setIsServerModalOpen(true);
          }}
          onEditServer={(server) => {
            setEditingServer(server);
            setIsServerModalOpen(true);
          }}
          onDeleteServer={handleDeleteServer}
          onCloneServer={handleCloneServer}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
          settings={settings}
          onOpenPasswords={() => {
            const exists = tabs.find((t) => t.type === 'PASSWORD_MANAGER');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Password Manager', type: 'PASSWORD_MANAGER' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenOTPs={() => {
            const exists = tabs.find((t) => t.type === 'OTP_MANAGER');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: '2FA Authenticator (OTP)', type: 'OTP_MANAGER' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenTunnels={() => {
            const exists = tabs.find((t) => t.type === 'TUNNEL_MANAGER');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'SSH Tunnels', type: 'TUNNEL_MANAGER' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenMultiExec={() => {
            const exists = tabs.find((t) => t.type === 'MULTI_EXEC_MANAGER');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Multi-Exec & Snippets', type: 'MULTI_EXEC_MANAGER' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenAuditLogs={() => {
            const exists = tabs.find((t) => t.type === 'AUDIT_LOG_MANAGER');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Audit Logs', type: 'AUDIT_LOG_MANAGER' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenTeamSync={() => setIsTeamSyncOpen(true)}
          onOpenErdDiff={() => {
            const exists = tabs.find((t) => t.type === 'ERD_SCHEMA_DIFF');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'ERD & Schema Diff', type: 'ERD_SCHEMA_DIFF' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenVisualQueryBuilder={() => {
            const exists = tabs.find((t) => t.type === 'VISUAL_QUERY_BUILDER');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Visual Query Builder', type: 'VISUAL_QUERY_BUILDER' }]);
              setActiveTabId(newTabId);
            }
          }}

          onOpenDataPump={() => {
            const exists = tabs.find((t) => t.type === 'DATA_PUMP');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Data Pump Stream', type: 'DATA_PUMP' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenDockerK8s={() => {
            const exists = tabs.find((t) => t.type === 'DOCKER_K8S');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Docker & K8s Panel', type: 'DOCKER_K8S' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenCloudExplorer={() => {
            const exists = tabs.find((t) => t.type === 'CLOUD_EXPLORER');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'S3 Explorer', type: 'CLOUD_EXPLORER' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenPluginManager={() => setIsPluginManagerOpen(true)}
          onOpenCustomConnector={() => {
            const exists = tabs.find((t) => t.type === 'CUSTOM_CONNECTOR');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Custom Connectors', type: 'CUSTOM_CONNECTOR' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenLogAggregator={() => {
            const exists = tabs.find((t) => t.type === 'LOG_AGGREGATOR');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Log Aggregator', type: 'LOG_AGGREGATOR' }]);
              setActiveTabId(newTabId);
            }
          }}
          onOpenDiagnostics={() => {
            const exists = tabs.find((t) => t.type === 'NET_DIAGNOSTICS');
            if (exists) {
              setActiveTabId(exists.id);
            } else {
              const newTabId = 'tab_' + Date.now();
              setTabs([...tabs, { id: newTabId, title: 'Network Diagnostics', type: 'NET_DIAGNOSTICS' }]);
              setActiveTabId(newTabId);
            }
          }}
        />

        {/* Central Active Viewport Container */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', overflow: 'hidden' }}>
          {/* Multi-Tab Bar Header */}
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
            onNewTab={() => setActiveTabId(null)}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed((v) => !v)}
            settings={settings}
          />

          {/* Active Workspace Component Container */}
          <div style={{ flex: 1, height: 'calc(100% - 38px)', overflow: 'hidden', position: 'relative' }}>
            {/* Dashboard View (when no tab is active) */}
            <div style={{ display: !activeTabId ? 'block' : 'none', height: '100%' }}>
              <Dashboard
                servers={vaultData.servers}
                onConnect={handleConnect}
                onAddServer={() => {
                  setEditingServer(null);
                  setIsServerModalOpen(true);
                }}
                onEditServer={(server) => {
                  setEditingServer(server);
                  setIsServerModalOpen(true);
                }}
                onDeleteServer={handleDeleteServer}
                onCloneServer={handleCloneServer}
                settings={settings}
              />
            </div>

            {/* Persistent Tab Views - Keeps SSH/SFTP/RDP/Managers alive when switching tabs */}
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              if (!tab.server && tab.type !== 'PASSWORD_MANAGER' && tab.type !== 'OTP_MANAGER' && tab.type !== 'TUNNEL_MANAGER' && tab.type !== 'MULTI_EXEC_MANAGER' && tab.type !== 'AUDIT_LOG_MANAGER' && tab.type !== 'ERD_SCHEMA_DIFF' && tab.type !== 'VISUAL_QUERY_BUILDER' && tab.type !== 'DATA_PUMP' && tab.type !== 'DOCKER_K8S' && tab.type !== 'CLOUD_EXPLORER' && tab.type !== 'CUSTOM_CONNECTOR') return null;

              return (
                <div
                  key={tab.id}
                  style={{
                    display: isActive ? 'flex' : 'none',
                    height: '100%',
                    width: '100%'
                  }}
                >
                  {tab.type === 'SSH' && tab.server ? (
                    <SSHTerminal
                      sessionId={tab.id}
                      server={tab.server}
                      keyObj={vaultData.keys.find((k) => k.id === tab.server?.privateKeyId)}
                      availableServers={vaultData.servers}
                      keys={vaultData.keys}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  ) : tab.type === 'SFTP' && tab.server ? (
                    <SFTPExplorer
                      sessionId={tab.id}
                      server={tab.server}
                      keyObj={vaultData.keys.find((k) => k.id === tab.server?.privateKeyId)}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  ) : tab.type === 'DATABASE' && tab.server ? (
                    <DatabaseExplorer
                      sessionId={tab.id}
                      server={tab.server}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  ) : tab.type === 'PASSWORD_MANAGER' ? (
                    <PasswordManager
                      passwords={vaultData.passwords || []}
                      settings={settings}
                      onSavePassword={(pw) => {
                        const newPws = vaultData.passwords?.filter((p) => p.id !== pw.id) || [];
                        newPws.push(pw);
                        saveVaultData({ ...vaultData, passwords: newPws });
                      }}
                      onDeletePassword={(id) => {
                        const newPws = vaultData.passwords?.filter((p) => p.id !== id) || [];
                        saveVaultData({ ...vaultData, passwords: newPws });
                      }}
                    />
                  ) : tab.type === 'OTP_MANAGER' ? (
                    <OTPManager
                      otps={vaultData.otps || []}
                      settings={settings}
                      onSaveOTP={(otp) => {
                        const newOTPs = vaultData.otps?.filter((o) => o.id !== otp.id) || [];
                        newOTPs.push(otp);
                        saveVaultData({ ...vaultData, otps: newOTPs });
                      }}
                      onDeleteOTP={(id) => {
                        const newOTPs = vaultData.otps?.filter((o) => o.id !== id) || [];
                        saveVaultData({ ...vaultData, otps: newOTPs });
                      }}
                    />
                  ) : tab.type === 'TUNNEL_MANAGER' ? (
                    <SSHTunnelManager
                      tunnels={vaultData.tunnels || []}
                      servers={vaultData.servers || []}
                      keys={vaultData.keys || []}
                      settings={settings}
                      onSaveTunnel={(tn) => {
                        const newTns = vaultData.tunnels?.filter((t) => t.id !== tn.id) || [];
                        newTns.push(tn);
                        saveVaultData({ ...vaultData, tunnels: newTns });
                      }}
                      onDeleteTunnel={(id) => {
                        const newTns = vaultData.tunnels?.filter((t) => t.id !== id) || [];
                        saveVaultData({ ...vaultData, tunnels: newTns });
                      }}
                    />
                  ) : tab.type === 'MULTI_EXEC_MANAGER' ? (
                    <MultiExecManager
                      snippets={vaultData.snippets || []}
                      servers={vaultData.servers || []}
                      keys={vaultData.keys || []}
                      settings={settings}
                      onSaveSnippet={(sn) => {
                        const newSns = vaultData.snippets?.filter((s) => s.id !== sn.id) || [];
                        newSns.push(sn);
                        saveVaultData({ ...vaultData, snippets: newSns });
                      }}
                      onDeleteSnippet={(id) => {
                        const newSns = vaultData.snippets?.filter((s) => s.id !== id) || [];
                        saveVaultData({ ...vaultData, snippets: newSns });
                      }}
                    />
                  ) : tab.type === 'AUDIT_LOG_MANAGER' ? (
                    <AuditLogManager settings={settings} />
                  ) : tab.type === 'ERD_SCHEMA_DIFF' ? (
                    <ERDAndSchemaDiff servers={vaultData.servers || []} settings={settings} />
                  ) : tab.type === 'VISUAL_QUERY_BUILDER' ? (
                    <VisualQueryBuilder servers={vaultData.servers || []} settings={settings} />
                  ) : tab.type === 'DATA_PUMP' ? (
                    <DataPump servers={vaultData.servers || []} settings={settings} />
                  ) : tab.type === 'DOCKER_K8S' ? (
                    <DockerK8sPanel
                      servers={vaultData.servers || []}
                      settings={settings}
                      onOpenExecTerminal={(server, execCmd) => {
                        const tabId = `ssh_${server.id}_${Date.now()}`;
                        const newTab: TabItem = {
                          id: tabId,
                          title: `Exec: ${server.name}`,
                          type: 'SSH',
                          serverId: server.id,
                          server
                        };
                        setTabs((prev) => [...prev, newTab]);
                        setActiveTabId(tabId);
                      }}
                    />
                  ) : tab.type === 'CLOUD_EXPLORER' ? (
                    <CloudExplorer
                      settings={settings}
                      onImportCloudInstanceAsServer={(serverData) => {
                        handleSaveServer(serverData);
                      }}
                      onConnectServer={(server, protocol) => {
                        handleConnect(server, protocol);
                      }}
                    />
                  ) : tab.type === 'LOG_AGGREGATOR' ? (
                    <LogAggregator servers={vaultData.servers || []} keys={vaultData.keys || []} />
                  ) : tab.type === 'NET_DIAGNOSTICS' ? (
                    <NetDiagnosticsPanel settings={settings} />
                  ) : tab.server ? (
                    <RDPViewer
                      sessionId={tab.id}
                      server={tab.server}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Docked AI Assistant Side Panel */}
        <AIAssistantDrawer
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          settings={settings}
          activeTabId={activeTabId || undefined}
        />
      </div>

      {/* Modals */}
      <ServerModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onSave={handleSaveServer}
        editingServer={editingServer}
        keys={vaultData.keys}
        availableServers={vaultData.servers}
        settings={settings}
      />

      <KeyManagerModal
        isOpen={isKeyManagerOpen}
        onClose={() => setIsKeyManagerOpen(false)}
        keys={vaultData.keys}
        onSaveKey={handleSaveKey}
        onDeleteKey={handleDeleteKey}
        settings={settings}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        vaultData={vaultData}
        onImportVaultData={handleImportVaultData}
        settings={settings}
      />

      <TeamSyncModal
        isOpen={isTeamSyncOpen}
        onClose={() => setIsTeamSyncOpen(false)}
        vaultData={vaultData}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
        onMergeVaultData={handleMergeVaultData}
      />

      <PluginManagerModal
        isOpen={isPluginManagerOpen}
        onClose={() => setIsPluginManagerOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onOpenKeyManager={() => setIsKeyManagerOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onLockVault={handleLockVault}
      />
    </div>
  );
};
