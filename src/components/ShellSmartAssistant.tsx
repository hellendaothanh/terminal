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
  aiSuggestions?: string[];
  aiSuggestionsLoading?: boolean;
  onTriggerAiSuggestions?: () => void;
}

const COMMON_COMMANDS = [
  'ping -c 4 8.8.8.8',
  'ping -c 4 google.com',
  'df -h',
  'free -h',
  'uptime',
  'ip a',
  'ss -tulpn',
  'netstat -tulpn',
  'top -b -n 1',
  'htop',
  'cat /etc/os-release',
  'uname -a',
  'journalctl -xe --no-pager -n 50',
  'journalctl -xe',
  'systemctl status',
  'systemctl list-units --type=service --state=running',
  'docker ps -a',
  'docker stats --no-stream',
  'docker-compose ps',
  'docker-compose up -d',
  'kubectl get pods -A',
  'kubectl get nodes -o wide',
  'tail -n 50 /var/log/syslog',
  'tail -n 50 /var/log/messages',
  'tail -n 50 /var/log/nginx/error.log',
  'ps aux --sort=-%mem | head -n 10',
  'ps aux --sort=-%cpu | head -n 10',
  'whoami',
  'id',
  'pwd',
  'ls -la'
];

// List of well-known Linux base commands
const KNOWN_BASE_COMMANDS = new Set([
  'sudo', 'systemctl', 'journalctl', 'docker', 'docker-compose', 'kubectl', 'ping',
  'df', 'free', 'top', 'htop', 'netstat', 'ss', 'tail', 'cat', 'ip', 'ps', 'grep',
  'curl', 'wget', 'git', 'ssh', 'scp', 'tar', 'unzip', 'chmod', 'chown', 'find',
  'ls', 'cd', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'uptime', 'uname', 'whoami', 'id',
  'mongosh', 'psql', 'mysql', 'redis-cli', 'vault', 'patronictl', 'gitlab-ctl'
]);

export const ShellSmartAssistant: React.FC<AutoCompletionBarProps> = ({
  currentInput,
  historyCommands = [],
  onSelectSuggestion,
  onClearAnomalyAlert,
  anomalyAlert,
  onTriggerAutofix,
  aiFixLoading,
  language,
  aiSuggestions = [],
  aiSuggestionsLoading = false,
  onTriggerAiSuggestions
}) => {
  // Filter intelligent suggestions based on currentInput or history
  const getSuggestions = (): string[] => {
    const trimmed = currentInput.trim().toLowerCase();
    
    // Clean and validate history commands to filter out typos or invalid single/weird characters
    const cleanHistory = (historyCommands || [])
      .map(cmd => cmd.trim())
      .filter(cmd => {
        if (!cmd || cmd.length < 2 || cmd.length > 150) return false;
        if (/[\x00-\x1F\x7F-\x9F]/.test(cmd)) return false;
        // Filter out accidental typo commands like "qping", "wcat" by checking if single word command is unknown
        const firstWord = cmd.split(/\s+/)[0].toLowerCase();
        if (firstWord.startsWith('q') && firstWord.length > 2 && KNOWN_BASE_COMMANDS.has(firstWord.slice(1))) {
          // Likely accidental 'q' prefix when exiting less/vim/pager
          return false;
        }
        return true;
      });

    const allCandidates = Array.from(new Set([...cleanHistory.reverse(), ...COMMON_COMMANDS]));

    if (!trimmed) {
      return allCandidates.slice(0, 6);
    }

    // Match suggestions that start with input first, then contains input
    const startsWith = allCandidates.filter(cmd => cmd.toLowerCase().startsWith(trimmed));
    const contains = allCandidates.filter(cmd => !cmd.toLowerCase().startsWith(trimmed) && cmd.toLowerCase().includes(trimmed));

    return [...startsWith, ...contains].slice(0, 6);
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
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 600 }}>
          <Terminal size={13} />
          <span>{language === 'vi' ? 'Gợi ý lệnh:' : 'Suggestions:'}</span>
        </div>

        {onTriggerAiSuggestions && (
          <button
            onClick={onTriggerAiSuggestions}
            disabled={aiSuggestionsLoading}
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#d8b4fe',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              marginRight: '8px'
            }}
            title={language === 'vi' ? 'Sử dụng AI phân tích log để gợi ý câu lệnh tiếp theo' : 'Use AI to analyze log and suggest next commands'}
          >
            <Sparkles size={11} className={aiSuggestionsLoading ? 'spin' : ''} style={{ color: '#c084fc' }} />
            <span>{language === 'vi' ? '🤖 AI Phân Tích & Gợi Ý' : '🤖 AI Analyze & Suggest'}</span>
          </button>
        )}

        {/* Regular Suggestions */}
        {suggestions.map((suggestion, idx) => (
          <button
            key={`reg-${idx}`}
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
            title="Click để chèn câu lệnh"
          >
            <span>{suggestion}</span>
            <CornerDownLeft size={10} style={{ color: 'var(--text-dim)' }} />
          </button>
        ))}

        {/* AI-generated Suggestions */}
        {aiSuggestions && aiSuggestions.map((suggestion, idx) => (
          <button
            key={`ai-${idx}`}
            onClick={() => onSelectSuggestion(suggestion)}
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '4px',
              color: '#e9d5ff',
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
            title="Câu lệnh đề xuất từ AI"
          >
            <Sparkles size={10} style={{ color: '#c084fc' }} />
            <span>{suggestion}</span>
            <CornerDownLeft size={10} style={{ color: '#c084fc' }} />
          </button>
        ))}
      </div>
    </div>
  );
};
