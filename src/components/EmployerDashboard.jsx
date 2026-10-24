import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User, Camera, Trash2, Save, LogOut, Users, Building2, MessageSquare } from 'lucide-react';
import gsap from 'gsap';
import MusiciansDirectory from './MusiciansDirectory';
import ChatPage from './ChatPage';
import styles from './EmployerDashboard.module.css';
import API from '../api';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

export default function EmployerDashboard({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);

  const getCurrentTab = () => {
    if (location.pathname.includes('/chat')) return 'chat';
    if (location.pathname.includes('/profile')) return 'profile';
    return 'directory';
  };

  const activeTab = getCurrentTab();
  const [hasUnread, setHasUnread] = useState(false);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [previewAvatar, setPreviewAvatar] = useState(currentUser.avatar ? `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${currentUser.avatar}?t=${new Date().getTime()}` : null);
  const [loadingBio, setLoadingBio] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  // 🎬 إضافة حركة ظهور انسيابية بـ GSAP عند التنقل بين الـ Routes
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
        }
      );
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const sendGlobalPing = async () => {
      try {
        await fetch(`${API_URL}/chat/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (err) {
        console.error('خطأ في إرسال نبضة النشاط:', err);
      }
    };

    sendGlobalPing();
    const interval = setInterval(sendGlobalPing, 20000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const checkUnreadMessages = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/unread-count/${currentUser.id}`);
      const data = await res.json();
      setHasUnread(data.unreadCount > 0);
    } catch (err) {
      console.error('خطأ في فحص الرسائل غير المقروءة:', err);
    }
  };

  useEffect(() => {
    checkUnreadMessages();
    const interval = setInterval(checkUnreadMessages, 4000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const handleLogout = async () => {
    if (!window.confirm('هل تريد تسجيل الخروج؟')) return;
    try {
      await fetch(`${API_URL}/chat/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
    } catch (err) {
      console.error('خطأ أثناء تسجيل الخروج:', err);
    } finally {
      localStorage.removeItem('syrian_musicians_user');
      setCurrentUser(null);
    }
  };

  const handleSaveBio = async () => {
    setLoadingBio(true);
    const formData = new FormData();
    formData.append('bio', bio);
    try {
      const res = await fetch(`${API_URL}/profile/${currentUser.id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (res.ok) {
        alert('تم تحديث السيرة الذاتية بنجاح! ✨');
        setCurrentUser(data.user);
        localStorage.setItem('syrian_musicians_user', JSON.stringify(data.user));
      } else { alert(data.error); }
    } catch (err) { alert('حدث خطأ أثناء حفظ السيرة الذاتية'); }
    finally { setLoadingBio(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !window.confirm('هل تريد تغيير الصورة الشخصية؟')) return;
    setLoadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('bio', bio);
    try {
      const res = await fetch(`${API_URL}/profile/${currentUser.id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (res.ok) {
        alert('تم تحديث الصورة الشخصية بنجاح! 📸');
        setCurrentUser(data.user);
        localStorage.setItem('syrian_musicians_user', JSON.stringify(data.user));
        if (data.user.avatar) setPreviewAvatar(`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${data.user.avatar}?t=${new Date().getTime()}`);
      } else { alert(data.error); }
    } catch (err) { alert('حدث خطأ أثناء رفع الصورة'); }
    finally { setLoadingAvatar(false); }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('هل أنت متأكد من إزالة الصورة الشخصية؟')) return;
    setLoadingAvatar(true);
    const formData = new FormData();
    formData.append('removeAvatar', 'true');
    formData.append('bio', bio);
    try {
      const res = await fetch(`${API_URL}/profile/${currentUser.id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (res.ok) {
        alert('تم إزالة الصورة الشخصية بنجاح!');
        setCurrentUser(data.user);
        localStorage.setItem('syrian_musicians_user', JSON.stringify(data.user));
        setPreviewAvatar(null);
      } else { alert(data.error); }
    } catch (err) { alert('حدث خطأ أثناء إزالة الصورة'); }
    finally { setLoadingAvatar(false); }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}><Building2 size={22} color="#070709" /></div>
          <div>
            <h1 className={styles.logoTitle}>موسيقيين سوريا</h1>
            <span className={styles.logoSubtitle}>المطاعم ومتعهدو الحفلات</span>
          </div>
        </div>

        {/* 🎯 الترتيب الجديد من اليمين إلى اليسار: تعديل الملف الشخصي 👈 تصفح العازفين 👈 المحادثات */}
        <div className={styles.tabBar}>
          <button className={activeTab === 'profile' ? styles.activeTabBtn : styles.tabBtn} onClick={() => navigate('/profile')}>
            <User size={16} /> تعديل الملف الشخصي
          </button>

          <button className={activeTab === 'directory' ? styles.activeTabBtn : styles.tabBtn} onClick={() => navigate('/directory')}>
            <Users size={16} /> تصفح العازفين
          </button>
          
          <button 
            className={activeTab === 'chat' ? styles.activeTabBtn : styles.tabBtn} 
            onClick={() => {
              navigate('/chat');
              setHasUnread(false);
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} />
              <span>المحادثات</span>
              {hasUnread && <span className={styles.redDot} />}
            </div>
          </button>
        </div>

        <div className={styles.userBar}>
          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>👋 {currentUser.full_name}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}><LogOut size={16} /> خروج</button>
        </div>
      </header>

      <main style={{ padding: '20px' }}>
        <div ref={cardRef}>
          <Routes>
            <Route path="/" element={<Navigate to="/directory" replace />} />
            <Route 
              path="/directory" 
              element={
                <MusiciansDirectory 
                  currentUser={currentUser} 
                  onStartChat={(convId) => navigate(`/chat?convId=${convId}`)} 
                />
              } 
            />
            <Route path="/chat" element={<ChatPage currentUser={currentUser} />} />
            <Route path="/profile" element={
              <div className={styles.card}>
                <h2 className={styles.title}>تعديل الملف الشخصي</h2>

                <div className={styles.avatarSection}>
                  <div className={styles.avatarWrapper}>
                    {previewAvatar ? (
                      <img src={previewAvatar} alt="Avatar" className={styles.avatarImg} />
                    ) : (
                      <User size={50} color="#f59e0b" />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label className={styles.uploadBtn}>
                      <Camera size={16} /> {loadingAvatar ? 'جاري التحديث...' : 'تغيير الصورة الشخصية'}
                      <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={loadingAvatar} hidden />
                    </label>
                    {previewAvatar && (
                      <button type="button" className={styles.removeBtn} onClick={handleRemoveAvatar} disabled={loadingAvatar}>
                        <Trash2 size={16} /> إزالة الصورة
                      </button>
                    )}
                  </div>
                </div>

                <hr className={styles.divider} />

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>السيرة الذاتية والموسيقية (Bio):</label>
                  <textarea
                    rows="4"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="اكتب نبذة عن المطعم أو المنشأة، ويمكنك إضافة رابط الفيسبوك أو الإنستغرام هنا..."
                    className={styles.textarea}
                  />
                  <button className={styles.saveBioBtn} onClick={handleSaveBio} disabled={loadingBio}>
                    <Save size={16} /> {loadingBio ? 'جاري الحفظ...' : 'حفظ السيرة'}
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </main>
    </div>
  );
}