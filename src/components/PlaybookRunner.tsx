import React, { useState } from 'react';
import { ServerConfig, SSHKey, DevOpsPlaybook, PlaybookStep, TerminalSettings, PlaybookRiskLevel } from '../types';
import {
  Play,
  RotateCcw,
  Eye,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Terminal,
  FileCode,
  ShieldAlert,
  Server,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface PlaybookRunnerProps {
  settings: TerminalSettings;
  servers: ServerConfig[];
  keys: SSHKey[];
  activeServer?: ServerConfig | null;
  onPasteToTerminal?: (text: string) => void;
}

export const PlaybookRunner: React.FC<PlaybookRunnerProps> = ({
  settings,
  servers,
  keys,
  activeServer,
  onPasteToTerminal
}) => {
  const { t } = useTranslation(settings);
  const isVi = settings.language === 'vi';

  const [prompt, setPrompt] = useState<string>('');
  const [selectedServerId, setSelectedServerId] = useState<string>(activeServer?.id || (servers[0]?.id ?? ''));
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [autoRollback, setAutoRollback] = useState<boolean>(true);
  const [playbook, setPlaybook] = useState<DevOpsPlaybook | null>(null);
  
  // Execution status
  const [executing, setExecuting] = useState<boolean>(false);
  const [dryRunning, setDryRunning] = useState<boolean>(false);
  const [rollingBack, setRollingBack] = useState<boolean>(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const selectedServer = servers.find((s) => s.id === selectedServerId);

  // Quick preset prompt templates
  const presets = isVi
    ? [
        { label: '🚀 Deploy Node.js & Nginx Reverse Proxy', prompt: 'Cài đặt Node.js 20, cấu hình Nginx reverse proxy trỏ port 3000, cấu hình firewall UFW mở cổng 80,443 và tạo backup cấu hình trước.' },
        { label: '🔒 Docker & Cài SSL Certbot Let\'s Encrypt', prompt: 'Cài đặt Docker và Docker Compose, pull nginx proxy container và lấy chứng chỉ SSL Certbot miễn phí.' },
        { label: '💾 Backup MySQL & Rotate Log', prompt: 'Tạo thư mục /backup/mysql, dump toàn bộ database với gzip, nén log cũ và xóa backup quá 7 ngày.' },
        { label: '🛡️ Linux Security Hardening', prompt: 'Tắt SSH Root login, đổi port SSH sang 2222, kích hoạt Fail2ban và cấu hình sysctl bảo mật mạng.' }
      ]
    : [
        { label: '🚀 Deploy Node.js & Nginx Reverse Proxy', prompt: 'Install Node.js 20, configure Nginx reverse proxy to port 3000, enable UFW firewall ports 80/443, and backup configs.' },
        { label: '🔒 Docker & SSL Certbot Setup', prompt: 'Install Docker & Docker Compose, run nginx proxy container, and issue Let\'s Encrypt SSL certificate.' },
        { label: '💾 MySQL Backup & Log Rotation', prompt: 'Create /backup/mysql, dump all databases with gzip, rotate old logs, and purge backups older than 7 days.' },
        { label: '🛡️ Linux Security Hardening', prompt: 'Disable SSH root login, set SSH port to 2222, install Fail2ban, and apply sysctl security hardening.' }
      ];

  const [serverTelemetry, setServerTelemetry] = useState<string>('');
  const [inspectingTelemetry, setInspectingTelemetry] = useState<boolean>(false);

  const fetchServerTelemetry = async (serverToInspect?: ServerConfig) => {
    const srv = serverToInspect || selectedServer;
    if (!srv || srv.protocol !== 'SSH') {
      return '';
    }

    setInspectingTelemetry(true);
    try {
      const keyObj = keys.find((k) => k.id === srv.privateKeyId);
      const res = await window.api.serverInspectTelemetry(srv, keyObj, settings.hashicorpVault);
      if (res.success && res.info) {
        setServerTelemetry(res.info);
        return res.info;
      }
      return '';
    } catch (e: any) {
      console.warn('Failed to inspect server telemetry:', e);
      return '';
    } finally {
      setInspectingTelemetry(false);
    }
  };

  const handleGeneratePlaybook = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    let telemetryData = serverTelemetry;
    if (!telemetryData && selectedServer && selectedServer.protocol === 'SSH') {
      telemetryData = await fetchServerTelemetry(selectedServer);
    }

    const targetInfo = selectedServer
      ? `Host: ${selectedServer.host}, User: ${selectedServer.username}, Port: ${selectedServer.port}, Protocol: ${selectedServer.protocol}, Environment: ${selectedServer.environment}`
      : 'Linux Ubuntu/Debian/CentOS Server';

    const fullContext = telemetryData
      ? `[LIVE SERVER TELEMETRY & OS STATE]:\n${telemetryData}`
      : undefined;

    try {
      const combinedAiConfig = {
        ...settings.ai,
        language: settings.language || 'vi'
      };
      const res = await window.api.aiGeneratePlaybook(combinedAiConfig, prompt.trim(), fullContext, targetInfo);
      if (res.success && res.playbook) {
        setPlaybook(res.playbook);
        // Expand all steps by default
        const initExpanded: Record<string, boolean> = {};
        res.playbook.steps.forEach((s: PlaybookStep) => {
          initExpanded[s.id] = true;
        });
        setExpandedSteps(initExpanded);
        showToast(isVi ? 'Đã tạo kịch bản DevOps chuẩn xác theo cấu hình máy chủ!' : 'Playbook generated based on live server state!', 'success');
      } else {
        showToast(res.error || (isVi ? 'Lỗi tạo kịch bản' : 'Failed to generate playbook'), 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const updateStepField = (stepId: string, field: keyof PlaybookStep, value: any) => {
    if (!playbook) return;
    setPlaybook({
      ...playbook,
      steps: playbook.steps.map((s) => (s.id === stepId ? { ...s, [field]: value } : s))
    });
  };

  const handleAddStep = () => {
    if (!playbook) return;
    const newStep: PlaybookStep = {
      id: 'step_' + Date.now(),
      name: isVi ? 'Bước mới' : 'New Step',
      description: '',
      command: 'echo "hello"',
      checkCommand: 'echo "check"',
      rollbackCommand: 'echo "revert"',
      riskLevel: 'LOW',
      timeoutSeconds: 60,
      status: 'PENDING'
    };
    setPlaybook({ ...playbook, steps: [...playbook.steps, newStep] });
    setExpandedSteps((prev) => ({ ...prev, [newStep.id]: true }));
  };

  const handleDeleteStep = (stepId: string) => {
    if (!playbook) return;
    setPlaybook({
      ...playbook,
      steps: playbook.steps.filter((s) => s.id !== stepId)
    });
  };

  // Dry-run mode: Run checkCommand on target server
  const handleDryRun = async () => {
    if (!playbook || !selectedServer) {
      showToast(isVi ? 'Vui lòng chọn máy chủ đích trước khi Dry-run' : 'Please select a target server first', 'error');
      return;
    }
    setDryRunning(true);
    showToast(isVi ? 'Bắt đầu Dry-Run (Kiểm tra điều kiện tiên quyết)...' : 'Starting Dry-Run checks...', 'info');

    const keyObj = keys.find((k) => k.id === selectedServer.privateKeyId);
    let allChecksPassed = true;

    for (let i = 0; i < playbook.steps.length; i++) {
      const step = playbook.steps[i];
      if (!step.checkCommand) continue;

      setActiveStepId(step.id);
      setPlaybook((prev) => prev ? {
        ...prev,
        steps: prev.steps.map((s) => s.id === step.id ? { ...s, status: 'CHECKING' } : s)
      } : null);

      try {
        const res = await window.api.playbookExecuteStep(selectedServer, step.checkCommand, keyObj, settings.hashicorpVault);
        const isSuccess = res.success;
        if (!isSuccess && !step.ignoreError) {
          allChecksPassed = false;
        }

        setPlaybook((prev) => prev ? {
          ...prev,
          steps: prev.steps.map((s) => s.id === step.id ? {
            ...s,
            status: isSuccess ? 'PENDING' : 'FAILED',
            output: `[DRY-RUN CHECK OUTPUT]:\n${res.output || '(No output)'}\n${res.error ? `[ERROR]: ${res.error}` : ''}`,
            executionTimeMs: res.executionTimeMs
          } : s)
        } : null);
      } catch (err: any) {
        allChecksPassed = false;
        setPlaybook((prev) => prev ? {
          ...prev,
          steps: prev.steps.map((s) => s.id === step.id ? {
            ...s,
            status: 'FAILED',
            error: err.message,
            output: `[DRY-RUN EXCEPTION]: ${err.message}`
          } : s)
        } : null);
      }
    }

    setActiveStepId(null);
    setDryRunning(false);

    if (allChecksPassed) {
      showToast(isVi ? '✅ Dry-Run hoàn tất! Tất cả các bước kiểm tra an toàn.' : '✅ Dry-Run completed! All pre-checks passed.', 'success');
    } else {
      showToast(isVi ? '⚠️ Dry-Run phát hiện cảnh báo ở một số bước.' : '⚠️ Dry-Run detected errors during pre-checks.', 'error');
    }
  };

  // Execute Playbook with Automatic Rollback Chain
  const handleExecutePlaybook = async () => {
    if (!playbook || !selectedServer) {
      showToast(isVi ? 'Vui lòng chọn máy chủ đích để thực thi' : 'Please select a target server', 'error');
      return;
    }

    setExecuting(true);
    const keyObj = keys.find((k) => k.id === selectedServer.privateKeyId);
    const completedStepIds: string[] = [];
    let hasFailure = false;
    let failedStepIndex = -1;

    // Reset status
    setPlaybook((prev) => prev ? {
      ...prev,
      steps: prev.steps.map((s) => ({ ...s, status: 'PENDING', output: undefined, error: undefined }))
    } : null);

    for (let i = 0; i < playbook.steps.length; i++) {
      const step = playbook.steps[i];
      setActiveStepId(step.id);

      setPlaybook((prev) => prev ? {
        ...prev,
        steps: prev.steps.map((s) => s.id === step.id ? { ...s, status: 'RUNNING' } : s)
      } : null);

      try {
        const res = await window.api.playbookExecuteStep(selectedServer, step.command, keyObj, settings.hashicorpVault);
        if (res.success) {
          completedStepIds.push(step.id);
          setPlaybook((prev) => prev ? {
            ...prev,
            steps: prev.steps.map((s) => s.id === step.id ? {
              ...s,
              status: 'SUCCESS',
              output: res.output || '(Execution completed with code 0)',
              executionTimeMs: res.executionTimeMs
            } : s)
          } : null);
        } else {
          setPlaybook((prev) => prev ? {
            ...prev,
            steps: prev.steps.map((s) => s.id === step.id ? {
              ...s,
              status: 'FAILED',
              output: res.output,
              error: res.error,
              executionTimeMs: res.executionTimeMs
            } : s)
          } : null);

          if (!step.ignoreError) {
            hasFailure = true;
            failedStepIndex = i;
            break;
          }
        }
      } catch (err: any) {
        setPlaybook((prev) => prev ? {
          ...prev,
          steps: prev.steps.map((s) => s.id === step.id ? {
            ...s,
            status: 'FAILED',
            error: err.message,
            output: err.message
          } : s)
        } : null);

        if (!step.ignoreError) {
          hasFailure = true;
          failedStepIndex = i;
          break;
        }
      }
    }

    setActiveStepId(null);
    setExecuting(false);

    if (hasFailure) {
      if (autoRollback) {
        showToast(isVi ? '⚠️ Bước gặp lỗi! Đang tự động kích hoạt chuỗi Rollback...' : '⚠️ Step failed! Triggering automatic rollback chain...', 'error');
        await executeRollbackChain(completedStepIds);
      } else {
        showToast(isVi ? '❌ Kịch bản thất bại tại bước ' + (failedStepIndex + 1) : '❌ Playbook failed at step ' + (failedStepIndex + 1), 'error');
      }
    } else {
      showToast(isVi ? '🎉 Toàn bộ Playbook đã thực thi thành công!' : '🎉 Playbook completed successfully!', 'success');
    }
  };

  // Rollback Chain (LIFO - reverse order of completed steps)
  const executeRollbackChain = async (stepIdsToRollback?: string[]) => {
    if (!playbook || !selectedServer) return;
    setRollingBack(true);

    const keyObj = keys.find((k) => k.id === selectedServer.privateKeyId);
    
    // Determine which steps to rollback
    const targetSteps = stepIdsToRollback
      ? playbook.steps.filter((s) => stepIdsToRollback.includes(s.id) && s.rollbackCommand)
      : playbook.steps.filter((s) => (s.status === 'SUCCESS' || s.status === 'RUNNING') && s.rollbackCommand);

    // Reverse for LIFO rollback
    const reversed = [...targetSteps].reverse();

    for (const step of reversed) {
      if (!step.rollbackCommand) continue;
      setActiveStepId(step.id);

      try {
        const res = await window.api.playbookExecuteStep(selectedServer, step.rollbackCommand, keyObj, settings.hashicorpVault);
        setPlaybook((prev) => prev ? {
          ...prev,
          steps: prev.steps.map((s) => s.id === step.id ? {
            ...s,
            status: 'ROLLED_BACK',
            output: `${s.output || ''}\n\n[ROLLBACK EXECUTED]:\n${res.output || res.error || '(Done)'}`
          } : s)
        } : null);
      } catch (err: any) {
        setPlaybook((prev) => prev ? {
          ...prev,
          steps: prev.steps.map((s) => s.id === step.id ? {
            ...s,
            output: `${s.output || ''}\n\n[ROLLBACK ERROR]: ${err.message}`
          } : s)
        } : null);
      }
    }

    setActiveStepId(null);
    setRollingBack(false);
    showToast(isVi ? 'Đã hoàn tất hoàn tác (Rollback) các bước!' : 'Rollback chain completed!', 'info');
  };

  // Export to Bash script with trap rollback support
  const exportBashScript = () => {
    if (!playbook) return;
    let bash = `#!/usr/bin/env bash
# ==============================================================================
# OmniTerminal Generated DevOps Playbook
# Title: ${playbook.title}
# Description: ${playbook.description}
# Generated At: ${new Date().toISOString()}
# ==============================================================================

set -eo pipefail

echo "========================================="
echo " Starting DevOps Playbook: ${playbook.title}"
echo "========================================="

`;
    playbook.steps.forEach((s, idx) => {
      bash += `# [Step ${idx + 1}]: ${s.name} (${s.riskLevel} Risk)\n`;
      bash += `# ${s.description}\n`;
      if (s.checkCommand) {
        bash += `echo "[Pre-Check Step ${idx + 1}]..."\n${s.checkCommand}\n\n`;
      }
      bash += `echo "[Executing Step ${idx + 1}]: ${s.name}..."\n`;
      bash += `${s.command}\n\n`;
    });

    bash += `echo "========================================="\n`;
    bash += `echo "✅ Playbook Execution Completed Successfully!"\n`;
    bash += `echo "========================================="\n`;

    downloadFile(`${playbook.title.toLowerCase().replace(/\s+/g, '_')}.sh`, bash);
  };

  // Export to Ansible Playbook YAML
  const exportAnsibleYaml = () => {
    if (!playbook) return;
    let yaml = `---
# OmniTerminal Generated Ansible Playbook
# Title: ${playbook.title}
- name: "${playbook.title}"
  hosts: all
  become: yes
  tasks:
`;
    playbook.steps.forEach((s) => {
      yaml += `    - name: "${s.name}"\n`;
      yaml += `      ansible.builtin.shell: |\n`;
      s.command.split('\n').forEach((line) => {
        yaml += `        ${line}\n`;
      });
      yaml += `      ignore_errors: ${s.ignoreError ? 'yes' : 'no'}\n\n`;
    });

    downloadFile(`${playbook.title.toLowerCase().replace(/\s+/g, '_')}.yml`, yaml);
  };

  // Export JSON
  const exportJsonPlaybook = () => {
    if (!playbook) return;
    const jsonStr = JSON.stringify(playbook, null, 2);
    downloadFile(`${playbook.title.toLowerCase().replace(/\s+/g, '_')}.json`, jsonStr);
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          try {
            const parsed = JSON.parse(re.target?.result as string);
            if (parsed && Array.isArray(parsed.steps)) {
              setPlaybook(parsed);
              showToast(isVi ? 'Đã nạp Playbook thành công!' : 'Playbook imported successfully!', 'success');
            } else {
              showToast(isVi ? 'Định dạng file không hợp lệ' : 'Invalid playbook format', 'error');
            }
          } catch (err: any) {
            showToast(err.message, 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const downloadFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    showToast(isVi ? `Đã tải về tệp ${fileName}` : `Downloaded ${fileName}`, 'success');
  };

  const getRiskBadge = (risk: PlaybookRiskLevel) => {
    switch (risk) {
      case 'CRITICAL':
        return <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>CRITICAL</span>;
      case 'HIGH':
        return <span style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', color: '#f97316', border: '1px solid #f97316', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>HIGH</span>;
      case 'MEDIUM':
        return <span style={{ backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308', border: '1px solid #eab308', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>MEDIUM</span>;
      default:
        return <span style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid #22c55e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>LOW</span>;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'RUNNING':
      case 'CHECKING':
        return <RefreshCw size={14} className="spin" style={{ color: 'var(--accent-primary)' }} />;
      case 'SUCCESS':
        return <CheckCircle2 size={14} style={{ color: 'var(--accent-success)' }} />;
      case 'FAILED':
        return <XCircle size={14} style={{ color: 'var(--accent-danger)' }} />;
      case 'ROLLED_BACK':
        return <RotateCcw size={14} style={{ color: '#f97316' }} />;
      default:
        return <Clock size={14} style={{ color: 'var(--text-dim)' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: toastMessage.type === 'success' ? '#064e3b' : toastMessage.type === 'error' ? '#7f1d1d' : '#1e3a8a',
            color: '#ffffff',
            fontSize: '0.78rem',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Target Server Selector & Config Toolbar */}
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
            <Server size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <select
              className="input-field"
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              style={{ height: '36px', fontSize: '0.82rem', flex: 1, fontWeight: 500 }}
            >
              <option value="">-- {t('selectTargetServer')} --</option>
              {servers.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} ({srv.username}@{srv.host}:{srv.port}) [{srv.environment}]
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => fetchServerTelemetry()}
              disabled={!selectedServer || selectedServer.protocol !== 'SSH' || inspectingTelemetry}
              className="btn-secondary"
              style={{
                height: '34px',
                fontSize: '0.78rem',
                color: serverTelemetry ? 'var(--accent-success)' : 'var(--accent-primary)',
                borderColor: serverTelemetry ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.4)'
              }}
              title="Inspect OS, CPU, RAM, Disk, and installed services"
            >
              <RefreshCw size={13} className={inspectingTelemetry ? 'spin' : ''} />
              <span>{inspectingTelemetry ? t('inspectingServer') : t('inspectServerTelemetry')}</span>
            </button>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-main)',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <input
                type="checkbox"
                checked={autoRollback}
                onChange={(e) => setAutoRollback(e.target.checked)}
                style={{ accentColor: '#c084fc', width: '15px', height: '15px' }}
              />
              <span style={{ fontWeight: 500 }}>{t('autoRollbackToggle')}</span>
            </label>
          </div>
        </div>

        {/* Live Server Telemetry Preview Pill */}
        {serverTelemetry && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              fontSize: '0.74rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--accent-success)', fontWeight: 600, marginBottom: '4px' }}>
              <span>{t('serverTelemetryTitle')}</span>
              <button onClick={() => setServerTelemetry('')} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.68rem' }}>✕</button>
            </div>
            <pre style={{ margin: 0, maxHeight: '80px', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
              {serverTelemetry}
            </pre>
          </div>
        )}

        {/* Natural Language Prompt Input */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea
            className="input-field"
            rows={3}
            placeholder={t('playbookPromptPlaceholder')}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating || executing || dryRunning || rollingBack}
            style={{ fontSize: '0.84rem', lineHeight: '1.45', padding: '10px 12px', resize: 'vertical', minHeight: '65px' }}
          />
          <button
            onClick={handleGeneratePlaybook}
            disabled={isGenerating || !prompt.trim() || executing || dryRunning}
            className="btn-primary"
            style={{
              backgroundColor: '#c084fc',
              border: 'none',
              padding: '0 20px',
              minWidth: '130px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(192, 132, 252, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            {isGenerating ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
            <span>{isGenerating ? t('generatingPlaybook') : t('generatePlaybookBtn')}</span>
          </button>
        </div>

        {/* Quick Presets Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(p.prompt)}
              className="btn-secondary"
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                height: '28px',
                whiteSpace: 'nowrap',
                backgroundColor: 'rgba(255,255,255,0.04)',
                borderColor: 'var(--border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Playbook Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {!playbook ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              textAlign: 'center',
              gap: '12px'
            }}
          >
            <Zap size={36} style={{ color: '#c084fc', opacity: 0.8 }} />
            <div style={{ maxWidth: '380px', fontSize: '0.83rem', lineHeight: '1.5' }}>
              <strong>{t('playbookTitle')}</strong>
              <p style={{ marginTop: '6px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                {isVi
                  ? 'Nhập yêu cầu triển khai hoặc sửa lỗi DevOps bằng ngôn ngữ tự nhiên. AI sẽ tự động phân tích và sinh các bước kèm kiểm tra an toàn (Dry-Run) và lệnh hoàn tác (Rollback).'
                  : 'Enter DevOps tasks in natural language. AI will parse steps, dry-run safety verification, and automatic rollback triggers.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button onClick={handleImportJson} className="btn-secondary" style={{ fontSize: '0.75rem', height: '28px' }}>
                <Upload size={12} />
                <span>{t('importJson')}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Playbook Header & Actions Bar */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={16} style={{ color: '#c084fc' }} />
                  {playbook.title}
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  {playbook.description} ({playbook.steps.length} {isVi ? 'bước' : 'steps'})
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleDryRun}
                  disabled={executing || dryRunning || rollingBack || !selectedServer}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', height: '30px', color: 'var(--accent-primary)', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                  title="Run safe non-destructive checkCommands"
                >
                  <Eye size={13} />
                  <span>{dryRunning ? (isVi ? 'Đang kiểm tra...' : 'Checking...') : t('dryRunBtn')}</span>
                </button>

                <button
                  onClick={handleExecutePlaybook}
                  disabled={executing || dryRunning || rollingBack || !selectedServer}
                  className="btn-primary"
                  style={{ fontSize: '0.75rem', height: '30px', backgroundColor: 'var(--accent-success)', border: 'none' }}
                  title="Execute all commands sequentially"
                >
                  <Play size={13} />
                  <span>{executing ? (isVi ? 'Đang chạy...' : 'Running...') : t('executePlaybookBtn')}</span>
                </button>

                <button
                  onClick={() => executeRollbackChain()}
                  disabled={executing || dryRunning || rollingBack || !selectedServer}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', height: '30px', color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.4)' }}
                  title="Rollback completed steps"
                >
                  <RotateCcw size={13} />
                  <span>{rollingBack ? (isVi ? 'Đang rollback...' : 'Rolling back...') : t('rollbackAllBtn')}</span>
                </button>
              </div>
            </div>

            {/* Export Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
              <button onClick={handleAddStep} className="btn-secondary" style={{ fontSize: '0.72rem', height: '26px' }}>
                <Plus size={12} />
                <span>{t('addStep')}</span>
              </button>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={exportBashScript} className="btn-secondary" style={{ fontSize: '0.72rem', height: '26px' }}>
                  <Download size={11} />
                  <span>{t('exportBash')}</span>
                </button>
                <button onClick={exportAnsibleYaml} className="btn-secondary" style={{ fontSize: '0.72rem', height: '26px' }}>
                  <Download size={11} />
                  <span>{t('exportAnsible')}</span>
                </button>
                <button onClick={exportJsonPlaybook} className="btn-secondary" style={{ fontSize: '0.72rem', height: '26px' }}>
                  <Download size={11} />
                  <span>{t('exportJson')}</span>
                </button>
              </div>
            </div>

            {/* Step Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {playbook.steps.map((step, index) => {
                const isExpanded = Boolean(expandedSteps[step.id]);
                const isActive = activeStepId === step.id;

                return (
                  <div
                    key={step.id}
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: isActive
                        ? '1px solid #c084fc'
                        : step.status === 'SUCCESS'
                        ? '1px solid var(--accent-success)'
                        : step.status === 'FAILED'
                        ? '1px solid var(--accent-danger)'
                        : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Step Card Header */}
                    <div
                      onClick={() => toggleStepExpand(step.id)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: 'var(--bg-surface)',
                        borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                          #{index + 1}
                        </span>
                        {getStatusIcon(step.status)}
                        <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {step.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getRiskBadge(step.riskLevel)}
                        {step.executionTimeMs && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {step.executionTimeMs}ms
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(step.id);
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
                          title="Delete step"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Step Details (Expanded) */}
                    {isExpanded && (
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Step Name & Description Inputs */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Step Name:</label>
                            <input
                              type="text"
                              className="input-field"
                              value={step.name}
                              onChange={(e) => updateStepField(step.id, 'name', e.target.value)}
                              style={{ height: '28px', fontSize: '0.78rem' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t('stepRisk')}:</label>
                            <select
                              className="input-field"
                              value={step.riskLevel}
                              onChange={(e) => updateStepField(step.id, 'riskLevel', e.target.value as PlaybookRiskLevel)}
                              style={{ height: '28px', fontSize: '0.75rem' }}
                            >
                              <option value="LOW">{t('riskLow')}</option>
                              <option value="MEDIUM">{t('riskMedium')}</option>
                              <option value="HIGH">{t('riskHigh')}</option>
                              <option value="CRITICAL">{t('riskCritical')}</option>
                            </select>
                          </div>
                        </div>

                        {/* Execute Command */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <label style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              ⚡ {t('stepCommand')}:
                            </label>
                            {onPasteToTerminal && (
                              <button
                                onClick={() => onPasteToTerminal(step.command)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.68rem', cursor: 'pointer' }}
                              >
                                {t('pasteCommand')}
                              </button>
                            )}
                          </div>
                          <textarea
                            className="input-field"
                            rows={2}
                            value={step.command}
                            onChange={(e) => updateStepField(step.id, 'command', e.target.value)}
                            style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}
                          />
                        </div>

                        {/* Check Command (Dry-Run / Pre-Check) */}
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            🔍 {t('stepCheckCommand')}:
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            value={step.checkCommand || ''}
                            onChange={(e) => updateStepField(step.id, 'checkCommand', e.target.value)}
                            placeholder="e.g. nginx -t or systemctl is-active mysqld"
                            style={{ height: '28px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}
                          />
                        </div>

                        {/* Rollback Command */}
                        <div>
                          <label style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 600 }}>
                            ↺ {t('stepRollbackCommand')}:
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            value={step.rollbackCommand || ''}
                            onChange={(e) => updateStepField(step.id, 'rollbackCommand', e.target.value)}
                            placeholder="e.g. mv config.bak config && systemctl reload"
                            style={{ height: '28px', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}
                          />
                        </div>

                        {/* Step Terminal Output Viewer */}
                        {step.output && (
                          <div>
                            <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{t('stepOutput')}:</label>
                            <pre
                              style={{
                                margin: '2px 0 0 0',
                                padding: '8px',
                                backgroundColor: 'var(--bg-primary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                color: step.status === 'FAILED' ? '#f87171' : 'var(--text-main)',
                                maxHeight: '120px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'var(--font-mono)'
                              }}
                            >
                              {step.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
