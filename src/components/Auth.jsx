import React, { useState } from 'react';
import { Music, User, Lock } from 'lucide-react';
import styles from './Auth.module.css';
import ForgotPassword from './ForgotPassword';

export default function Auth({ API_URL, setCurrentUser }) {
  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    role: 'musician',
    fullName: '',
    email: '',
    password: '',
    city: 'دمشق',
    attachment: null
  });

  const [selectedInstruments, setSelectedInstruments] = useState([]);

  const handleSwitchTab = (mode) => {
    setAuthMode(mode);
    setLoginForm({ email: '', password: '' });
    setRegForm({
      role: 'musician',
      fullName: '',
      email: '',
      password: '',
      city: 'دمشق',
      attachment: null
    });
    setSelectedInstruments([]);
  };

  const handleRoleChange = (newRole) => {
    setRegForm({ ...regForm, role: newRole });
    setSelectedInstruments([]); // إعادة ضبط الآلات عند تغيير الدور
  };

  const syrianCities = [
    "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", "اللاذقية", 
    "طرطوس", "إدلب", "درعا", "السويداء", "القنيطرة", "دير الزور", "الرقة", "الحسكة"
  ];

  const availableInstruments = [
    "قائد فرقة", "فرقة موسيقية تخت شرقي", "فرقة موسيقية باند غربي",
    "كلارينيت", "أورغ / كيبورد", "عود", "قانون", "كمان", 
    "ناي", "إيقاع / درامز", "بزق", "تشيلو", "غناء"
  ];

  const toggleInstrument = (inst) => {
    setSelectedInstruments((prev) => {
      if (prev.includes(inst)) {
        return prev.filter((i) => i !== inst);
      } else {
        return [...prev, inst];
      }
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطأ في تسجيل الدخول');
        setLoading(false);
        return;
      }
      setCurrentUser(data.user);
    } catch (err) {
      alert('تعذر الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!regForm.attachment) {
      alert('عذراً، إرفاق الفيديو أو وثيقة الإثبات إلزامي لإتمام التسجيل!');
      return;
    }

    const isEmployer = regForm.role === 'restaurant' || regForm.role === 'organizer';

    if (!isEmployer && selectedInstruments.length === 0) {
      alert('يرجى تحديد آلة موسيقية واحدة أو صفة (مثل قائد فرقة) على الأقل!');
      return;
    }

    setLoading(true);

    // 🎯 تحديد نص الآلات والتخصص بدقة حسب نوع الحساب
    let instrumentsString = selectedInstruments.join(', ');
    if (regForm.role === 'restaurant') {
      instrumentsString = 'مطعم';
    } else if (regForm.role === 'organizer') {
      instrumentsString = 'متعهد حفلات';
    } else if (regForm.role === 'maestro' && selectedInstruments.length === 0) {
      instrumentsString = 'مايسترو / فرقة موسيقية';
    }

    const formData = new FormData();
    formData.append('fullName', regForm.fullName);
    formData.append('email', regForm.email);
    formData.append('password', regForm.password);
    formData.append('role', regForm.role);
    formData.append('city', regForm.city);
    formData.append('bio', '');
    formData.append('instruments', instrumentsString);
    formData.append('attachment', regForm.attachment);

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطأ في التسجيل');
        setLoading(false);
        return;
      }
      alert('تم إرسال طلبك بنجاح! بانتظار مراجعة الأدمن');
      handleSwitchTab('login');
    } catch (err) {
      alert('تعذر الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  };

  const isEmployerRole = regForm.role === 'restaurant' || regForm.role === 'organizer';

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div className={styles.logoIcon}><Music size={28} color="#0a0a0c" /></div>
          <h1 style={{ color: '#fff', fontSize: '1.4rem', margin: '10px 0 4px' }}>موسيقيين سوريا</h1>
          <p style={{ color: '#facc15', fontSize: '0.8rem', fontWeight: 'bold' }}>Syrian Musicians Platform</p>
        </div>

        {authMode === 'forgot' ? (
          <ForgotPassword onBack={() => handleSwitchTab('login')} />
        ) : (
        <>
        <div className={styles.authTabs}>
          <button className={authMode === 'login' ? styles.activeTab : styles.tab} onClick={() => handleSwitchTab('login')}>تسجيل الدخول</button>
          <button className={authMode === 'register' ? styles.activeTab : styles.tab} onClick={() => handleSwitchTab('register')}>إنشاء حساب جديد</button>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className={styles.form} autoComplete="off">
            <div className={styles.inputBox}>
              <User size={18} color="#9ca3af" />
              <input 
                className={styles.input} 
                type="email" 
                placeholder="البريد الإلكتروني" 
                required 
                autoComplete="off"
                value={loginForm.email} 
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} 
              />
            </div>
            <div className={styles.inputBox}>
              <Lock size={18} color="#9ca3af" />
              <input 
                className={styles.input} 
                type="password" 
                placeholder="كلمة المرور" 
                required 
                autoComplete="new-password"
                value={loginForm.password} 
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} 
              />
            </div>
            <button type="submit" className={styles.btn} disabled={loading}>{loading ? 'جاري التحقق...' : 'دخول للمنصة'}</button>
            <button
              type="button"
              onClick={() => setAuthMode('forgot')}
              style={{ background: 'none', border: 'none', color: '#facc15', cursor: 'pointer', fontSize: '0.85rem', marginTop: '4px' }}
            >
              نسيت كلمة السر؟
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className={styles.form} autoComplete="off">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
              <button type="button" className={regForm.role === 'musician' ? styles.activeRoleBtn : styles.roleBtn} onClick={() => handleRoleChange('musician')}>🎻 عازف</button>
              <button type="button" className={regForm.role === 'maestro' ? styles.activeRoleBtn : styles.roleBtn} onClick={() => handleRoleChange('maestro')}>🎼 مايسترو / فرقة موسيقية</button>
              <button type="button" className={regForm.role === 'restaurant' ? styles.activeRoleBtn : styles.roleBtn} onClick={() => handleRoleChange('restaurant')}>🍽️ مطعم</button>
              <button type="button" className={regForm.role === 'organizer' ? styles.activeRoleBtn : styles.roleBtn} onClick={() => handleRoleChange('organizer')}>💼 متعهد حفلات</button>
            </div>

            <input 
              className={styles.inputBare} 
              type="text" 
              placeholder={regForm.role === 'restaurant' ? 'اسم المطعم أو مكان السهر' : regForm.role === 'organizer' ? 'اسم المتعهد أو الشركة' : 'الاسم الكامل أو اسم الفرقة'} 
              required 
              autoComplete="off" 
              value={regForm.fullName} 
              onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })} 
            />
            <input className={styles.inputBare} type="email" placeholder="البريد الإلكتروني" required autoComplete="off" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
            <input className={styles.inputBare} type="password" placeholder="كلمة المرور" required autoComplete="new-password" value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
            
            <select className={styles.inputBare} value={regForm.city} onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}>
              {syrianCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {!isEmployerRole && (
              <div style={{ backgroundColor: '#0a0a0c', border: '1px solid #27272a', padding: '10px', borderRadius: '10px' }}>
                <label style={{ color: '#facc15', fontSize: '0.78rem', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                  🎵 حدد الآلة أو التخصص (إلزامي):
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {availableInstruments.map(inst => {
                    const isSelected = selectedInstruments.includes(inst);
                    return (
                      <button
                        type="button"
                        key={inst}
                        onClick={() => toggleInstrument(inst)}
                        className={isSelected ? styles.selectedInstBtn : styles.instBtn}
                      >
                        {isSelected ? '✓ ' : '+ '}{inst}
                      </button>
                    );
                  })}
                </div>
                {selectedInstruments.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#22c55e', fontWeight: 'bold' }}>
                    المحدد حالياً: {selectedInstruments.join(' ، ')}
                  </div>
                )}
              </div>
            )}

            <div style={{ backgroundColor: '#0a0a0c', border: '1px solid #facc15', padding: '10px', borderRadius: '10px' }}>
              <label style={{ color: '#facc15', fontSize: '0.78rem', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                ⚠️ {isEmployerRole ? 'أرفق ترخيص المنشأة أو بطاقة الإثبات (إلزامي)' : 'أرفق فيديو عزف/حفلة للفرقة أو الآلات (فيديو/PDF إلزامي)'}
              </label>
              <input 
                type="file" 
                accept="video/*,application/pdf"
                required 
                style={{ color: '#fff', fontSize: '0.78rem' }}
                onChange={(e) => setRegForm({ ...regForm, attachment: e.target.files[0] })} 
              />
            </div>

            <button type="submit" className={styles.btn} disabled={loading}>{loading ? 'جاري رفع الملف وإرسال الطلب...' : 'إرسال الطلب'}</button>
          </form>
        )}
        </>
        )}
      </div>
    </div>
  );
}