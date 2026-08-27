import React from 'react';
import { Copy } from 'lucide-react';
import { translations } from '../../i18n/translations';

export type TranslateFn = (key: keyof typeof translations.vi) => string;
export type ShowToastFn = (status: 'success' | 'empty' | 'pasted', message: string) => void;

interface MarkdownRendererOptions {
  t: TranslateFn;
  showToast: ShowToastFn;
}

/**
 * Render an AI markdown explanation (headings, lists, bold/italic/code,
 * fenced code blocks with a copy button) as React elements.
 */
export const renderFormattedExplanation = (content: string, { t, showToast }: MarkdownRendererOptions): React.ReactNode[] => {
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
        const headingFontSize = level === 1 ? '0.95rem' : level === 2 ? '0.88rem' : '0.82rem';
        return (
          <h4 key={`${keyOffset}-${idx}`} style={{ fontSize: headingFontSize, fontWeight: 700, color: 'var(--accent-primary)', margin: '8px 0 3px 0' }}>
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
