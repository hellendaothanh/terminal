import React, { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { TerminalSettings } from '../types';

interface NetDiagnosticsPanelProps {
  settings?: TerminalSettings;
}

export const NetDiagnosticsPanel: React.FC<NetDiagnosticsPanelProps> = ({ settings }) => {
  const { t } = useTranslation(settings);
  const [host, setHost] = useState('');
  const [diagnosticsTool, setDiagnosticsTool] = useState<'ping' | 'dns' | 'ports' | 'traceroute' | 'mtr'>('ping');
  const [diagnosticsOutput, setDiagnosticsOutput] = useState('');
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [pingPackets, setPingPackets] = useState(4);
  const [dnsType, setDnsType] = useState('A');
  const [portsList, setPortsList] = useState('22, 80, 443, 3389, 3306, 5432');
  const [maxHops, setMaxHops] = useState(20);
  const [mtrCount, setMtrCount] = useState(5);

  React.useEffect(() => {
    console.log("NetDiagnosticsPanel mounted!");
  }, []);

  const handleRunDiagnostics = async () => {
    if (!host) {
      setDiagnosticsOutput(t('netDiagHostRequired'));
      return;
    }
    setDiagnosticsLoading(true);
    setDiagnosticsOutput(`[${new Date().toLocaleTimeString()}] ` + t('netDiagStarting').replace('{tool}', diagnosticsTool.toUpperCase()).replace('{host}', host) + `\n`);
    try {
      const options = {
        packets: pingPackets,
        dnsType,
        portsList,
        maxHops,
        count: mtrCount
      };
      const result = await window.api.netDiagnose(diagnosticsTool, host, options);
      setDiagnosticsOutput(prev => prev + result);
    } catch (err: any) {
      setDiagnosticsOutput(prev => prev + `${settings?.language === 'en' ? 'Error' : 'Lỗi'}: ${err.message || err}`);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleClearOutput = () => {
    setDiagnosticsOutput('');
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100%', color: 'var(--text-main)', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            <Activity size={22} style={{ color: 'var(--accent-primary)' }} />
            {t('netDiagnostics')}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('netDiagDesc')}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: '1 1 auto', minHeight: '450px' }}>
        {/* Left Side: Controls */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Target Host / IP Address:</label>
            <input 
              type="text" 
              className="input-field" 
              value={host} 
              onChange={(e) => setHost(e.target.value)} 
              placeholder="e.g. 8.8.8.8 or google.com"
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('netDiagSelectTool')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
              {(['ping', 'dns', 'ports', 'traceroute', 'mtr'] as const).map(tool => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => setDiagnosticsTool(tool)}
                  style={{
                    padding: '8px 2px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: diagnosticsTool === tool ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    backgroundColor: diagnosticsTool === tool ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                    color: diagnosticsTool === tool ? 'var(--accent-primary)' : 'var(--text-muted)',
                    textTransform: 'uppercase'
                  }}
                >
                  {tool === 'ports' ? 'Scan' : tool}
                </button>
              ))}
            </div>
          </div>

          {/* Config options */}
          <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{t('netDiagConfig')}</h4>
            {diagnosticsTool === 'ping' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{t('netDiagPacketsLabel')}</span>
                <input 
                  type="number" 
                  className="input-field" 
                  value={pingPackets} 
                  onChange={(e) => setPingPackets(parseInt(e.target.value) || 4)} 
                  style={{ width: '80px', height: '28px', padding: '2px 8px' }} 
                />
              </div>
            )}
            {diagnosticsTool === 'dns' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{t('netDiagDnsTypeLabel')}</span>
                <select 
                  className="input-field" 
                  value={dnsType} 
                  onChange={(e) => setDnsType(e.target.value)} 
                  style={{ width: '100px', height: '28px', padding: '2px 8px' }}
                >
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="CNAME">CNAME</option>
                </select>
              </div>
            )}
            {diagnosticsTool === 'ports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>{t('netDiagPortsLabel')}</span>
                <input 
                  type="text" 
                  className="input-field" 
                  value={portsList} 
                  onChange={(e) => setPortsList(e.target.value)} 
                  placeholder="22, 80, 443, 3389..."
                  style={{ width: '100%', height: '28px', padding: '2px 8px' }} 
                />
              </div>
            )}
            {diagnosticsTool === 'traceroute' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{t('netDiagMaxHopsLabel')}</span>
                <input 
                  type="number" 
                  className="input-field" 
                  value={maxHops} 
                  onChange={(e) => setMaxHops(parseInt(e.target.value) || 20)} 
                  style={{ width: '80px', height: '28px', padding: '2px 8px' }} 
                />
              </div>
            )}
            {diagnosticsTool === 'mtr' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{t('netDiagCyclesLabel')}</span>
                <input 
                  type="number" 
                  className="input-field" 
                  value={mtrCount} 
                  onChange={(e) => setMtrCount(parseInt(e.target.value) || 5)} 
                  style={{ width: '80px', height: '28px', padding: '2px 8px' }} 
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleRunDiagnostics}
              disabled={diagnosticsLoading}
              style={{ flex: 1, height: '36px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {diagnosticsLoading ? <RefreshCw size={14} className="spin" /> : <Activity size={14} />}
              <span>{diagnosticsLoading ? t('netDiagRunningLabel') : t('netDiagRunBtn')}</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClearOutput}
              style={{ height: '36px', fontSize: '0.85rem' }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Right Side: Output Terminal Console */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{t('netDiagConsoleOutput')}</span>
          </div>
          <textarea
            readOnly
            value={diagnosticsOutput}
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-tertiary)',
              color: '#34d399',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              lineHeight: '1.4',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
};
