import React, { useState, useEffect } from 'react';
import { PluginMetadata, PluginField } from '../types';
import { Blocks, Play, AlertCircle, Database, Braces } from 'lucide-react';

interface CustomConnectorPanelProps {
  onClose: () => void;
}

export const CustomConnectorPanel: React.FC<CustomConnectorPanelProps> = ({ onClose }) => {
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginMetadata | null>(null);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [query, setQuery] = useState('{\n  "query": "match_all"\n}');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    try {
      const res = await window.api.pluginList();
      if (res.success && res.plugins) {
        setPlugins(res.plugins);
      }
    } catch (e) {
      console.error('Failed to fetch plugins:', e);
    }
  };

  const handlePluginSelect = (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId);
    setSelectedPlugin(plugin || null);
    
    // Initialize form data with defaults
    if (plugin && plugin.fields) {
      const initialData: Record<string, any> = {};
      plugin.fields.forEach(f => {
        initialData[f.name] = f.default !== undefined ? f.default : '';
      });
      setFormData(initialData);
    } else {
      setFormData({});
    }
    setResult(null);
    setError(null);
  };

  const handleRunQuery = async () => {
    if (!selectedPlugin) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const res = await window.api.pluginInvoke(selectedPlugin.id, 'query', {
        connection: formData,
        query: query
      });

      if (res.success) {
        setResult(res.data);
      } else {
        throw new Error(res.error || 'Plugin returned an error');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: PluginField) => {
    return (
      <div key={field.name} className="form-group" style={{ marginBottom: '12px' }}>
        <label>{field.label} {field.required && <span style={{ color: 'var(--accent-danger)' }}>*</span>}</label>
        {field.type === 'boolean' ? (
          <input 
            type="checkbox" 
            checked={!!formData[field.name]} 
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })} 
          />
        ) : (
          <input 
            type={field.type} 
            value={formData[field.name] || ''} 
            onChange={(e) => setFormData({ ...formData, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value })} 
            className="input-field" 
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Blocks size={20} style={{ color: 'var(--accent-primary)' }} />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
            Custom Connectors (Plugins)
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar: Connection config */}
        <div style={{ width: '300px', borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Select Plugin</label>
            <select 
              value={selectedPlugin?.id || ''} 
              onChange={e => handlePluginSelect(e.target.value)} 
              className="input-field"
            >
              <option value="">-- Choose a Plugin --</option>
              {plugins.map(p => (
                <option key={p.id} value={p.id}>{p.name} (v{p.version})</option>
              ))}
            </select>
            {plugins.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginTop: '4px', display: 'block' }}>
                No plugins found. Use Plugin Manager to install one.
              </span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {selectedPlugin ? (
              <>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} /> Connection Properties
                </h3>
                {selectedPlugin.fields.map(renderField)}
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-muted)' }}>
                <Blocks size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.9rem' }}>Select a plugin to configure connection.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Query and Result */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Query Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ padding: '8px 16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Query Payload (JSON / SQL)</span>
              <button 
                onClick={handleRunQuery} 
                disabled={!selectedPlugin || loading}
                style={{ 
                  padding: '4px 12px', borderRadius: '4px', backgroundColor: 'var(--accent-primary)', color: 'white', 
                  border: 'none', cursor: (!selectedPlugin || loading) ? 'not-allowed' : 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600,
                  opacity: (!selectedPlugin || loading) ? 0.7 : 1
                }}
              >
                <Play size={14} /> Run
              </button>
            </div>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              disabled={!selectedPlugin}
              style={{
                flex: 1, width: '100%', border: 'none', padding: '16px', backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.9rem', resize: 'none', outline: 'none'
              }}
              spellCheck={false}
            />
          </div>

          {/* Output Viewer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e' }}>
            <div style={{ padding: '6px 16px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #404040', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Braces size={14} color="#a3a3a3" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a3a3a3' }}>Output Result</span>
            </div>
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              {error && (
                <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <AlertCircle size={16} /> <span>{error}</span>
                </div>
              )}
              {loading ? (
                <span style={{ color: '#a3a3a3' }}>Running query...</span>
              ) : result ? (
                <pre style={{ margin: 0, color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
                </pre>
              ) : (
                <span style={{ color: '#525252' }}>{error ? '' : 'No data yet.'}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
