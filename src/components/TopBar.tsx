import React from 'react';
import {
  Search,
  Key,
  ArrowUpDown,
  Settings,
  Lock,
  Plus,
  Terminal,
  Sparkles
} from 'lucide-react';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenKeyManager: () => void;
  onOpenImportExport: () => void;
  onOpenSettings: () => void;
  onAddServer: () => void;
  onLockVault: () => void;
  onToggleAI?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenKeyManager,
  onOpenImportExport,
  onOpenSettings,
  onAddServer,
  onLockVault,
  onToggleAI
}) => {
  return (
    <div
      style={{
        height: '52px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '80px', // Reserved space for macOS native traffic light buttons (Red/Yellow/Green)
        paddingRight: '16px',
        gap: '16px',
        userSelect: 'none',
        WebkitAppRegion: 'drag'
      } as any}
    >
      {/* Left Section: Brand Logo + Search Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          WebkitAppRegion: 'no-drag'
        } as any}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} style={{ color: 'var(--accent-primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
            OmniTerminal
          </span>
        </div>

        {/* Search Input Box */}
        <div style={{ position: 'relative', width: '300px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Tìm kiếm nhanh theo Tên, IP, Username, Tag..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ paddingLeft: '36px', height: '34px', fontSize: '0.82rem' }}
          />
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right Section: Toolbar Quick Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          WebkitAppRegion: 'no-drag'
        } as any}
      >
        <button
          className="btn-secondary"
          onClick={onToggleAI}
          style={{
            height: '34px',
            fontSize: '0.8rem',
            backgroundColor: 'rgba(168, 85, 247, 0.15)',
            color: '#c084fc',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}
          title="Bật / Tắt Trợ Lý AI"
        >
          <Sparkles size={15} />
          <span>Trợ Lý AI</span>
        </button>

        <button
          className="btn-primary"
          onClick={onAddServer}
          style={{ height: '34px', fontSize: '0.8rem' }}
        >
          <Plus size={15} />
          <span>Thêm Server</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenKeyManager}
          style={{ height: '34px', fontSize: '0.8rem' }}
          title="Quản lý SSH Key (Tạo cặp khóa RSA/Ed25519)"
        >
          <Key size={15} />
          <span>SSH Keys</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenImportExport}
          style={{ height: '34px', fontSize: '0.8rem' }}
          title="Xuất / Nhập cấu hình mã hóa"
        >
          <ArrowUpDown size={15} />
          <span>Import/Export</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenSettings}
          style={{ height: '34px', padding: '8px', width: '34px', justifyContent: 'center' }}
          title="Cài đặt Terminal & Giao diện"
        >
          <Settings size={16} />
        </button>

        <button
          className="btn-secondary"
          onClick={onLockVault}
          style={{ height: '34px', padding: '8px', width: '34px', justifyContent: 'center', color: 'var(--accent-warning)' }}
          title="Khóa ứng dụng (Lock Vault)"
        >
          <Lock size={16} />
        </button>
      </div>
    </div>
  );
};
