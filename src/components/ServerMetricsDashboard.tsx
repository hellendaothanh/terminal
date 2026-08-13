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
  osInfo?: string;
  timestamp: number;
}

interface ServerMetricsDashboardProps {
  server: ServerConfig;
  keyObj?: SSHKey;
  refreshIntervalMs?: number; // Default 3000ms
  compact?: boolean;
  vaultConfig?: any;
}

export const ServerMetricsDashboard: React.FC<ServerMetricsDashboardProps> = ({
  server,
  keyObj,
  refreshIntervalMs = 3000,
  compact = false,
  vaultConfig
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

      const [cpuPart, memPart, diskPart, netPart, uptimePart, osPart] = parts.map((p) => p.trim());

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
        osInfo: osPart || undefined,
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
      CPU1=\$(awk '/^cpu / {usr=\$2; nic=\$3; sys=\$4; idl=\$5; io=\$6; irq=\$7; sirq=\$8; steal=\$9; total=usr+nic+sys+idl+io+irq+sirq+steal; print total" "idl; exit}' /proc/stat)
      NET1=\$(cat /proc/net/dev 2>/dev/null | grep -v "lo:" | awk 'NR>2 {r+=\$2; t+=\$10} END {print r" "t}' || echo "0 0")
      sleep 1
      CPU2=\$(awk '/^cpu / {usr=\$2; nic=\$3; sys=\$4; idl=\$5; io=\$6; irq=\$7; sirq=\$8; steal=\$9; total=usr+nic+sys+idl+io+irq+sirq+steal; print total" "idl; exit}' /proc/stat)
      NET2=\$(cat /proc/net/dev 2>/dev/null | grep -v "lo:" | awk 'NR>2 {r+=\$2; t+=\$10} END {print r" "t}' || echo "0 0")
      echo "\$CPU1 \$CPU2" | awk '{dt=\$3-\$1; di=\$4-\$2; if (dt==0) print 0; else print (1-di/dt)*100}'
      echo "---METRICS_DELIM---"
      awk '/MemTotal/ {t=\$2} /MemAvailable/ {a=\$2} END {print int(t/1024)" "int((t-a)/1024)}' /proc/meminfo || echo "0 0"
      echo "---METRICS_DELIM---"
      df -k / | awk 'NR==2{print \$2" "\$3" "\$5}' || echo "0 0 0%"
      echo "---METRICS_DELIM---"
      echo "\$NET1 \$NET2" | awk '{print (\$3-\$1)" "(\$4-\$2)}' || echo "0 0"
      echo "---METRICS_DELIM---"
      uptime -p || uptime
      uptime | awk -F'load average:' '{ print \$2 }'
      echo "---METRICS_DELIM---"
      if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "\$NAME \$VERSION"
      elif [ -f /etc/redhat-release ]; then
        cat /etc/redhat-release
      else
        uname -s
      fi
    `.trim();

    try {
      const res = await window.api.multiExecSsh([server], cmd, keyObj ? [keyObj] : [], vaultConfig);
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

  const renderDetailCards = () => {
    return (
      <>
        {/* Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
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
                {metrics ? `${metrics.cpuUsage}%` : 'N/A'}
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
                {metrics ? `${metrics.memUsage}%` : 'N/A'}
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
              {metrics ? `${metrics.memUsedMb} / ${metrics.memTotalMb} MB` : 'N/A'}
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
                {metrics ? `${metrics.diskUsage}%` : 'N/A'}
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
              {metrics ? `${metrics.diskUsedGb} / ${metrics.diskTotalGb} GB` : 'N/A'}
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
              <span>↓ Download: <strong>{metrics ? `${metrics.netRxKbps} KB/s` : 'N/A'}</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-main)', marginTop: '2px' }}>
              <span>↑ Upload: <strong>{metrics ? `${metrics.netTxKbps} KB/s` : 'N/A'}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer Info: Uptime & Load Avg & OS */}
        {metrics && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              backgroundColor: 'var(--bg-tertiary)',
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-muted)'
              }}
            >
              <span>Uptime: <strong style={{ color: 'var(--text-main)' }}>{metrics.uptime}</strong></span>
              {metrics.loadAvg && <span>Load Average: <strong style={{ color: 'var(--text-main)' }}>{metrics.loadAvg}</strong></span>}
            </div>
            {metrics.osInfo && (
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-dim)',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '4px',
                  marginTop: '2px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Hệ điều hành:</span>
                <strong style={{ color: 'var(--text-main)' }}>{metrics.osInfo}</strong>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  if (compact) {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '4px 10px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            userSelect: 'none',
            cursor: 'pointer',
            border: isExpanded ? '1px solid var(--border-focus)' : '1px solid var(--border-subtle)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={12} style={{ color: metrics ? getProgressColor(metrics.cpuUsage) : 'var(--text-muted)' }} />
            <span>CPU: <strong style={{ color: 'var(--text-main)' }}>{loading && !metrics ? '...' : (metrics ? `${metrics.cpuUsage}%` : 'N/A')}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Activity size={12} style={{ color: metrics ? getProgressColor(metrics.memUsage) : 'var(--text-muted)' }} />
            <span>RAM: <strong style={{ color: 'var(--text-main)' }}>{loading && !metrics ? '...' : (metrics ? `${metrics.memUsage}%` : 'N/A')}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <HardDrive size={12} style={{ color: metrics ? getProgressColor(metrics.diskUsage) : 'var(--text-muted)' }} />
            <span>Disk: <strong style={{ color: 'var(--text-main)' }}>{loading && !metrics ? '...' : (metrics ? `${metrics.diskUsage}%` : 'N/A')}</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Network size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>Net: <strong style={{ color: 'var(--text-main)' }}>{metrics ? `↓${metrics.netRxKbps} KB/s ↑${metrics.netTxKbps} KB/s` : 'N/A'}</strong></span>
          </div>

          <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>

        {isExpanded && (
          <div
            style={{
              position: 'absolute',
              top: '36px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '420px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-focus)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 1000,
              fontSize: '0.8rem',
              color: 'var(--text-main)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Activity size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>Chi tiết tài nguyên (Real-time Metrics)</span>
                {loading && <RefreshCw size={12} className="spin" style={{ color: 'var(--text-muted)' }} />}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <ChevronUp size={14} />
              </button>
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
              renderDetailCards()
            )}
          </div>
        )}
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
        color: 'var(--text-main)'
      }}
    >
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

        {metrics && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            Cập nhật: {new Date(metrics.timestamp).toLocaleTimeString()}
          </span>
        )}
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
        renderDetailCards()
      )}
    </div>
  );
};
