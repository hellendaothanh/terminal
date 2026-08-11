import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Activity, Network, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Server } from 'lucide-react';
import { ServerConfig, SSHKey } from '../types';

export interface ServerMetrics {
  cpuUsage: number; // Percentage 0-100
  memUsage: number; // Percentage 0-100
  memUsedMb: number;
  memTotalMb: number;
  diskUsage: number; // Percentage 0-100
  diskUsedGb: number;
  diskTotalGb: number;
  netRxKbps: number;
  netTxKbps: number;
  uptime: string;
  loadAvg: string;
  timestamp: number;
}

interface ServerMetricsDashboardProps {
  server: ServerConfig;
  keyObj?: SSHKey;
  refreshIntervalMs?: number; // Default 3000ms
  compact?: boolean;
}

export const ServerMetricsDashboard: React.FC<ServerMetricsDashboardProps> = ({
  server,
  keyObj,
  refreshIntervalMs = 3000,
  compact = false
}) => {
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);

  // Command to extract CPU, RAM, Disk, Network I/O and Uptime in 1 light agentless command
  const parseMetricsOutput = (output: string): ServerMetrics | null => {
    try {
      // Split output by delimiters
      const parts = output.trim().split('---METRICS_DELIM---');
      if (parts.length < 5) return null;

      const [cpuPart, memPart, diskPart, netPart, uptimePart] = parts.map((p) => p.trim());

      // 1. CPU Usage %
      let cpuUsage = 0;
      const cpuVal = parseFloat(cpuPart);
      if (!isNaN(cpuVal)) {
        cpuUsage = Math.min(100, Math.max(0, Math.round(cpuVal)));
      }

      // 2. RAM (Used MB, Total MB, %)
      let memUsedMb = 0;
      let memTotalMb = 0;
      let memUsage = 0;
      const memTokens = memPart.split(/\s+/);
      if (memTokens.length >= 2) {
        memTotalMb = parseInt(memTokens[0], 10) || 0;
        memUsedMb = parseInt(memTokens[1], 10) || 0;
        if (memTotalMb > 0) {
          memUsage = Math.round((memUsedMb / memTotalMb) * 100);
        }
      }

      // 3. Disk (Used GB, Total GB, %)
      let diskUsedGb = 0;
      let diskTotalGb = 0;
      let diskUsage = 0;
      const diskTokens = diskPart.split(/\s+/);
      if (diskTokens.length >= 3) {
        diskTotalGb = Math.round((parseInt(diskTokens[0], 10) || 0) / 1024 / 1024);
        diskUsedGb = Math.round((parseInt(diskTokens[1], 10) || 0) / 1024 / 1024);
        const rawPct = parseInt(diskTokens[2].replace('%', ''), 10);
        diskUsage = isNaN(rawPct) ? (diskTotalGb > 0 ? Math.round((diskUsedGb / diskTotalGb) * 100) : 0) : rawPct;
      }

      // 4. Network I/O (Rx, Tx in KB/s over interval)
      let netRxKbps = 0;
      let netTxKbps = 0;
      const netTokens = netPart.split(/\s+/);
      if (netTokens.length >= 2) {
        netRxKbps = Math.round((parseFloat(netTokens[0]) || 0) / 1024);
        netTxKbps = Math.round((parseFloat(netTokens[1]) || 0) / 1024);
      }

      // 5. Uptime & Load Average
      let uptime = 'N/A';
      let loadAvg = '';
      if (uptimePart) {
        const upLines = uptimePart.split('\n');
        uptime = upLines[0] || 'N/A';
        loadAvg = upLines[1] || '';
      }

      return {
        cpuUsage,
        memUsage,
        memUsedMb,
        memTotalMb,
        diskUsage,
        diskUsedGb,
        diskTotalGb,
        netRxKbps,
        netTxKbps,
        uptime,
        loadAvg,
        timestamp: Date.now()
      };
    } catch (e) {
      console.error('[Metrics] Error parsing metrics output:', e);
      return null;
    }
  };

  const fetchMetrics = async () => {
    if (!server || server.protocol !== 'SSH') return;

    // Single lightweight bash command sequence
    const cmd = `
      top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}' || echo "0"
      echo "---METRICS_DELIM---"
      free -m | awk 'NR==2{print $2" "$3}' || echo "0 0"
      echo "---METRICS_DELIM---"
      df -k / | awk 'NR==2{print $2" "$3" "$5}' || echo "0 0 0%"
      echo "---METRICS_DELIM---"
      R1=$(cat /proc/net/dev | grep -v "lo:" | awk 'NR>2 {r+=$2; t+=$10} END {print r" "t}')
      sleep 1
      R2=$(cat /proc/net/dev | grep -v "lo:" | awk 'NR>2 {r+=$2; t+=$10} END {print r" "t}')
      echo "$R1 $R2" | awk '{print ($3-$1)" "($4-$2)}' || echo "0 0"
      echo "---METRICS_DELIM---"
      uptime -p || uptime
      uptime | awk -F'load average:' '{ print $2 }'
    `.trim();

    try {
      const res = await window.api.multiExecSsh([server], cmd, keyObj ? [keyObj] : []);
      if (res && res.length > 0) {
        const item = res[0];
        if (item.status === 'SUCCESS' && item.output) {
          const parsed = parseMetricsOutput(item.output);
          if (parsed) {
            setMetrics(parsed);
            setError(null);
          } else {
            setError('Không thể phân tích dữ liệu metrics');
          }
        } else {
          setError(item.error || item.output || 'Lỗi kết nối SSH');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi lấy thông số máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(() => {
      fetchMetrics();
    }, Math.max(2000, refreshIntervalMs));

    return () => clearInterval(interval);
  }, [server.id, refreshIntervalMs]);

  const getProgressColor = (pct: number) => {
    if (pct >= 85) return 'var(--accent-danger, #ef4444)';
    if (pct >= 70) return 'var(--accent-warning, #f59e0b)';
    return 'var(--accent-success, #22c55e)';
  };

  if (compact && !isExpanded) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '4px 10px',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Cpu size={12} style={{ color: getProgressColor(metrics?.cpuUsage || 0) }} />
          <span>CPU: <strong style={{ color: 'var(--text-main)' }}>{loading && !metrics ? '...' : `${metrics?.cpuUsage || 0}%`}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Activity size={12} style={{ color: getProgressColor(metrics?.memUsage || 0) }} />
          <span>RAM: <strong style={{ color: 'var(--text-main)' }}>{loading && !metrics ? '...' : `${metrics?.memUsage || 0}%`}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <HardDrive size={12} style={{ color: getProgressColor(metrics?.diskUsage || 0) }} />
          <span>Disk: <strong style={{ color: 'var(--text-main)' }}>{loading && !metrics ? '...' : `${metrics?.diskUsage || 0}%`}</strong></span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Network size={12} style={{ color: 'var(--accent-primary)' }} />
          <span>Net: <strong style={{ color: 'var(--text-main)' }}>↓{metrics?.netRxKbps || 0} KB/s ↑{metrics?.netTxKbps || 0} KB/s</strong></span>
        </div>

        <button
          onClick={() => setIsExpanded(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Mở rộng bảng Giám sát Tài nguyên"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        fontSize: '0.8rem',
        color: 'var(--text-main)',
        marginBottom: compact ? '8px' : '0'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <Activity size={16} style={{ color: 'var(--accent-primary)' }} />
          <span>Giám Sát Tài Nguyên Máy Chủ (Real-time Metrics)</span>
          {loading && <RefreshCw size={12} className="spin" style={{ color: 'var(--text-muted)' }} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {metrics && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              Cập nhật: {new Date(metrics.timestamp).toLocaleTimeString()}
            </span>
          )}

          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px'
              }}
              title="Thu gọn"
            >
              <ChevronUp size={14} />
            </button>
          )}
        </div>
      </div>

      {error && !metrics ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--accent-warning)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem'
          }}
        >
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      ) : (
        <div>
          {/* Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
              marginBottom: '10px'
            }}
          >
            {/* CPU Metric Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Cpu size={14} /> CPU
                </span>
                <span style={{ fontWeight: 700, color: getProgressColor(metrics?.cpuUsage || 0) }}>
                  {metrics?.cpuUsage || 0}%
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${metrics?.cpuUsage || 0}%`,
                    backgroundColor: getProgressColor(metrics?.cpuUsage || 0),
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </div>

            {/* RAM Metric Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={14} /> RAM
                </span>
                <span style={{ fontWeight: 700, color: getProgressColor(metrics?.memUsage || 0) }}>
                  {metrics?.memUsage || 0}%
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${metrics?.memUsage || 0}%`,
                    backgroundColor: getProgressColor(metrics?.memUsage || 0),
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                {metrics?.memUsedMb || 0} / {metrics?.memTotalMb || 0} MB
              </div>
            </div>

            {/* Disk Metric Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <HardDrive size={14} /> Disk (/)
                </span>
                <span style={{ fontWeight: 700, color: getProgressColor(metrics?.diskUsage || 0) }}>
                  {metrics?.diskUsage || 0}%
                </span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${metrics?.diskUsage || 0}%`,
                    backgroundColor: getProgressColor(metrics?.diskUsage || 0),
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                {metrics?.diskUsedGb || 0} / {metrics?.diskTotalGb || 0} GB
              </div>
            </div>

            {/* Network I/O Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Network size={14} /> Network I/O
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-main)' }}>
                <span>↓ Download: <strong>{metrics?.netRxKbps || 0} KB/s</strong></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-main)', marginTop: '2px' }}>
                <span>↑ Upload: <strong>{metrics?.netTxKbps || 0} KB/s</strong></span>
              </div>
            </div>
          </div>

          {/* Footer Info: Uptime & Load Avg */}
          {metrics?.uptime && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-tertiary)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <span>Uptime: <strong style={{ color: 'var(--text-main)' }}>{metrics.uptime}</strong></span>
              {metrics.loadAvg && <span>Load Average: <strong style={{ color: 'var(--text-main)' }}>{metrics.loadAvg}</strong></span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
