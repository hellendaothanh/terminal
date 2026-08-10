import React, { useState, useEffect } from 'react';
import { TerminalSettings, AIMessage, ServerConfig } from '../types';
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
  AlertCircle
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TerminalSettings;
  activeTabId?: string;
  activeServer?: ServerConfig | null;
  onPasteToTerminal?: (text: string) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  activeTabId,
  onPasteToTerminal
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! Tôi là **Trợ Lý AI OmniTerminal**.\n\nTôi có thể giúp bạn:\n- **Phân tích log SSH Terminal** và hướng dẫn các lệnh sửa lỗi Linux.\n- **Tối ưu hóa câu lệnh SQL** và phân tích cấu trúc CSDL (MySQL, PostgreSQL, Redis, MongoDB).\n- **Giải thích lỗi hệ thống** thời gian thực.\n\nBấm nút **"📥 Nạp Tự Động Từ Màn Hình Terminal/CSDL"** bên dưới để tôi phân tích dữ liệu trực tiếp!',
      timestamp: Date.now()
    }
  ]);
  const [promptInput, setPromptInput] = useState<string>('');
  const [contextSnippet, setContextSnippet] = useState<string>('');
  const [contextSourceInfo, setContextSourceInfo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeTabId) {
      handleAutoCaptureContext();
    }
  }, [isOpen, activeTabId]);

  if (!isOpen) return null;

  const aiConfig = settings.ai;

  const handleAutoCaptureContext = () => {
    if (!activeTabId) return;
    const buffers = (window as any).__activeBuffers;
    if (buffers && typeof buffers[activeTabId] === 'function') {
      const data = buffers[activeTabId]();
      if (data && data.text) {
        setContextSnippet(data.text);
        if (data.type === 'SSH') {
          setContextSourceInfo(`SSH Terminal (${data.server || 'Active Session'})${data.isSelection ? ' - Đoạn bôi đen' : ''}`);
        } else if (data.type === 'DATABASE') {
          setContextSourceInfo(`Database ${data.dbType || ''} (${data.server || 'Active Console'})`);
        }
      }
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || promptInput;
    if (!textToSend.trim()) return;

    if (!aiConfig || !aiConfig.enabled) {
      alert('Vui lòng bật tính năng Trợ Lý AI và nhập API Key trong phần Cài Đặt (Settings).');
      return;
    }

    const userMsg: AIMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      contextSnippet: contextSnippet ? contextSnippet.slice(0, 800) : undefined
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setPromptInput('');
    setLoading(true);

    try {
      const res = await window.api.aiChat(
        aiConfig,
        textToSend,
        messages.filter((m) => m.id !== 'welcome'),
        contextSnippet
      );

      if (res.success && res.reply) {
        const aiMsg: AIMessage = {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          content: res.reply,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errMsg: AIMessage = {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `⚠️ **Lỗi AI:** ${res.error || 'Không thể kết nối đến AI Service.'}`,
          timestamp: Date.now()
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (e: any) {
      const errMsg: AIMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `⚠️ **Lỗi:** ${e.message}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const extractCodeBlocks = (content: string) => {
    const codeRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const matches = [];
    let match;
    while ((match = codeRegex.exec(content)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  };

  // Custom Lightweight Markdown Parser & HTML Formatter
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockBuffer: string[] = [];

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // Close Code Block
          const codeText = codeBlockBuffer.join('\n');
          const currentCodeIndex = idx;
          elements.push(
            <div key={`code_${idx}`} style={{
              margin: '10px 0',
              backgroundColor: '#161922',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#1f2430',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-muted)'
              }}>
                <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{codeBlockLang || 'code'}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {onPasteToTerminal && (
                    <button
                      onClick={() => onPasteToTerminal(codeText)}
                      style={{
                        padding: '2px 6px',
                        fontSize: '0.7rem',
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        color: 'var(--accent-success)',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Zap size={10} />
                      <span>Dán Lệnh</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(`block_${currentCodeIndex}`, codeText)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={10} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
              <pre style={{
                margin: 0,
                padding: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: '#e6edf3',
                overflowX: 'auto',
                whiteSpace: 'pre'
              }}>
                {codeText}
              </pre>
            </div>
          );
          codeBlockBuffer = [];
          inCodeBlock = false;
        } else {
          // Open Code Block
          inCodeBlock = true;
          codeBlockLang = line.replace('```', '').trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockBuffer.push(line);
        return;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(<h5 key={idx} style={{ margin: '8px 0 4px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{parseInlineMarkdown(line.slice(4))}</h5>);
        return;
      }
      if (line.startsWith('## ')) {
        elements.push(<h4 key={idx} style={{ margin: '10px 0 4px', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>{parseInlineMarkdown(line.slice(3))}</h4>);
        return;
      }
      if (line.startsWith('# ')) {
        elements.push(<h3 key={idx} style={{ margin: '12px 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>{parseInlineMarkdown(line.slice(2))}</h3>);
        return;
      }

      // Bullet Lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <div key={idx} style={{ display: 'flex', gap: '6px', marginLeft: '6px', margin: '2px 0' }}>
            <span style={{ color: 'var(--accent-primary)' }}>•</span>
            <span>{parseInlineMarkdown(line.trim().slice(2))}</span>
          </div>
        );
        return;
      }

      // Empty Lines
      if (!line.trim()) {
        elements.push(<div key={idx} style={{ height: '6px' }} />);
        return;
      }

      // Normal Paragraph
      elements.push(<div key={idx} style={{ marginBottom: '4px' }}>{parseInlineMarkdown(line)}</div>);
    });

    return elements;
  };

  // Helper for Bold, Italic, Inline Code parsing
  const parseInlineMarkdown = (text: string): React.ReactNode => {
    // Regex matches **bold**, *italic*, and `inline code`
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ fontWeight: 700, color: 'var(--text-main)' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 5px',
              borderRadius: '4px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: '#c084fc'
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div style={{
      position: 'relative',
      height: '100%',
      width: '400px',
      minWidth: '360px',
      maxWidth: '500px',
      backgroundColor: 'var(--bg-secondary)',
      borderLeft: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Drawer Header */}
      <div style={{
        padding: '14px 16px',
        backgroundColor: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} style={{ color: '#c084fc' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Trợ Lý AI OmniTerminal
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Model: <code style={{ color: 'var(--accent-primary)' }}>{aiConfig?.model || 'gemini-1.5-flash'}</code>
            </div>
          </div>
        </div>

        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {/* Auto Capture Live Context Button */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-primary)' }}>
        <button
          onClick={handleAutoCaptureContext}
          style={{
            width: '100%',
            padding: '6px 12px',
            fontSize: '0.76rem',
            fontWeight: 600,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Download size={13} />
          <span>📥 Nạp Tự Động Từ Màn Hình Terminal / CSDL Hiện Tại</span>
        </button>

        {contextSourceInfo && (
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-success)', marginTop: '4px', textAlign: 'center' }}>
            ⚡ Đã nạp bối cảnh từ: <strong>{contextSourceInfo}</strong>
          </div>
        )}
      </div>

      {/* Active Context Snippet Box */}
      {contextSnippet && (
        <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>📋 Dữ Liệu Ngữ Cảnh Nạp Kèm ({contextSnippet.length} ký tự):</span>
            <button onClick={() => { setContextSnippet(''); setContextSourceInfo(''); }} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '0.7rem' }}>Xóa</button>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', maxHeight: '70px', overflowY: 'auto', backgroundColor: 'var(--bg-tertiary)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>
            {contextSnippet.slice(0, 300)}...
          </div>
        </div>
      )}

      {/* Chat Messages Log */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                  {isUser ? 'Bạn' : <Bot size={13} />}
                  {isUser ? '' : 'Trợ Lý AI'}
                </span>
                <button
                  onClick={() => handleCopy(m.id, m.content)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                  title="Copy nội dung"
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
            <span>Trợ lý AI đang phân tích và suy nghĩ...</span>
          </div>
        )}
      </div>

      {/* Input Prompt Footer */}
      <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Hỏi Trợ lý AI hoặc dán câu hỏi vào đây..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{
              flex: 1,
              height: '42px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontSize: '0.82rem',
              padding: '8px 10px',
              resize: 'none',
              outline: 'none'
            }}
          />
          <button
            className="btn-primary"
            onClick={() => handleSendMessage()}
            disabled={loading || !promptInput.trim()}
            style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center' }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
