import React, { useState } from 'react';
import { CommandSnippet, MultiExecResult, ServerConfig, SSHKey } from '../types';
import { Play, Plus, Search, Edit2, Trash2, Code2, CheckSquare, Square, Terminal, Database, CheckCircle2, XCircle, Clock, Copy, Check, FileText } from 'lucide-react';

import { TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface MultiExecManagerProps {
  snippets: CommandSnippet[];
  servers: ServerConfig[];
  keys: SSHKey[];
  onSaveSnippet: (snippet: CommandSnippet) => void;
  onDeleteSnippet: (id: string) => void;
  settings?: TerminalSettings;
}

export const MultiExecManager: React.FC<MultiExecManagerProps> = ({
  snippets,
  servers,
  keys,
  onSaveSnippet,
  onDeleteSnippet,
  settings
}) => {
  const { t } = useTranslation(settings);
  const [activeTab, setActiveTab] = useState<'SNIPPETS' | 'MULTI_EXEC'>('MULTI_EXEC');
  
  // Snippet Library States
  const [searchSnippet, setSearchSnippet] = useState('');
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [snippetFormData, setSnippetFormData] = useState<Partial<CommandSnippet>>({
    type: 'SSH'
  });

  // Multi-Exec States
  const [execType, setExecType] = useState<'SSH' | 'DATABASE'>('SSH');
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [commandContent, setCommandContent] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [execResults, setExecResults] = useState<MultiExecResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredServers = servers.filter((s) => {
    if (execType === 'DATABASE') return s.protocol === 'DATABASE';
    return s.protocol === 'SSH' || s.protocol === 'SFTP' || !s.protocol;
  });

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchSnippet.toLowerCase()) ||
      s.content.toLowerCase().includes(searchSnippet.toLowerCase())
  );

  const handleSelectAllServers = () => {
    if (selectedServerIds.length === filteredServers.length) {
      setSelectedServerIds([]);
    } else {
      setSelectedServerIds(filteredServers.map((s) => s.id));
    }
  };

  const handleToggleServer = (id: string) => {
    if (selectedServerIds.includes(id)) {
      setSelectedServerIds(selectedServerIds.filter((sid) => sid !== id));
    } else {
      setSelectedServerIds([...selectedServerIds, id]);
    }
  };

  const handleOpenSnippetModal = (sn?: CommandSnippet) => {
    if (sn) {
      setSnippetFormData(sn);
      setEditingSnippetId(sn.id);
    } else {
      setSnippetFormData({
        title: '',
        type: 'SSH',
        content: '',
        description: ''
      });
      setEditingSnippetId(null);
    }
    setIsSnippetModalOpen(true);
  };

  const handleSaveSnippet = () => {
    if (!snippetFormData.title || !snippetFormData.content) {
      alert('Vui lòng nhập Tiêu đề và Nội dung script.');
      return;
    }

    const now = Date.now();
    const entry: CommandSnippet = {
      id: editingSnippetId || crypto.randomUUID(),
      title: snippetFormData.title,
      type: snippetFormData.type || 'SSH',
      content: snippetFormData.content,
      description: snippetFormData.description,
      createdAt: snippetFormData.createdAt || now,
      updatedAt: now
    };

    onSaveSnippet(entry);
    setIsSnippetModalOpen(false);
  };

  const handleRunSnippetMultiExec = (sn: CommandSnippet) => {
    setExecType(sn.type);
    setCommandContent(sn.content);
    setActiveTab('MULTI_EXEC');
  };

  const handleExecuteMulti = async () => {
    if (selectedServerIds.length === 0) {
      alert('Vui lòng chọn ít nhất một máy chủ / CSDL.');
      return;
    }
    if (!commandContent.trim()) {
      alert('Vui lòng nhập lệnh cần chạy.');
      return;
    }

    const targetServers = servers.filter((s) => selectedServerIds.includes(s.id));
    setIsRunning(true);

    // Initial pending states
    const initialResults: MultiExecResult[] = targetServers.map((s) => ({
      targetId: s.id,
      targetName: s.name,
      hostOrDb: execType === 'SSH' ? `${s.username}@${s.host}:${s.port}` : `${s.dbType}://${s.host}:${s.port}`,
      status: 'RUNNING',
      output: 'Đang kết nối và thực thi...',
      executionTimeMs: 0
    }));
    setExecResults(initialResults);

    try {
      let results: MultiExecResult[] = [];
      if (execType === 'SSH') {
        results = await window.api.multiExecSsh(targetServers, commandContent, keys);
      } else {
        results = await window.api.multiExecDb(targetServers, commandContent);
      }
      setExecResults(results);
    } catch (e: any) {
      alert(`Lỗi thực thi hàng loạt: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const successCount = execResults.filter((r) => r.status === 'SUCCESS').length;
  const errorCount = execResults.filter((r) => r.status === 'ERROR').length;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-main)', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            <Code2 size={22} style={{ color: 'var(--accent-primary)' }} />
            {t('multiExecTitle')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {t('multiExecSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('MULTI_EXEC')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'MULTI_EXEC' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'MULTI_EXEC' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={14} /> {t('tabMultiExec')}
          </button>
          <button
            onClick={() => setActiveTab('SNIPPETS')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'SNIPPETS' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'SNIPPETS' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} /> {t('tabSnippets')} ({snippets.length})
          </button>
        </div>
      </div>

      {activeTab === 'SNIPPETS' ? (
        /* TAB 1: SNIPPETS LIBRARY */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Tìm kiếm đoạn script..."
                value={searchSnippet}
                onChange={(e) => setSearchSnippet(e.target.value)}
                style={{ paddingLeft: '34px' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
            </div>

            <button className="btn-primary" onClick={() => handleOpenSnippetModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Thêm Snippet Mới
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredSnippets.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Chưa có Snippet nào trong thư viện.
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
                      <Play size={12} /> Chạy Lệnh Hàng Loạt
                    </button>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn-secondary" onClick={() => handleOpenSnippetModal(sn)} style={{ padding: '4px' }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-secondary" onClick={() => { if (confirm('Xóa Snippet này?')) onDeleteSnippet(sn.id); }} style={{ padding: '4px', color: 'var(--accent-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* TAB 2: MULTI-EXEC RUNNER */
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Left Column: Target Server/DB Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '16px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Chọn Mục Tiêu</span>
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
                <span>Chọn tất cả ({filteredServers.length})</span>
              </button>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Đã chọn: {selectedServerIds.length}</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filteredServers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Không có mục tiêu phù hợp.
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
                  Nội Dung Câu Lệnh ({execType})
                </span>

                <button
                  className="btn-primary"
                  onClick={handleExecuteMulti}
                  disabled={isRunning}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', opacity: isRunning ? 0.6 : 1 }}
                >
                  <Play size={14} /> {isRunning ? 'Đang Chạy Đồng Thời...' : 'Thực Thi Song Song'}
                </button>
              </div>

              <textarea
                className="input-field"
                placeholder={execType === 'SSH' ? 'VD: uptime && uname -a' : 'VD: SELECT CURRENT_TIMESTAMP;'}
                value={commandContent}
                onChange={(e) => setCommandContent(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', minHeight: '90px', resize: 'vertical', backgroundColor: 'var(--bg-primary)' }}
              />
            </div>

            {/* Parallel Output Results Grid */}
            <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>Kết Quả Thực Thi Song Song</span>
                  {execResults.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> {successCount} Thành công
                      </span>
                      {errorCount > 0 && (
                        <span style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={13} /> {errorCount} Thất bại
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
                {execResults.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Chọn mục tiêu và nhấn "Thực Thi Song Song" để xem kết quả đồng thời.
                  </div>
                ) : (
                  execResults.map((res) => (
                    <div
                      key={res.targetId}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        border: res.status === 'ERROR' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{res.targetName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{res.hostOrDb}</div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} /> {res.executionTimeMs}ms
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
                          backgroundColor: 'var(--bg-secondary)',
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
      )}

      {/* Modal Add/Edit Snippet */}
      {isSnippetModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '480px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{editingSnippetId ? 'Sửa Snippet' : 'Thêm Snippet Mới'}</h3>
              <button onClick={() => setIsSnippetModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Tiêu đề Snippet <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <input type="text" className="input-field" placeholder="VD: Check Uptime & RAM, Clean Logs" value={snippetFormData.title || ''} onChange={(e) => setSnippetFormData({ ...snippetFormData, title: e.target.value })} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Loại Snippet</label>
                <select className="input-field" value={snippetFormData.type || 'SSH'} onChange={(e) => setSnippetFormData({ ...snippetFormData, type: e.target.value as any })}>
                  <option value="SSH">SSH Shell Command</option>
                  <option value="DATABASE">Database SQL Query</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Nội dung đoạn lệnh <span style={{ color: 'var(--accent-danger)' }}>*</span></label>
                <textarea
                  className="input-field"
                  placeholder="Nhập nội dung script / SQL..."
                  value={snippetFormData.content || ''}
                  onChange={(e) => setSnippetFormData({ ...snippetFormData, content: e.target.value })}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Mô tả thêm</label>
                <input type="text" className="input-field" placeholder="Mô tả công dụng của snippet này..." value={snippetFormData.description || ''} onChange={(e) => setSnippetFormData({ ...snippetFormData, description: e.target.value })} />
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-tertiary)' }}>
              <button className="btn-secondary" onClick={() => setIsSnippetModalOpen(false)}>Hủy</button>
              <button className="btn-primary" onClick={handleSaveSnippet}>Lưu Snippet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
