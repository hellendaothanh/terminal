import React from 'react';
import { Copy, Clipboard, ZoomIn, ZoomOut, KeyRound, Check, AlertCircle, RotateCcw, ChevronDown, ChevronUp, Bookmark, Share2, Users, Radio } from 'lucide-react';
import { ServerMetricsDashboard } from '../ServerMetricsDashboard';
import type { ServerConfig, SSHKey, TerminalSettings } from '../../types';
import type { TranslateFn } from './markdownRenderer';
import type { LiveViewer, ShareMode } from './useLiveShare';

export type CopyStatus = 'idle' | 'success' | 'empty' | 'pasted';

interface TerminalToolbarProps {
  settings: TerminalSettings;
  currentServer: ServerConfig;
  keyObj?: SSHKey;
  envColor: string;
  isConnected: boolean;
  connecting: boolean;
  error: string | null;
  copyStatus: CopyStatus;
  fontSize: number;
  onFontSizeChange: (updater: (prev: number) => number) => void;
  isLiveShared: boolean;
  shareMode: ShareMode;
  activeViewers: LiveViewer[];
  showLiveViewersPopover: boolean;
  onToggleViewersPopover: () => void;
  onCloseViewersPopover: () => void;
  onOpenShareModal: () => void;
  showQuickCommands: boolean;
  onToggleQuickCommands: () => void;
  onReconnect: () => void;
  onReAuth: () => void;
  onCopy: () => void;
  onPaste: () => void;
  t: TranslateFn;
}

export const TerminalToolbar: React.FC<TerminalToolbarProps> = ({
  settings,
  currentServer,
  keyObj,
  envColor,
  isConnected,
  connecting,
  error,
  copyStatus,
  fontSize,
  onFontSizeChange,
  isLiveShared,
  shareMode,
  activeViewers,
  showLiveViewersPopover,
  onToggleViewersPopover,
  onCloseViewersPopover,
  onOpenShareModal,
  showQuickCommands,
  onToggleQuickCommands,
  onReconnect,
  onReAuth,
  onCopy,
  onPaste,
  t
}) => {
  return (
    <div style={{
      height: settings.uiDensity === 'compact' ? '28px' : '32px',
      backgroundColor: 'var(--bg-tertiary)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontSize: '0.75rem',
      color: 'var(--text-muted)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            padding: '1px 6px',
            borderRadius: '3px',
            fontSize: '0.68rem',
            fontWeight: 700,
            backgroundColor: currentServer.environment === 'PRODUCTION' ? 'rgba(244, 63, 94, 0.25)' : currentServer.environment === 'STAGING' ? 'rgba(234, 179, 8, 0.25)' : 'rgba(34, 197, 94, 0.2)',
            color: envColor,
            border: `1px solid ${envColor}`
          }}
        >
          {currentServer.environment}
        </span>
        <span style={{ color: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
          ● {currentServer.name}
        </span>
        <span>({currentServer.username}@{currentServer.host})</span>
        {!isConnected && !connecting && (
          <span style={{ color: 'var(--accent-danger)', fontSize: '0.72rem' }}>{t('disconnectedStatus')}</span>
        )}
      </div>

      {/* Real-time Server Metrics Widget */}
      <ServerMetricsDashboard server={currentServer} keyObj={keyObj} compact={true} refreshIntervalMs={3000} vaultConfig={settings.hashicorpVault} language={settings.language} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Reconnect Button */}
        <button
          onClick={onReconnect}
          style={{
            backgroundColor: isConnected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.2)',
            color: isConnected ? 'var(--accent-primary)' : 'var(--accent-danger)',
            border: isConnected ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '4px',
            padding: '2px 8px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 500
          }}
          title={t('reconnectTooltip')}
        >
          <RotateCcw size={12} />
          <span>{t('reconnect')}</span>
        </button>

        {error && (
          <button
            onClick={onReAuth}
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--accent-warning)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <KeyRound size={12} />
            <span>{t('changePassword')}</span>
          </button>
        )}

        {/* Dynamic Copy Button */}
        <button
          onClick={onCopy}
          style={{
            background: copyStatus === 'success' ? 'rgba(34, 197, 94, 0.15)' : copyStatus === 'empty' ? 'rgba(245, 158, 11, 0.15)' : 'none',
            border: copyStatus === 'success' ? '1px solid rgba(34, 197, 94, 0.4)' : copyStatus === 'empty' ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            color: copyStatus === 'success' ? 'var(--accent-success)' : copyStatus === 'empty' ? 'var(--accent-warning)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            transition: 'all 0.2s ease'
          }}
          title={t('copyTooltip')}
        >
          {copyStatus === 'success' ? <Check size={13} /> : copyStatus === 'empty' ? <AlertCircle size={13} /> : <Copy size={13} />}
          <span>{copyStatus === 'success' ? t('copySuccess') : copyStatus === 'empty' ? t('copyEmpty') : 'Copy'}</span>
        </button>

        {/* Dynamic Paste Button */}
        <button
          onClick={onPaste}
          style={{
            background: copyStatus === 'pasted' ? 'rgba(34, 197, 94, 0.15)' : 'none',
            border: copyStatus === 'pasted' ? '1px solid rgba(34, 197, 94, 0.4)' : 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            color: copyStatus === 'pasted' ? 'var(--accent-success)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            transition: 'all 0.2s ease'
          }}
          title={t('pasteTooltip')}
        >
          {copyStatus === 'pasted' ? <Check size={13} /> : <Clipboard size={13} />}
          <span>{copyStatus === 'pasted' ? t('pastedSuccess') : 'Paste'}</span>
        </button>

        {/* Live Share Button with Dropdown Viewers Popover */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: isLiveShared ? 'rgba(239, 68, 68, 0.15)' : 'none',
            border: isLiveShared ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}>
            <button
              onClick={onOpenShareModal}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 4px 2px 6px',
                color: isLiveShared ? 'var(--accent-danger)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem'
              }}
              title={t('liveShareTooltip')}
            >
              {isLiveShared ? <Radio size={13} className="spin" /> : <Share2 size={13} />}
              <span>{isLiveShared ? `${t('liveSharingBadge')} (${activeViewers.length})` : t('liveShareBtn')}</span>
            </button>

            {isLiveShared && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleViewersPopover();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderLeft: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--accent-danger)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={t('liveActiveViewersTitle')}
              >
                {showLiveViewersPopover ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            )}
          </div>

          {/* Quick Live Viewers Popover (Like CPU/RAM metrics overlay) */}
          {isLiveShared && showLiveViewersPopover && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '6px',
              width: '320px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '12px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  <Users size={13} style={{ color: 'var(--accent-danger)' }} />
                  <span>{t('liveActiveViewersTitle')}</span>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '8px',
                  backgroundColor: activeViewers.length > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: activeViewers.length > 0 ? 'var(--accent-success)' : 'var(--text-muted)'
                }}>
                  {activeViewers.length} online
                </span>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{t('liveViewerModeLabel')}</span>
                <span style={{ fontWeight: 600, color: shareMode === 'READONLY' ? 'var(--accent-primary)' : 'var(--accent-warning)' }}>
                  {shareMode === 'READONLY' ? t('liveShareReadonlyTitle') : t('liveShareInteractiveTitle')}
                </span>
              </div>

              {activeViewers.length === 0 ? (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '6px 0', textAlign: 'center' }}>
                  {t('liveNoViewersYet')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                  {activeViewers.map((viewer, idx) => (
                    <div
                      key={viewer.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        fontSize: '0.72rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-success)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                          {viewer.ip}
                        </span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>
                          ({viewer.platform || 'Web'})
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                        {viewer.joinedAt}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn-secondary"
                onClick={() => {
                  onCloseViewersPopover();
                  onOpenShareModal();
                }}
                style={{
                  fontSize: '0.7rem',
                  padding: '4px 8px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  marginTop: '4px'
                }}
              >
                <Share2 size={11} />
                <span>{t('liveShareModalTitle')}</span>
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onToggleQuickCommands}
          style={{
            background: showQuickCommands ? 'rgba(59, 130, 246, 0.15)' : 'none',
            border: showQuickCommands ? '1px solid rgba(59, 130, 246, 0.4)' : 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            color: showQuickCommands ? 'var(--accent-primary)' : 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            transition: 'all 0.2s ease'
          }}
          title={t('quickCommandsTooltip')}
        >
          <Bookmark size={13} />
          <span>{t('quickCommands')}</span>
        </button>

        <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />

        <button
          onClick={() => onFontSizeChange((f) => Math.max(10, f - 1))}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <ZoomOut size={13} />
        </button>
        <span>{fontSize}px</span>
        <button
          onClick={() => onFontSizeChange((f) => Math.min(24, f + 1))}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <ZoomIn size={13} />
        </button>
      </div>
    </div>
  );
};
