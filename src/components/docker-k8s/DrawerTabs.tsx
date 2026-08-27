import React from 'react';
import { Search, Download, Cpu, Activity } from 'lucide-react';

/* ------------------------------ Logs Tab ------------------------------ */

interface LogsTabProps {
  logs: string[];
  logsRegex: string;
  onLogsRegexChange: (value: string) => void;
  autoScroll: boolean;
  onAutoScrollChange: (value: boolean) => void;
  resourceName?: string;
  logsEndRef: React.RefObject<HTMLDivElement | null>;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  logsRegex,
  onLogsRegexChange,
  autoScroll,
  onAutoScrollChange,
  resourceName,
  logsEndRef
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* Log Filter header bar */}
    <div style={{ display: 'flex', padding: '6px 16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <Search size={12} style={{ color: 'var(--text-dim)' }} />
        <input
          type="text"
          placeholder="Regex Filter..."
          value={logsRegex}
          onChange={(e) => onLogsRegexChange(e.target.value)}
          style={{
            border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none', width: '200px'
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => onAutoScrollChange(e.target.checked)}
          />
          Auto-scroll
        </label>
        <button
          className="btn-secondary"
          style={{ padding: '3px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={() => {
            const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${resourceName || 'resource'}-logs.txt`;
            a.click();
          }}
        >
          <Download size={11} /> Download
        </button>
      </div>
    </div>
    {/* Log Output Console */}
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#a7f3d0' }}>
      {logs
        .filter(line => !logsRegex || new RegExp(logsRegex, 'i').test(line))
        .map((line, idx) => (
          <div key={idx} style={{ lineHeight: '1.4' }}>{line}</div>
        ))
      }
      <div ref={logsEndRef} />
    </div>
  </div>
);

/* ---------------------------- Terminal Tab ---------------------------- */

interface TerminalTabProps {
  history: string[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({ history, input, onInputChange, onSubmit }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#f3f4f6' }}>
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {history.map((line, idx) => (
        <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>{line}</div>
      ))}
    </div>
    <form onSubmit={onSubmit} style={{ display: 'flex', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px', marginTop: '6px' }}>
      <span style={{ color: 'var(--accent-primary)', marginRight: '6px', fontWeight: 600 }}>$</span>
      <input
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Type shell command (e.g. ls, df -h, env) and press Enter..."
        style={{
          flex: 1, background: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.75rem', fontFamily: 'monospace'
        }}
      />
    </form>
  </div>
);

/* ------------------------------ YAML Tab ------------------------------ */

interface YamlTabProps {
  content: string;
  onChange: (value: string) => void;
}

export const YamlTab: React.FC<YamlTabProps> = ({ content, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* Monaco style editor container */}
    <div style={{ flex: 1, overflow: 'auto', padding: '10px 16px', fontFamily: 'monospace', fontSize: '0.75rem', backgroundColor: 'var(--bg-tertiary)', color: '#cbd5e1' }}>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', height: '100%', background: 'transparent', border: 'none', color: '#e2e8f0', outline: 'none', fontFamily: 'monospace', fontSize: '0.75rem', resize: 'none'
        }}
      />
    </div>
  </div>
);

/* ----------------------------- Metrics Tab ---------------------------- */

/** Build SVG paths (area + line) for a sparkline inside a 100x30 viewBox. */
const buildSparklinePaths = (values: number[]) => ({
  areaPath: `M 0 30 ${values.map((val, idx) => `L ${(idx / (values.length - 1)) * 100} ${30 - (val / 100) * 30}`).join(' ')} L 100 30 Z`,
  linePath: values.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${(idx / (values.length - 1)) * 100} ${30 - (val / 100) * 30}`).join(' ')
});

interface SparklineCardProps {
  label: string;
  icon: React.ReactNode;
  iconColor: string;
  strokeColor: string;
  gradientId: string;
  values: number[];
}

const SparklineCard: React.FC<SparklineCardProps> = ({ label, icon, iconColor, strokeColor, gradientId, values }) => {
  const { areaPath, linePath } = buildSparklinePaths(values);
  return (
    <div style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {values[values.length - 1].toFixed(1)}%
        </span>
      </div>

      <div style={{ flex: 1, minHeight: '60px' }}>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
};

interface MetricsTabProps {
  metricHistory: { cpu: number[]; memory: number[] };
}

export const MetricsTab: React.FC<MetricsTabProps> = ({ metricHistory }) => (
  <div style={{ display: 'flex', padding: '16px', gap: '16px', height: '100%', overflowY: 'auto' }}>
    <SparklineCard
      label="CPU UTILIZATION"
      icon={<Cpu size={12} style={{ color: 'var(--accent-primary)' }} />}
      iconColor="var(--accent-primary)"
      strokeColor="var(--accent-primary)"
      gradientId="cpuGrad"
      values={metricHistory.cpu}
    />
    <SparklineCard
      label="MEMORY ALLOCATION"
      icon={<Activity size={12} style={{ color: '#c084fc' }} />}
      iconColor="#c084fc"
      strokeColor="#c084fc"
      gradientId="memGrad"
      values={metricHistory.memory}
    />
  </div>
);
