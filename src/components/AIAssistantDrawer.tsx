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
import { useTranslation } from '../i18n/useTranslation';

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
  const { t } = useTranslation(settings);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [promptInput, setPromptInput] = useState<string>('');
  const [contextSnippet, setContextSnippet] = useState<string>('');
  const [contextSourceInfo, setContextSourceInfo] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  useEffect(() => {
    if (isOpen && activeTabId) {
      handleAutoCaptureContext();
    }
  }, [isOpen, activeTabId]);

  if (!isOpen) return null;

  const aiConfig = settings.ai;

  const handleAutoCaptureContext = () => {
    if (!activeTabId) return;

    // Check if active tab is Terminal (SSH) or Database Explorer
    const captured = (window as any).__omni_active_tab_context?.();

    if (captured && captured.text) {
      setContextSnippet(captured.text);
      setContextSourceInfo(captured.source || 'Tab Currently Active');
    } else {
      // Fallback capture message
      setContextSnippet('');
      setContextSourceInfo('');
    }
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptInput.trim() && !contextSnippet) return;

    const userMessageContent = promptInput.trim();
    const finalPrompt = contextSnippet
      ? `[Context Data from ${contextSourceInfo}]:\n\`\`\`\n${contextSnippet}\n\`\`\`\n\nQuestion/Task: ${userMessageContent}`
      : userMessageContent;

    const userMessage: AIMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: userMessageContent || '[Analysis request with attached screen context]',
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setPromptInput('');
    setLoading(true);

    try {
      const responseText = await window.api.aiSendMessage(finalPrompt, aiConfig);

      const aiResponse: AIMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `❌ **Error sending request to AI:** ${err.message || 'Check your API Key & endpoint configuration in Settings.'}`,
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper parser: formats Markdown code blocks, **bold**, and `inline code`
  const renderFormattedContent = (content: string) => {
    // Split by code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Text before code block
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
                  style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px' }}
                >
                  <Copy size={11} />
                  <span>{t('copyCode')}</span>
                </button>
              </div>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: '#4ade80',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap'
              }}
            >
              <code>{part.code}</code>
            </pre>
          </div>
        );
      } else {
        // Simple inline markdown formatting parser for **bold** and `inline code`
        const textLines = (part.value || '').split('\n');

        return (
          <div key={index}>
            {textLines.map((line, lIdx) => {
              if (!line.trim()) return <br key={lIdx} />;

              // Process **bold** and `code`
              const inlineRegex = /(\*\*.*?\*\*|`.*?`)/g;
              const lineParts = line.split(inlineRegex);

              return (
                <p key={lIdx} style={{ margin: '4px 0' }}>
                  {lineParts.map((sub, sIdx) => {
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
                  })}
                </p>
              );
            })}
          </div>
        );
      }
    });
  };

  return (
    <div
      style={{
        width: '400px',
        backgroundColor: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
        userSelect: 'none'
      }}
    >
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

        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Auto Context Capture Toolbar */}
      <div
        style={{
          padding: '10px 14px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <button
          onClick={handleAutoCaptureContext}
          className="btn-secondary"
          style={{
            width: '100%',
            height: '32px',
            fontSize: '0.78rem',
            justifyContent: 'center',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}
        >
          <Download size={13} />
          <span>{t('autoCaptureContext')}</span>
        </button>

        {contextSourceInfo && (
          <div style={{ fontSize: '0.7rem', color: 'var(--accent-success)', marginTop: '4px', textAlign: 'center' }}>
            {t('capturedContextFrom')} <strong>{contextSourceInfo}</strong>
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
    </div>
  );
};
