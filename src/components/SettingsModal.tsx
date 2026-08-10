import React, { useState } from 'react';
import { TerminalSettings, HashiCorpVaultConfig, AISettings } from '../types';
import { Settings, X, Shield, Check, AlertCircle, RefreshCw, Bot, Sparkles } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TerminalSettings;
  onSaveSettings: (settings: TerminalSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'hashicorp' | 'ai'>('general');

  // HashiCorp Vault Form State
  const [vaultConfig, setVaultConfig] = useState<HashiCorpVaultConfig>(
    settings.hashicorpVault || {
      url: 'https://127.0.0.1:8200',
      token: '',
      authMethod: 'token',
      roleId: '',
      secretId: '',
      namespace: ''
    }
  );

  // AI Assistant Form State
  const [aiConfig, setAiConfig] = useState<AISettings>(
    settings.ai || {
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-1.5-flash',
      baseUrl: '',
      enabled: true
    }
  );

  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({ testing: false });
  const [testAiStatus, setTestAiStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({ testing: false });

  if (!isOpen) return null;

  const handleTestVault = async () => {
    setTestStatus({ testing: true });
    try {
      const res = await window.api.hashicorpVaultTest(vaultConfig);
      if (res.success) {
        setTestStatus({ testing: false, success: true, message: `Kết nối thành công! HashiCorp Vault Version: ${res.version}` });
      } else {
        setTestStatus({ testing: false, success: false, message: res.error || 'Kết nối thất bại.' });
      }
    } catch (e: any) {
      setTestStatus({ testing: false, success: false, message: e.message });
    }
  };

  const handleTestAi = async () => {
    setTestAiStatus({ testing: true });
    try {
      const res = await window.api.aiTestKey(aiConfig);
      if (res.success) {
        setTestAiStatus({ testing: false, success: true, message: res.message || 'Xác thực API Key thành công!' });
      } else {
        setTestAiStatus({ testing: false, success: false, message: res.error || 'Lỗi xác thực API Key.' });
      }
    } catch (e: any) {
      setTestAiStatus({ testing: false, success: false, message: e.message });
    }
  };

  const handleSaveAll = () => {
    onSaveSettings({
      ...settings,
      hashicorpVault: vaultConfig,
      ai: aiConfig
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Cài Đặt Hệ Thống & Trợ Lý AI
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 20px' }}>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'general' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'general' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Giao Diện & Terminal
          </button>
          <button
            onClick={() => setActiveTab('hashicorp')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'hashicorp' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'hashicorp' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Shield size={14} />
            <span>HashiCorp Vault</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ai' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === 'ai' ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={14} style={{ color: '#c084fc' }} />
            <span>Trợ Lý AI</span>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'general' ? (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Cỡ Chữ Terminal (Font Size)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={settings.fontSize}
                  onChange={(e) => onSaveSettings({ ...settings, fontSize: parseInt(e.target.value) || 14 })}
                  min={10}
                  max={28}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Font Chữ (Font Family)
                </label>
                <select
                  className="input-field"
                  value={settings.fontFamily}
                  onChange={(e) => onSaveSettings({ ...settings, fontFamily: e.target.value })}
                >
                  <option value="JetBrains Mono, monospace">JetBrains Mono (Khuyên dùng)</option>
                  <option value="Menlo, Monaco, monospace">Menlo / Monaco</option>
                  <option value="Consolas, monospace">Consolas</option>
                  <option value="Courier New, monospace">Courier New</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Chủ Đề Màu Sắc (Color Theme)
                </label>
                <select
                  className="input-field"
                  value={settings.theme}
                  onChange={(e) => onSaveSettings({ ...settings, theme: e.target.value as any })}
                >
                  <option value="one-dark">One Dark (Mặc định)</option>
                  <option value="dracula">Dracula Dark</option>
                  <option value="monokai">Monokai Dark</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>Con trỏ nhấp nháy (Cursor Blink)</span>
                <input
                  type="checkbox"
                  checked={settings.cursorBlink}
                  onChange={(e) => onSaveSettings({ ...settings, cursorBlink: e.target.checked })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Giới Hạn Dòng Cuộn (Scrollback Limit)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={settings.scrollback}
                  onChange={(e) => onSaveSettings({ ...settings, scrollback: parseInt(e.target.value) || 5000 })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  🌐 Ngôn Ngữ Giao Diện (Language)
                </label>
                <select
                  className="input-field"
                  value={settings.language || 'vi'}
                  onChange={(e) => onSaveSettings({ ...settings, language: e.target.value as 'vi' | 'en' })}
                >
                  <option value="vi">🇻🇳 Tiếng Việt (Vietnamese)</option>
                  <option value="en">🇺🇸 English</option>
                </select>
              </div>
            </>
          ) : activeTab === 'hashicorp' ? (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Địa Chỉ Máy Chủ HashiCorp Vault (Vault Server URL)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://vault.company.com:8200"
                  value={vaultConfig.url}
                  onChange={(e) => setVaultConfig({ ...vaultConfig, url: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Phương Thức Xác Thực (Auth Method)
                </label>
                <select
                  className="input-field"
                  value={vaultConfig.authMethod}
                  onChange={(e) => setVaultConfig({ ...vaultConfig, authMethod: e.target.value as any })}
                >
                  <option value="token">Vault Token (X-Vault-Token)</option>
                  <option value="approle">AppRole (Role ID + Secret ID)</option>
                </select>
              </div>

              {vaultConfig.authMethod === 'token' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Vault Client Token
                  </label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="hvs.CAES..."
                    value={vaultConfig.token || ''}
                    onChange={(e) => setVaultConfig({ ...vaultConfig, token: e.target.value })}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Role ID</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="db-role-id..."
                      value={vaultConfig.roleId || ''}
                      onChange={(e) => setVaultConfig({ ...vaultConfig, roleId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Secret ID</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="secret-id..."
                      value={vaultConfig.secretId || ''}
                      onChange={(e) => setVaultConfig({ ...vaultConfig, secretId: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Vault Namespace (Tùy chọn cho Vault Enterprise)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="admin/finance (tùy chọn)"
                  value={vaultConfig.namespace || ''}
                  onChange={(e) => setVaultConfig({ ...vaultConfig, namespace: e.target.value })}
                />
              </div>

              {/* Connection Status & Test Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleTestVault}
                  disabled={testStatus.testing || !vaultConfig.url}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  {testStatus.testing ? <RefreshCw size={14} className="spin" /> : <Shield size={14} />}
                  <span>{testStatus.testing ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối Vault'}</span>
                </button>

                {testStatus.message && (
                  <div style={{
                    fontSize: '0.78rem',
                    color: testStatus.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {testStatus.success ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{testStatus.message}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* AI Assistant Tab */
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bot size={20} style={{ color: '#c084fc' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-main)' }}>Kích Hoạt Trợ Lý AI</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hỗ trợ phân tích Terminal SSH, SQL Database & gợi ý sửa lỗi</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiConfig.enabled}
                  onChange={(e) => setAiConfig({ ...aiConfig, enabled: e.target.checked })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Nhà Cung Cấp AI (AI Provider)
                </label>
                <select
                  className="input-field"
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    const defaultModel = p === 'gemini' ? 'gemini-1.5-flash' : p === 'openai' ? 'gpt-4o-mini' : 'llama3';
                    setAiConfig({ ...aiConfig, provider: p, model: defaultModel });
                  }}
                >
                  <option value="gemini">Google Gemini AI</option>
                  <option value="openai">OpenAI / Compatible API</option>
                  <option value="custom">Custom Endpoint (Ollama / vLLM / LocalAI / DeepSeek)</option>
                </select>
              </div>

              {/* Flexible Model Name Text Input */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Tên Model (Nhập trực tiếp tên Model bất kỳ bạn muốn)
                </label>
                <input
                  type="text"
                  className="input-field"
                  list="popular-ai-models"
                  placeholder="Nhập tên Model (ví dụ: gemini-1.5-flash, gpt-4o, deepseek-r1...)"
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  required
                />
                <datalist id="popular-ai-models">
                  <option value="gemini-1.5-flash" />
                  <option value="gemini-1.5-pro" />
                  <option value="gemini-2.0-flash" />
                  <option value="gpt-4o-mini" />
                  <option value="gpt-4o" />
                  <option value="gpt-3.5-turbo" />
                  <option value="deepseek-coder" />
                  <option value="deepseek-r1" />
                  <option value="llama3" />
                  <option value="qwen2.5-coder" />
                </datalist>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  💡 Gợi ý: Bạn có thể gõ bất kỳ tên Model mới nhất nào từ nhà cung cấp (e.g. <code>gemini-2.0-flash</code>, <code>gpt-4o</code>, <code>deepseek-r1</code>).
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  API Key ({aiConfig.provider === 'custom' ? 'Tùy chọn cho LocalAI' : 'Bắt buộc'})
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="AI API Key..."
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                />
              </div>

              {aiConfig.provider === 'custom' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Custom Base URL (REST Endpoint)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. http://localhost:11434/v1"
                    value={aiConfig.baseUrl || ''}
                    onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  />
                </div>
              )}

              {/* AI Test Key Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleTestAi}
                  disabled={testAiStatus.testing}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  {testAiStatus.testing ? <RefreshCw size={14} className="spin" /> : <Sparkles size={14} style={{ color: '#c084fc' }} />}
                  <span>{testAiStatus.testing ? 'Đang kiểm tra...' : 'Kiểm Tra API Key'}</span>
                </button>

                {testAiStatus.message && (
                  <div style={{
                    fontSize: '0.78rem',
                    color: testAiStatus.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {testAiStatus.success ? <Check size={14} /> : <AlertCircle size={14} />}
                    <span>{testAiStatus.message}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={handleSaveAll}>Lưu Cài Đặt</button>
        </div>
      </div>
    </div>
  );
};
