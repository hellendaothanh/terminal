import React, { useState } from 'react';
import { Sparkles, Terminal, AlertTriangle, Check, CornerDownLeft, ShieldAlert } from 'lucide-react';

interface AutoCompletionBarProps {
  currentInput: string;
  historyCommands?: string[];
  onSelectSuggestion: (suggestion: string) => void;
  onClearAnomalyAlert?: () => void;
  anomalyAlert?: string | null;
  onTriggerAutofix?: () => void;
  aiFixLoading?: boolean;
  language?: 'vi' | 'en';
}

const COMMON_COMMANDS = [
  'systemctl status ',
  'systemctl restart ',
  'journalctl -u ',
  'journalctl -xe',
  'docker ps -a',
  'docker logs --tail 100 ',
  'docker-compose up -d',
  'kubectl get pods -A',
  'kubectl logs -f ',
  'df -h',
  'free -h',
  'top -b -n 1',
  'htop',
  'netstat -tulpn',
  'ss -tulpn',
  'tail -f /var/log/syslog',
  'tail -f /var/log/nginx/error.log',
  'cat /etc/os-release',
  'ip a',
  'ping -c 4 8.8.8.8'
];

export const ShellSmartAssistant: React.FC<AutoCompletionBarProps> = ({
  currentInput,
  historyCommands = [],
  onSelectSuggestion,
  onClearAnomalyAlert,
  anomalyAlert,
  onTriggerAutofix,
  aiFixLoading,
  language
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Filter intelligent suggestions based on currentInput or history
  const getSuggestions = (): string[] => {
    const trimmed = currentInput.trim().toLowerCase();
    const allCandidates = Array.from(new Set([...historyCommands.reverse(), ...COMMON_COMMANDS]));

    if (!trimmed) {
      return allCandidates.slice(0, 5);
    }

    return allCandidates
      .filter((cmd) => cmd.toLowerCase().includes(trimmed))
      .slice(0, 5);
  };

  const suggestions = getSuggestions();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        userSelect: 'none',
        fontSize: '0.75rem'
      }}
    >
      {/* 1. Log Anomaly Detection Warning Banner */}
      {anomalyAlert && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            borderBottom: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            fontWeight: 600,
            animation: 'pulse 2s infinite'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={16} style={{ color: '#ef4444' }} />
            <span>
              {language === 'vi' 
                ? `⚠️ CẢNH BÁO PHÁT HIỆN SỰ CỐ LOG: ${anomalyAlert}`
                : `⚠️ LOG ANOMALY DETECTED: ${anomalyAlert}`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {onTriggerAutofix && (
              <button
                onClick={onTriggerAutofix}
                disabled={aiFixLoading}
                style={{
                  background: 'rgba(59, 130, 246, 0.4)',
                  border: '1px solid rgba(59, 130, 246, 0.6)',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '2px 10px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600
                }}
              >
                <Sparkles size={11} className={aiFixLoading ? 'spin' : ''} />
                {language === 'vi' ? 'Sửa Lỗi Bằng AI' : 'AI Autofix'}
              </button>
            )}
            {onClearAnomalyAlert && (
              <button
                onClick={onClearAnomalyAlert}
                style={{
                  background: 'rgba(239, 68, 68, 0.3)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  cursor: 'pointer'
                }}
              >
                {language === 'vi' ? 'Đã hiểu' : 'Dismiss'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Auto-completion & Smart Suggestions Bar */}
      <div
        style={{
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px',
          overflowX: 'auto'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 600 }}>
          <Sparkles size={13} />
          <span>{language === 'vi' ? 'Gợi ý lệnh:' : 'Suggestions:'}</span>
        </div>

        {suggestions.length === 0 ? (
          <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
            {language === 'vi' ? 'Nhập lệnh để xem gợi ý thông minh...' : 'Type commands to get smart suggestions...'}
          </span>
        ) : (
          suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(suggestion)}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: 'var(--text-main)',
                padding: '2px 8px',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title="Click hoặc nhấn Tab để chèn câu lệnh gợi ý"
            >
              <span>{suggestion}</span>
              <CornerDownLeft size={10} style={{ color: 'var(--text-dim)' }} />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
