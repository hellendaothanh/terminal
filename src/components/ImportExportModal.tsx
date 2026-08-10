import React, { useState } from 'react';
import { VaultData } from '../types';
import { ArrowUpDown, Download, Upload, FileText, Check, X, AlertCircle } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  vaultData: VaultData;
  onImportVaultData: (data: VaultData) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  vaultData,
  onImportVaultData
}) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportJSON = async () => {
    try {
      const jsonStr = JSON.stringify(vaultData, null, 2);
      const success = await window.api.saveFileDialog('omni_servers_backup.json', jsonStr);
      if (success) {
        setStatusMessage('Xuất danh sách máy chủ thành công!');
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất dữ liệu: ${err.message}`);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = 'ID,Name,Host,Port,Protocol,Username,Environment,Tags\n';
      const rows = vaultData.servers
        .map((s) => `"${s.id}","${s.name}","${s.host}",${s.port},"${s.protocol}","${s.username}","${s.environment}","${(s.tags || []).join(';')}"`)
        .join('\n');
      const csvStr = headers + rows;
      const success = await window.api.saveFileDialog('omni_servers.csv', csvStr);
      if (success) {
        setStatusMessage('Xuất CSV thành công!');
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi xuất CSV: ${err.message}`);
    }
  };

  const handleImportJSON = async () => {
    try {
      const file = await window.api.openFileDialog();
      if (file) {
        const importedData: VaultData = JSON.parse(file.content);
        if (Array.isArray(importedData.servers)) {
          onImportVaultData(importedData);
          setStatusMessage('Nhập dữ liệu thành công!');
        } else {
          setStatusMessage('Cấu trúc file JSON không hợp lệ.');
        }
      }
    } catch (err: any) {
      setStatusMessage(`Lỗi đọc file: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ArrowUpDown size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Xuất / Nhập Cấu Hình Máy Chủ & Kho Khóa
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {statusMessage && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-primary)',
              fontSize: '0.85rem'
            }}>
              {statusMessage}
            </div>
          )}

          {/* Export Options */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} style={{ color: 'var(--accent-success)' }} />
              Xuất Cấu Hình (Export Backup)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Lưu trữ danh sách máy chủ ({vaultData.servers.length} server) và SSH keys ra file để dễ dàng đồng bộ sang máy tính khác.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" onClick={handleExportJSON} style={{ flex: 1, justifyContent: 'center' }}>
                <FileText size={15} />
                <span>Xuất JSON (Đầy đủ)</span>
              </button>
              <button className="btn-secondary" onClick={handleExportCSV} style={{ flex: 1, justifyContent: 'center' }}>
                <FileText size={15} />
                <span>Xuất CSV (Bảng tính)</span>
              </button>
            </div>
          </div>

          {/* Import Options */}
          <div style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={16} style={{ color: 'var(--accent-warning)' }} />
              Nhập Cấu Hình (Import Backup)
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Khôi phục danh sách máy chủ từ file sao lưu JSON.
            </p>
            <button className="btn-secondary" onClick={handleImportJSON} style={{ width: '100%', justifyContent: 'center' }}>
              <Upload size={15} />
              <span>Chọn File JSON Để Nhập Dữ Liệu</span>
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};
