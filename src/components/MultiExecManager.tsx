import React, { useState } from 'react';
import { CommandSnippet, MultiExecResult, ServerConfig, SSHKey } from '../types';
import { Code2, Play, FileText } from 'lucide-react';
import { TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { SnippetModal } from './multiexec/SnippetModal';
import { SnippetLibraryTab } from './multiexec/SnippetLibraryTab';
import { MultiExecRunnerTab } from './multiexec/MultiExecRunnerTab';

interface MultiExecManagerProps {
  snippets: CommandSnippet[];
  servers: ServerConfig[];
  keys: SSHKey[];
  onSaveSnippet: (snippet: CommandSnippet) => void;
  onDeleteSnippet: (id: string) => void;
  settings?: TerminalSettings;
}

export const MultiExecManager: React.FC<MultiExecManagerProps> = ({
  snippets,
  servers,
  keys,
  onSaveSnippet,
  onDeleteSnippet,
  settings
}) => {
  const { t } = useTranslation(settings);
  const [activeTab, setActiveTab] = useState<'SNIPPETS' | 'MULTI_EXEC'>('MULTI_EXEC');
  
  // Snippet Library States
  const [searchSnippet, setSearchSnippet] = useState('');
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [snippetFormData, setSnippetFormData] = useState<Partial<CommandSnippet>>({
    type: 'SSH'
  });

  // Multi-Exec States
  const [execType, setExecType] = useState<'SSH' | 'DATABASE'>('SSH');
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [commandContent, setCommandContent] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [execResults, setExecResults] = useState<MultiExecResult[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredServers = servers.filter((s) => {
    if (execType === 'DATABASE') return s.protocol === 'DATABASE';
    return s.protocol === 'SSH' || s.protocol === 'SFTP' || !s.protocol;
  });

  const filteredSnippets = snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(searchSnippet.toLowerCase()) ||
      s.content.toLowerCase().includes(searchSnippet.toLowerCase())
  );

  const handleSelectAllServers = () => {
    if (selectedServerIds.length === filteredServers.length) {
      setSelectedServerIds([]);
    } else {
      setSelectedServerIds(filteredServers.map((s) => s.id));
    }
  };

  const handleToggleServer = (id: string) => {
    if (selectedServerIds.includes(id)) {
      setSelectedServerIds(selectedServerIds.filter((sid) => sid !== id));
    } else {
      setSelectedServerIds([...selectedServerIds, id]);
    }
  };

  const handleOpenSnippetModal = (sn?: CommandSnippet) => {
    if (sn) {
      setSnippetFormData(sn);
      setEditingSnippetId(sn.id);
    } else {
      setSnippetFormData({
        title: '',
        type: 'SSH',
        content: '',
        description: ''
      });
      setEditingSnippetId(null);
    }
    setIsSnippetModalOpen(true);
  };

  const handleSaveSnippet = () => {
    if (!snippetFormData.title || !snippetFormData.content) {
      alert('Vui lòng nhập Tiêu đề và Nội dung script.');
      return;
    }

    const now = Date.now();
    const entry: CommandSnippet = {
      id: editingSnippetId || crypto.randomUUID(),
      title: snippetFormData.title,
      type: snippetFormData.type || 'SSH',
      content: snippetFormData.content,
      description: snippetFormData.description,
      createdAt: snippetFormData.createdAt || now,
      updatedAt: now
    };

    onSaveSnippet(entry);
    setIsSnippetModalOpen(false);
  };

  const handleRunSnippetMultiExec = (sn: CommandSnippet) => {
    setExecType(sn.type);
    setCommandContent(sn.content);
    setActiveTab('MULTI_EXEC');
  };

  const handleExecuteMulti = async () => {
    if (selectedServerIds.length === 0) {
      alert(t('alertSelectTarget'));
      return;
    }
    if (!commandContent.trim()) {
      alert(t('alertEnterCommand'));
      return;
    }

    const targetServers = servers.filter((s) => selectedServerIds.includes(s.id));
    setIsRunning(true);

    // Initial pending states
    const initialResults: MultiExecResult[] = targetServers.map((s) => ({
      targetId: s.id,
      targetName: s.name,
      hostOrDb: execType === 'SSH' ? `${s.username}@${s.host}:${s.port}` : `${s.dbType}://${s.host}:${s.port}`,
      status: 'RUNNING',
      output: t('connectingExecStatus'),
      executionTimeMs: 0
    }));
    setExecResults(initialResults);

    try {
      let results: MultiExecResult[] = [];
      if (execType === 'SSH') {
        results = await window.api.multiExecSsh(targetServers, commandContent, keys);
      } else {
        results = await window.api.multiExecDb(targetServers, commandContent);
      }
      setExecResults(results);
    } catch (e: any) {
      alert(`${t('execErrorPrefix')} ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const successCount = execResults.filter((r) => r.status === 'SUCCESS').length;
  const errorCount = execResults.filter((r) => r.status === 'ERROR').length;

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-main)', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            <Code2 size={22} style={{ color: 'var(--accent-primary)' }} />
            {t('multiExecTitle')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {t('multiExecSubtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('MULTI_EXEC')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'MULTI_EXEC' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'MULTI_EXEC' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Play size={14} /> {t('tabMultiExec')}
          </button>
          <button
            onClick={() => setActiveTab('SNIPPETS')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'SNIPPETS' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'SNIPPETS' ? '#fff' : 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={14} /> {t('tabSnippets')} ({snippets.length})
          </button>
        </div>
      </div>

      {activeTab === 'SNIPPETS' ? (
        <SnippetLibraryTab
          snippets={snippets}
          searchSnippet={searchSnippet}
          setSearchSnippet={setSearchSnippet}
          filteredSnippets={filteredSnippets}
          handleOpenSnippetModal={handleOpenSnippetModal}
          handleRunSnippetMultiExec={handleRunSnippetMultiExec}
          onDeleteSnippet={onDeleteSnippet}
          t={t}
        />
      ) : (
        <MultiExecRunnerTab
          execType={execType}
          setExecType={setExecType}
          selectedServerIds={selectedServerIds}
          setSelectedServerIds={setSelectedServerIds}
          filteredServers={filteredServers}
          handleSelectAllServers={handleSelectAllServers}
          handleToggleServer={handleToggleServer}
          commandContent={commandContent}
          setCommandContent={setCommandContent}
          handleExecuteMulti={handleExecuteMulti}
          isRunning={isRunning}
          execResults={execResults}
          successCount={successCount}
          errorCount={errorCount}
          copiedId={copiedId}
          handleCopyText={handleCopyText}
          t={t}
        />
      )}

      <SnippetModal
        isOpen={isSnippetModalOpen}
        onClose={() => setIsSnippetModalOpen(false)}
        editingSnippetId={editingSnippetId}
        snippetFormData={snippetFormData}
        onChangeFormData={setSnippetFormData}
        onSave={handleSaveSnippet}
        t={t}
      />
    </div>
  );
};
