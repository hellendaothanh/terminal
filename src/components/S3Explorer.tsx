import React, { useEffect, useState } from 'react';
import { ServerConfig, SSHKey, RemoteFile, TerminalSettings } from '../types';
import {
  Folder,
  FileText,
  Upload,
  Download,
  FolderPlus,
  Trash2,
  RefreshCw,
  ArrowUp,
  HardDrive,
  KeyRound,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { ReAuthModal } from './ReAuthModal';

interface S3ExplorerProps {
  sessionId: string;
  server: ServerConfig;
  keyObj?: SSHKey;
  settings?: TerminalSettings;
  onUpdateServerPassword?: (serverId: string, newPassword: string) => void;
}

interface TransferProgress {
  type: 'upload' | 'download';
  fileName: string;
  transferred: number;
  total: number;
  percentage: number;
}

export const S3Explorer: React.FC<S3ExplorerProps> = ({
  sessionId,
  server: initialServer,
  keyObj,
  settings,
  onUpdateServerPassword
}) => {
  const [currentServer, setCurrentServer] = useState<ServerConfig>(initialServer);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<RemoteFile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isReAuthOpen, setIsReAuthOpen] = useState(false);

  // Transfer Progress Bar State
  const [transferProgress, setTransferProgress] = useState<TransferProgress | null>(null);

  const startConnection = (targetServer: ServerConfig) => {
    setLoading(true);
    setError(null);
    const options = targetServer.s3Options || {
      region: 'us-east-1',
      accessKeyId: targetServer.username,
      secretAccessKey: targetServer.password,
      endpoint: targetServer.host ? `https://${targetServer.host}` : undefined
    };

    window.api
      .s3Connect(sessionId, options)
      .then((res) => {
        if (res) {
          loadDirectory('/');
        } else {
          setError('Kết nối S3 thất bại.');
          setLoading(false);
          setIsReAuthOpen(true);
        }
      })
      .catch(err => {
        setError(err.message || 'Lỗi kết nối');
        setLoading(false);
      });
  };

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const files = await window.api.s3List(sessionId, path);
      setFiles(files || []);
      setCurrentPath(path);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startConnection(currentServer);

    // Listen to real-time SFTP upload/download progress
    const removeProgressListener = window.api.onS3Progress((_, payload) => {
      if (payload.sessionId === sessionId) {
        setTransferProgress(payload);
        if (payload.percentage >= 100) {
          setTimeout(() => {
            setTransferProgress(null);
          }, 3000);
        }
      }
    });

    return () => {
      removeProgressListener();
      window.api.s3Disconnect(sessionId);
    };
  }, [sessionId, initialServer.id]);

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

  const handleNavigateUp = () => {
    if (currentPath === '/') return;
    
    // Path format: /bucket-name/folder1/folder2/
    const parts = currentPath.split('/').filter(Boolean);
    if (parts.length === 1) {
      // Inside bucket, go to root
      loadDirectory('/');
    } else {
      parts.pop();
      const parentPath = '/' + parts.join('/') + '/';
      loadDirectory(parentPath);
    }
  };

  const handleItemClick = (file: RemoteFile) => {
    setSelectedFile(file);
  };

  const handleItemDoubleClick = (file: RemoteFile) => {
    if (file.type === 'd') {
      const newPath = currentPath === '/' ? `/${file.name}/` : `${currentPath}${file.name}/`;
      loadDirectory(newPath);
    }
  };

  const handleUpload = async () => {
    const picked = await window.api.openFileDialog();
    if (picked) {
      const fileName = picked.path.split('/').pop() || 'uploaded_file';
      const remoteFilePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;

      setTransferProgress({
        type: 'upload',
        fileName,
        transferred: 0,
        total: 100,
        percentage: 0
      });

      try {
        await window.api.s3Upload(sessionId, picked.path, remoteFilePath);
        setStatusMessage(`Upload thành công: ${fileName}`);
        loadDirectory(currentPath);
      } catch (err: any) {
        setError(`Upload thất bại: ${err.message || err}`);
        setTransferProgress(null);
      }
    }
  };

  const handleDownload = async () => {
    if (!selectedFile || selectedFile.type === 'd') return;
    const remoteFilePath = currentPath === '/' ? `/${selectedFile.name}` : `${currentPath}/${selectedFile.name}`;

    const savePath = await window.api.saveFileDialog(selectedFile.name, '');
    if (savePath) {
      setTransferProgress({
        type: 'download',
        fileName: selectedFile.name,
        transferred: 0,
        total: selectedFile.size || 100,
        percentage: 0
      });

      try {
        await window.api.s3Download(sessionId, remoteFilePath, savePath);
        setStatusMessage(`Download thành công: ${selectedFile.name}`);
        loadDirectory(currentPath);
      } catch (err: any) {
        setError(`Download thất bại: ${err.message || err}`);
        setTransferProgress(null);
      }
    }
  };

  const handleMkdir = async () => {
    const folderName = prompt('Nhập tên thư mục mới:');
    if (folderName) {
      const newFolderPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
      try {
        await window.api.s3Mkdir(sessionId, newFolderPath);
        loadDirectory(currentPath);
      } catch (err: any) {
        setError(`Tạo thư mục thất bại: ${err.message || err}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedFile) return;
    if (confirm(`Bạn có chắc chắn muốn xóa "${selectedFile.name}"?`)) {
      const targetPath = currentPath === '/' ? `/${selectedFile.name}` : `${currentPath}/${selectedFile.name}`;
      try {
        await window.api.s3Delete(sessionId, targetPath, selectedFile.type === 'd');
        loadDirectory(currentPath);
      } catch (err: any) {
        setError(`Xóa thất bại: ${err.message || err}`);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)', position: 'relative' }}>
      {/* SFTP Toolbar */}
      <div style={{
        height: '46px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        gap: '12px'
      }}>
        {/* Navigation & Address Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <button
            className="btn-secondary"
            onClick={handleNavigateUp}
            disabled={currentPath === '/'}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Lên thư mục cha"
          >
            <ArrowUp size={15} />
          </button>

          <button
            className="btn-secondary"
            onClick={() => loadDirectory(currentPath)}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            title="Tải lại danh sách"
          >
            <RefreshCw size={15} />
          </button>

          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 10px',
            fontSize: '0.82rem',
            color: 'var(--text-main)',
            fontFamily: 'var(--font-mono)'
          }}>
            <HardDrive size={14} style={{ color: 'var(--accent-primary)', marginRight: '8px' }} />
            <span>{currentPath}</span>
          </div>
        </div>

        {/* File Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {error && (
            <button
              onClick={() => setIsReAuthOpen(true)}
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-warning)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '4px',
                padding: '6px 10px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <KeyRound size={14} />
              <span>Đổi Mật Khẩu</span>
            </button>
          )}

          <button
            className="btn-primary"
            onClick={handleUpload}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <Upload size={15} />
            <span>Upload File</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleDownload}
            disabled={!selectedFile || selectedFile.type === 'd'}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <Download size={15} />
            <span>Download</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleMkdir}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <FolderPlus size={15} />
            <span>Tạo Thư Mục</span>
          </button>

          <button
            className="btn-danger"
            onClick={handleDelete}
            disabled={!selectedFile}
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Error Bar */}
      {error && (
        <div style={{
          padding: '8px 16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--accent-danger)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>⚠️ {error}</span>
          <button
            onClick={() => setIsReAuthOpen(true)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
          >
            Nhập lại mật khẩu
          </button>
        </div>
      )}

      {/* Main File Explorer Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Đang kết nối và tải thông tin SFTP...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Tên Tệp Tin / Thư Mục</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, width: '120px' }}>Kích Thước</th>
                <th style={{ padding: '8px 12px', fontWeight: 600, width: '160px' }}>Ngày Cập Nhật</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => {
                const isSelected = selectedFile?.name === file.name;
                const isFolder = file.type === 'd';

                return (
                  <tr
                    key={file.name}
                    onClick={() => handleItemClick(file)}
                    onDoubleClick={() => handleItemDoubleClick(file)}
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-glow)' : 'transparent',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-main)'
                    }}
                  >
                    <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isFolder ? (
                        <Folder size={16} style={{ color: 'var(--accent-warning)' }} />
                      ) : (
                        <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                      )}
                      <span style={{ fontWeight: isFolder ? 500 : 400 }}>{file.name}</span>
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {isFolder ? '--' : formatSize(file.size)}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                      {new Date(file.modifyTime * 1000).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Floating Transfer Progress Card */}
      {transferProgress && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '360px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {transferProgress.percentage >= 100 ? (
                <CheckCircle size={18} style={{ color: 'var(--accent-success)' }} />
              ) : transferProgress.type === 'upload' ? (
                <Upload size={18} style={{ color: 'var(--accent-primary)' }} />
              ) : (
                <Download size={18} style={{ color: 'var(--accent-warning)' }} />
              )}
              <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {transferProgress.percentage >= 100
                  ? `Hoàn tất: ${transferProgress.fileName}`
                  : `Đang ${transferProgress.type === 'upload' ? 'Upload' : 'Download'}: ${transferProgress.fileName}`}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: transferProgress.percentage >= 100 ? 'var(--accent-success)' : 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
              {transferProgress.percentage}%
            </span>
          </div>

          {/* Progress Bar Track */}
          <div style={{
            height: '8px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, Math.max(0, transferProgress.percentage))}%`,
              backgroundColor: transferProgress.percentage >= 100 ? 'var(--accent-success)' : 'var(--accent-primary)',
              transition: 'width 0.2s ease',
              borderRadius: '4px'
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>
              {transferProgress.total > 100
                ? `${formatSize(transferProgress.transferred)} / ${formatSize(transferProgress.total)}`
                : `${transferProgress.percentage}%`}
            </span>
            <span>{transferProgress.percentage >= 100 ? 'Thành công' : 'Đang xử lý...'}</span>
          </div>
        </div>
      )}

      {/* ReAuth Password Modal */}
      <ReAuthModal
        isOpen={isReAuthOpen}
        server={currentServer}
        errorMsg={error || 'Xác thực SFTP thất bại'}
        onRetry={handleRetryAuth}
        onClose={() => setIsReAuthOpen(false)}
      />
    </div>
  );
};
