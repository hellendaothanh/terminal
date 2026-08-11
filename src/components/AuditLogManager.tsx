import React, { useState, useEffect, useRef } from 'react';
import { AuditLogEntry } from '../types';
import { FileText, Search, Play, Pause, Download, AlertTriangle, ShieldAlert, Clock, Terminal, Database, RefreshCw, Check, ArrowRight, Copy } from 'lucide-react';

interface AuditLogManagerProps {
  onExportLog?: (logId: string, format: 'cast' | 'txt') => void;
}

export const AuditLogManager: React.FC<AuditLogManagerProps> = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<'ALL' | 'SSH' | 'DATABASE'>('ALL');
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [castData, setCastData] = useState<{ header: any; frames: Array<[number, string, string]> } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await window.api.auditList();
      setLogs(res || []);
    } catch (e) {
      console.error('Lỗi khi tải Audit Logs:', e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.targetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.commandOrQuery.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProtocol = filterProtocol === 'ALL' || log.protocol === filterProtocol;
    const matchesRisk = filterRisk === 'ALL' || log.riskLevel === filterRisk;

    return matchesSearch && matchesProtocol && matchesRisk;
  });

  const handleSelectLog = async (log: AuditLogEntry) => {
    setSelectedLog(log);
    setIsPlaying(false);
    setPlaybackFrameIndex(0);

    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    if (log.protocol === 'SSH') {
      try {
        const res = await window.api.auditGetCast(log.id);
        setCastData(res);
      } catch (e) {
        setCastData(null);
      }
    } else {
      setCastData(null);
    }
  };

  // Playback timer for SSH Asciinema .cast frames
  useEffect(() => {
    if (isPlaying && castData && castData.frames.length > 0) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackFrameIndex((prev) => {
          if (prev + 1 >= castData.frames.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100 / playbackSpeed);
    } else {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, castData, playbackSpeed]);

  const handleExport = async (format: 'cast' | 'txt') => {
    if (!selectedLog) return;
    const res = await window.api.auditExport(selectedLog.id, format);
    if (res.success) {
      alert(`Đã xuất nhật ký thành công tại: ${res.path}`);
    } else if (res.error && res.error !== 'Đã hủy thao tác lưu.') {
      alert(`Lỗi xuất file: ${res.error}`);
    }
  };

  const handleCopyCommand = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderTerminalOutputUntilFrame = () => {
    if (!castData || !castData.frames) return '';
    let output = '';
    for (let i = 0; i <= playbackFrameIndex && i < castData.frames.length; i++) {
      const frame = castData.frames[i];
      if (frame && frame[1] === 'o') {
        output += frame[2];
      }
    }
    return output;
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-main)', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            <ShieldAlert size={22} style={{ color: 'var(--accent-danger)' }} />
            Ghi Vết & Nhật Ký Kiểm Toán Phiên Làm Việc (Session Recording & Audit Logs)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Ghi lại toàn bộ lịch sử thao tác SSH (chuẩn asciinema v2), SQL Queries và cảnh báo các câu lệnh có rủi ro cao.
          </p>
        </div>

        <button className="btn-secondary" onClick={fetchLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={15} /> Tải Lại Nhật Ký
        </button>
      </div>

      {/* Main Grid: Left Log List, Right Log Details & Asciinema Player */}
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Left Column: Audit Log List */}
        <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '16px', overflow: 'hidden' }}>
          {/* Search & Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Tìm kiếm lệnh, máy chủ, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '0.85rem' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-dim)' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <select className="input-field" value={filterProtocol} onChange={(e) => setFilterProtocol(e.target.value as any)} style={{ fontSize: '0.78rem', flex: 1 }}>
                <option value="ALL">Tất cả Giao thức</option>
                <option value="SSH">SSH</option>
                <option value="DATABASE">Database</option>
              </select>

              <select className="input-field" value={filterRisk} onChange={(e) => setFilterRisk(e.target.value as any)} style={{ fontSize: '0.78rem', flex: 1 }}>
                <option value="ALL">Mọi Mức Rủi Ro</option>
                <option value="HIGH">CRITICAL / HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
          </div>

          {/* Audit Items */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Không có nhật ký kiểm toán nào.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                const isHighRisk = log.riskLevel === 'HIGH';
                const isMedRisk = log.riskLevel === 'MEDIUM';

                return (
                  <div
                    key={log.id}
                    onClick={() => handleSelectLog(log)}
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-surface)' : 'var(--bg-tertiary)',
                      border: isSelected
                        ? '1px solid var(--accent-primary)'
                        : isHighRisk
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {log.protocol === 'SSH' ? <Terminal size={14} style={{ color: 'var(--accent-primary)' }} /> : <Database size={14} style={{ color: '#c084fc' }} />}
                        {log.targetName}
                      </span>

                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: isHighRisk ? 'rgba(239, 68, 68, 0.2)' : isMedRisk ? 'rgba(234, 179, 8, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: isHighRisk ? 'var(--accent-danger)' : isMedRisk ? 'var(--accent-warning)' : 'var(--accent-success)'
                        }}
                      >
                        {log.riskLevel || 'LOW'} RISK
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        color: isHighRisk ? '#fca5a5' : 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '6px'
                      }}
                    >
                      {log.commandOrQuery || '(SSH Session Live Input)'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      <span>User: {log.user}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Player & Detail Visualizer */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {selectedLog ? (
            <>
              {/* Detail Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Chi Tiết Nhật Ký Audit #{selectedLog.id.slice(-8)}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '16px' }}>
                    <span>Target: <strong>{selectedLog.targetName}</strong></span>
                    <span>User: <strong>{selectedLog.user}</strong></span>
                    <span>Time: <strong>{new Date(selectedLog.timestamp).toLocaleString()}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedLog.protocol === 'SSH' && (
                    <button className="btn-secondary" onClick={() => handleExport('cast')} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Download size={13} /> Export .cast
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => handleExport('txt')} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={13} /> Export .txt
                  </button>
                </div>
              </div>

              {/* High Risk Alert Banner */}
              {selectedLog.riskLevel === 'HIGH' && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-danger)' }}>
                  <AlertTriangle size={20} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    CẢNH BÁO KIỂM TOÁN: Phát hiện câu lệnh có khả năng gây rủi ro cao cho hệ thống!
                  </div>
                </div>
              )}

              {/* SSH Asciinema Player Screen */}
              {selectedLog.protocol === 'SSH' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Play size={14} style={{ color: 'var(--accent-primary)' }} />
                      Trình Phát Lại Asciinema Session Player (.cast)
                    </span>

                    {castData && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => setIsPlaying(!isPlaying)}
                          style={{ padding: '4px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                          <span>{isPlaying ? 'Pause' : 'Play'}</span>
                        </button>

                        <select
                          className="input-field"
                          value={playbackSpeed}
                          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                          style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                        >
                          <option value={1}>Speed 1x</option>
                          <option value={2}>Speed 2x</option>
                          <option value={4}>Speed 4x</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Terminal Cast Screen Canvas */}
                  <div
                    style={{
                      flex: 1,
                      backgroundColor: '#0f131a',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      padding: '16px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem',
                      color: '#34d399',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      overflowY: 'auto',
                      minHeight: '200px'
                    }}
                  >
                    {castData ? (
                      renderTerminalOutputUntilFrame() || '(Chưa có dữ liệu frame ghi lại)'
                    ) : (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '40px' }}>
                        Không tìm thấy file .cast ghi lại cho phiên SSH này.
                      </div>
                    )}
                  </div>

                  {/* Cast Playback Progress Bar */}
                  {castData && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="range"
                        min="0"
                        max={castData.frames.length - 1}
                        value={playbackFrameIndex}
                        onChange={(e) => {
                          setPlaybackFrameIndex(Number(e.target.value));
                          setIsPlaying(false);
                        }}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', minWidth: '60px' }}>
                        {playbackFrameIndex + 1} / {castData.frames.length}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Database / SQL Command Log Output */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Câu Lệnh Thực Thi (SQL / Command)</span>
                      <button
                        onClick={() => handleCopyCommand(selectedLog.commandOrQuery, selectedLog.id)}
                        style={{ background: 'none', border: 'none', color: copiedId === selectedLog.id ? 'var(--accent-success)' : 'var(--accent-primary)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {copiedId === selectedLog.id ? <Check size={14} /> : <Copy size={14} />} Copy
                      </button>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#a7f3d0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {selectedLog.commandOrQuery}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Thời gian thực thi</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                        {selectedLog.executionTimeMs || 0} ms
                      </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Trạng thái</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: selectedLog.status === 'SUCCESS' ? 'var(--accent-success)' : 'var(--accent-danger)', marginTop: '4px' }}>
                        {selectedLog.status}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Chọn một nhật ký kiểm toán ở danh sách bên trái để xem chi tiết.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
