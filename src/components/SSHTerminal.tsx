import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { ServerConfig, SSHKey, TerminalSettings } from '../types';
import { Copy, Clipboard, ZoomIn, ZoomOut, KeyRound, Check, AlertCircle, RotateCcw, Sparkles, ChevronDown, Bookmark, Share2, Users, Radio, Lock, Globe } from 'lucide-react';
import { ReAuthModal } from './ReAuthModal';
import { ServerMetricsDashboard } from './ServerMetricsDashboard';
import { ShellSmartAssistant } from './ShellSmartAssistant';
import { CommandGuardApprovalModal } from './CommandGuardApprovalModal';
import { QuickCommandsPanel } from './QuickCommandsPanel';
import { useTranslation } from '../i18n/useTranslation';

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
  const [showQuickCommands, setShowQuickCommands] = useState<boolean>(false);

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
  const [detectedOs, setDetectedOs] = useState<string | null>(null);
  const recentOutputRef = useRef<string>('');

  // Ghost Text / Inline Autocomplete States
  const [ghostText, setGhostText] = useState<string>('');
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  const ghostTextRef = useRef<string>('');
  const currentInputRef = useRef<string>('');
  const historyCommandsRef = useRef<string[]>([]);

  const HIGH_RISK_COMMANDS = ['rm -rf', 'drop database', 'drop table', 'truncate', 'chmod 777', 'mkfs', 'dd if=', 'shutdown', 'reboot', 'systemctl stop'];

  const checkDangerousCommand = (cmd: string): 'HIGH' | 'MEDIUM' | null => {
    const lower = cmd.toLowerCase();
    if (HIGH_RISK_COMMANDS.some((kw) => lower.includes(kw))) return 'HIGH';
    return null;
  };

  const ANOMALY_KEYWORDS = [
    'option requires an argument',
    'requires an argument',
    'unrecognized option',
    'invalid option',
    'invalid argument',
    'syntax error',
    'SyntaxError',
    'command not found',
    'not found',
    'no such file or directory',
    'No such file or directory',
    'Permission denied',
    'Permission Denied',
    'permission denied',
    'Access denied',
    'Access Denied',
    'OutOfMemory',
    'Out of memory',
    'OOMKilled',
    'Connection Refused',
    'Connection refused',
    'Segmentation Fault',
    'segmentation fault',
    'FATAL ERROR',
    'Panic: ',
    'Uncaught Exception',
    'Cannot find module',
    'is not recognized as an internal or external command',
    'fatal:',
    'FAILED',
    'failed to start',
    'Unit not found',
    'could not find unit'
  ];

  const checkAnomalyLogs = (text: string) => {
    for (const kw of ANOMALY_KEYWORDS) {
      if (text.includes(kw)) {
        setAnomalyAlert(settings.language === 'vi' ? `Phát hiện lỗi log: "${kw}"` : `Error detected in logs: "${kw}"`);
        break;
      }
    }
  };

  // Copy / Paste Toast Notification Feedback State
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'empty' | 'pasted'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  const showToast = (status: 'success' | 'empty' | 'pasted', message: string) => {
    setCopyStatus(status);
    setToastMessage(message);
    setTimeout(() => {
      setCopyStatus('idle');
      setToastMessage(null);
    }, 2500);
  };

  const safeFit = () => {
    try {
      if (fitAddonRef.current && terminalRef.current && containerRef.current) {
        const container = containerRef.current;
        const term = terminalRef.current;
        if (
          container.offsetWidth > 0 &&
          container.offsetHeight > 0 &&
          (term as any)._core?._renderService
        ) {
          fitAddonRef.current.fit();
          window.api.sshResize(sessionId, term.cols, term.rows);
        }
      }
    } catch (e) {
      console.warn('Failed to fit terminal:', e);
    }
  };

  const startConnection = (targetServer: ServerConfig) => {
    if (!terminalRef.current) return;
    const term = terminalRef.current;
    setConnecting(true);
    setIsConnected(false);
    setError(null);

    safeFit();

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
          setError(res.error || (settings.language === 'vi' ? 'Kết nối SSH thất bại.' : 'SSH connection failed.'));
          term.writeln(`\r\n\x1b[31mError: ${res.error}\x1b[0m\r\n`);
          setIsReAuthOpen(true);
        } else {
          setIsConnected(true);
          setIsReAuthOpen(false);
        }
      });
  };

  const getTerminalBufferText = (): string => {
    if (terminalRef.current) {
      const selection = terminalRef.current.getSelection();
      if (selection && selection.trim().length > 0) {
        return selection;
      }
      const buffer = terminalRef.current.buffer.active;
      const lines: string[] = [];
      const start = Math.max(0, buffer.length - 40);
      for (let i = start; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          const str = line.translateToString(true);
          if (str.trim().length > 0) lines.push(str);
        }
      }
      if (lines.length > 0) {
        return lines.join('\n');
      }
    }
    if (recentOutputRef.current && recentOutputRef.current.trim().length > 0) {
      return recentOutputRef.current.trim().split('\n').slice(-30).join('\n');
    }
    const bufferGetter = (window as any).__activeBuffers?.[sessionId];
    return bufferGetter ? bufferGetter().text : '';
  };

  const handleTriggerAutofix = async () => {
    const textContext = getTerminalBufferText();
    const osInfo = detectedOs ? `Operating System: ${detectedOs}` : `Host: ${currentServer.host}`;

    setShowAiPanel(true);
    setAiLoading(true);
    setAiExplanation('');
    setAiSuggestedCommand('');

    const isVi = settings.language === 'vi';
    const prompt = isVi
      ? `Bạn là chuyên gia DevOps và Quản trị Hệ thống.
[Thông tin máy chủ]: ${osInfo}
[Log Terminal SSH / Lỗi sự cố]:
${textContext || 'Vui lòng kiểm tra và hỗ trợ phân tích sự cố lệnh gần nhất trên máy chủ.'}

Yêu cầu định dạng:
1. Giải thích nguyên nhân sự cố ngắn gọn (2-3 câu). ĐẶC BIỆT LƯU Ý sử dụng đúng trình quản lý gói phù hợp với Hệ điều hành ${detectedOs || 'của máy chủ'} (ví dụ: dùng dnf/yum cho Rocky Linux, RHEL, CentOS, AlmaLinux, Fedora; dùng apt cho Ubuntu/Debian; dùng apk cho Alpine; hoặc pip cho Python).
2. Đề xuất DUY NHẤT một khối câu lệnh Unix/Shell hoàn chỉnh và chính xác nhất cho hệ điều hành này để khắc phục sự cố. Khối lệnh PHẢI nằm trọn vẹn bên trong cặp 3 dấu backticks \`\`\`bash ... \`\`\`. Không chèn thêm các ký tự thừa ngoài cú pháp markdown tiêu chuẩn.`
      : `You are a senior DevOps and System Administration expert.
[Target Server Info]: ${osInfo}
[SSH Terminal Log / Command Failure]:
${textContext || 'Please analyze the recent command failure and system log on this server.'}

Formatting requirements:
1. Explain the cause of the failure briefly (2-3 sentences). IMPORTANT: Use the exact package manager suitable for the detected OS (${detectedOs || 'the target server'}) (e.g. use dnf/yum for Rocky Linux, RHEL, CentOS, AlmaLinux, Fedora; apt for Debian/Ubuntu; apk for Alpine; or pip for Python packages).
2. Provide EXACTLY ONE single, complete, and accurate Unix/Shell command block tailored to this OS to resolve the issue. The command block MUST be fully enclosed in triple backticks \`\`\`bash ... \`\`\`. Do not include unclosed backticks or random symbols outside standard markdown syntax.`;

    try {
      const config = {
        ...(settings.ai || { provider: 'gemini', enabled: true, model: 'gemini-1.5-flash', apiKey: '' }),
        language: settings.language || 'vi'
      };
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

  const renderFormattedExplanation = (content: string) => {
    // 1. Separate code blocks (```...```) from regular markdown text
    const blockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const renderInline = (text: string) => {
      // Inline markdown: **bold**, `code`, *italic*
      const inlineRegex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
      const parts = text.split(inlineRegex);
      return parts.map((sub, sIdx) => {
        if (sub.startsWith('**') && sub.endsWith('**') && sub.length >= 4) {
          return <strong key={sIdx} style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sub.slice(2, -2)}</strong>;
        }
        if (sub.startsWith('*') && sub.endsWith('*') && sub.length >= 2 && !sub.startsWith('**')) {
          return <em key={sIdx} style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>{sub.slice(1, -1)}</em>;
        }
        if (sub.startsWith('`') && sub.endsWith('`') && sub.length >= 2) {
          return (
            <code
              key={sIdx}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: '#38bdf8',
                padding: '2px 5px',
                borderRadius: '4px',
                fontSize: '0.74rem',
                fontFamily: 'monospace',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {sub.slice(1, -1)}
            </code>
          );
        }
        return sub;
      });
    };

    const renderTextSection = (rawText: string, keyOffset: number) => {
      const lines = rawText.split('\n');
      return lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={`${keyOffset}-${idx}`} style={{ height: '4px' }} />;

        // Horizontal dividers
        if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) {
          return <hr key={`${keyOffset}-${idx}`} style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '8px 0' }} />;
        }

        // Headings (e.g. #, ##, ###, or numbered headings like 1. Cause of the Failure)
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const fontSize = level === 1 ? '0.95rem' : level === 2 ? '0.88rem' : '0.82rem';
          return (
            <h4 key={`${keyOffset}-${idx}`} style={{ fontSize, fontWeight: 700, color: 'var(--accent-primary)', margin: '8px 0 3px 0' }}>
              {renderInline(text)}
            </h4>
          );
        }

        const numberedHeadingMatch = line.match(/^(\d+\.\s+[A-Za-zÀ-ỹ\s]+)$/);
        if (numberedHeadingMatch) {
          return (
            <h4 key={`${keyOffset}-${idx}`} style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--accent-primary)', margin: '8px 0 3px 0' }}>
              {renderInline(numberedHeadingMatch[1])}
            </h4>
          );
        }

        // Bullet list items
        const listMatch = line.match(/^(\*|-|\+)\s+(.+)$/);
        if (listMatch) {
          return (
            <div key={`${keyOffset}-${idx}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', margin: '2px 0 2px 10px', color: 'var(--text-main)' }}>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', lineHeight: '1.2' }}>•</span>
              <span style={{ lineHeight: '1.4' }}>{renderInline(listMatch[2])}</span>
            </div>
          );
        }

        return (
          <p key={`${keyOffset}-${idx}`} style={{ margin: '3px 0', lineHeight: '1.45', color: 'var(--text-main)' }}>
            {renderInline(line)}
          </p>
        );
      });
    };

    let blockIdx = 0;
    while ((match = blockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        elements.push(
          <div key={`text-${blockIdx}`}>
            {renderTextSection(textBefore, blockIdx * 1000)}
          </div>
        );
      }

      const lang = match[1] || 'bash';
      const code = match[2].trim();

      elements.push(
        <div
          key={`code-${blockIdx}`}
          style={{
            margin: '6px 0',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            overflow: 'hidden'
          }}
        >
          {lang && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '2px 8px',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              fontSize: '0.65rem',
              color: 'var(--text-dim)',
              borderBottom: '1px solid var(--border-subtle)',
              fontFamily: 'monospace'
            }}>
              <span>{lang}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  showToast('success', t('copyToastSuccess').replace('{count}', String(code.length)));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.68rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <Copy size={11} />
                <span>{t('copySuccess') ? 'Copy' : 'Copy'}</span>
              </button>
            </div>
          )}
          <pre
            style={{
              margin: 0,
              padding: '8px 10px',
              fontFamily: 'monospace',
              fontSize: '0.74rem',
              color: '#38bdf8',
              backgroundColor: 'transparent',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {code}
          </pre>
        </div>
      );

      lastIndex = blockRegex.lastIndex;
      blockIdx++;
    }

    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      elements.push(
        <div key={`text-final`}>
          {renderTextSection(remainingText, blockIdx * 1000)}
        </div>
      );
    }

    return elements;
  };

  const handleReconnect = () => {
    window.api.sshDisconnect(sessionId);
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
    showToast('success', t('reconnecting'));
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
    try {
      if (
        containerRef.current &&
        containerRef.current.offsetWidth > 0 &&
        containerRef.current.offsetHeight > 0 &&
        (term as any)._core?._renderService
      ) {
        fitAddon.fit();
      }
    } catch (e) {
      console.warn('Initial fit failed:', e);
    }

    terminalRef.current = term;
    // Helper to calculate and update inline Ghost-Text suggestion (Warp/Fig style)
    const updateGhostText = (typed: string, history: string[]) => {
      const trimmed = typed.trim().toLowerCase();
      if (!trimmed || trimmed.length < 2) {
        setGhostText('');
        ghostTextRef.current = '';
        setGhostPosition(null);
        return;
      }

      const COMMON_CMD_LIST = [
        'ping -c 4 8.8.8.8',
        'ping -c 4 google.com',
        'df -h',
        'free -h',
        'uptime',
        'ip a',
        'ss -tulpn',
        'netstat -tulpn',
        'top -b -n 1',
        'htop',
        'cat /etc/os-release',
        'uname -a',
        'journalctl -xe --no-pager -n 50',
        'journalctl -xe',
        'systemctl status',
        'systemctl list-units --type=service --state=running',
        'docker ps -a',
        'docker stats --no-stream',
        'docker-compose ps',
        'docker-compose up -d',
        'kubectl get pods -A',
        'kubectl get nodes -o wide',
        'tail -n 50 /var/log/syslog',
        'tail -n 50 /var/log/messages',
        'tail -n 50 /var/log/nginx/error.log',
        'ps aux --sort=-%mem | head -n 10',
        'ps aux --sort=-%cpu | head -n 10',
        'whoami',
        'id',
        'pwd',
        'ls -la'
      ];

      const allCandidates = Array.from(new Set([...(history || []).slice().reverse(), ...COMMON_CMD_LIST]));
      const matched = allCandidates.find((cmd) => cmd.toLowerCase().startsWith(trimmed) && cmd.length > typed.length);

      if (matched) {
        const remaining = matched.slice(typed.length);
        setGhostText(remaining);
        ghostTextRef.current = remaining;

        // Position ghost text right after current cursor location
        const core = (term as any)._core;
        const cellWidth = core?._renderService?.dimensions?.actualCellWidth || (fontSize * 0.6);
        const cellHeight = core?._renderService?.dimensions?.actualCellHeight || (fontSize * 1.25);
        const buffer = term.buffer.active;
        const cursorX = buffer.cursorX;
        const cursorY = buffer.cursorY;

        setGhostPosition({
          x: cursorX * cellWidth + 8,
          y: cursorY * cellHeight + 8
        });
      } else {
        setGhostText('');
        ghostTextRef.current = '';
        setGhostPosition(null);
      }
    };

    // Keyboard Shortcuts: Ctrl+Shift+C (Copy), Ctrl+Shift+V (Paste), Ctrl+C when text is selected (Copy), Tab/Right-Arrow (Accept Ghost Text)
    term.attachCustomKeyEventHandler((event: KeyboardEvent) => {
      // Tab or Right-Arrow: Accept ghost text suggestion (like Fig / Warp / Fish shell)
      if ((event.key === 'Tab' || event.key === 'ArrowRight') && ghostTextRef.current && ghostTextRef.current.length > 0) {
        if (event.type === 'keydown') {
          const toInsert = ghostTextRef.current;
          window.api.sshWrite(sessionId, toInsert);
          lineBuf += toInsert;
          currentInputRef.current = lineBuf;
          setCurrentInput(lineBuf);
          setGhostText('');
          ghostTextRef.current = '';
          setGhostPosition(null);
        }
        return false; // Prevent tab navigation / default terminal tab
      }

      // Escape: Dismiss ghost text suggestion
      if (event.key === 'Escape' && ghostTextRef.current) {
        setGhostText('');
        ghostTextRef.current = '';
        setGhostPosition(null);
      }

      // Ctrl+Shift+C / Cmd+Shift+C => Copy selection
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'C' || event.key === 'c')) {
        if (event.type === 'keydown') {
          if (term.hasSelection()) {
            const selection = term.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection);
              showToast('success', t('copyToastSuccess').replace('{count}', String(selection.length)));
            }
          }
        }
        return false;
      }

      // Ctrl+C with active text selection => Copy to clipboard without sending SIGINT
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && (event.key === 'c' || event.key === 'C')) {
        if (term.hasSelection()) {
          if (event.type === 'keydown') {
            const selection = term.getSelection();
            if (selection) {
              navigator.clipboard.writeText(selection);
              showToast('success', t('copyToastSuccess').replace('{count}', String(selection.length)));
            }
          }
          return false; // Prevent sending SIGINT when user intends to copy selected text
        }
      }

      // Ctrl+Shift+V / Cmd+Shift+V / Ctrl+V => Paste from clipboard directly into terminal
      if ((event.ctrlKey || event.metaKey) && (event.key === 'v' || event.key === 'V')) {
        if (event.type === 'keydown') {
          navigator.clipboard.readText().then((text) => {
            if (text) {
              window.api.sshWrite(sessionId, text);
              showToast('pasted', t('pasteToastSuccess').replace('{count}', String(text.length)));
            }
          }).catch(() => {
            showToast('empty', t('pasteToastError'));
          });
        }
        return false;
      }

      return true;
    });

    const scrollListener = term.onScroll(() => {
      const buffer = term.buffer.active;
      const hasScrolledUp = buffer.viewportY < buffer.baseY;
      setShowScrollBottom(hasScrolledUp);
    });

    let lineBuf = '';
    const dataListener = term.onData((data) => {
      window.api.sshWrite(sessionId, data);

      // Reset buffer on control keys that alter the command or navigate history (Escape, Tab, Ctrl+C, Ctrl+D)
      if (data.includes('\x1b') || data.includes('\t') || data.includes('\x03') || data.includes('\x04')) {
        lineBuf = '';
        currentInputRef.current = '';
        setCurrentInput('');
        setGhostText('');
        ghostTextRef.current = '';
        setGhostPosition(null);
        return;
      }

      if (data === '\r' || data === '\n') {
        const trimmed = lineBuf.trim();
        const isValidCmd = trimmed && 
                           trimmed.length >= 2 && 
                           trimmed.length <= 150 && 
                           !/[\x00-\x1F\x7F-\x9F]/.test(trimmed) &&
                           !/^[a-zA-Z]$/.test(trimmed);
        if (isValidCmd) {
          setHistoryCommands((prev) => {
            const filtered = prev.filter(c => c !== trimmed);
            const updated = [...filtered, trimmed].slice(-50);
            historyCommandsRef.current = updated;
            return updated;
          });
        }
        lineBuf = '';
        currentInputRef.current = '';
        setCurrentInput('');
        setGhostText('');
        ghostTextRef.current = '';
        setGhostPosition(null);
      } else if (data === '\x7f' || data === '\b') {
        lineBuf = lineBuf.slice(0, -1);
        currentInputRef.current = lineBuf;
        setCurrentInput(lineBuf);
        updateGhostText(lineBuf, historyCommandsRef.current);
      } else if (data.length === 1 && data >= ' ') {
        lineBuf += data;
        currentInputRef.current = lineBuf;
        setCurrentInput(lineBuf);
        updateGhostText(lineBuf, historyCommandsRef.current);
      }
    });

    const removeSshDataListener = window.api.onSshData((_, payload) => {
      if (payload.sessionId === sessionId) {
        term.write(payload.data);
        
        // Broadcast terminal output to all connected WebRTC Live Pairing peers
        if (activeConnectionsRef.current && activeConnectionsRef.current.length > 0) {
          activeConnectionsRef.current.forEach((conn) => {
            if (conn && conn.open) {
              try {
                conn.send({ type: 'DATA', payload: payload.data });
              } catch (_) {}
            }
          });
        }

        // Strip ANSI escape codes to keep clean readable text
        const cleanChunk = payload.data.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
        recentOutputRef.current = (recentOutputRef.current + cleanChunk).slice(-15000);
        checkAnomalyLogs(payload.data);
      }
    });

    const removeSshClosedListener = window.api.onSshClosed((_, payload) => {
      if (payload.sessionId === sessionId) {
        setIsConnected(false);
        term.writeln(`\r\n\x1b[31m[${t('sshSessionEnded')}]\x1b[0m`);

        // Notify WebRTC peers that session ended
        if (activeConnectionsRef.current && activeConnectionsRef.current.length > 0) {
          activeConnectionsRef.current.forEach((conn) => {
            if (conn && conn.open) {
              try {
                conn.send({ type: 'CLOSED' });
              } catch (_) {}
            }
          });
        }
      }
    });

    startConnection(currentServer);

    // Light background detection of Server OS for AI contextual awareness
    const detectOsCmd = `if [ -f /etc/os-release ]; then . /etc/os-release; echo "$NAME $VERSION"; elif [ -f /etc/redhat-release ]; then cat /etc/redhat-release; else uname -s; fi`;
    window.api.multiExecSsh([currentServer], detectOsCmd, [], settings.hashicorpVault).then((res: any[]) => {
      if (res && res[0] && res[0].status === 'SUCCESS' && res[0].output) {
        setDetectedOs(res[0].output.trim());
      }
    }).catch((e: any) => console.warn('OS detection failed silently:', e));

    const handleResize = () => {
      safeFit();
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
      safeFit();
    }
  }, [fontSize]);

  const { t } = useTranslation(settings);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu.visible]);

  const handleCopy = () => {
    if (terminalRef.current && terminalRef.current.hasSelection()) {
      const selection = terminalRef.current.getSelection();
      if (selection && selection.trim().length > 0) {
        navigator.clipboard.writeText(selection);
        showToast('success', t('copyToastSuccess').replace('{count}', String(selection.length)));
        return;
      }
    }
    showToast('empty', t('copyToastEmpty'));
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        window.api.sshWrite(sessionId, text);
        showToast('pasted', t('pasteToastSuccess').replace('{count}', String(text.length)));
      } else {
        showToast('empty', t('pasteToastEmpty'));
      }
    } catch (e) {
      showToast('empty', t('pasteToastError'));
    }
  };

  const handleClearTerminal = () => {
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
  };

  const handleSelectAll = () => {
    if (terminalRef.current) {
      terminalRef.current.selectAll();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      visible: true
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle-click (mouse button 1) paste like typical Linux terminal / PuTTY / iTerm
    if (e.button === 1) {
      e.preventDefault();
      handlePaste();
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

  // Remote Web Share / Live Pairing states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareMode, setShareMode] = useState<'READONLY' | 'INTERACTIVE'>('READONLY');
  const [shareLink, setShareLink] = useState('');
  const [shareKey, setShareKey] = useState('');
  const [isLiveShared, setIsLiveShared] = useState(false);
  const peerInstanceRef = useRef<any>(null);
  const activeConnectionsRef = useRef<any[]>([]);

  // Cleanup WebRTC Peer on unmount or stop
  const cleanupPeer = () => {
    if (activeConnectionsRef.current) {
      activeConnectionsRef.current.forEach((conn) => {
        try { conn.close(); } catch (_) {}
      });
      activeConnectionsRef.current = [];
    }
    if (peerInstanceRef.current) {
      try { peerInstanceRef.current.destroy(); } catch (_) {}
      peerInstanceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupPeer();
    };
  }, []);

  const handleStartLiveShare = () => {
    cleanupPeer();

    // Generate strong, cryptographically secure 256-bit / 32-char Access Key
    const secureKey = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Unpredictable Room ID
    const randomSalt = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8);
    const roomId = `omni_${sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)}_${randomSalt}`;

    setShareKey(secureKey);

    // Initialize PeerJS Host Server with reliable Google STUN servers
    const PeerClass = (window as any).Peer;
    if (PeerClass) {
      try {
        const peer = new PeerClass(roomId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
        });
        peerInstanceRef.current = peer;

        peer.on('open', (id: string) => {
          console.log('[Live Share Host] WebRTC Peer Room opened:', id);
        });

        peer.on('connection', (conn: any) => {
          console.log('[Live Share Host] New remote viewer connected:', conn.peer);
          
          conn.on('open', () => {
            // Verify access key handshake
            conn.on('data', (data: any) => {
              if (data && data.type === 'AUTH') {
                if (data.key === secureKey) {
                  activeConnectionsRef.current.push(conn);
                  conn.send({ type: 'AUTH_OK', mode: shareMode });
                  showToast('success', t('liveViewerJoined'));
                } else {
                  conn.send({ type: 'AUTH_FAILED', message: 'Invalid Access Key' });
                  conn.close();
                }
              } else if (data && data.type === 'INPUT') {
                // If interactive mode, execute input
                if (shareMode === 'INTERACTIVE' && data.payload) {
                  window.api.sshWrite(sessionId, data.payload);
                }
              }
            });
          });

          conn.on('close', () => {
            activeConnectionsRef.current = activeConnectionsRef.current.filter(c => c !== conn);
          });
        });

        peer.on('error', (err: any) => {
          console.error('[Live Share Host] Peer error:', err);
        });
      } catch (e) {
        console.error('Failed to init PeerJS Host:', e);
      }
    }

    const baseUrl = (settings.liveShareRelayUrl && settings.liveShareRelayUrl.trim()) 
      ? settings.liveShareRelayUrl.trim().replace(/\/+$/, '') 
      : 'https://hellendaothanh.github.io/terminal';
    
    // Construct encrypted URL with room and secret key
    const url = `${baseUrl}?room=${roomId}&key=${secureKey}&mode=${shareMode.toLowerCase()}&server=${encodeURIComponent(currentServer.name)}`;
    setShareLink(url);
    setIsLiveShared(true);
    showToast('success', shareMode === 'READONLY' ? t('liveShareReadonlyStarted') : t('liveShareInteractiveStarted'));
  };

  const handleStopLiveShare = () => {
    cleanupPeer();
    setShareLink('');
    setShareKey('');
    setIsLiveShared(false);
    setIsShareModalOpen(false);
    showToast('empty', t('liveShareStopped'));
  };

  const envColor = currentServer.environment === 'PRODUCTION' 
    ? 'var(--env-prod)' 
    : currentServer.environment === 'STAGING' 
      ? 'var(--env-staging)' 
      : 'var(--env-dev)';

  const envBorder = currentServer.environment === 'PRODUCTION'
    ? '2px solid rgba(244, 63, 94, 0.7)'
    : currentServer.environment === 'STAGING'
      ? '2px solid rgba(234, 179, 8, 0.7)'
      : '1px solid var(--border-subtle)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: THEMES[settings.theme]?.background || '#1e222a',
      position: 'relative',
      border: envBorder,
      boxShadow: currentServer.environment === 'PRODUCTION' ? 'inset 0 0 15px rgba(244, 63, 94, 0.15)' : 'none'
    }}>
      {/* Environment Isolation Warning Banner for Production / Staging */}
      {currentServer.environment === 'PRODUCTION' && (
        <div style={{
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          borderBottom: '1px solid rgba(244, 63, 94, 0.4)',
          color: '#fca5a5',
          padding: '3px 12px',
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          letterSpacing: '0.5px'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f43f5e', animation: 'pulse 1.5s infinite' }} />
            ⚠️ {t('prodEnvironmentWarning')}
          </span>
          <span style={{ fontSize: '0.68rem', opacity: 0.85, textTransform: 'uppercase' }}>PRODUCTION ISOLATION MODE</span>
        </div>
      )}

      {currentServer.environment === 'STAGING' && (
        <div style={{
          backgroundColor: 'rgba(234, 179, 8, 0.12)',
          borderBottom: '1px solid rgba(234, 179, 8, 0.35)',
          color: '#fde047',
          padding: '2px 12px',
          fontSize: '0.7rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 500
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#eab308' }} />
            ⚡ {t('stagingEnvironmentNotice')}
          </span>
          <span style={{ fontSize: '0.68rem', opacity: 0.85, textTransform: 'uppercase' }}>STAGING ISOLATION</span>
        </div>
      )}

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
            title={t('reconnectTooltip')}
          >
            <RotateCcw size={12} />
            <span>{t('reconnect')}</span>
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
              <span>{t('changePassword')}</span>
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
            title={t('copyTooltip')}
          >
            {copyStatus === 'success' ? <Check size={13} /> : copyStatus === 'empty' ? <AlertCircle size={13} /> : <Copy size={13} />}
            <span>{copyStatus === 'success' ? t('copySuccess') : copyStatus === 'empty' ? t('copyEmpty') : 'Copy'}</span>
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
            title={t('pasteTooltip')}
          >
            {copyStatus === 'pasted' ? <Check size={13} /> : <Clipboard size={13} />}
            <span>{copyStatus === 'pasted' ? t('pastedSuccess') : 'Paste'}</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            style={{
              background: isLiveShared ? 'rgba(239, 68, 68, 0.15)' : 'none',
              border: isLiveShared ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
              borderRadius: '4px',
              padding: '2px 6px',
              color: isLiveShared ? 'var(--accent-danger)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              transition: 'all 0.2s ease'
            }}
            title={t('liveShareTooltip')}
          >
            {isLiveShared ? <Radio size={13} className="spin" /> : <Share2 size={13} />}
            <span>{isLiveShared ? t('liveSharingBadge') : t('liveShareBtn')}</span>
          </button>

          <button
            onClick={() => setShowQuickCommands(!showQuickCommands)}
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

      {/* Terminal Container with side-by-side Quick Commands Panel */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <div 
          style={{ flex: 1, padding: '8px', overflow: 'hidden', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}
          onContextMenu={handleContextMenu}
          onMouseDown={handleMouseDown}
        >
          <div
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden'
            }}
          />

          {/* Interactive Ghost-Text Autocomplete Overlay (Warp / Fig style) */}
          {ghostText && ghostPosition && (
            <div
              style={{
                position: 'absolute',
                left: `${ghostPosition.x}px`,
                top: `${ghostPosition.y}px`,
                pointerEvents: 'none',
                fontFamily: settings.fontFamily || 'JetBrains Mono, monospace',
                fontSize: `${fontSize}px`,
                lineHeight: 1.25,
                color: 'rgba(255, 255, 255, 0.35)',
                whiteSpace: 'pre',
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{ghostText}</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#93c5fd',
                  borderRadius: '3px',
                  padding: '1px 4px',
                  fontFamily: 'sans-serif',
                  pointerEvents: 'auto',
                  fontWeight: 600,
                  userSelect: 'none'
                }}
              >
                Tab ⇥
              </span>
            </div>
          )}

          {/* Right-Click Context Menu */}
          {contextMenu.visible && (
            <div
              style={{
                position: 'fixed',
                top: `${contextMenu.y}px`,
                left: `${contextMenu.x}px`,
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                boxShadow: 'var(--shadow-xl)',
                padding: '4px',
                zIndex: 1000,
                minWidth: '160px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                animation: 'fadeIn 0.1s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  handleCopy();
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Copy size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>{t('menuCopy')}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-dim)' }}>Ctrl+Shift+C</span>
              </button>

              <button
                onClick={() => {
                  handlePaste();
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Clipboard size={13} style={{ color: 'var(--accent-success)' }} />
                <span>{t('menuPaste')}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-dim)' }}>Ctrl+V</span>
              </button>

              <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '2px 0' }} />

              <button
                onClick={() => {
                  handleSelectAll();
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--text-main)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Bookmark size={13} style={{ color: 'var(--text-muted)' }} />
                <span>{t('menuSelectAll')}</span>
              </button>

              <button
                onClick={() => {
                  handleClearTerminal();
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--accent-danger)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <RotateCcw size={13} />
                <span>{t('menuClear')}</span>
              </button>
            </div>
          )}

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
              title={t('scrollToBottomTooltip')}
            >
              <ChevronDown size={14} />
              <span>{t('scrollToBottom')}</span>
            </button>
          )}
        </div>

        {showQuickCommands && (
          <QuickCommandsPanel
            language={settings.language}
            onClose={() => setShowQuickCommands(false)}
            onExecute={(cmd) => {
              if (terminalRef.current) {
                // If it ends with a space (e.g. systemctl restart ), write it but don't enter
                const needsEnter = !cmd.endsWith(' ');
                window.api.sshWrite(sessionId, cmd + (needsEnter ? '\n' : ''));
                showToast('success', settings.language === 'vi' ? (needsEnter ? 'Đã chạy lệnh!' : 'Đã chèn lệnh vào terminal!') : (needsEnter ? 'Command executed!' : 'Command inserted into terminal!'));
              }
            }}
            onCopy={(cmd) => {
              navigator.clipboard.writeText(cmd);
              showToast('success', settings.language === 'vi' ? 'Đã copy lệnh vào Clipboard!' : 'Command copied to Clipboard!');
            }}
          />
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
              <div style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {renderFormattedExplanation(aiExplanation)}
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
            let toWrite = suggestion;
            // If current typed input is a prefix of suggestion (e.g. currentInput = "ping", suggestion = "ping -c 4 8.8.8.8"),
            // only write the remaining part (" -c 4 8.8.8.8") so it does not duplicate into "pingping -c 4 8.8.8.8".
            if (currentInput && suggestion.toLowerCase().startsWith(currentInput.toLowerCase())) {
              toWrite = suggestion.slice(currentInput.length);
            } else if (currentInput && currentInput.length > 0) {
              // If user typed something that is not a prefix, backspace the typed chars first, then write full suggestion
              const backspaces = '\b \b'.repeat(currentInput.length);
              window.api.sshWrite(sessionId, '\x08'.repeat(currentInput.length));
              toWrite = suggestion;
            }
            if (toWrite) {
              window.api.sshWrite(sessionId, toWrite);
            }
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
          language={settings.language}
          onApprove={() => {
            if (terminalRef.current) {
              window.api.sshWrite(sessionId, pendingCommand.command + '\r');
            }
            setGuardModalOpen(false);
            setPendingCommand(null);
          }}
          onCancel={() => {
            if (terminalRef.current) {
              terminalRef.current.write(`\r\n\x1b[31m${t('commandGuardBlockedMsg')}\x1b[0m\r\n`);
            }
            setGuardModalOpen(false);
            setPendingCommand(null);
          }}
        />
      )}

      {/* Quick Web-based Remote Share (Live Pairing) Modal */}
      {isShareModalOpen && (
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
                onClick={() => setIsShareModalOpen(false)}
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
                    onClick={() => setShareMode('READONLY')}
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
                    onClick={() => setShareMode('INTERACTIVE')}
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
                  onClick={handleStopLiveShare}
                  style={{ color: 'var(--accent-danger)' }}
                >
                  {t('liveShareStopBtn')}
                </button>
              ) : (
                <>
                  <button className="btn-secondary" onClick={() => setIsShareModalOpen(false)}>
                    {t('cancel')}
                  </button>
                  <button className="btn-primary" onClick={handleStartLiveShare}>
                    <Share2 size={14} />
                    <span>{t('liveShareStartBtn')}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ReAuth Password Modal */}
      <ReAuthModal
        isOpen={isReAuthOpen}
        server={currentServer}
        errorMsg={error || (settings.language === 'vi' ? 'Xác thực thất bại' : 'Authentication failed')}
        language={settings.language}
        onRetry={handleRetryAuth}
        onClose={() => setIsReAuthOpen(false)}
      />
    </div>
  );
};
