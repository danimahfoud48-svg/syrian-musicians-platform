import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { User, Camera, Trash2, Save, Send, Music, LogOut, Users, UserCheck, Plus, Film, MessageSquare } from 'lucide-react';
import gsap from 'gsap';
import MusiciansDirectory from './MusiciansDirectory';
import VideosManager from './VideosManager';
import ChatPage from './ChatPage';
import styles from './MusicianDashboard.module.css';
import API from '../api';
import { fileUrl } from '../fileUrl';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const AVAILABLE_INSTRUMENTS = [
  'عود', 'قانون', 'ناي', 'كمان', 'كلارينيت', 'بيانو', 'أورغ', 'إيقاع / طبلة', 'جيتار', 'تشيلو'
];

export default function MusicianDashboard({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);

  const getCurrentTab = () => {
    if (location.pathname.includes('/videos')) return 'videos';
    if (location.pathname.includes('/directory')) return 'directory';
    if (location.pathname.includes('/chat')) return 'chat';
    return 'profile';
  };

  const activeTab = getCurrentTab();
  const [hasUnread, setHasUnread] = useState(false);
  const [bio, setBio] = useState(currentUser.bio || '');
  const [previewAvatar, setPreviewAvatar] = useState(currentUser.avatar ? `${fileUrl(currentUser.avatar)}?t=${new Date().getTime()}` : null);
  const [loadingBio, setLoadingBio] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);
  const [selectedNewInstrument, setSelectedNewInstrument] = useState('');
  const [newAttachment, setNewAttachment] = useState(null);
  const [loadingInstrument, setLoadingInstrument] = useState(false);

  // 🎬 إضافة حركة GSAP انسيابية عند التنقل بين التبويبات والصفحات
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
      console.error(err);
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
    if (!file || !window.confirm('هل تريد بالتأكيد تعيين هذه الصورة كصورة شخصية جديدة؟')) return;
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
        if (data.user.avatar) setPreviewAvatar(`${fileUrl(data.user.avatar)}?t=${new Date().getTime()}`);
      } else { alert(data.error); }
    } catch (err) { alert('حدث خطأ أثناء رفع الصورة'); }
    finally { setLoadingAvatar(false); }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('هل أنت متأكد من إزالة صورتك الشخصية؟')) return;
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

  const handleSendInstrumentForReview = async () => {
    if (!selectedNewInstrument) return alert('الرجاء اختيار آلة موسيقية!');
    if (!newAttachment) return alert('يجب إرفاق فيديو أو وثيقة إثبات!');
    setLoadingInstrument(true);
    const formData = new FormData();
    formData.append('bio', bio);
    formData.append('instruments', selectedNewInstrument);
    formData.append('instrumentsChanged', 'true');
    formData.append('newAttachment', newAttachment);
    try {
      const res = await fetch(`${API_URL}/profile/${currentUser.id}`, { method: 'PUT', body: formData });
      const data = await res.json();
      if (res.ok) {
        alert('تم إرسال طلب إضافة الآلة الجديدة للأدمن! 🎷');
        setCurrentUser(data.user);
        localStorage.setItem('syrian_musicians_user', JSON.stringify(data.user));
        setSelectedNewInstrument('');
        setNewAttachment(null);
      } else { alert(data.error); }
    } catch (err) { alert('حدث خطأ أثناء إرسال الطلب'); }
    finally { setLoadingInstrument(false); }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}><Music size={22} color="#070709" /></div>
          <div>
            <h1 className={styles.logoTitle}>موسيقيين سوريا</h1>
            <span className={styles.logoSubtitle}>(عازف / مايسترو)</span>
          </div>
        </div>

        <div className={styles.tabBar}>
          <button className={activeTab === 'profile' ? styles.activeTabBtn : styles.tabBtn} onClick={() => navigate('/profile')}>
            <UserCheck size={16} /> ملفي الشخصي
          </button>
          <button className={activeTab === 'videos' ? styles.activeTabBtn : styles.tabBtn} onClick={() => navigate('/videos')}>
            <Film size={16} /> معرض الفيديوهات
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
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="/profile" element={
              <div className={styles.card}>
                <h2 className={styles.title}>تعديل الملف الشخصي</h2>
                <div className={styles.avatarSection}>
                  <div className={styles.avatarWrapper}>
                    {previewAvatar ? <img src={previewAvatar} alt="Avatar" className={styles.avatarImg} /> : <User size={50} color="#f59e0b" />}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label className={styles.uploadBtn}>
                      <Camera size={16} /> {loadingAvatar ? 'جاري التحديث...' : 'تغيير الصورة'}
                      <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={loadingAvatar} hidden />
                    </label>
                    {previewAvatar && (
                      <button type="button" className={styles.removeBtn} onClick={handleRemoveAvatar} disabled={loadingAvatar}>
                        <Trash2 size={16} /> إزالة
                      </button>
                    )}
                  </div>
                </div>
                <hr className={styles.divider} />
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>السيرة الذاتية والموسيقية (Bio):</label>
                  <textarea rows="4" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="نبذة عن مسيرتك الموسيقية..." className={styles.textarea} />
                  <button className={styles.saveBioBtn} onClick={handleSaveBio} disabled={loadingBio}><Save size={16} /> حفظ السيرة</button>
                </div>
                <hr className={styles.divider} />
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>الآلات الحالية المعتمدة:</label>
                  <div className={styles.currentInstrumentsBadge}>🎵 {currentUser.instruments || 'لا توجد آلات مسجلة'}</div>
                </div>
                <div className={styles.instrumentsBox}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '10px' }}>
                    <Plus size={18} /> <h3 style={{ margin: 0, fontSize: '1rem' }}>طلب إضافة آلة جديدة</h3>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>اختر الآلة:</label>
                    <select value={selectedNewInstrument} onChange={(e) => setSelectedNewInstrument(e.target.value)} className={styles.select}>
                      <option value="">-- اختر آلة --</option>
                      {AVAILABLE_INSTRUMENTS.map((inst, i) => <option key={i} value={inst}>{inst}</option>)}
                    </select>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>فيديو / وثيقة إثبات:</label>
                    <input type="file" onChange={(e) => setNewAttachment(e.target.files[0])} className={styles.fileInput} />
                  </div>
                  <button className={styles.sendReviewBtn} onClick={handleSendInstrumentForReview} disabled={loadingInstrument}>
                    <Send size={16} /> إرسال الطلب للأدمن
                  </button>
                </div>
              </div>
            } />
            <Route path="/videos" element={<div style={{ maxWidth: '800px', margin: '0 auto' }}><VideosManager API_URL={API_URL} currentUser={currentUser} /></div>} />
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
          </Routes>
        </div>
      </main>
    </div>
  );
}