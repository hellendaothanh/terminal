import React, { useEffect, useRef, useState } from 'react';
import { ServerConfig, TerminalSettings } from '../types';
import { Monitor, RefreshCw, KeyRound, AlertTriangle, CheckCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { ReAuthModal } from './ReAuthModal';

interface RDPViewerProps {
  sessionId: string;
  server: ServerConfig;
  settings?: TerminalSettings;
  onUpdateServerPassword?: (serverId: string, newPassword: string) => void;
}

export const RDPViewer: React.FC<RDPViewerProps> = ({
  sessionId,
  server: initialServer,
  settings,
  onUpdateServerPassword
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentServer, setCurrentServer] = useState<ServerConfig>(initialServer);
  const [resolution, setResolution] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });
  const [statusInfo, setStatusInfo] = useState<string>('Đang kiểm tra kết nối TCP tới máy chủ RDP...');
  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [autoFit, setAutoFit] = useState<boolean>(true);
  const [isReAuthOpen, setIsReAuthOpen] = useState<boolean>(false);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);

  const copyPasswordToClipboard = (password?: string) => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 3000);
    }
  };

  const startRdpConnection = (targetServer: ServerConfig) => {
    if (!containerRef.current) return;
    const initialWidth = containerRef.current.clientWidth || 1280;
    const initialHeight = containerRef.current.clientHeight || 720;
    setResolution({ width: initialWidth, height: initialHeight });
    setConnecting(true);
    setError(null);
    setStatusInfo(`Đang kiểm tra kết nối TCP tới ${targetServer.host}:${targetServer.port || 3389}...`);

    // Auto-copy password to clipboard for quick paste in RDP prompt if required
    if (targetServer.password) {
      copyPasswordToClipboard(targetServer.password);
    }

    window.api
      .rdpConnect({
        sessionId,
        server: targetServer,
        width: initialWidth,
        height: initialHeight,
        vaultConfig: settings?.hashicorpVault
      })
      .then((res) => {
        setConnecting(false);
        if (res.success) {
          setConnected(true);
          setError(null);
          setIsReAuthOpen(false);
        } else {
          setConnected(false);
          setError(res.error || 'Kết nối RDP thất bại.');
          setStatusInfo(`Lỗi: ${res.error}`);
          setIsReAuthOpen(true);
        }
      });
  };

  useEffect(() => {
    startRdpConnection(currentServer);

    const removeRdpStatusListener = window.api.onRdpStatus((_, payload) => {
      if (payload.sessionId === sessionId) {
        setConnected(payload.connected);
        if (payload.resolution) setResolution(payload.resolution);
        if (payload.info) setStatusInfo(payload.info);
      }
    });

    const resizeObserver = new ResizeObserver((entries) => {
      if (!autoFit) return;
      for (const entry of entries) {
        const width = Math.floor(entry.contentRect.width);
        const height = Math.floor(entry.contentRect.height);
        if (width > 200 && height > 200) {
          setResolution({ width, height });
          window.api.rdpResize(sessionId, width, height);
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      removeRdpStatusListener();
      resizeObserver.disconnect();
      window.api.rdpDisconnect(sessionId);
    };
  }, [sessionId, initialServer.id, autoFit]);

  const handleRetryAuth = (newPassword: string, saveToVault: boolean) => {
    if (saveToVault && onUpdateServerPassword) {
      onUpdateServerPassword(currentServer.id, newPassword);
    }
    const updated = {
      ...currentServer,
      authType: 'password' as const,
      password: newPassword
    };
    setCurrentServer(updated);
    setIsReAuthOpen(false);
    startRdpConnection(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: '#090c10' }}>
      {/* RDP Control Toolbar */}
      <div style={{
        height: '36px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={15} style={{ color: connected ? 'var(--accent-success)' : 'var(--accent-danger)' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>RDP: {currentServer.name} ({currentServer.host})</span>
          <span style={{ color: error ? 'var(--accent-danger)' : 'var(--text-dim)' }}>| {statusInfo}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick Copy Password Button */}
          {currentServer.password && (
            <button
              onClick={() => copyPasswordToClipboard(currentServer.password)}
              style={{
                backgroundColor: copiedPass ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-tertiary)',
                color: copiedPass ? 'var(--accent-success)' : 'var(--text-main)',
                border: copiedPass ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--border-subtle)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              title="Copy mật khẩu RDP vào Clipboard để dán nếu cần"
            >
              {copiedPass ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedPass ? 'Đã Copy Mật Khẩu!' : 'Copy Mật Khẩu RDP'}</span>
            </button>
          )}

          <button
            onClick={() => startRdpConnection(currentServer)}
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Kiểm tra và kết nối lại RDP"
          >
            <RefreshCw size={12} />
            <span>Thử Kết Nối Lại</span>
          </button>

          {error && (
            <button
              onClick={() => setIsReAuthOpen(true)}
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
              <span>Đổi Mật Khẩu / IP</span>
            </button>
          )}

          <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-subtle)' }} />

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.75rem' }}>
            <input
              type="checkbox"
              checked={autoFit}
              onChange={(e) => setAutoFit(e.target.checked)}
            />
            <span>Auto-fit ({resolution.width}x{resolution.height})</span>
          </label>
        </div>
      </div>

      {/* Error Bar */}
      {error && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          color: 'var(--accent-danger)',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setIsReAuthOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
          >
            Cập nhật mật khẩu RDP
          </button>
        </div>
      )}

      {/* Main RDP Viewport Canvas Area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#05070a',
          padding: '16px'
        }}
      >
        <div style={{
          width: autoFit ? '100%' : `${resolution.width}px`,
          height: autoFit ? '100%' : `${resolution.height}px`,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#111827',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px'
        }}>
          {connecting ? (
            <div style={{ textAlign: 'center' }}>
              <RefreshCw size={40} className="spin" style={{ color: 'var(--accent-primary)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '8px' }}>
                Đang kiểm tra kết nối máy chủ RDP...
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {currentServer.host}:{currentServer.port || 3389}
              </p>
            </div>
          ) : connected ? (
            <div style={{ textAlign: 'center', maxWidth: '520px' }}>
              <CheckCircle size={48} style={{ color: 'var(--accent-success)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '8px' }}>
                Phiên Kết Nối RDP Đã Sẵn Sàng!
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px', lineHeight: '1.5' }}>
                Đã mở cửa sổ Remote Desktop kết nối tới máy chủ Windows <strong>{currentServer.host}:{currentServer.port || 3389}</strong> (User: <code>{currentServer.username}</code>).
              </p>

              {currentServer.password && (
                <div style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  fontSize: '0.82rem',
                  color: 'var(--accent-success)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <Check size={16} />
                  <span>Mật khẩu đã được tự động đăng ký vào Hệ thống & Copy vào Clipboard!</span>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {currentServer.password && (
                  <button
                    className="btn-secondary"
                    onClick={() => copyPasswordToClipboard(currentServer.password)}
                  >
                    {copiedPass ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedPass ? 'Đã Copy!' : 'Copy Mật Khẩu'}</span>
                  </button>
                )}

                <button
                  className="btn-primary"
                  onClick={() => startRdpConnection(currentServer)}
                >
                  <ExternalLink size={15} />
                  <span>Mở Lại Cửa Sổ RDP</span>
                </button>
              </div>

              <div style={{
                marginTop: '20px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'var(--accent-primary)',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                display: 'inline-block'
              }}>
                Resolution: {resolution.width} x {resolution.height} px
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', maxWidth: '480px' }}>
              <AlertTriangle size={48} style={{ color: 'var(--accent-danger)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '8px' }}>
                Không Thể Kết Nối Tới Máy Chủ RDP
              </h3>
              <p style={{ color: 'var(--accent-danger)', fontSize: '0.85rem', marginBottom: '20px' }}>
                {error}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="btn-primary"
                  onClick={() => setIsReAuthOpen(true)}
                  style={{ backgroundColor: 'var(--accent-warning)' }}
                >
                  <KeyRound size={15} />
                  <span>Cập Nhật Mật Khẩu / IP</span>
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => startRdpConnection(currentServer)}
                >
                  <RefreshCw size={15} />
                  <span>Thử Lại</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ReAuth Password Modal */}
      <ReAuthModal
        isOpen={isReAuthOpen}
        server={currentServer}
        errorMsg={error || 'Kết nối RDP thất bại'}
        onRetry={handleRetryAuth}
        onClose={() => setIsReAuthOpen(false)}
      />
    </div>
  );
};
