import React from 'react';
import { Share2, Lock, Users, Radio, Copy } from 'lucide-react';
import type { TranslateFn, ShowToastFn } from './markdownRenderer';
import type { LiveViewer, ShareMode } from './useLiveShare';

interface LiveShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslateFn;
  showToast: ShowToastFn;
  shareMode: ShareMode;
  shareLink: string;
  isLiveShared: boolean;
  activeViewers: LiveViewer[];
  onSwitchMode: (mode: ShareMode) => void;
  onStart: () => void;
  onStop: () => void;
}

export const LiveShareModal: React.FC<LiveShareModalProps> = ({
  isOpen,
  onClose,
  t,
  showToast,
  shareMode,
  shareLink,
  isLiveShared,
  activeViewers,
  onSwitchMode,
  onStart,
  onStop
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100
    }}>
      <div style={{
        width: '480px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t('liveShareModalTitle')}</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {t('liveShareModalDesc')}
          </p>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              {t('liveShareModeLabel')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                onClick={() => onSwitchMode('READONLY')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: shareMode === 'READONLY' ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  backgroundColor: shareMode === 'READONLY' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.82rem', color: shareMode === 'READONLY' ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                  <Lock size={14} /> {t('liveShareReadonlyTitle')}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('liveShareReadonlyDesc')}</span>
              </div>

              <div
                onClick={() => onSwitchMode('INTERACTIVE')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: shareMode === 'INTERACTIVE' ? '2px solid var(--accent-warning)' : '1px solid var(--border-subtle)',
                  backgroundColor: shareMode === 'INTERACTIVE' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.82rem', color: shareMode === 'INTERACTIVE' ? 'var(--accent-warning)' : 'var(--text-main)' }}>
                  <Users size={14} /> {t('liveShareInteractiveTitle')}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t('liveShareInteractiveDesc')}</span>
              </div>
            </div>
          </div>

          {isLiveShared && shareLink && (
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                {t('liveShareUrlLabel')}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  value={shareLink}
                  readOnly
                  style={{ fontSize: '0.78rem', color: 'var(--accent-primary)' }}
                />
                <button
                  className="btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    showToast('success', t('copySuccess'));
                  }}
                  style={{ padding: '0 12px', fontSize: '0.75rem' }}
                >
                  <Copy size={13} />
                </button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-success)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Radio size={12} className="spin" />
                <span>{t('liveShareActiveStatus')}</span>
              </div>

              {/* Connected Viewers & IP Address Dashboard */}
              <div style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px dashed var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={13} style={{ color: 'var(--accent-primary)' }} />
                    {t('liveActiveViewersTitle')}:
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: activeViewers.length > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: activeViewers.length > 0 ? 'var(--accent-success)' : 'var(--text-muted)'
                  }}>
                    {activeViewers.length} online
                  </span>
                </div>

                {activeViewers.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '4px 0' }}>
                    {t('liveNoViewersYet')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto', marginTop: '6px' }}>
                    {activeViewers.map((viewer, idx) => (
                      <div
                        key={viewer.id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: 'var(--bg-secondary)',
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
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
                            ({viewer.platform || 'Web'})
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>
                          {viewer.joinedAt}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-tertiary)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          {isLiveShared ? (
            <button
              className="btn-secondary"
              onClick={onStop}
              style={{ color: 'var(--accent-danger)' }}
            >
              {t('liveShareStopBtn')}
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={onClose}>
                {t('cancel')}
              </button>
              <button className="btn-primary" onClick={onStart}>
                <Share2 size={14} />
                <span>{t('liveShareStartBtn')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
