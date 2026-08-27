import React from 'react';
import { Copy, Clipboard, Bookmark, RotateCcw } from 'lucide-react';
import type { TranslateFn } from './markdownRenderer';

export interface ContextMenuState {
  x: number;
  y: number;
  visible: boolean;
}

interface TerminalContextMenuProps {
  state: ContextMenuState;
  t: TranslateFn;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
}

const menuItemStyle: React.CSSProperties = {
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
};

const hoverHandlers = {
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.backgroundColor = 'transparent'; }
};

export const TerminalContextMenu: React.FC<TerminalContextMenuProps> = ({
  state,
  t,
  onCopy,
  onPaste,
  onSelectAll,
  onClear,
  onClose
}) => {
  if (!state.visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: `${state.y}px`,
        left: `${state.x}px`,
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
        onClick={() => { onCopy(); onClose(); }}
        style={menuItemStyle}
        {...hoverHandlers}
      >
        <Copy size={13} style={{ color: 'var(--accent-primary)' }} />
        <span>{t('menuCopy')}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-dim)' }}>Ctrl+Shift+C</span>
      </button>

      <button
        onClick={() => { onPaste(); onClose(); }}
        style={menuItemStyle}
        {...hoverHandlers}
      >
        <Clipboard size={13} style={{ color: 'var(--accent-success)' }} />
        <span>{t('menuPaste')}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-dim)' }}>Ctrl+V</span>
      </button>

      <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '2px 0' }} />

      <button
        onClick={() => { onSelectAll(); onClose(); }}
        style={menuItemStyle}
        {...hoverHandlers}
      >
        <Bookmark size={13} style={{ color: 'var(--text-muted)' }} />
        <span>{t('menuSelectAll')}</span>
      </button>

      <button
        onClick={() => { onClear(); onClose(); }}
        style={{ ...menuItemStyle, color: 'var(--accent-danger)' }}
        {...hoverHandlers}
      >
        <RotateCcw size={13} />
        <span>{t('menuClear')}</span>
      </button>
    </div>
  );
};
