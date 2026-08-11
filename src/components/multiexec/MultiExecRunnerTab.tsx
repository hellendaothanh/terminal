import React from 'react';
import { Play, CheckSquare, Square, Terminal, Database, Clock, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { ServerConfig, MultiExecResult } from '../../types';

interface MultiExecRunnerTabProps {
  execType: 'SSH' | 'DATABASE';
  setExecType: (type: 'SSH' | 'DATABASE') => void;
  selectedServerIds: string[];
  setSelectedServerIds: (ids: string[]) => void;
  filteredServers: ServerConfig[];
  handleSelectAllServers: () => void;
  handleToggleServer: (id: string) => void;
  commandContent: string;
  setCommandContent: (content: string) => void;
  handleExecuteMulti: () => void;
  isRunning: boolean;
  execResults: MultiExecResult[];
  successCount: number;
  errorCount: number;
  copiedId: string | null;
  handleCopyText: (text: string, id: string) => void;
  t: (key: any) => string;
}

export const MultiExecRunnerTab: React.FC<MultiExecRunnerTabProps> = ({
  execType,
  setExecType,
  selectedServerIds,
  setSelectedServerIds,
  filteredServers,
  handleSelectAllServers,
  handleToggleServer,
  commandContent,
  setCommandContent,
  handleExecuteMulti,
  isRunning,
  execResults,
  successCount,
  errorCount,
  copiedId,
  handleCopyText,
  t
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
      {/* Left Column: Target Server/DB Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{t('selectTargets')}</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => { setExecType('SSH'); setSelectedServerIds([]); }}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: execType === 'SSH' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: execType === 'SSH' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              SSH
            </button>
            <button
              onClick={() => { setExecType('DATABASE'); setSelectedServerIds([]); }}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: 'none',
                backgroundColor: execType === 'DATABASE' ? '#c084fc' : 'var(--bg-tertiary)',
                color: execType === 'DATABASE' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              DATABASE
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <button
            onClick={handleSelectAllServers}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {selectedServerIds.length === filteredServers.length && filteredServers.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>{t('selectAll')} ({filteredServers.length})</span>
          </button>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('selectedCount')} {selectedServerIds.length}</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filteredServers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {t('noTargetsMatch')}
            </div>
          ) : (
            filteredServers.map((s) => {
              const isChecked = selectedServerIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => handleToggleServer(s.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isChecked ? 'var(--bg-surface)' : 'var(--bg-tertiary)',
                    border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {execType === 'SSH' ? `${s.username}@${s.host}` : `${s.dbType}://${s.host}`}
                    </div>
                  </div>

                  {isChecked ? <CheckSquare size={16} style={{ color: 'var(--accent-primary)' }} /> : <Square size={16} style={{ color: 'var(--text-dim)' }} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Command Editor & Parallel Results Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
        {/* Command Editor Input Card */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {execType === 'SSH' ? <Terminal size={16} style={{ color: 'var(--accent-primary)' }} /> : <Database size={16} style={{ color: '#c084fc' }} />}
              {t('commandContentTitle')} ({execType})
            </span>

            <button
              className="btn-primary"
              onClick={handleExecuteMulti}
              disabled={isRunning}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', opacity: isRunning ? 0.6 : 1 }}
            >
              <Play size={14} /> {isRunning ? t('executing') : t('executeParallel')}
            </button>
          </div>

          <textarea
            className="input-field"
            placeholder={execType === 'SSH' ? 'Ex: uptime && uname -a' : 'Ex: SELECT CURRENT_TIMESTAMP;'}
            value={commandContent}
            onChange={(e) => setCommandContent(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', minHeight: '90px', resize: 'vertical', backgroundColor: 'var(--bg-primary)' }}
          />
        </div>

        {/* Parallel Output Results Grid */}
        <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{t('parallelResults')}</span>
              {execResults.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> {successCount} {t('successCountLabel')}
                  </span>
                  {errorCount > 0 && (
                    <span style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <XCircle size={13} /> {errorCount} {t('errorCountLabel')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '12px', minHeight: 0 }}>
            {execResults.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {t('noParallelResults')}
              </div>
            ) : (
              execResults.map((res) => (
                <div
                  key={res.targetId}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border:
                      res.status === 'SUCCESS'
                        ? '1px solid rgba(16, 185, 129, 0.4)'
                        : res.status === 'ERROR'
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : '1px solid var(--border-subtle)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>{res.targetName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.hostOrDb}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} /> {res.executionTimeMs} ms
                      </span>

                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor:
                            res.status === 'SUCCESS'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : res.status === 'ERROR'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'rgba(234, 179, 8, 0.2)',
                          color:
                            res.status === 'SUCCESS'
                              ? 'var(--accent-success)'
                              : res.status === 'ERROR'
                              ? 'var(--accent-danger)'
                              : 'var(--accent-warning)'
                        }}
                      >
                        {res.status}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.76rem',
                      color: res.status === 'ERROR' ? 'var(--accent-danger)' : '#a7f3d0',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all'
                    }}
                  >
                    {res.output}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleCopyText(res.output, res.targetId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedId === res.targetId ? 'var(--accent-success)' : 'var(--text-dim)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedId === res.targetId ? <Check size={12} /> : <Copy size={12} />} Copy Output
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
