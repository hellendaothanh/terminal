import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { ServerConfig, SSHKey, TerminalSettings } from '../types';
import { Check, AlertCircle, RotateCcw, Sparkles, ChevronDown } from 'lucide-react';
import { ReAuthModal } from './ReAuthModal';
import { ServerMetricsDashboard } from './ServerMetricsDashboard';
import { ShellSmartAssistant } from './ShellSmartAssistant';
import { QuickCommandsPanel } from './QuickCommandsPanel';
import { useTranslation } from '../i18n/useTranslation';
import { TERMINAL_THEMES } from './ssh-terminal/terminalThemes';
import { COMMON_CMD_LIST, findAnomalyKeyword } from './ssh-terminal/constants';
import { renderFormattedExplanation } from './ssh-terminal/markdownRenderer';
import { getTerminalContextText } from './ssh-terminal/bufferUtils';
import { useLiveShare } from './ssh-terminal/useLiveShare';
import type { ShareMode } from './ssh-terminal/useLiveShare';
import { LiveShareModal } from './ssh-terminal/LiveShareModal';
import { TerminalToolbar } from './ssh-terminal/TerminalToolbar';
import { TerminalContextMenu } from './ssh-terminal/TerminalContextMenu';

interface SSHTerminalProps {
  sessionId: string;
  server: ServerConfig;
  keyObj?: SSHKey;
  availableServers?: ServerConfig[];
  keys?: SSHKey[];
  settings: TerminalSettings;
  onUpdateServerPassword?: (serverId: string, newPassword: string) => void;
}

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

  const checkAnomalyLogs = (text: string) => {
    const kw = findAnomalyKeyword(text);
    if (kw) {
      setAnomalyAlert(settings.language === 'vi' ? `Phát hiện lỗi log: "${kw}"` : `Error detected in logs: "${kw}"`);
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

  const handleTriggerAutofix = async () => {
    const textContext = getTerminalContextText(terminalRef.current, recentOutputRef.current, sessionId);
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
      theme: TERMINAL_THEMES[settings.theme] || TERMINAL_THEMES['one-dark'],
      allowProposedApi: true,
      scrollSensitivity: 2
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    fitAddonRef.current = fitAddon;
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
        window.api.sshResize(sessionId, term.cols, term.rows);
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
      if (terminalRef.current) {
        terminalRef.current.scrollToBottom();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
      // Double check after small delay for smooth layout transitions
      setTimeout(handleResize, 60);
    });
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      dataListener.dispose();
      scrollListener.dispose();
      removeSshDataListener();
      removeSshClosedListener();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
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

  // Remote Web Share / Live Pairing (WebRTC host feature)
  const buildLiveShareUrl = (roomId: string, key: string, mode: ShareMode) => {
    const baseUrl = (settings.liveShareRelayUrl && settings.liveShareRelayUrl.trim())
      ? settings.liveShareRelayUrl.trim().replace(/\/+$/, '')
      : 'https://hellendaothanh.github.io/terminal';
    return `${baseUrl}?room=${roomId}&key=${key}&mode=${mode.toLowerCase()}&server=${encodeURIComponent(currentServer.name)}`;
  };

  const {
    isShareModalOpen,
    setIsShareModalOpen,
    shareMode,
    shareKey,
    shareLink,
    isLiveShared,
    showLiveViewersPopover,
    setShowLiveViewersPopover,
    activeViewers,
    activeConnectionsRef,
    handleSwitchShareMode,
    handleStartLiveShare,
    handleStopLiveShare
  } = useLiveShare({
    sessionId,
    settings,
    currentServer,
    t,
    showToast,
    buildShareUrl: buildLiveShareUrl
  });

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
      backgroundColor: TERMINAL_THEMES[settings.theme]?.background || '#1e222a',
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
      <TerminalToolbar
        settings={settings}
        currentServer={currentServer}
        keyObj={keyObj}
        envColor={envColor}
        isConnected={isConnected}
        connecting={connecting}
        error={error}
        copyStatus={copyStatus}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        isLiveShared={isLiveShared}
        shareMode={shareMode}
        activeViewers={activeViewers}
        showLiveViewersPopover={showLiveViewersPopover}
        onToggleViewersPopover={() => setShowLiveViewersPopover(!showLiveViewersPopover)}
        onCloseViewersPopover={() => setShowLiveViewersPopover(false)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        showQuickCommands={showQuickCommands}
        onToggleQuickCommands={() => setShowQuickCommands(!showQuickCommands)}
        onReconnect={handleReconnect}
        onReAuth={() => setIsReAuthOpen(true)}
        onCopy={handleCopy}
        onPaste={handlePaste}
        t={t}
      />

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
          <TerminalContextMenu
            state={contextMenu}
            t={t}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onSelectAll={handleSelectAll}
            onClear={handleClearTerminal}
            onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
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
                {renderFormattedExplanation(aiExplanation, { t, showToast })}
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

      {/* Quick Web-based Remote Share (Live Pairing) Modal */}
      {/* Live Share Modal */}
      <LiveShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        t={t}
        showToast={showToast}
        shareMode={shareMode}
        shareLink={shareLink}
        isLiveShared={isLiveShared}
        activeViewers={activeViewers}
        onSwitchMode={handleSwitchShareMode}
        onStart={handleStartLiveShare}
        onStop={handleStopLiveShare}
      />

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
