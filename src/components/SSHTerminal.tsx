import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { ServerConfig, SSHKey, TerminalSettings } from '../types';
import { Copy, Clipboard, ZoomIn, ZoomOut, KeyRound, Check, AlertCircle, RotateCcw } from 'lucide-react';
import { ReAuthModal } from './ReAuthModal';

interface SSHTerminalProps {
  sessionId: string;
  server: ServerConfig;
  keyObj?: SSHKey;
  settings: TerminalSettings;
  onUpdateServerPassword?: (serverId: string, newPassword: string) => void;
}

const THEMES: Record<string, any> = {
  'one-dark': {
    background: '#1e222a',
    foreground: '#abb2bf',
    cursor: '#528bff',
    selectionBackground: '#3e4451',
    black: '#1e222a',
    red: '#e06c75',
    green: '#98c379',
    yellow: '#d19a66',
    blue: '#61afef',
    magenta: '#c678dd',
    cyan: '#56b6c2',
    white: '#abb2bf'
  },
  dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    selectionBackground: '#44475a',
    black: '#21222c',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#f8f8f2'
  },
  monokai: {
    background: '#272822',
    foreground: '#f8f8f2',
    cursor: '#f8f8f0',
    selectionBackground: '#49483e',
    black: '#272822',
    red: '#f92672',
    green: '#a6e22e',
    yellow: '#e6db74',
    blue: '#66d9ef',
    magenta: '#ae81ff',
    cyan: '#a1efe4',
    white: '#f8f8f2'
  }
};

export const SSHTerminal: React.FC<SSHTerminalProps> = ({
  sessionId,
  server: initialServer,
  keyObj,
  settings,
  onUpdateServerPassword
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const [currentServer, setCurrentServer] = useState<ServerConfig>(initialServer);
  const [connecting, setConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(settings.fontSize || 14);
  const [isReAuthOpen, setIsReAuthOpen] = useState(false);

  // Copy / Paste Toast Notification Feedback State
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'empty' | 'pasted'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (status: 'success' | 'empty' | 'pasted', message: string) => {
    setCopyStatus(status);
    setToastMessage(message);
    setTimeout(() => {
      setCopyStatus('idle');
      setToastMessage(null);
    }, 2500);
  };

  const startConnection = (targetServer: ServerConfig) => {
    if (!terminalRef.current) return;
    const term = terminalRef.current;
    setConnecting(true);
    setIsConnected(false);
    setError(null);

    term.writeln(`\x1b[36mConnecting to ${targetServer.username}@${targetServer.host}:${targetServer.port} via SSH...\x1b[0m\r\n`);

    window.api
      .sshConnect({
        sessionId,
        server: targetServer,
        key: targetServer.authType === 'privateKey' ? keyObj : undefined,
        vaultConfig: settings.hashicorpVault
      })
      .then((res) => {
        setConnecting(false);
        if (!res.success) {
          setError(res.error || 'Kết nối SSH thất bại.');
          term.writeln(`\r\n\x1b[31mError: ${res.error}\x1b[0m\r\n`);
          setIsReAuthOpen(true);
        } else {
          setIsConnected(true);
          setIsReAuthOpen(false);
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
            window.api.sshResize(sessionId, term.cols, term.rows);
          }
        }
      });
  };

  const handleReconnect = () => {
    window.api.sshDisconnect(sessionId);
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
    showToast('success', 'Đang thực hiện kết nối lại...');
    startConnection(currentServer);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      fontFamily: settings.fontFamily || 'JetBrains Mono, monospace',
      fontSize: fontSize,
      cursorBlink: settings.cursorBlink ?? true,
      scrollback: settings.scrollback || 5000,
      theme: THEMES[settings.theme] || THEMES['one-dark'],
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const dataListener = term.onData((data) => {
      window.api.sshWrite(sessionId, data);
    });

    const removeSshDataListener = window.api.onSshData((_, payload) => {
      if (payload.sessionId === sessionId) {
        term.write(payload.data);
      }
    });

    const removeSshClosedListener = window.api.onSshClosed((_, payload) => {
      if (payload.sessionId === sessionId) {
        setIsConnected(false);
        term.writeln('\r\n\x1b[31m[Phiên kết nối SSH đã kết thúc. Bấm "Kết nối lại" để mở lại phiên]\x1b[0m');
      }
    });

    startConnection(currentServer);

    const handleResize = () => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit();
        window.api.sshResize(sessionId, terminalRef.current.cols, terminalRef.current.rows);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      dataListener.dispose();
      removeSshDataListener();
      removeSshClosedListener();
      resizeObserver.disconnect();
      term.dispose();
      window.api.sshDisconnect(sessionId);
    };
  }, [sessionId, initialServer.id]);

  useEffect(() => {
    (window as any).__activeBuffers = (window as any).__activeBuffers || {};
    (window as any).__activeBuffers[sessionId] = () => {
      if (!terminalRef.current) return { type: 'SSH', server: initialServer.name, text: '' };
      const selection = terminalRef.current.getSelection();
      if (selection) return { type: 'SSH', server: initialServer.name, text: selection, isSelection: true };

      const buffer = terminalRef.current.buffer.active;
      const lines: string[] = [];
      const start = Math.max(0, buffer.length - 40);
      for (let i = start; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) lines.push(line.translateToString(true));
      }
      return { type: 'SSH', server: initialServer.name, text: lines.join('\n') };
    };

    return () => {
      if ((window as any).__activeBuffers) {
        delete (window as any).__activeBuffers[sessionId];
      }
    };
  }, [sessionId, initialServer.name]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.fontSize = fontSize;
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        window.api.sshResize(sessionId, terminalRef.current.cols, terminalRef.current.rows);
      }
    }
  }, [fontSize]);

  const handleCopy = () => {
    if (terminalRef.current && terminalRef.current.hasSelection()) {
      const selection = terminalRef.current.getSelection();
      if (selection && selection.trim().length > 0) {
        navigator.clipboard.writeText(selection);
        showToast('success', `Đã copy ${selection.length} ký tự vào Clipboard!`);
        return;
      }
    }
    showToast('empty', 'Vui lòng bôi đen (chọn) văn bản trong terminal trước khi bấm Copy.');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        window.api.sshWrite(sessionId, text);
        showToast('pasted', `Đã dán ${text.length} ký tự từ Clipboard!`);
      } else {
        showToast('empty', 'Clipboard hiện đang trống.');
      }
    } catch (e) {
      showToast('empty', 'Không thể truy cập Clipboard.');
    }
  };

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
    startConnection(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: THEMES[settings.theme]?.background || '#1e222a', position: 'relative' }}>
      {/* Toast Notification Bar */}
      {toastMessage && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '16px',
          zIndex: 100,
          backgroundColor: copyStatus === 'success' || copyStatus === 'pasted' ? 'rgba(34, 197, 94, 0.92)' : 'rgba(245, 158, 11, 0.92)',
          color: '#ffffff',
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.82rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.15s ease-out'
        }}>
          {copyStatus === 'success' || copyStatus === 'pasted' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quick Terminal Control Bar */}
      <div style={{
        height: '32px',
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
          <span style={{ color: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
            ● {currentServer.name}
          </span>
          <span>({currentServer.username}@{currentServer.host})</span>
          {!isConnected && !connecting && (
            <span style={{ color: 'var(--accent-danger)', fontSize: '0.72rem' }}>(Đã ngắt kết nối)</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Reconnect Button */}
          <button
            onClick={handleReconnect}
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
            title="Thực hiện kết nối lại SSH phiên này"
          >
            <RotateCcw size={12} />
            <span>Kết nối lại</span>
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
              <span>Đổi Mật Khẩu</span>
            </button>
          )}

          {/* Dynamic Copy Button */}
          <button
            onClick={handleCopy}
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
            title="Bôi đen văn bản trong terminal rồi bấm Copy"
          >
            {copyStatus === 'success' ? <Check size={13} /> : copyStatus === 'empty' ? <AlertCircle size={13} /> : <Copy size={13} />}
            <span>{copyStatus === 'success' ? 'Đã Copy!' : copyStatus === 'empty' ? 'Chưa chọn văn bản' : 'Copy'}</span>
          </button>

          {/* Dynamic Paste Button */}
          <button
            onClick={handlePaste}
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
            title="Dán từ Clipboard vào Terminal"
          >
            {copyStatus === 'pasted' ? <Check size={13} /> : <Clipboard size={13} />}
            <span>{copyStatus === 'pasted' ? 'Đã Dán!' : 'Paste'}</span>
          </button>

          <span style={{ width: '1px', height: '14px', backgroundColor: 'var(--border-subtle)', margin: '0 4px' }} />

          <button
            onClick={() => setFontSize((f) => Math.max(10, f - 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <ZoomOut size={13} />
          </button>
          <span>{fontSize}px</span>
          <button
            onClick={() => setFontSize((f) => Math.min(24, f + 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* Terminal Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '8px',
          overflow: 'hidden'
        }}
      />

      {/* ReAuth Password Modal */}
      <ReAuthModal
        isOpen={isReAuthOpen}
        server={currentServer}
        errorMsg={error || 'Xác thực thất bại'}
        onRetry={handleRetryAuth}
        onClose={() => setIsReAuthOpen(false)}
      />
    </div>
  );
};
