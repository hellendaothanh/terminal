import React, { useState, useEffect } from 'react';
import { Blocks, Upload, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { PluginMetadata } from '../types';

interface PluginManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluginManagerModal: React.FC<PluginManagerModalProps> = ({ isOpen, onClose }) => {
  const [plugins, setPlugins] = useState<PluginMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPlugins = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.pluginList();
      if (res.success && res.plugins) {
        setPlugins(res.plugins);
      } else {
        throw new Error(res.error || 'Failed to list plugins');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlugins();
      setSuccessMsg(null);
      setError(null);
    }
  }, [isOpen]);

  const handleInstall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In Electron, File objects have a 'path' property
    const filePath = (file as any).path;
    if (!filePath) {
      setError('Cannot determine file path. Please use the desktop client.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await window.api.pluginInstall(filePath);
      if (res.success) {
        setSuccessMsg('Plugin installed successfully!');
        await fetchPlugins();
      } else {
        throw new Error(res.error || 'Failed to install plugin');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!window.confirm('Are you sure you want to uninstall this plugin?')) return;
    
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await window.api.pluginUninstall(pluginId);
      if (res.success) {
        setSuccessMsg('Plugin uninstalled successfully!');
        await fetchPlugins();
      } else {
        throw new Error(res.error || 'Failed to uninstall plugin');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', backgroundColor: 'var(--bg-primary)' }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Blocks size={24} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
              Plugin & Custom Connectors
            </h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '8px' }}>
            Install custom community connectors (e.g. Elasticsearch, Kafka) via .js plugins.
          </p>
        </div>

        <div className="modal-body" style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', gap: '12px' }}>
            <ShieldAlert size={24} style={{ color: 'var(--accent-danger)' }} />
            <div>
              <strong style={{ color: 'var(--accent-danger)', display: 'block', marginBottom: '4px' }}>Security Warning</strong>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Plugins are executed in the Node.js Main Process and have full access to your filesystem, network, and memory. 
                <strong> Only install plugins from developers you completely trust.</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Installed Plugins ({plugins.length})</h4>
            <div>
              <input
                type="file"
                id="plugin-upload"
                accept=".js"
                style={{ display: 'none' }}
                onChange={handleInstall}
                disabled={loading}
              />
              <label 
                htmlFor="plugin-upload"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
                  backgroundColor: 'var(--accent-primary)', color: 'white', borderRadius: '6px', 
                  cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, fontSize: '0.9rem',
                  opacity: loading ? 0.7 : 1
                }}
              >
                <Upload size={16} /> Install .js Plugin
              </label>
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {successMsg && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {plugins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
              <Blocks size={48} style={{ color: 'var(--text-muted)', opacity: 0.5, marginBottom: '16px' }} />
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No plugins installed yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {plugins.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: 'var(--text-main)' }}>
                      {p.name} <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', marginLeft: '8px' }}>v{p.version}</span>
                    </h5>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.description}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px' }}>
                      <span><strong>ID:</strong> {p.id}</span>
                      {p.author && <span><strong>Author:</strong> {p.author}</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUninstall(p.id)}
                    disabled={loading}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: loading ? 'not-allowed' : 'pointer', padding: '8px', borderRadius: '4px' }}
                    title="Uninstall"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

        <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-secondary)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', cursor: 'pointer', fontWeight: 500 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
