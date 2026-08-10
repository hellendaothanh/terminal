import React, { useEffect, useState } from 'react';
import { ServerConfig, TerminalSettings, DBQueryResult } from '../types';
import {
  Database,
  Table,
  Play,
  RefreshCw,
  Search,
  KeyRound,
  Download,
  AlertTriangle,
  Clock,
  Layers,
  FileCode
} from 'lucide-react';
import { ReAuthModal } from './ReAuthModal';
import { useTranslation } from '../i18n/useTranslation';

interface DatabaseExplorerProps {
  sessionId: string;
  server: ServerConfig;
  settings?: TerminalSettings;
  onUpdateServerPassword?: (serverId: string, newPassword: string) => void;
}

export const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  sessionId,
  server: initialServer,
  settings,
  onUpdateServerPassword
}) => {
  const { t } = useTranslation(settings);
  const [currentServer, setCurrentServer] = useState<ServerConfig>(initialServer);
  const [dbType] = useState<string>(initialServer.dbType || 'MySQL');

  // Database Navigation State
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>(initialServer.dbName || '');
  const [tables, setTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Query Execution State
  const [queryInput, setQueryInput] = useState<string>('');
  const [queryResult, setQueryResult] = useState<DBQueryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReAuthOpen, setIsReAuthOpen] = useState<boolean>(false);

  useEffect(() => {
    (window as any).__activeBuffers = (window as any).__activeBuffers || {};
    (window as any).__activeBuffers[sessionId] = () => {
      let dbText = `[Database Context]\nEngine: ${dbType}\nDatabase Name: ${selectedDb || 'Default'}\nTable: ${selectedTable || 'None'}\n`;
      if (queryInput) dbText += `\n[Active SQL Query]:\n${queryInput}\n`;
      if (error) dbText += `\n[Database Error Trace]:\n${error}\n`;
      if (queryResult) {
        dbText += `\n[Query Results Summary]:\nTotal Rows: ${queryResult.rowCount} | Execution Time: ${queryResult.executionTimeMs}ms\nColumns: ${queryResult.columns.join(', ')}\nSample Rows:\n${JSON.stringify(queryResult.rows.slice(0, 5), null, 2)}\n`;
      }
      return { type: 'DATABASE', dbType, server: initialServer.name, text: dbText };
    };

    return () => {
      if ((window as any).__activeBuffers) {
        delete (window as any).__activeBuffers[sessionId];
      }
    };
  }, [sessionId, initialServer.name, dbType, selectedDb, selectedTable, queryInput, error, queryResult]);

  const startConnection = (targetServer: ServerConfig) => {
    setLoading(true);
    setError(null);

    window.api
      .dbConnect({
        sessionId,
        server: targetServer,
        vaultConfig: settings?.hashicorpVault
      })
      .then(async (res) => {
        if (res.success) {
          setError(null);
          setIsReAuthOpen(false);

          // Fetch database list
          const dbRes = await window.api.dbListDatabases(sessionId, dbType);
          if (dbRes.success && dbRes.databases) {
            setDatabases(dbRes.databases);
            const activeDb = selectedDb || dbRes.databases[0] || '';
            if (activeDb) {
              setSelectedDb(activeDb);
              loadTables(activeDb);
            }
          }
          setLoading(false);
        } else {
          setError(res.error || 'Kết nối Cơ Sở Dữ Liệu thất bại.');
          setLoading(false);
          setIsReAuthOpen(true);
        }
      });
  };

  const loadTables = async (dbName: string) => {
    const res = await window.api.dbListTables(sessionId, dbType, dbName);
    if (res.success && res.tables) {
      setTables(res.tables);
    }
  };

  useEffect(() => {
    startConnection(currentServer);
    return () => {
      window.api.dbDisconnect(sessionId);
    };
  }, [sessionId, initialServer.id]);

  const handleSelectDb = (dbName: string) => {
    setSelectedDb(dbName);
    loadTables(dbName);
  };

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    let defaultQuery = '';

    if (dbType === 'MySQL') {
      defaultQuery = `SELECT * FROM \`${tableName}\` LIMIT 100;`;
    } else if (dbType === 'PostgreSQL') {
      defaultQuery = `SELECT * FROM "${tableName}" LIMIT 100;`;
    } else if (dbType === 'Redis') {
      defaultQuery = `GET ${tableName}`;
    }

    setQueryInput(defaultQuery);
    runQuery(defaultQuery);
  };

  const runQuery = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : queryInput;
    if (!q.trim()) return;

    setExecuting(true);
    const res = await window.api.dbExecuteQuery(sessionId, dbType, q, selectedDb);
    setQueryResult(res);
    setExecuting(false);
  };

  const handleRetryAuth = (newPassword: string, saveToVault: boolean) => {
    if (saveToVault && onUpdateServerPassword) {
      onUpdateServerPassword(currentServer.id, newPassword);
    }
    const updated = {
      ...currentServer,
      authType: 'password' as const,
      password: newPassword
    };
    setCurrentServer(updated);
    setIsReAuthOpen(false);
    startConnection(updated);
  };

  const handleExportCSV = () => {
    if (!queryResult || !queryResult.rows || queryResult.rows.length === 0) return;
    const cols = queryResult.columns;
    const headerRow = cols.join(',');
    const dataRows = queryResult.rows.map((row) =>
      cols.map((col) => JSON.stringify(row[col] !== undefined ? row[col] : '')).join(',')
    );
    const csvContent = [headerRow, ...dataRows].join('\n');

    window.api.saveFileDialog(`export_${selectedTable || 'query'}.csv`, csvContent);
  };

  const filteredTables = tables.filter((t) => t.toLowerCase().includes(tableSearch.toLowerCase()));

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: 'var(--bg-primary)' }}>
      {/* Left Sidebar: Databases & Tables */}
      <div style={{
        width: '240px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* DB Connection Header */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Database size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
              {dbType}: {currentServer.name}
            </span>
          </div>

          {/* Database Selector Dropdown */}
          <select
            className="input-field"
            value={selectedDb}
            onChange={(e) => handleSelectDb(e.target.value)}
            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
          >
            {databases.map((db) => (
              <option key={db} value={db}>
                📁 {db}
              </option>
            ))}
          </select>
        </div>

        {/* Table Search Input */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', position: 'relative' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Lọc danh sách bảng..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            style={{ fontSize: '0.75rem', paddingLeft: '28px', height: '28px' }}
          />
          <Search size={13} style={{ position: 'absolute', left: '20px', top: '15px', color: 'var(--text-dim)' }} />
        </div>

        {/* Table List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
          {filteredTables.map((t) => {
            const isSelected = selectedTable === t;
            return (
              <button
                key={t}
                onClick={() => handleSelectTable(t)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isSelected ? 'var(--accent-glow)' : 'transparent',
                  border: 'none',
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <Table size={14} style={{ color: 'var(--text-muted)' }} />
                <span>{t}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Main Area: Query Console & Data Grid */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Error Banner */}
        {error && (
          <div style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--accent-danger)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setIsReAuthOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
            >
              Cập nhật mật khẩu Database
            </button>
          </div>
        )}

        {/* Query Editor Bar */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
              <FileCode size={16} style={{ color: 'var(--accent-primary)' }} />
              <span>Truy Vấn SQL / Câu Lệnh {dbType}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {queryResult && (
                <button
                  className="btn-secondary"
                  onClick={handleExportCSV}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Xuất kết quả ra file CSV"
                >
                  <Download size={13} />
                  <span>Export CSV</span>
                </button>
              )}

              <button
                className="btn-primary"
                onClick={() => runQuery()}
                disabled={executing || !queryInput.trim()}
                style={{ fontSize: '0.78rem', padding: '4px 12px' }}
              >
                {executing ? <RefreshCw size={13} className="spin" /> : <Play size={13} />}
                <span>{executing ? 'Đang chạy...' : 'Chạy Câu Lệnh (Run)'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={`Nhập câu lệnh ${dbType} (e.g. SELECT * FROM users WHERE active = 1;)`}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                runQuery();
              }
            }}
            style={{
              width: '100%',
              height: '70px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-main)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              padding: '8px 12px',
              resize: 'none',
              outline: 'none'
            }}
          />
        </div>

        {/* Results Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Đang kết nối tới máy chủ CSDL {dbType}...
            </div>
          ) : queryResult?.error ? (
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--accent-danger)',
              fontSize: '0.85rem'
            }}>
              <strong>Lỗi thực thi SQL:</strong> {queryResult.error}
            </div>
          ) : queryResult ? (
            <div>
              {/* Execution Summary Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={13} style={{ color: 'var(--accent-primary)' }} />
                  <strong>{queryResult.rowCount}</strong> dòng dữ liệu
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} style={{ color: 'var(--accent-success)' }} />
                  Thời gian: <strong>{queryResult.executionTimeMs} ms</strong>
                </span>
              </div>

              {/* Data Table Grid */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    {queryResult.columns.map((col) => (
                      <th key={col} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--accent-primary)', whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        backgroundColor: idx % 2 === 1 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                      }}
                    >
                      {queryResult.columns.map((col) => {
                        const val = row[col];
                        return (
                          <td key={col} style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', color: val === null ? 'var(--text-dim)' : 'var(--text-main)' }}>
                            {val === null ? 'NULL' : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Chọn một bảng ở cột bên trái hoặc nhập câu lệnh SQL để xem dữ liệu.
            </div>
          )}
        </div>
      </div>

      {/* ReAuth Password Modal */}
      <ReAuthModal
        isOpen={isReAuthOpen}
        server={currentServer}
        errorMsg={error || 'Xác thực Database thất bại'}
        onRetry={handleRetryAuth}
        onClose={() => setIsReAuthOpen(false)}
      />
    </div>
  );
};
