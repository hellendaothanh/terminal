import React from 'react';
import { CommandSnippet } from '../../types';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingSnippetId: string | null;
  snippetFormData: Partial<CommandSnippet>;
  onChangeFormData: (data: Partial<CommandSnippet>) => void;
  onSave: () => void;
  t: (key: any) => string;
}

export const SnippetModal: React.FC<SnippetModalProps> = ({
  isOpen,
  onClose,
  editingSnippetId,
  snippetFormData,
  onChangeFormData,
  onSave,
  t
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ width: '480px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{editingSnippetId ? t('editSnippet') : t('addSnippet')}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('snippetTitleLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
            <input type="text" className="input-field" placeholder="Ex: Check Uptime & RAM, Clean Logs" value={snippetFormData.title || ''} onChange={(e) => onChangeFormData({ ...snippetFormData, title: e.target.value })} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('snippetTypeLabel')}</label>
            <select className="input-field" value={snippetFormData.type || 'SSH'} onChange={(e) => onChangeFormData({ ...snippetFormData, type: e.target.value as any })}>
              <option value="SSH">SSH Shell Command</option>
              <option value="DATABASE">Database SQL Query</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('snippetContentLabel')} <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
            <textarea
              className="input-field"
              placeholder="..."
              value={snippetFormData.content || ''}
              onChange={(e) => onChangeFormData({ ...snippetFormData, content: e.target.value })}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', minHeight: '120px', resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>{t('snippetDescLabel')}</label>
            <input type="text" className="input-field" placeholder="..." value={snippetFormData.description || ''} onChange={(e) => onChangeFormData({ ...snippetFormData, description: e.target.value })} />
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-tertiary)' }}>
          <button className="btn-secondary" onClick={onClose}>{t('cancel')}</button>
          <button className="btn-primary" onClick={onSave}>{t('saveSnippetBtn')}</button>
        </div>
      </div>
    </div>
  );
};
