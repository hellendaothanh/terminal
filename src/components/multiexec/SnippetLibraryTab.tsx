import React from 'react';
import { Search, Plus, Play, Edit2, Trash2 } from 'lucide-react';
import { CommandSnippet } from '../../types';

interface SnippetLibraryTabProps {
  snippets: CommandSnippet[];
  searchSnippet: string;
  setSearchSnippet: (val: string) => void;
  filteredSnippets: CommandSnippet[];
  handleOpenSnippetModal: (sn?: CommandSnippet) => void;
  handleRunSnippetMultiExec: (sn: CommandSnippet) => void;
  onDeleteSnippet: (id: string) => void;
  t: (key: any) => string;
}

export const SnippetLibraryTab: React.FC<SnippetLibraryTabProps> = ({
  snippets,
  searchSnippet,
  setSearchSnippet,
  filteredSnippets,
  handleOpenSnippetModal,
  handleRunSnippetMultiExec,
  onDeleteSnippet,
  t
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            className="input-field"
            placeholder={t('searchSnippetsPlaceholder')}
            value={searchSnippet}
            onChange={(e) => setSearchSnippet(e.target.value)}
            style={{ paddingLeft: '34px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
        </div>

        <button className="btn-primary" onClick={() => handleOpenSnippetModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> {t('addSnippet')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredSnippets.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            {t('noSnippetsFound')}
          </div>
        ) : (
          filteredSnippets.map((sn) => (
            <div
              key={sn.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{sn.title}</h3>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: sn.type === 'SSH' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                      color: sn.type === 'SSH' ? 'var(--accent-primary)' : '#c084fc'
                    }}
                  >
                    {sn.type}
                  </span>
                </div>

                {sn.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>{sn.description}</p>}

                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    color: '#a7f3d0',
                    maxHeight: '90px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}
                >
                  {sn.content}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleRunSnippetMultiExec(sn)}
                  style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Play size={12} /> {t('tabMultiExec')}
                </button>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn-secondary" onClick={() => handleOpenSnippetModal(sn)} style={{ padding: '4px' }}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn-secondary" onClick={() => { if (confirm(t('confirmDeleteSnippet'))) onDeleteSnippet(sn.id); }} style={{ padding: '4px', color: 'var(--accent-danger)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
