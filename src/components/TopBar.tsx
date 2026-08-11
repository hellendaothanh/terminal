import React from 'react';
import {
  Search,
  Settings,
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
  onOpenSettings: () => void;
  onAddServer: () => void;
  onToggleAI?: () => void;
  settings?: TerminalSettings;
  onToggleLanguage?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onAddServer,
  onToggleAI,
  settings,
  onToggleLanguage
}) => {
  const { t, lang } = useTranslation(settings);

  return (
    <div
      className="glass-panel"
      style={{
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '80px', // Reserved space for macOS native traffic light buttons (Red/Yellow/Green)
        paddingRight: '16px',
        userSelect: 'none',
        WebkitAppRegion: 'drag'
      } as any}
    >
      {/* Left Section: Brand Logo */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          WebkitAppRegion: 'no-drag'
        } as any}
      >
        <Terminal size={18} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          OmniTerminal
        </span>
      </div>

      {/* Center Section: Search Box */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          WebkitAppRegion: 'no-drag'
        } as any}
      >
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            className="input-field"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ 
              paddingLeft: '36px', 
              height: '32px', 
              fontSize: '0.82rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          />
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '9px', color: 'var(--text-dim)' }} />
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
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
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
              height: '32px',
              padding: '0 10px',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: 'none'
            }}
            title="Đổi Ngôn Ngữ / Change Language"
          >
            <Globe size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
          </button>
        )}

        <button
          className="btn-secondary"
          onClick={onToggleAI}
          style={{
            height: '32px',
            fontSize: '0.8rem',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '8px'
          }}
          title={t('aiAssistant')}
        >
          <Sparkles size={14} />
          <span>{t('aiAssistant')}</span>
        </button>

        <button
          className="btn-primary"
          onClick={onAddServer}
          style={{ height: '32px', fontSize: '0.8rem', borderRadius: '8px' }}
        >
          <Plus size={14} />
          <span>{t('addServer')}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenSettings}
          style={{ height: '32px', padding: '8px', width: '32px', justifyContent: 'center', borderRadius: '8px', backgroundColor: 'transparent', border: 'none' }}
          title={t('settings')}
        >
          <Settings size={16} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </div>
  );
};
