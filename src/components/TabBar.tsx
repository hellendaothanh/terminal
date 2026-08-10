import React from 'react';
import { Terminal, FolderOpen, Monitor, Key, Settings, X, Plus, Database, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TabItem } from '../types';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onToggleSidebar,
  isSidebarCollapsed
}) => {
  const getTabIcon = (type: TabItem['type']) => {
    switch (type) {
      case 'SSH':
        return <Terminal size={14} style={{ color: 'var(--env-dev)' }} />;
      case 'SFTP':
        return <FolderOpen size={14} style={{ color: 'var(--env-staging)' }} />;
      case 'DATABASE':
        return <Database size={14} style={{ color: '#c084fc' }} />;
      case 'RDP':
        return <Monitor size={14} style={{ color: 'var(--accent-primary)' }} />;
      case 'KEY_MANAGER':
        return <Key size={14} style={{ color: 'var(--accent-warning)' }} />;
      case 'SETTINGS':
        return <Settings size={14} style={{ color: 'var(--text-muted)' }} />;
      default:
        return <Terminal size={14} />;
    }
  };

  return (
    <div style={{
      height: '38px',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      paddingLeft: '8px',
      overflowX: 'auto',
      userSelect: 'none'
    }}>
      {/* Sidebar Collapse/Expand Button */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: isSidebarCollapsed ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '6px'
          }}
          title={isSidebarCollapsed ? "Mở danh sách Máy Chủ (Ctrl+B)" : "Thu gọn danh sách Máy Chủ (Ctrl+B)"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '100%' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                height: '30px',
                padding: '0 12px',
                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                borderTop: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                maxWidth: '200px'
              }}
            >
              {getTabIcon(tab.type)}
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Đóng Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <button
          onClick={onNewTab}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '4px'
          }}
          title="Mở Trang Tổng Quan (Dashboard)"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};
