import React from 'react';
import {
  Search,
  Key,
  ArrowUpDown,
  Settings,
  Lock,
  Plus,
  Terminal,
  Sparkles,
  Globe
} from 'lucide-react';
import { TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenKeyManager: () => void;
  onOpenImportExport: () => void;
  onOpenSettings: () => void;
  onAddServer: () => void;
  onLockVault: () => void;
  onToggleAI?: () => void;
  settings?: TerminalSettings;
  onToggleLanguage?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenKeyManager,
  onOpenImportExport,
  onOpenSettings,
  onAddServer,
  onLockVault,
  onToggleAI,
  settings,
  onToggleLanguage
}) => {
  const { t, lang } = useTranslation(settings);

  return (
    <div
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '80px', // Reserved space for macOS native traffic light buttons (Red/Yellow/Green)
        paddingRight: '16px',
        gap: '16px',
        userSelect: 'none',
        WebkitAppRegion: 'drag'
      } as any}
    >
      {/* Left Section: Brand Logo + Search Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          WebkitAppRegion: 'no-drag'
        } as any}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            OmniTerminal
          </span>
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', width: '300px' }}>
          <input
            type="text"
            className="input-field"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ paddingLeft: '36px', height: '34px', fontSize: '0.82rem' }}
          />
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Section: Toolbar Quick Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          WebkitAppRegion: 'no-drag'
        } as any}
      >
        {/* Quick Language Toggle Button */}
        {onToggleLanguage && (
          <button
            className="btn-secondary"
            onClick={onToggleLanguage}
            style={{
              height: '34px',
              padding: '0 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Đổi Ngôn Ngữ / Change Language"
          >
            <Globe size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>{lang === 'vi' ? '🇻🇳 VI' : '🇺🇸 EN'}</span>
          </button>
        )}

        <button
          className="btn-secondary"
          onClick={onToggleAI}
          style={{
            height: '34px',
            fontSize: '0.8rem',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}
          title={t('aiAssistant')}
        >
          <Sparkles size={15} />
          <span>{t('aiAssistant')}</span>
        </button>

        <button
          className="btn-primary"
          onClick={onAddServer}
          style={{ height: '34px', fontSize: '0.8rem' }}
        >
          <Plus size={15} />
          <span>{t('addServer')}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenKeyManager}
          style={{ height: '34px', fontSize: '0.8rem' }}
          title="Quản lý SSH Key"
        >
          <Key size={15} />
          <span>{t('sshKeys')}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenImportExport}
          style={{ height: '34px', fontSize: '0.8rem' }}
          title="Xuất / Nhập cấu hình mã hóa"
        >
          <ArrowUpDown size={15} />
          <span>{t('importExport')}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenSettings}
          style={{ height: '34px', padding: '8px', width: '34px', justifyContent: 'center' }}
          title={t('settings')}
        >
          <Settings size={16} />
        </button>

        <button
          className="btn-secondary"
          onClick={onLockVault}
          style={{ height: '34px', padding: '8px', width: '34px', justifyContent: 'center', color: 'var(--accent-warning)' }}
          title={t('lockVault')}
        >
          <Lock size={16} />
        </button>
      </div>
    </div>
  );
};
