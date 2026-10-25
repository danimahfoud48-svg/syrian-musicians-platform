import React, { useState } from 'react';
import { authFetch } from '../authFetch';

// بطاقة تغيير كلمة السر (بتنحط بصفحة الملف الشخصي)
export default function ChangePasswordCard({ currentUser, setCurrentUser, API_URL }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const isTemporary = Number(currentUser.must_change_password) === 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage('كلمتا المرور الجديدتان غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(currentUser, `${API_URL}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setIsError(false);
        setMessage('تم تغيير كلمة السر بنجاح ✅');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        const updatedUser = { ...currentUser, must_change_password: 0 };
        setCurrentUser(updatedUser);
        localStorage.setItem('syrian_musicians_user', JSON.stringify(updatedUser));
      } else {
        setIsError(true);
        setMessage(data.error || 'حدث خطأ، حاول مرة أخرى');
      }
    } catch (err) {
      setIsError(true);
      setMessage('تعذر الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#070709',
    border: '1px solid #272732',
    borderRadius: '10px',
    padding: '10px 12px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    marginBottom: '10px',
    direction: 'ltr'
  };

  return (
    <div style={{ marginTop: '4px' }}>
      <h3 style={{ margin: '0 0 6px', color: '#f59e0b', fontSize: '1rem' }}>🔑 تغيير كلمة السر</h3>
      {isTemporary && (
        <p style={{ color: '#fcd34d', fontSize: '0.82rem', margin: '0 0 10px' }}>
          كلمة سرك الحالية مؤقتة. اكتبها بالحقل الأول، واختار كلمة سر جديدة.
        </p>
      )}

      {message && (
        <div style={{ color: isError ? '#ef4444' : '#22c55e', fontSize: '0.85rem', marginBottom: '10px' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="password"
          required
          placeholder="كلمة السر الحالية"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="كلمة السر الجديدة (6 أحرف على الأقل)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={inputStyle}
          autoComplete="new-password"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="تأكيد كلمة السر الجديدة"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
          autoComplete="new-password"
        />
        <button
          type="submit"
          disabled={loading}
          style={{ background: '#f59e0b', color: '#070709', border: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ كلمة السر'}
        </button>
      </form>
    </div>
  );
}