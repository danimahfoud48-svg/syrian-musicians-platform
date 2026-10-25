import React, { useState } from 'react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// شاشة "نسيت كلمة السر": المستخدم بيكتب إيميله، والطلب بيوصل للأدمن بلوحته
export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setMessage(data.message);
      } else {
        setError(data.error || 'حدث خطأ، حاول مرة أخرى');
      }
    } catch (err) {
      setError('تعذر الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: '#070709',
    border: '1px solid #272732',
    borderRadius: '12px',
    padding: '12px 14px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    marginBottom: '12px'
  };

  const primaryBtn = {
    width: '100%',
    background: '#f59e0b',
    color: '#070709',
    border: 'none',
    borderRadius: '12px',
    padding: '12px',
    fontWeight: 'bold',
    fontSize: '0.95rem',
    cursor: 'pointer'
  };

  const linkBtn = {
    background: 'none',
    border: 'none',
    color: '#f59e0b',
    cursor: 'pointer',
    marginTop: '14px',
    fontSize: '0.9rem'
  };

  return (
    <div style={{ width: '100%', maxWidth: '380px', margin: '0 auto', color: '#fff', textAlign: 'center' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>🔑 نسيت كلمة السر؟</h2>

      {sent ? (
        <>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6 }}>{message}</p>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            الأدمن رح يتواصل معك ويعطيك كلمة سر مؤقتة، وبتغيّرها بعد أول دخول.
          </p>
        </>
      ) : (
        <>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px' }}>
            اكتب بريدك الإلكتروني، وبيوصل طلبك للأدمن.
          </p>
          {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '10px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              required
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...inputStyle, direction: 'ltr' }}
            />
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'جاري الإرسال...' : 'إرسال الطلب للأدمن'}
            </button>
          </form>
        </>
      )}

      <button type="button" onClick={onBack} style={linkBtn}>
        ← رجوع لتسجيل الدخول
      </button>
    </div>
  );
}