import React, { useState, useEffect } from 'react';
import { TerminalSettings, HashiCorpVaultConfig, AISettings } from '../types';
import { Settings, X, Shield, Check, AlertCircle, RefreshCw, Bot, Sparkles, Key, ArrowUpDown, Lock } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TerminalSettings;
  onSaveSettings: (settings: TerminalSettings) => void;
  onOpenKeyManager?: () => void;
  onOpenImportExport?: () => void;
  onLockVault?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onOpenKeyManager,
  onOpenImportExport,
  onLockVault
}) => {
  const { t } = useTranslation(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'hashicorp' | 'ai'>('general');

  // App Version & Update State
  const [appVer, setAppVer] = useState('1.5.6');
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
    downloadUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && window.api.appVersion) {
      window.api.appVersion().then((version) => {
        setAppVer(version);
      }).catch(err => {
        console.error('Failed to get app version:', err);
      });
    }
    setUpdateStatus(null);
    setCheckingUpdates(false);
  }, [isOpen]);

  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    setUpdateStatus({ type: 'info', message: t('checkingUpdates') });
    try {
      const response = await fetch('https://api.github.com/repos/hellendaothanh/terminal/releases/latest');
      if (!response.ok) {
        throw new Error('Github API connection failed');
      }
      const data = await response.json();
      const latestTag = data.tag_name;
      const downloadUrl = data.html_url;

      const cleanLatest = latestTag.startsWith('v') ? latestTag.substring(1) : latestTag;
      const cleanCurrent = appVer.startsWith('v') ? appVer.substring(1) : appVer;

      if (cleanLatest !== cleanCurrent) {
        setUpdateStatus({
          type: 'success',
          message: t('newVersionAvailable').replace('{version}', latestTag),
          downloadUrl: downloadUrl
        });
      } else {
        setUpdateStatus({
          type: 'success',
          message: t('latestVersion')
        });
      }
    } catch (e) {
      setUpdateStatus({
        type: 'error',
        message: t('updateError')
      });
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleDownloadUpdate = () => {
    if (updateStatus && updateStatus.downloadUrl && window.api.appOpenUrl) {
      window.api.appOpenUrl(updateStatus.downloadUrl);
    }
  };

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
        setTestStatus({ testing: false, success: true, message: `Connected! Vault Version: ${res.version}` });
      } else {
        setTestStatus({ testing: false, success: false, message: res.error || 'Connection failed.' });
      }
    } catch (e: any) {
      setTestStatus({ testing: false, success: false, message: e.message });
    }
  };

  const handleTestAI = async () => {
    setTestAiStatus({ testing: true });
    try {
      const reply = await window.api.aiSendMessage('Ping check AI connection', aiConfig);
      if (reply) {
        setTestAiStatus({ testing: false, success: true, message: `Connected to ${aiConfig.model} successfully!` });
      } else {
        setTestAiStatus({ testing: false, success: false, message: 'AI returned empty response.' });
      }
    } catch (e: any) {
      setTestAiStatus({ testing: false, success: false, message: e.message || 'AI test failed.' });
    }
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      hashicorpVault: vaultConfig,
      ai: aiConfig
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {t('settingsTitle')}
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
            {t('tabGeneral')}
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
              cursor: 'pointer'
            }}
          >
            {t('tabVault')}
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
            <span>{t('tabAI')}</span>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeTab === 'general' ? (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('fontSize')}
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
                  {t('fontFamily')}
                </label>
                <select
                  className="input-field"
                  value={settings.fontFamily}
                  onChange={(e) => onSaveSettings({ ...settings, fontFamily: e.target.value })}
                >
                  <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                  <option value="Fira Code, monospace">Fira Code</option>
                  <option value="Menlo, Monaco, monospace">Menlo / Monaco</option>
                  <option value="Consolas, monospace">Consolas</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('colorTheme')}
                </label>
                <select
                  className="input-field"
                  value={settings.theme}
                  onChange={(e) => onSaveSettings({ ...settings, theme: e.target.value as any })}
                >
                  <option value="one-dark">One Dark</option>
                  <option value="dracula">Dracula Dark</option>
                  <option value="monokai">Monokai Dark</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{t('cursorBlink')}</span>
                <input
                  type="checkbox"
                  checked={settings.cursorBlink}
                  onChange={(e) => onSaveSettings({ ...settings, cursorBlink: e.target.checked })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('scrollbackLimit')}
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
                  🌐 {t('language')}
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

              {/* App Version & Auto-update Section */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                    {t('currentVersion')}: <span style={{ color: 'var(--accent-primary)' }}>v{appVer}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCheckUpdates}
                    disabled={checkingUpdates}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', height: '28px' }}
                  >
                    {checkingUpdates ? <RefreshCw size={12} className="spin" /> : <RefreshCw size={12} />}
                    <span style={{ marginLeft: '4px' }}>{t('checkForUpdates')}</span>
                  </button>
                </div>

                {updateStatus && (
                  <div style={{
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: updateStatus.type === 'success'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : updateStatus.type === 'error'
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'rgba(59, 130, 246, 0.1)',
                    color: updateStatus.type === 'success'
                      ? 'var(--accent-success)'
                      : updateStatus.type === 'error'
                        ? 'var(--accent-danger)'
                        : 'var(--accent-primary)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {updateStatus.type === 'success' ? <Check size={14} /> : updateStatus.type === 'error' ? <AlertCircle size={14} /> : <RefreshCw size={14} className="spin" />}
                      <span>{updateStatus.message}</span>
                    </div>
                    {updateStatus.downloadUrl && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleDownloadUpdate}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', height: '26px' }}
                      >
                        {t('downloadUpdate')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {onOpenKeyManager && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onClose();
                      onOpenKeyManager();
                    }}
                    style={{ flex: '1 1 120px', height: '36px', fontSize: '0.8rem', justifyContent: 'center' }}
                  >
                    <Key size={14} />
                    <span>{t('sshKeys')}</span>
                  </button>
                )}
                {onOpenImportExport && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onClose();
                      onOpenImportExport();
                    }}
                    style={{ flex: '1 1 120px', height: '36px', fontSize: '0.8rem', justifyContent: 'center' }}
                  >
                    <ArrowUpDown size={14} />
                    <span>{t('importExport')}</span>
                  </button>
                )}
                {onLockVault && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onClose();
                      onLockVault();
                    }}
                    style={{ flex: '1 1 120px', height: '36px', fontSize: '0.8rem', justifyContent: 'center', color: 'var(--accent-warning)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                  >
                    <Lock size={14} />
                    <span>{t('lockVault')}</span>
                  </button>
                )}
              </div>
            </>
          ) : activeTab === 'hashicorp' ? (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('vaultServerUrl')}
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
                  {t('vaultAuthMethod')}
                </label>
                <select
                  className="input-field"
                  value={vaultConfig.authMethod}
                  onChange={(e) => setVaultConfig({ ...vaultConfig, authMethod: e.target.value as any })}
                >
                  <option value="token">Vault Token</option>
                  <option value="approle">AppRole (Role ID + Secret ID)</option>
                </select>
              </div>

              {vaultConfig.authMethod === 'token' ? (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    {t('vaultClientToken')}
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
                      placeholder="db-role-id"
                      value={vaultConfig.roleId || ''}
                      onChange={(e) => setVaultConfig({ ...vaultConfig, roleId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Secret ID</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="••••••••"
                      value={vaultConfig.secretId || ''}
                      onChange={(e) => setVaultConfig({ ...vaultConfig, secretId: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Namespace (Optional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="admin/finance"
                  value={vaultConfig.namespace || ''}
                  onChange={(e) => setVaultConfig({ ...vaultConfig, namespace: e.target.value })}
                />
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleTestVault}
                disabled={testStatus.testing || !vaultConfig.url}
                style={{ height: '36px', fontSize: '0.8rem', justifyContent: 'center' }}
              >
                {testStatus.testing ? <RefreshCw size={14} className="spin" /> : <Shield size={14} />}
                <span>{testStatus.testing ? t('checking') : t('testVaultConnection')}</span>
              </button>

              {testStatus.message && (
                <div style={{
                  fontSize: '0.8rem',
                  color: testStatus.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: testStatus.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                }}>
                  {testStatus.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{testStatus.message}</span>
                </div>
              )}
            </>
          ) : (
            /* AI Assistant Settings Tab */
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{t('enableAi')}</span>
                <input
                  type="checkbox"
                  checked={aiConfig.enabled}
                  onChange={(e) => setAiConfig({ ...aiConfig, enabled: e.target.checked })}
                />
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {t('aiDesc')}
              </p>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('aiProvider')}
                </label>
                <select
                  className="input-field"
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const p = e.target.value as any;
                    let defModel = 'gemini-1.5-flash';
                    if (p === 'openai') defModel = 'gpt-4o-mini';
                    else if (p === 'custom') defModel = 'llama3';
                    setAiConfig({ ...aiConfig, provider: p, model: defModel });
                  }}
                >
                  <option value="gemini">Google Gemini AI (Recommend)</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="custom">Custom Endpoint (Ollama / vLLM / LocalAI / DeepSeek)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('aiModelName')}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. gemini-1.5-flash, gemini-2.0-flash, gpt-4o, deepseek-r1..."
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  {t('aiApiKey')}
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="AI API Key (AIZA... or sk-...)"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                />
              </div>

              {aiConfig.provider === 'custom' && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    {t('aiBaseUrl')}
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="http://localhost:11434/v1 or https://api.deepseek.com/v1"
                    value={aiConfig.baseUrl || ''}
                    onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  />
                </div>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={handleTestAI}
                disabled={testAiStatus.testing || !aiConfig.apiKey}
                style={{ height: '36px', fontSize: '0.8rem', justifyContent: 'center', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}
              >
                {testAiStatus.testing ? <RefreshCw size={14} className="spin" /> : <Bot size={14} />}
                <span>{testAiStatus.testing ? t('checking') : t('testApiKey')}</span>
              </button>

              {testAiStatus.message && (
                <div style={{
                  fontSize: '0.8rem',
                  color: testAiStatus.success ? 'var(--accent-success)' : 'var(--accent-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: testAiStatus.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                }}>
                  {testAiStatus.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{testAiStatus.message}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            {t('saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
};
