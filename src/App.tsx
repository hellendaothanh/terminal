import React, { useState, useEffect } from 'react';
import { ServerConfig, SSHKey, VaultData, TabItem, Protocol, Environment, TerminalSettings } from './types';
import { LockScreen } from './components/LockScreen';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { TabBar } from './components/TabBar';
import { SSHTerminal } from './components/SSHTerminal';
import { SFTPExplorer } from './components/SFTPExplorer';
import { RDPViewer } from './components/RDPViewer';
import { DatabaseExplorer } from './components/DatabaseExplorer';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { Dashboard } from './components/Dashboard';
import { ServerModal } from './components/ServerModal';
import { KeyManagerModal } from './components/KeyManagerModal';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [hasVault, setHasVault] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Vault State
  const [vaultData, setVaultData] = useState<VaultData>({ servers: [], keys: [] });

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
  const [settings, setSettings] = useState<TerminalSettings>({
    fontSize: 14,
    fontFamily: 'JetBrains Mono, monospace',
    theme: 'one-dark',
    cursorBlink: true,
    scrollback: 5000
  });

  useEffect(() => {
    // Check initial Vault status
    if (window.api) {
      window.api.vaultCheckStatus().then((status) => {
        setHasVault(status.hasVault);
        setIsUnlocked(status.isUnlocked);
        if (status.isUnlocked) {
          loadVaultData();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const loadVaultData = async () => {
    try {
      const data = await window.api.vaultGetData();
      setVaultData(data || { servers: [], keys: [] });
    } catch (e) {
      console.error('Lỗi khi tải kho dữ liệu:', e);
    }
  };

  const saveVaultData = async (newData: VaultData) => {
    setVaultData(newData);
    await window.api.vaultSaveData(newData);
  };

  const handleInitVault = async (passphrase: string): Promise<boolean> => {
    const res = await window.api.vaultInit(passphrase);
    if (res.success) {
      setHasVault(true);
      setIsUnlocked(true);
      await loadVaultData();
      return true;
    }
    return false;
  };

  const handleUnlockVault = async (passphrase: string): Promise<boolean> => {
    const res = await window.api.vaultUnlock(passphrase);
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
    const newTab: TabItem = {
      id: tabId,
      title,
      type: protocol,
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
        onOpenKeyManager={() => setIsKeyManagerOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleAI={() => setIsAIOpen((v) => !v)}
        settings={settings}
        onToggleLanguage={() => setSettings((s) => ({ ...s, language: s.language === 'en' ? 'vi' : 'en' }))}
        onAddServer={() => {
          setEditingServer(null);
          setIsServerModalOpen(true);
        }}
        onLockVault={handleLockVault}
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
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
          settings={settings}
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
                settings={settings}
              />
            </div>

            {/* Persistent Tab Views - Keeps SSH/SFTP/RDP sessions alive when switching tabs */}
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              if (!tab.server) return null;

              return (
                <div
                  key={tab.id}
                  style={{
                    display: isActive ? 'flex' : 'none',
                    height: '100%',
                    width: '100%'
                  }}
                >
                  {tab.type === 'SSH' ? (
                    <SSHTerminal
                      sessionId={tab.id}
                      server={tab.server}
                      keyObj={vaultData.keys.find((k) => k.id === tab.server?.privateKeyId)}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  ) : tab.type === 'SFTP' ? (
                    <SFTPExplorer
                      sessionId={tab.id}
                      server={tab.server}
                      keyObj={vaultData.keys.find((k) => k.id === tab.server?.privateKeyId)}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  ) : tab.type === 'DATABASE' ? (
                    <DatabaseExplorer
                      sessionId={tab.id}
                      server={tab.server}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  ) : (
                    <RDPViewer
                      sessionId={tab.id}
                      server={tab.server}
                      settings={settings}
                      onUpdateServerPassword={handleUpdateServerPassword}
                    />
                  )}
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
        onImportVaultData={(imported) => saveVaultData(imported)}
        settings={settings}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
      />
    </div>
  );
};
