import React, { useState, useEffect } from 'react';
import { PasswordEntry } from '../types';
import { Plus, Search, Edit2, Trash2, Copy, Eye, EyeOff, KeyRound, ExternalLink, RefreshCw, Check } from 'lucide-react';

import { TerminalSettings } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface PasswordManagerProps {
  passwords: PasswordEntry[];
  onSavePassword: (pw: PasswordEntry) => void;
  onDeletePassword: (id: string) => void;
  settings?: TerminalSettings;
}

export const PasswordManager: React.FC<PasswordManagerProps> = ({ passwords, onSavePassword, onDeletePassword, settings }) => {
  const { t } = useTranslation(settings);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<PasswordEntry>>({});
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Password Generator States
  const [genLength, setGenLength] = useState(16);
  const [genUppercase, setGenUppercase] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);

  const filteredPasswords = passwords.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.url && p.url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const generatePassword = () => {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const syms = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let chars = lower;
    if (genUppercase) chars += upper;
    if (genNumbers) chars += nums;
    if (genSymbols) chars += syms;

    let result = '';
    for (let i = 0; i < genLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password: result });
  };

  const handleOpenModal = (pw?: PasswordEntry) => {
    if (pw) {
      setFormData(pw);
      setEditingId(pw.id);
    } else {
      setFormData({
        title: '',
        username: '',
        password: '',
        url: '',
        notes: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.username || !formData.password) {
      alert('Vui lòng nhập Tiêu đề, Tên đăng nhập và Mật khẩu.');
      return;
    }

    const now = Date.now();
    const entry: PasswordEntry = {
      id: editingId || crypto.randomUUID(),
      title: formData.title,
      username: formData.username,
      password: formData.password,
      url: formData.url,
      notes: formData.notes,
      createdAt: formData.createdAt || now,
      updatedAt: now,
    };

    onSavePassword(entry);
    setIsModalOpen(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-main)', backgroundColor: 'var(--bg-primary)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
            <KeyRound size={20} style={{ color: 'var(--accent-primary)' }} />
            {t('pwManagerTitle')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            {t('pwManagerSubtitle')}
          </p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> {t('addPassword')}
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px', width: '300px' }}>
        <input
          type="text"
          className="input-field"
          placeholder={t('searchPasswords')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '36px' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredPasswords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            {t('noPasswordsFound')}
          </div>
        ) : (
          filteredPasswords.map(pw => (
            <div key={pw.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {pw.title}
                  {pw.url && (
                    <a href={pw.url.startsWith('http') ? pw.url : `https://${pw.url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-dim)', display: 'inline-flex' }}>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span><strong style={{ color: 'var(--text-dim)' }}>User:</strong> {pw.username}</span>
                  <button 
                    onClick={() => handleCopy(pw.username, pw.id + '_user')} 
                    style={{ background: 'none', border: 'none', color: copiedId === pw.id + '_user' ? 'var(--accent-success)' : 'var(--accent-primary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedId === pw.id + '_user' ? <Check size={14} /> : <Copy size={14} />} Copy
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <span><strong style={{ color: 'var(--text-dim)' }}>Pass:</strong> {showPasswordMap[pw.id] ? pw.password : '••••••••'}</span>
                  <button 
                    onClick={() => setShowPasswordMap(prev => ({ ...prev, [pw.id]: !prev[pw.id] }))} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '2px' }}
                  >
                    {showPasswordMap[pw.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button 
                    onClick={() => handleCopy(pw.password, pw.id + '_pass')} 
                    style={{ background: 'none', border: 'none', color: copiedId === pw.id + '_pass' ? 'var(--accent-success)' : 'var(--accent-primary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedId === pw.id + '_pass' ? <Check size={14} /> : <Copy size={14} />} Copy
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => handleOpenModal(pw)} style={{ padding: '6px' }} title="Sửa">
                  <Edit2 size={16} />
                </button>
                <button className="btn-secondary" onClick={() => { if(confirm('Xóa mật khẩu này?')) onDeletePassword(pw.id); }} style={{ padding: '6px', color: 'var(--accent-danger)' }} title="Xóa">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '480px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingId ? 'Sửa Mật Khẩu' : 'Thêm Mật Khẩu'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '70vh' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Tiêu đề <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                <input type="text" className="input-field" placeholder="VD: Github, Facebook" value={formData.title || ''} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Tên đăng nhập / Email <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                <input type="text" className="input-field" placeholder="admin@domain.com" value={formData.username || ''} onChange={(e) => setFormData({...formData, username: e.target.value})} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Mật khẩu <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type={showPasswordMap['modal'] ? 'text' : 'password'} className="input-field" placeholder="Mật khẩu" value={formData.password || ''} onChange={(e) => setFormData({...formData, password: e.target.value})} style={{ flex: 1 }} />
                  <button className="btn-secondary" onClick={() => setShowPasswordMap(prev => ({ ...prev, 'modal': !prev['modal'] }))} style={{ padding: '0 12px' }}>
                    {showPasswordMap['modal'] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Generator Section */}
              <div style={{ padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px', color: 'var(--text-main)' }}>Trình Sinh Mật Khẩu</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', minWidth: '60px' }}>Độ dài: {genLength}</span>
                  <input type="range" min="8" max="64" value={genLength} onChange={(e) => setGenLength(parseInt(e.target.value))} style={{ flex: 1 }} />
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={genUppercase} onChange={(e) => setGenUppercase(e.target.checked)} /> A-Z</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} /> 0-9</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} /> @#$</label>
                </div>
                <button className="btn-secondary" onClick={generatePassword} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <RefreshCw size={14} /> Sinh mật khẩu tự động
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Đường dẫn (URL)</label>
                <input type="text" className="input-field" placeholder="https://" value={formData.url || ''} onChange={(e) => setFormData({...formData, url: e.target.value})} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Ghi chú</label>
                <textarea className="input-field" placeholder="Ghi chú thêm..." value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-tertiary)' }}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
              <button className="btn-primary" onClick={handleSave}>Lưu Mật Khẩu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
