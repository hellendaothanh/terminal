import React, { useState, useEffect, useRef } from 'react';
import { ServerConfig, SSHKey } from '../types';
import { Terminal, Plus, Search, Trash2, X, Play, Square, Activity } from 'lucide-react';

interface LogAggregatorProps {
  servers: ServerConfig[];
  keys: SSHKey[];
}

interface LogLine {
  id: string;
  streamId: string;
  serverName: string;
  timestamp: number;
  text: string;
  color: string;
}

interface LogStreamConfig {
  streamId: string;
  serverId: string;
  filePath: string;
  color: string;
  isActive: boolean;
}

const COLORS = [
  '#60a5fa', // Blue
  '#34d399', // Green
  '#fbbf24', // Yellow
  '#f87171', // Red
  '#a78bfa', // Purple
  '#fb923c', // Orange
  '#2dd4bf', // Teal
  '#f472b6', // Pink
];

export const LogAggregator: React.FC<LogAggregatorProps> = ({ servers, keys }) => {
  const [streams, setStreams] = useState<LogStreamConfig[]>([]);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [filterRegex, setFilterRegex] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal state
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('/var/log/syslog');
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Maximum lines to keep in memory to prevent browser crash
  const MAX_LINES = 5000;

  useEffect(() => {
    // Listen for log data
    const handleLogData = (streamId: string, data: string) => {
      const stream = streams.find(s => s.streamId === streamId);
      if (!stream) return;
      
      const serverName = servers.find(s => s.id === stream.serverId)?.name || 'Unknown';
      const lines = data.split('\n').filter(line => line.trim() !== '');
      
      const newLines = lines.map(line => ({
        id: Math.random().toString(36).substr(2, 9),
        streamId,
        serverName,
        timestamp: Date.now(),
        text: line,
        color: stream.color
      }));

      setLogLines(prev => {
        const updated = [...prev, ...newLines];
        if (updated.length > MAX_LINES) {
          return updated.slice(updated.length - MAX_LINES);
        }
        return updated;
      });
    };

    window.api.onLogData(handleLogData);
    
    return () => {
      window.api.removeLogDataListener(handleLogData);
    };
  }, [streams, servers]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logLines, autoScroll]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      setAutoScroll(isAtBottom);
    }
  };

  const handleAddStream = async () => {
    if (!selectedServerId || !filePath) return;

    const streamId = 'log_' + Date.now();
    const color = COLORS[streams.length % COLORS.length];

    const newStream: LogStreamConfig = {
      streamId,
      serverId: selectedServerId,
      filePath,
      color,
      isActive: true
    };

    setStreams([...streams, newStream]);
    setIsModalOpen(false);
    
    // Start backend stream
    const serverChain: ServerConfig[] = [];
    const keyChain: any[] = [];
    const currentServer = servers.find((s) => s.id === selectedServerId);
    
    if (currentServer) {
      if (currentServer.jumpHostIds && currentServer.jumpHostIds.length > 0) {
        for (const jId of currentServer.jumpHostIds) {
          const jSrv = servers.find(s => s.id === jId);
          if (jSrv) {
            serverChain.push(jSrv);
            keyChain.push(keys.find(k => k.id === jSrv.privateKeyId));
          }
        }
      }
      serverChain.push(currentServer);
      keyChain.push(keys.find(k => k.id === currentServer.privateKeyId));
      
      try {
        await window.api.logStartStream(streamId, serverChain, keyChain, filePath);
      } catch (err) {
        console.error("Failed to start log stream:", err);
      }
    }
  };

  const handleStopStream = async (streamId: string) => {
    setStreams(prev => prev.map(s => s.streamId === streamId ? { ...s, isActive: false } : s));
    await window.api.logStopStream(streamId);
  };

  const handleRemoveStream = async (streamId: string) => {
    await handleStopStream(streamId);
    setStreams(prev => prev.filter(s => s.streamId !== streamId));
    setLogLines(prev => prev.filter(line => line.streamId !== streamId));
  };

  const filteredLines = logLines.filter(line => {
    if (!filterRegex) return true;
    try {
      const regex = new RegExp(filterRegex, 'i');
      return regex.test(line.text);
    } catch {
      // Invalid regex, just do simple includes
      return line.text.toLowerCase().includes(filterRegex.toLowerCase());
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
      {/* Header toolbar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>
            <Activity size={24} style={{ color: 'var(--accent-primary)' }} />
            Log Aggregator
          </h2>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500 }}
          >
            <Plus size={16} />
            Add Source
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Regex Filter (e.g. error|warn)"
              value={filterRegex}
              onChange={(e) => setFilterRegex(e.target.value)}
              style={{ width: '100%', padding: '6px 10px 6px 32px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', fontSize: '0.88rem' }}
            />
          </div>
          <button
            onClick={() => setLogLines([])}
            style={{ padding: '6px 12px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontSize: '0.88rem' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Main Content Split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Terminal Area */}
        <div 
          ref={containerRef}
          onScroll={handleScroll}
          style={{ flex: 1, backgroundColor: '#0f172a', padding: '16px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5 }}
        >
          {filteredLines.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '100px' }}>
              No logs to display. Add a source to start tailing.
            </div>
          ) : (
            filteredLines.map((line) => (
              <div key={line.id} style={{ display: 'flex', gap: '12px', marginBottom: '4px', wordBreak: 'break-all' }}>
                <span style={{ color: '#64748b', whiteSpace: 'nowrap', userSelect: 'none' }}>
                  {new Date(line.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ color: line.color, fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none' }}>
                  [{line.serverName}]
                </span>
                <span style={{ color: '#e2e8f0', flex: 1 }}>{line.text}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Sidebar Sources list */}
        {streams.length > 0 && (
          <div style={{ width: '280px', borderLeft: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', overflowY: 'auto', padding: '16px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', marginTop: 0 }}>Active Sources ({streams.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {streams.map(stream => {
                const srvName = servers.find(s => s.id === stream.serverId)?.name;
                return (
                  <div key={stream.streamId} style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: stream.color }} />
                      <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>{srvName}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px', wordBreak: 'break-all' }}>
                      {stream.filePath}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => stream.isActive ? handleStopStream(stream.streamId) : handleRemoveStream(stream.streamId)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {stream.isActive ? <Square size={12} /> : <Trash2 size={12} />}
                        {stream.isActive ? 'Stop' : 'Remove'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Source Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Add Log Source</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 500, marginBottom: '8px', color: 'var(--text-main)' }}>Server</label>
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
              >
                <option value="">Select a server...</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.host})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 500, marginBottom: '8px', color: 'var(--text-main)' }}>Log File Path</label>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/var/log/syslog"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-main)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddStream}
                disabled={!selectedServerId || !filePath}
                style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', cursor: (!selectedServerId || !filePath) ? 'not-allowed' : 'pointer', opacity: (!selectedServerId || !filePath) ? 0.5 : 1 }}
              >
                Start Tailing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
