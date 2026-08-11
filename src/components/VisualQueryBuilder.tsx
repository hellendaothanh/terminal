import React, { useState } from 'react';
import { ServerConfig, TerminalSettings } from '../types';
import { MousePointer, Database, Plus, Trash2, Play, Code2, Layers, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

interface VisualQueryBuilderProps {
  servers: ServerConfig[];
  onExecuteGeneratedQuery?: (serverId: string, queryStr: string) => void;
  settings?: TerminalSettings;
}

interface TableDefinition {
  name: string;
  columns: string[];
}

const AVAILABLE_TABLES: TableDefinition[] = [
  { name: 'users', columns: ['id', 'username', 'email', 'status', 'created_at'] },
  { name: 'orders', columns: ['id', 'user_id', 'total_amount', 'status', 'created_at'] },
  { name: 'order_items', columns: ['id', 'order_id', 'product_id', 'quantity', 'price'] },
  { name: 'products', columns: ['id', 'name', 'category', 'price', 'stock'] }
];

export const VisualQueryBuilder: React.FC<VisualQueryBuilderProps> = ({
  servers,
  onExecuteGeneratedQuery,
  settings
}) => {
  const { t } = useTranslation(settings);
  const dbServers = servers.filter((s) => s.protocol === 'DATABASE');
  const [selectedServerId, setSelectedServerId] = useState<string>(dbServers[0]?.id || '');

  const [selectedTables, setSelectedTables] = useState<string[]>(['users', 'orders']);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(['users.id', 'users.username', 'orders.total_amount', 'orders.status']);
  const [joinConditions, setJoinConditions] = useState<{ leftTable: string; leftCol: string; joinType: 'INNER' | 'LEFT' | 'RIGHT'; rightTable: string; rightCol: string }[]>([
    { leftTable: 'users', leftCol: 'id', joinType: 'INNER', rightTable: 'orders', rightCol: 'user_id' }
  ]);
  const [whereConditions, setWhereConditions] = useState<{ column: string; operator: '=' | '>' | '<' | 'LIKE'; value: string }[]>([
    { column: 'orders.status', operator: '=', value: "'COMPLETED'" }
  ]);
  const [limit, setLimit] = useState<number>(50);

  const toggleTable = (tableName: string) => {
    if (selectedTables.includes(tableName)) {
      setSelectedTables(selectedTables.filter((t) => t !== tableName));
      setSelectedColumns(selectedColumns.filter((c) => !c.startsWith(tableName + '.')));
    } else {
      setSelectedTables([...selectedTables, tableName]);
    }
  };

  const toggleColumn = (colFullName: string) => {
    if (selectedColumns.includes(colFullName)) {
      setSelectedColumns(selectedColumns.filter((c) => c !== colFullName));
    } else {
      setSelectedColumns([...selectedColumns, colFullName]);
    }
  };

  // Generate SQL Query string automatically
  const generateSql = (): string => {
    if (selectedTables.length === 0) return t('vqbSelectTablePrompt');

    const colsStr = selectedColumns.length > 0 ? selectedColumns.join(',\n    ') : '*';
    const mainTable = selectedTables[0];
    let sql = `SELECT\n    ${colsStr}\nFROM ${mainTable}`;

    // Join Clauses
    joinConditions.forEach((join) => {
      if (selectedTables.includes(join.leftTable) && selectedTables.includes(join.rightTable)) {
        sql += `\n${join.joinType} JOIN ${join.rightTable} ON ${join.leftTable}.${join.leftCol} = ${join.rightTable}.${join.rightCol}`;
      }
    });

    // Where Clauses
    if (whereConditions.length > 0) {
      const whereStrs = whereConditions.map((w) => `${w.column} ${w.operator} ${w.value}`);
      sql += `\nWHERE ${whereStrs.join(' AND ')}`;
    }

    sql += `\nLIMIT ${limit};`;
    return sql;
  };

  const generatedSql = generateSql();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)', padding: '20px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MousePointer size={22} style={{ color: '#c084fc' }} />
            <span>{t('vqbTitle')}</span>
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {t('vqbDesc')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <select className="input-field" value={selectedServerId} onChange={(e) => setSelectedServerId(e.target.value)} style={{ height: '34px', fontSize: '0.8rem' }}>
            {dbServers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.dbType})</option>
            ))}
          </select>

          {onExecuteGeneratedQuery && (
            <button
              className="btn-primary"
              onClick={() => onExecuteGeneratedQuery(selectedServerId, generatedSql)}
              style={{ height: '34px', backgroundColor: '#c084fc' }}
            >
              <Play size={14} />
              <span>{t('vqbRunBtn')}</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 1fr', gap: '16px', flex: 1 }}>
        {/* 1. Tables & Columns Picker */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>{t('vqbTableColList')}</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            {AVAILABLE_TABLES.map((table) => {
              const isSelected = selectedTables.includes(table.name);

              return (
                <div key={table.name} style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)' }}>
                  <div
                    onClick={() => toggleTable(table.name)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)' }}
                  >
                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    <span>{table.name}</span>
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: '8px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {table.columns.map((col) => {
                        const fullName = `${table.name}.${col}`;
                        const isColSelected = selectedColumns.includes(fullName);

                        return (
                          <div
                            key={col}
                            onClick={() => toggleColumn(fullName)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', color: isColSelected ? 'var(--text-main)' : 'var(--text-muted)' }}
                          >
                            {isColSelected ? <CheckSquare size={13} style={{ color: 'var(--accent-success)' }} /> : <Square size={13} />}
                            <span>{col}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. JOIN & WHERE Condition Designer */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {t('vqbJoinWhereRules')}
          </h3>

          {/* JOIN Rules */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>{t('vqbJoinRules')}</label>
            {joinConditions.map((j, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{j.leftTable}.{j.leftCol}</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{j.joinType} JOIN</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{j.rightTable}.{j.rightCol}</span>
              </div>
            ))}
          </div>

          {/* WHERE Rules */}
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>{t('vqbWhereRules')}</label>
            {whereConditions.map((w, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-main)' }}>{w.column}</span>
                <span style={{ color: 'var(--accent-warning)', fontWeight: 700 }}>{w.operator}</span>
                <span style={{ color: '#a7f3d0' }}>{w.value}</span>
              </div>
            ))}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>{t('vqbLimit')}</label>
            <input type="number" className="input-field" value={limit} onChange={(e) => setLimit(parseInt(e.target.value, 10) || 10)} style={{ width: '100px', height: '32px' }} />
          </div>
        </div>

        {/* 3. Generated SQL Preview */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code2 size={16} style={{ color: '#c084fc' }} />
              <span>{t('vqbSqlPreview')}</span>
            </h3>
            <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(generatedSql)} style={{ height: '28px', fontSize: '0.72rem' }}>
              Copy SQL
            </button>
          </div>

          <textarea
            readOnly
            value={generatedSql}
            style={{
              flex: 1,
              backgroundColor: 'var(--bg-tertiary)',
              color: '#c084fc',
              fontFamily: 'monospace',
              fontSize: '0.82rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              resize: 'none'
            }}
          />
        </div>
      </div>
    </div>
  );
};
