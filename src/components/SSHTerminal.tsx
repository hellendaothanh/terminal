import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { ServerConfig, SSHKey, TerminalSettings } from '../types';
import { Copy, Clipboard, ZoomIn, ZoomOut, KeyRound, Check, AlertCircle, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';
import { ReAuthModal } from './ReAuthModal';
import { ServerMetricsDashboard } from './ServerMetricsDashboard';
import { ShellSmartAssistant } from './ShellSmartAssistant';
import { CommandGuardApprovalModal } from './CommandGuardApprovalModal';

interface SSHTerminalProps {
  sessionId: string;
  server: ServerConfig;
  keyObj?: SSHKey;
  availableServers?: ServerConfig[];
  keys?: SSHKey[];
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
  availableServers = [],
  keys = [],
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

  const [guardModalOpen, setGuardModalOpen] = useState<boolean>(false);
  const [pendingCommand, setPendingCommand] = useState<{ command: string; risk: 'HIGH' | 'MEDIUM' } | null>(null);

  const [currentInput, setCurrentInput] = useState<string>('');
  const [historyCommands, setHistoryCommands] = useState<string[]>([]);
  const [anomalyAlert, setAnomalyAlert] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiSuggestionsLoading, setAiSuggestionsLoading] = useState<boolean>(false);

  const handleGetAiSuggestions = async () => {
    setAiSuggestionsLoading(true);
    const bufferGetter = (window as any).__activeBuffers?.[sessionId];
    const textContext = bufferGetter ? bufferGetter().text : '';

    const isVi = settings.language === 'vi';
    const prompt = isVi
      ? `Bạn là một trợ lý DevOps. Dựa trên log terminal SSH sau đây:
${textContext}

Hãy đề xuất 3 đến 5 câu lệnh Linux/Unix tiếp theo phù hợp nhất để kiểm tra hệ thống, khắc phục sự cố hoặc theo dõi.
Chỉ trả về duy nhất một danh sách các câu lệnh dưới dạng JSON array dạng ["command1", "command2", "command3"]. Không giải thích thêm bất cứ điều gì.`
      : `You are a DevOps assistant. Based on this SSH terminal output:
${textContext}

Suggest 3 to 5 relevant Linux/Unix next commands for system checks, troubleshooting, or monitoring.
Return ONLY a raw JSON array of strings, for example: ["command1", "command2", "command3"]. Do not explain anything else.`;

    try {
      const config = settings.ai || { provider: 'gemini', enabled: true, model: 'gemini-1.5-flash', apiKey: '' };
      const reply = await window.api.aiSendMessage(prompt, config);
      
      let parsedCommands: string[] = [];

      // 1. Try JSON Array parsing
      try {
        const jsonStart = reply.indexOf('[');
        const jsonEnd = reply.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = reply.slice(jsonStart, jsonEnd + 1)
            .replace(/'/g, '"') // Replace single quotes with double quotes
            .replace(/\\"/g, '"'); // Replace escaped quotes if any
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) {
            parsedCommands = parsed.map(cmd => String(cmd).trim()).filter(Boolean);
          }
        }
      } catch (e) {
        console.warn('JSON parsing of AI reply failed, trying fallback parser...', e);
      }

      // 2. Fallback: Parse line-by-line if JSON parser failed
      if (parsedCommands.length === 0) {
        const lines = reply.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;

          // Match code blocks like `cmd` or ```cmd```
          const codeMatch = line.match(/`([^`]+)`/);
          if (codeMatch && codeMatch[1]) {
            const cmd = codeMatch[1].trim();
            if (cmd && cmd.length < 120 && !parsedCommands.includes(cmd)) {
              parsedCommands.push(cmd);
            }
            continue;
          }

          // Match list elements like "1. cmd" or "- cmd"
          const listMatch = line.match(/^(?:\d+\.|\*|-)\s+(.+)$/);
          if (listMatch && listMatch[1]) {
            const cmd = listMatch[1].trim().replace(/^['"`]|['"`]$/g, '');
            // Only add if it's a reasonably short command line and doesn't contain explanations
            if (cmd && cmd.length < 80 && !cmd.includes('để') && !cmd.includes('to ') && !parsedCommands.includes(cmd)) {
              parsedCommands.push(cmd);
            }
          }
        }
      }

      if (parsedCommands.length > 0) {
        setAiSuggestions(parsedCommands.slice(0, 5));
        showToast('success', isVi ? 'Đã cập nhật gợi ý từ AI!' : 'AI Suggestions updated!');
      } else {
        showToast('empty', isVi ? 'AI không trả về danh sách câu lệnh hợp lệ.' : 'AI did not return a valid list of commands.');
      }
    } catch (err: any) {
      console.error('Error fetching AI suggestions:', err);
      showToast('empty', isVi ? `Lỗi gọi AI: ${err.message || err}` : `AI Error: ${err.message || err}`);
    } finally {
      setAiSuggestionsLoading(false);
    }
  };

  // AI Autofix states
  const [showAiPanel, setShowAiPanel] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [aiSuggestedCommand, setAiSuggestedCommand] = useState<string>('');

  const HIGH_RISK_COMMANDS = ['rm -rf', 'drop database', 'drop table', 'truncate', 'chmod 777', 'mkfs', 'dd if=', 'shutdown', 'reboot', 'systemctl stop'];

  const checkDangerousCommand = (cmd: string): 'HIGH' | 'MEDIUM' | null => {
    const lower = cmd.toLowerCase();
    if (HIGH_RISK_COMMANDS.some((kw) => lower.includes(kw))) return 'HIGH';
    return null;
  };

  const ANOMALY_KEYWORDS = [
    'OutOfMemory',
    'Out of memory',
    'OOMKilled',
    'Connection Refused',
    'Connection refused',
    'Segmentation Fault',
    'segmentation fault',
    'Permission denied',
    'Permission Denied',
    'permission denied',
    'FATAL ERROR',
    'Panic: ',
    'SyntaxError',
    'Uncaught Exception',
    'command not found',
    'not found',
    'no such file or directory',
    'Cannot find module',
    'is not recognized as an internal or external command',
    'Access denied',
    'fatal:',
    'FAILED'
  ];

  const checkAnomalyLogs = (text: string) => {
    for (const kw of ANOMALY_KEYWORDS) {
      if (text.includes(kw)) {
        setAnomalyAlert(settings.language === 'vi' ? `Phát hiện lỗi log: "${kw}"` : `Log error detected: "${kw}"`);
        break;
      }
    }
  };

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

    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }

    // Resolve Bastion / Jump Host Chain
    const jumpChain: { server: ServerConfig; key?: SSHKey }[] = [];
    if (targetServer.jumpHostIds && targetServer.jumpHostIds.length > 0) {
      for (const jumpId of targetServer.jumpHostIds) {
        const jumpSrv = availableServers.find((s) => s.id === jumpId);
        if (jumpSrv) {
          const jumpKey = keys.find((k) => k.id === jumpSrv.privateKeyId);
          jumpChain.push({ server: jumpSrv, key: jumpKey });
        }
      }
    }

    if (jumpChain.length > 0) {
      term.writeln(`\x1b[33m[Bastion Jump Chain] Routing through ${jumpChain.length} Jump Host(s): ${jumpChain.map((j) => j.server.name).join(' -> ')}...\x1b[0m`);
    }
    term.writeln(`\x1b[36mConnecting to ${targetServer.username}@${targetServer.host}:${targetServer.port} via SSH...\x1b[0m\r\n`);

    window.api
      .sshConnect({
        sessionId,
        server: targetServer,
        key: targetServer.authType === 'privateKey' ? keyObj : undefined,
        jumpChain: jumpChain.length > 0 ? jumpChain : undefined,
        vaultConfig: settings.hashicorpVault,
        cols: term.cols,
        rows: term.rows
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
        }
      });
  };

  const handleTriggerAutofix = async () => {
    const bufferGetter = (window as any).__activeBuffers?.[sessionId];
    const textContext = bufferGetter ? bufferGetter().text : '';

    setShowAiPanel(true);
    setAiLoading(true);
    setAiExplanation('');
    setAiSuggestedCommand('');

    const isVi = settings.language === 'vi';
    const prompt = isVi
      ? `Bạn là chuyên gia DevOps và Quản trị Hệ thống. Hãy phân tích lỗi/sự cố trong log Terminal SSH sau:
${textContext}

Hãy thực hiện:
1. Giải thích nguyên nhân sự cố ngắn gọn (2-3 câu).
2. Đề xuất câu lệnh Unix/Shell sửa đổi chính xác. Đặt câu lệnh này DUY NHẤT trong khối code block markdown dạng \`\`\`bash ... \`\`\`.`
      : `You are a DevOps and System Administration expert. Diagnose the failure/error in this SSH Terminal output:
${textContext}

Please:
1. Explain the cause of the failure briefly (2-3 sentences).
2. Propose the corrected Unix/Shell command. Place the suggested command ONLY inside a markdown code block like \`\`\`bash ... \`\`\`.`;

    try {
      const config = settings.ai || { provider: 'gemini', enabled: true, model: 'gemini-1.5-flash', apiKey: '' };
      const reply = await window.api.aiSendMessage(prompt, config);
      setAiExplanation(reply);

      const match = reply.match(/```bash([\s\S]*?)```/i);
      if (match && match[1]) {
        setAiSuggestedCommand(match[1].trim());
      }
    } catch (err: any) {
      setAiExplanation(isVi ? `Lỗi khi gọi AI Assistant: ${err.message || err}` : `AI Assistant Error: ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
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
      allowProposedApi: true,
      scrollSensitivity: 2
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const scrollListener = term.onScroll(() => {
      const buffer = term.buffer.active;
      const hasScrolledUp = buffer.viewportY < buffer.baseY;
      setShowScrollBottom(hasScrolledUp);
    });

    let lineBuf = '';
    const dataListener = term.onData((data) => {
      window.api.sshWrite(sessionId, data);

      if (data === '\r' || data === '\n') {
        const trimmed = lineBuf.trim();
        if (trimmed) {
          setHistoryCommands((prev) => [...prev, trimmed]);
        }
        lineBuf = '';
        setCurrentInput('');
      } else if (data === '\x7f' || data === '\b') {
        lineBuf = lineBuf.slice(0, -1);
        setCurrentInput(lineBuf);
      } else if (data.length === 1 && data >= ' ') {
        lineBuf += data;
        setCurrentInput(lineBuf);
      }
    });

    const removeSshDataListener = window.api.onSshData((_, payload) => {
      if (payload.sessionId === sessionId) {
        term.write(payload.data);
        checkAnomalyLogs(payload.data);
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
      scrollListener.dispose();
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

        {/* Real-time Server Metrics Widget */}
        <ServerMetricsDashboard server={currentServer} keyObj={keyObj} compact={true} refreshIntervalMs={3000} vaultConfig={settings.hashicorpVault} />

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
      <div style={{ flex: 1, padding: '8px', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden'
          }}
        />

        {/* Scroll-to-bottom Helper Button */}
        {showScrollBottom && (
          <button
            onClick={() => {
              if (terminalRef.current) {
                terminalRef.current.scrollToBottom();
                setShowScrollBottom(false);
              }
            }}
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '24px',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              zIndex: 90,
              fontWeight: 500,
              animation: 'fadeIn 0.2s ease-out'
            }}
            title={settings.language === 'vi' ? 'Cuộn xuống dưới cùng' : 'Scroll to bottom'}
          >
            <ChevronDown size={14} />
            <span>{settings.language === 'vi' ? 'Cuộn xuống dưới' : 'Scroll to Bottom'}</span>
          </button>
        )}
      </div>

      {/* Floating AI Autofix Pane */}
      {showAiPanel && (
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '220px',
          overflowY: 'auto',
          userSelect: 'text'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>
              <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{settings.language === 'vi' ? 'AI Chẩn Đoán & Sửa Lỗi Tự Động' : 'AI Diagnostics & Autofix'}</span>
            </div>
            <button 
              onClick={() => setShowAiPanel(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ✕
            </button>
          </div>

          {aiLoading ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
              <RotateCcw size={14} className="spin" /> 
              {settings.language === 'vi' ? 'Đang phân tích lỗi trong terminal...' : 'Analyzing terminal logs...'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.78rem' }}>
              <div style={{ color: 'var(--text-muted)', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                {aiExplanation}
              </div>

              {aiSuggestedCommand && (
                <div style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                    {settings.language === 'vi' ? 'CÂU LỆNH ĐỀ XUẤT:' : 'SUGGESTED COMMAND:'}
                  </div>
                  <pre style={{
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    color: 'var(--accent-success)',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {aiSuggestedCommand}
                  </pre>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      window.api.sshWrite(sessionId, aiSuggestedCommand + '\n');
                      setShowAiPanel(false);
                      setAnomalyAlert(null);
                    }}
                    style={{ alignSelf: 'flex-end', height: '26px', padding: '0 10px', fontSize: '0.72rem' }}
                  >
                    {settings.language === 'vi' ? 'Chạy Lệnh (1-Click)' : 'Run Command (1-Click)'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Shell Smart Assistant: Auto-completion & Log Anomaly Alert Banner */}
      <ShellSmartAssistant
        currentInput={currentInput}
        historyCommands={historyCommands}
        anomalyAlert={anomalyAlert}
        onClearAnomalyAlert={() => setAnomalyAlert(null)}
        onSelectSuggestion={(suggestion) => {
          if (terminalRef.current) {
            window.api.sshWrite(sessionId, suggestion);
            setCurrentInput(suggestion);
          }
        }}
        onTriggerAutofix={handleTriggerAutofix}
        aiFixLoading={aiLoading}
        language={settings.language}
        aiSuggestions={aiSuggestions}
        aiSuggestionsLoading={aiSuggestionsLoading}
        onTriggerAiSuggestions={handleGetAiSuggestions}
      />

      {/* Command Guard Approval Modal */}
      {pendingCommand && (
        <CommandGuardApprovalModal
          isOpen={guardModalOpen}
          commandOrQuery={pendingCommand.command}
          riskLevel={pendingCommand.risk}
          onApprove={() => {
            if (terminalRef.current) {
              window.api.sshWrite(sessionId, pendingCommand.command + '\r');
            }
            setGuardModalOpen(false);
            setPendingCommand(null);
          }}
          onCancel={() => {
            if (terminalRef.current) {
              terminalRef.current.write('\r\n\x1b[31m[Lệnh nguy hiểm bị hủy bởi Command Guard]\x1b[0m\r\n');
            }
            setGuardModalOpen(false);
            setPendingCommand(null);
          }}
        />
      )}

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
