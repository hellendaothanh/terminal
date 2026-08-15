import React, { useState, useEffect, useRef } from 'react';
import { TerminalSettings, AIMessage, ServerConfig, SSHKey } from '../types';
import {
  Sparkles,
  X,
  Send,
  Terminal,
  Database,
  Copy,
  Check,
  Bot,
  RefreshCw,
  Zap,
  Code,
  Download,
  AlertCircle,
  PlayCircle,
  Maximize2,
  Minimize2,
  GripVertical
} from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { PlaybookRunner } from './PlaybookRunner';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TerminalSettings;
  activeTabId?: string;
  activeServer?: ServerConfig | null;
  servers?: ServerConfig[];
  keys?: SSHKey[];
  onPasteToTerminal?: (text: string) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  activeTabId,
  activeServer,
  servers = [],
  keys = [],
  onPasteToTerminal
}) => {
  const { t } = useTranslation(settings);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'PLAYBOOK'>('PLAYBOOK');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [promptInput, setPromptInput] = useState<string>('');
  const [contextSnippet, setContextSnippet] = useState<string>('');
  const [contextSourceInfo, setContextSourceInfo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Drawer Width & Maximized State
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = localStorage.getItem('omni_ai_drawer_width');
    return saved ? Math.max(450, parseInt(saved, 10)) : 580;
  });
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const [chatServerTelemetry, setChatServerTelemetry] = useState<string>('');
  const [inspectingChatTelemetry, setInspectingChatTelemetry] = useState<boolean>(false);
  const [includeTelemetryInChat, setIncludeTelemetryInChat] = useState<boolean>(true);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 400 && newWidth <= window.innerWidth * 0.85) {
        setDrawerWidth(newWidth);
        localStorage.setItem('omni_ai_drawer_width', String(newWidth));
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('aiWelcome'),
        timestamp: Date.now()
      }
    ]);
  }, [settings.language]);

  const handleAutoCaptureContext = () => {
    if (!activeTabId) return;

    const getter = (window as any).__activeBuffers?.[activeTabId];
    const captured = getter ? getter() : null;

    if (captured && captured.text) {
      setContextSnippet(captured.text);
      setContextSourceInfo(
        captured.type === 'SSH'
          ? `Terminal SSH (${captured.server})`
          : `CSDL ${captured.dbType} (${captured.server})`
      );
    } else {
      setContextSnippet('');
      setContextSourceInfo('');
    }
  };

  useEffect(() => {
    if (isOpen && activeTabId) {
      handleAutoCaptureContext();
    }
  }, [isOpen, activeTabId]);

  if (!isOpen) return null;

  const aiConfig = settings.ai;

  const handleInspectActiveServer = async () => {
    if (!activeServer || activeServer.protocol !== 'SSH') {
      return;
    }

    setInspectingChatTelemetry(true);
    try {
      const keyObj = keys.find((k) => k.id === activeServer.privateKeyId);
      const res = await window.api.serverInspectTelemetry(activeServer, keyObj, settings.hashicorpVault);
      if (res.success && res.info) {
        setChatServerTelemetry(res.info);
      }
    } catch (e: any) {
      console.warn('Failed to inspect chat server telemetry:', e);
    } finally {
      setInspectingChatTelemetry(false);
    }
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() && !contextSnippet && !chatServerTelemetry) return;

    const userMessageContent = promptInput.trim();
    
    // Combine terminal buffer context with live server telemetry context if available
    let combinedContext = '';
    if (includeTelemetryInChat && chatServerTelemetry) {
      combinedContext += `[REAL-TIME SERVER OS & HARDWARE TELEMETRY (${activeServer?.name || activeServer?.host})]:\n${chatServerTelemetry}\n\n`;
    }
    if (contextSnippet) {
      combinedContext += `[SCREEN BUFFER CONTEXT from ${contextSourceInfo}]:\n\`\`\`\n${contextSnippet}\n\`\`\``;
    }

    const finalPrompt = combinedContext.trim()
      ? `${combinedContext.trim()}\n\n[USER QUESTION / TASK]:\n${userMessageContent || 'Hãy phân tích tình trạng máy chủ trên và đưa ra đánh giá / khuyến nghị.'}`
      : userMessageContent;

    const userMessage: AIMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: userMessageContent || '[Yêu cầu phân tích dữ liệu màn hình & tình trạng máy chủ]',
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setPromptInput('');
    setLoading(true);

    try {
      if (!window.api || !window.api.aiSendMessage) {
        throw new Error('AI API is not supported in this runtime environment.');
      }

      const combinedAiConfig = {
        ...aiConfig,
        language: settings.language || 'vi'
      };

      const replyText = await window.api.aiSendMessage(finalPrompt, combinedAiConfig);

      const aiReply: AIMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: replyText,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch (err: any) {
      const isEn = settings.language === 'en';
      const errorReply: AIMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: isEn
          ? `❌ Error sending request to AI: ${err.message || 'Unknown error.'}\nPlease check your API Key or AI Provider in Settings (Settings -> AI).`
          : `❌ Lỗi khi gửi yêu cầu tới AI: ${err.message || 'Lỗi không xác định.'}\nVui lòng kiểm tra lại API Key hoặc nhà cung cấp AI trong Cài đặt (Settings -> AI).`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMsg(settings.language === 'vi' ? 'Đã sao chép vào bộ nhớ đệm!' : 'Copied to clipboard!');
    setTimeout(() => {
      setCopiedId(null);
      setToastMsg(null);
    }, 2000);
  };

  const renderFormattedContent = (content: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code'; language?: string; code?: string; value?: string }> = [];

    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
      }

      parts.push({
        type: 'code',
        language: match[1] || 'bash',
        code: match[2].trim()
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', value: content.substring(lastIndex) });
    }

    const renderInlineMarkdown = (text: string) => {
      const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
      const lineParts = text.split(inlineRegex);
      return lineParts.map((sub, sIdx) => {
        if (sub.startsWith('**') && sub.endsWith('**')) {
          return <strong key={sIdx} style={{ color: 'var(--text-main)', fontWeight: 600 }}>{sub.slice(2, -2)}</strong>;
        }
        if (sub.startsWith('`') && sub.endsWith('`')) {
          return (
            <code
              key={sIdx}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: '#f43f5e',
                padding: '2px 5px',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {sub.slice(1, -1)}
            </code>
          );
        }
        return sub;
      });
    };

    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <div
            key={index}
            style={{
              margin: '10px 0',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 10px',
                backgroundColor: 'var(--bg-tertiary)',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.72rem',
                color: 'var(--text-muted)'
              }}
            >
              <span>{part.language}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {onPasteToTerminal && (
                  <button
                    onClick={() => onPasteToTerminal(part.code || '')}
                    className="btn-secondary"
                    style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px' }}
                    title="Paste command directly to active Terminal"
                  >
                    <Code size={11} />
                    <span>{t('pasteCommand')}</span>
                  </button>
                )}
                <button
                  onClick={() => handleCopy(`code_${index}`, part.code || '')}
                  className="btn-secondary"
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    height: '22px',
                    backgroundColor: copiedId === `code_${index}` ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-tertiary)',
                    borderColor: copiedId === `code_${index}` ? 'var(--accent-success)' : 'var(--border-subtle)',
                    color: copiedId === `code_${index}` ? 'var(--accent-success)' : 'var(--text-main)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {copiedId === `code_${index}` ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedId === `code_${index}` ? (settings.language === 'vi' ? 'Đã copy!' : 'Copied!') : t('copyCode')}</span>
                </button>
              </div>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: '#e2e8f0',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              {part.code}
            </pre>
          </div>
        );
      } else {
        const lines = (part.value || '').split('\n');
        return (
          <div key={index} style={{ margin: '4px 0' }}>
            {lines.map((line, lIdx) => {
              if (line.startsWith('# ')) {
                return <h3 key={lIdx} style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: '10px 0 4px 0' }}>{line.slice(2)}</h3>;
              }
              if (line.startsWith('## ')) {
                return <h4 key={lIdx} style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-primary)', margin: '8px 0 3px 0' }}>{line.slice(3)}</h4>;
              }
              if (line.startsWith('### ')) {
                return <h5 key={lIdx} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c084fc', margin: '6px 0 2px 0' }}>{line.slice(4)}</h5>;
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                  <div key={lIdx} style={{ display: 'flex', gap: '6px', margin: '3px 0', paddingLeft: '4px' }}>
                    <span style={{ color: 'var(--accent-primary)', lineHeight: '1.4' }}>•</span>
                    <span style={{ flex: 1 }}>{renderInlineMarkdown(line.slice(2))}</span>
                  </div>
                );
              }
              if (!line.trim()) {
                return <div key={lIdx} style={{ height: '6px' }} />;
              }
              return (
                <p key={lIdx} style={{ margin: '3px 0', lineHeight: '1.5' }}>
                  {renderInlineMarkdown(line)}
                </p>
              );
            })}
          </div>
        );
      }
    });
  };

  const finalWidth = isMaximized ? 'min(900px, 80vw)' : `${drawerWidth}px`;

  return (
    <div
      style={{
        width: finalWidth,
        minWidth: '420px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: '-6px 0 25px rgba(0, 0, 0, 0.4)',
        userSelect: 'none',
        position: 'relative',
        transition: isDraggingRef.current ? 'none' : 'width 0.15s ease-out'
      }}
    >
      {/* Draggable Left Border Resize Handle */}
      {!isMaximized && (
        <div
          onMouseDown={handleMouseDownResize}
          title="Kéo để thay đổi kích thước khung (Drag to resize)"
          style={{
            position: 'absolute',
            left: '-4px',
            top: 0,
            bottom: 0,
            width: '8px',
            cursor: 'ew-resize',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(192, 132, 252, 0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <GripVertical size={10} style={{ color: 'var(--text-dim)', opacity: 0.6 }} />
        </div>
      )}

      {toastMsg && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '16px',
          zIndex: 100,
          backgroundColor: 'rgba(34, 197, 94, 0.95)',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.75rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <Check size={14} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          height: '52px',
          padding: '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-tertiary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: '#c084fc' }} />
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
            {t('aiAssistant')}
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}
          >
            {aiConfig?.model || 'Gemini'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setIsMaximized((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 'var(--radius-sm)'
            }}
            title={isMaximized ? 'Thu nhỏ khung (Minimize)' : 'Mở rộng khung (Maximize)'}
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
            title="Đóng (Close)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)'
        }}
      >
        <button
          onClick={() => setActiveTab('CHAT')}
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'CHAT' ? '#c084fc' : 'var(--text-dim)',
            borderBottom: activeTab === 'CHAT' ? '2px solid #c084fc' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Bot size={14} />
          <span>{t('tabAiChat')}</span>
        </button>

        <button
          onClick={() => setActiveTab('PLAYBOOK')}
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: '0.78rem',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: activeTab === 'PLAYBOOK' ? '#c084fc' : 'var(--text-dim)',
            borderBottom: activeTab === 'PLAYBOOK' ? '2px solid #c084fc' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Zap size={14} />
          <span>{t('tabDevOpsPlaybook')}</span>
        </button>
      </div>

      {activeTab === 'PLAYBOOK' ? (
        <PlaybookRunner
          settings={settings}
          servers={servers}
          keys={keys}
          activeServer={activeServer}
          onPasteToTerminal={onPasteToTerminal}
        />
      ) : (
        <>
          {/* Auto Context Capture Toolbar */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleAutoCaptureContext}
                className="btn-secondary"
                style={{
                  flex: 1,
                  height: '32px',
                  fontSize: '0.76rem',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  color: 'var(--accent-primary)',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}
                title="Lấy dữ liệu hiển thị trên tab terminal / SQL hiện tại"
              >
                <Download size={13} />
                <span>{t('autoCaptureContext')}</span>
              </button>

              {activeServer && activeServer.protocol === 'SSH' && (
                <button
                  onClick={handleInspectActiveServer}
                  disabled={inspectingChatTelemetry}
                  className="btn-secondary"
                  style={{
                    height: '32px',
                    fontSize: '0.76rem',
                    padding: '0 10px',
                    justifyContent: 'center',
                    backgroundColor: chatServerTelemetry ? 'rgba(34, 197, 94, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                    color: chatServerTelemetry ? 'var(--accent-success)' : '#c084fc',
                    border: chatServerTelemetry ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)'
                  }}
                  title="Thu thập thông số OS, CPU, RAM, Disk và dịch vụ máy chủ hiện tại"
                >
                  <RefreshCw size={13} className={inspectingChatTelemetry ? 'spin' : ''} />
                  <span>{inspectingChatTelemetry ? '...' : (chatServerTelemetry ? '✓ OS Live' : '🔍 Scan Server')}</span>
                </button>
              )}
            </div>

            {contextSourceInfo && (
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-success)', textAlign: 'center' }}>
                {t('capturedContextFrom')} <strong>{contextSourceInfo}</strong>
              </div>
            )}

            {chatServerTelemetry && (
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '0.72rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-success)', fontWeight: 600, marginBottom: '4px' }}>
                  <span>{t('serverTelemetryTitle')}</span>
                  <button onClick={() => setChatServerTelemetry('')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.68rem' }}>✕</button>
                </div>
                <pre style={{ margin: 0, maxHeight: '75px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                  {chatServerTelemetry}
                </pre>
              </div>
            )}
          </div>

          {/* Active Context Snippet Box */}
          {contextSnippet && (
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>{t('contextSnippetTitle')} ({contextSnippet.length} chars):</span>
                <button onClick={() => { setContextSnippet(''); setContextSourceInfo(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '0.7rem' }}>Xóa</button>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', maxHeight: '70px', overflowY: 'auto', backgroundColor: 'var(--bg-tertiary)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>
                {contextSnippet.slice(0, 300)}...
              </div>
            </div>
          )}

          {/* Chat Messages Log */}
          <div className="ai-assistant-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((m) => {
              const isUser = m.role === 'user';

              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '92%',
                    backgroundColor: isUser ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    border: isUser ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    color: 'var(--text-main)',
                    fontSize: '0.83rem',
                    lineHeight: '1.5'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isUser ? 'var(--accent-primary)' : '#c084fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isUser ? 'User' : <Bot size={13} />}
                      {isUser ? '' : t('aiAssistant')}
                    </span>
                    <button
                      onClick={() => handleCopy(m.id, m.content)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                      title={t('copyCode')}
                    >
                      {copiedId === m.id ? <Check size={12} style={{ color: 'var(--accent-success)' }} /> : <Copy size={12} />}
                    </button>
                  </div>

                  {/* Formatted Markdown Rendered View */}
                  <div>
                    {renderFormattedContent(m.content)}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <RefreshCw size={14} className="spin" style={{ color: '#c084fc' }} />
                <span>{t('aiThinking')}</span>
              </div>
            )}
          </div>

          {/* Input Prompt Footer */}
          <form
            onSubmit={handleSendPrompt}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              className="input-field"
              placeholder={t('askAiPlaceholder')}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              disabled={loading}
              style={{ height: '36px', fontSize: '0.83rem' }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || (!promptInput.trim() && !contextSnippet)}
              style={{ height: '36px', width: '36px', padding: 0, justifyContent: 'center', backgroundColor: '#c084fc', border: 'none' }}
            >
              <Send size={15} />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

