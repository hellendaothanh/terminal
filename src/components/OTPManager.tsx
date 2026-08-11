import React, { useState, useEffect } from 'react';
import { OTPEntry } from '../types';
import { Plus, Search, Edit2, Trash2, Copy, Shield, Check } from 'lucide-react';

interface OTPManagerProps {
  otps: OTPEntry[];
  onSaveOTP: (otp: OTPEntry) => void;
  onDeleteOTP: (id: string) => void;
}

export const OTPManager: React.FC<OTPManagerProps> = ({ otps, onSaveOTP, onDeleteOTP }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<OTPEntry>>({});
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [otpValues, setOtpValues] = useState<Record<string, string>>({});

  const filteredOTPs = otps.filter(o => 
    (o.issuer && o.issuer.toLowerCase().includes(searchQuery.toLowerCase())) || 
    o.accountName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update OTP values every second via IPC
  useEffect(() => {
    const updateOTPs = async () => {
      const newValues: Record<string, string> = {};
      for (const otp of otps) {
        try {
          const res = await window.api.otpGenerate(otp.secretKey);
          newValues[otp.id] = (res.success && res.code) ? res.code : 'Error';
        } catch (e) {
          newValues[otp.id] = 'Error';
        }
      }
      setOtpValues(newValues);
      try {
        const rem = await window.api.otpTimeRemaining();
        setTimeRemaining(rem);
      } catch (e) {
        setTimeRemaining(30);
      }
    };

    updateOTPs(); // Initial calculation
    const interval = setInterval(updateOTPs, 1000);
    return () => clearInterval(interval);
  }, [otps]);

  const handleOpenModal = (otp?: OTPEntry) => {
    if (otp) {
      setFormData(otp);
      setEditingId(otp.id);
    } else {
      setFormData({
        issuer: '',
        accountName: '',
        secretKey: ''
      });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.accountName || !formData.secretKey) {
      alert('Vui lòng nhập Tên tài khoản và Secret Key.');
      return;
    }

    try {
      // Test if secret is valid via IPC
      const res = await window.api.otpGenerate(formData.secretKey.replace(/\s+/g, ''));
      if (!res.success) {
        alert('Secret Key không hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }
    } catch (e) {
      alert('Secret Key không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    const now = Date.now();
    const entry: OTPEntry = {
      id: editingId || crypto.randomUUID(),
      issuer: formData.issuer,
      accountName: formData.accountName,
      secretKey: formData.secretKey.replace(/\s+/g, ''),
      createdAt: formData.createdAt || now,
    };

    onSaveOTP(entry);
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
            <Shield size={20} style={{ color: 'var(--accent-success)' }} />
            Mã Xác Thực (OTP)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Tự động tạo mã xác thực 2 bước (TOTP).
          </p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Thêm OTP
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px', width: '300px' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Tìm kiếm dịch vụ, tài khoản..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '36px' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-dim)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredOTPs.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Không có mã OTP nào.
          </div>
        ) : (
          filteredOTPs.map(otp => {
            const code = otpValues[otp.id] || '---';
            const isDanger = timeRemaining <= 5;
            
            return (
              <div key={otp.id} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>{otp.issuer || 'Unknown Issuer'}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{otp.accountName}</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenModal(otp)} style={{ padding: '4px' }} title="Sửa">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-secondary" onClick={() => { if(confirm('Xóa mã OTP này?')) onDeleteOTP(otp.id); }} style={{ padding: '4px', color: 'var(--accent-danger)' }} title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
                  <div 
                    onClick={() => handleCopy(code, otp.id)}
                    style={{ 
                      fontSize: '2rem', 
                      fontWeight: 700, 
                      letterSpacing: '4px', 
                      color: isDanger ? 'var(--accent-danger)' : 'var(--accent-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    title="Click để Copy"
                  >
                    {code.slice(0,3)} {code.slice(3)}
                    {copiedId === otp.id && <Check size={20} style={{ color: 'var(--accent-success)' }} />}
                  </div>
                  
                  {/* Circular Timer (simplified to text for now) */}
                  <div style={{ 
                    width: '36px', height: '36px', 
                    borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isDanger ? 'var(--accent-danger)' : 'var(--accent-primary)',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    {timeRemaining}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '420px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingId ? 'Sửa OTP' : 'Thêm OTP'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Tên dịch vụ (Issuer)</label>
                <input type="text" className="input-field" placeholder="VD: Github, AWS" value={formData.issuer || ''} onChange={(e) => setFormData({...formData, issuer: e.target.value})} />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Tên tài khoản (Account) <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                <input type="text" className="input-field" placeholder="admin@domain.com" value={formData.accountName || ''} onChange={(e) => setFormData({...formData, accountName: e.target.value})} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '6px' }}>Secret Key <span style={{color: 'var(--accent-danger)'}}>*</span></label>
                <input type="text" className="input-field" placeholder="ABCD EFGH IJKL MNOP" value={formData.secretKey || ''} onChange={(e) => setFormData({...formData, secretKey: e.target.value})} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                  Secret Key thường được cung cấp dưới dạng chuỗi chữ và số (Base32).
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--bg-tertiary)' }}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
              <button className="btn-primary" onClick={handleSave}>Lưu OTP</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
