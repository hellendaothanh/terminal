import { Terminal, FolderOpen, Monitor, Key, Settings, X, Plus, Database, PanelLeftClose, PanelLeftOpen, Box, Cloud, Activity } from 'lucide-react';
import { TabItem, TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface TabBarProps {
  tabs: TabItem[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  settings?: TerminalSettings;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onToggleSidebar,
  isSidebarCollapsed,
  settings
}) => {
  const { t } = useTranslation(settings);

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
      case 'ERD_SCHEMA_DIFF':
      case 'VISUAL_QUERY_BUILDER':
      case 'DATA_PUMP':
        return <Database size={14} style={{ color: '#c084fc' }} />;
      case 'DOCKER_K8S':
        return <Box size={14} style={{ color: 'var(--env-dev)' }} />;
      case 'CLOUD_EXPLORER':
        return <Cloud size={14} style={{ color: 'var(--accent-primary)' }} />;
      case 'NET_DIAGNOSTICS':
        return <Activity size={14} style={{ color: 'var(--accent-primary)' }} />;
      default:
        return <Terminal size={14} />;
    }
  };

  return (
    <div style={{
      height: '40px',
      backgroundColor: 'var(--bg-secondary)', // Matches secondary panel
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'flex-end', // Align tabs to bottom
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
            marginRight: '6px',
            marginBottom: '4px'
          }}
          title={isSidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '100%' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              style={{
                height: isActive ? '34px' : '30px',
                padding: '0 14px',
                backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent', // Matches workspace background
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                borderTop: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                borderLeft: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                borderRight: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                maxWidth: '220px',
                borderBottom: isActive ? '1px solid var(--bg-primary)' : 'none',
                marginBottom: isActive ? '-1px' : '0' // Overlap bottom border
              }}
            >
              {getTabIcon(tab.type)}
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tab.type === 'PASSWORD_MANAGER' ? t('passwords') :
                 tab.type === 'OTP_MANAGER' ? t('otpAuth') :
                 tab.type === 'TUNNEL_MANAGER' ? t('sshTunnels') :
                 tab.type === 'MULTI_EXEC_MANAGER' ? t('multiExec') :
                 tab.type === 'AUDIT_LOG_MANAGER' ? t('auditLogs') :
                 tab.type === 'ERD_SCHEMA_DIFF' ? t('erdDiff') :
                 tab.type === 'VISUAL_QUERY_BUILDER' ? t('visualQueryBuilder') :
                 tab.type === 'DATA_PUMP' ? t('dataPump') :
                 tab.type === 'DOCKER_K8S' ? t('dockerK8s') :
                 tab.type === 'CLOUD_EXPLORER' ? t('cloudExplorer') :
                 tab.type === 'NET_DIAGNOSTICS' ? t('netDiagnostics') : tab.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? 'var(--text-muted)' : 'transparent',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--accent-danger)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = isActive ? 'var(--text-muted)' : 'transparent';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title={t('closeTab')}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        <button
          onClick={onNewTab}
          style={{
            height: '26px',
            width: '26px',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginLeft: '4px',
            marginBottom: '4px'
          }}
          title={t('newTab')}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
