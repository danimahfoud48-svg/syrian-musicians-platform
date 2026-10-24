import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Film, MessageSquare, X, Music } from 'lucide-react';
import styles from './MusiciansDirectory.module.css';
import API from '../api';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

export default function MusiciansDirectory({ currentUser }) {
  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedProfile, setSelectedProfile] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/profile/public/list`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProfiles(data);
      })
      .catch((err) => console.error('خطأ في جلب الدليل:', err));
  }, []);

  // 🎯 تصفية صريحة ونظيفة 100% مبنية على الـ Role القياسي
  const filteredProfiles = profiles.filter((p) => {
    if (p.role === 'admin' || (currentUser && String(p.id) === String(currentUser.id))) {
      return false;
    }

    const matchesSearch =
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.instruments?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.bio?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      selectedRole === 'all' ||
      p.role?.toLowerCase() === selectedRole.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const handleStartChat = (profileId) => {
    navigate(`/chat?convId=${profileId}`);
  };

  return (
    <div className={styles.directoryContainer}>
      <div className={styles.directoryHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.4rem' }}>
            <Music size={24} color="#f59e0b" /> دليل أعضاء منصة موسيقيين سوريا 🎵
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div className={styles.searchBox} style={{ flex: 1, minWidth: '220px' }}>
            <Search size={16} color="#9ca3af" />
            <input
              type="text"
              placeholder="ابحث بالاسم، الآلة، أو التفاصيل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{
              backgroundColor: '#070709',
              color: '#fff',
              border: '1px solid #272732',
              borderRadius: '12px',
              padding: '10px 16px',
              outline: 'none',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            <option value="all">جميع الفئات والأقسام</option>
            <option value="musician">عازف</option>
            <option value="maestro">مايسترو / فرقة</option>
            <option value="restaurant">مطعم</option>
            <option value="organizer">متعهد / منظم حفلات</option>
          </select>
        </div>
      </div>

      {filteredProfiles.length === 0 ? (
        <div className={styles.emptyDirectory} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
          <p>لا توجد نتائج مطابقة لبحثك في الدليل.</p>
        </div>
      ) : (
        <div className={styles.musiciansGrid}>
          {filteredProfiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => setSelectedProfile(profile)}
              className={styles.musicianCard}
            >
              <div className={styles.cardHeader}>
                <div className={styles.avatarWrapper}>
                  {profile.avatar ? (
                    <img src={`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${profile.avatar}`} alt={profile.full_name} className={styles.avatarImg} />
                  ) : (
                    <User size={26} color="#facc15" />
                  )}
                </div>
                <div>
                  <h3 className={styles.musicianName}>{profile.full_name}</h3>
                  <span className={styles.musicianInstrument}>
                    {profile.role === 'restaurant' && 'مطعم سياحي'}
                    {profile.role === 'organizer' && 'متعهد حفلات'}
                    {profile.role === 'maestro' && 'مايسترو / فرقة موسيقية'}
                    {profile.role === 'musician' && (profile.instruments || 'عازف محترف')}
                  </span>
                </div>
              </div>

              <p className={styles.musicianBio}>
                {profile.bio || 'لا توجد نبذة تعريفية مضافة...'}
              </p>

              <div className={styles.cardFooter}>
                <span style={{ fontSize: '0.78rem', padding: '4px 10px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  {profile.role === 'restaurant' && 'مطعم'}
                  {profile.role === 'organizer' && 'متعهد'}
                  {profile.role === 'maestro' && 'مايسترو'}
                  {profile.role === 'musician' && 'عازف'}
                </span>

                <button className={styles.viewProfileBtn}>عرض الملف الشخصي</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProfile && (
        <ProfileModal 
          profileId={selectedProfile.id} 
          currentUser={currentUser} 
          onClose={() => setSelectedProfile(null)} 
          onStartChat={handleStartChat} 
        />
      )}
    </div>
  );
}

function ProfileModal({ profileId, currentUser, onClose, onStartChat }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/profile/public/${profileId}`)
      .then((res) => res.json())
      .then((result) => {
        if (result && result.musician) setData(result);
      })
      .catch((err) => console.error('خطأ في جلب التفاصيل:', err));
  }, [profileId]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeModalBtn}>
          <X size={18} />
        </button>

        {!data ? (
          <p style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>جاري تحميل البيانات...</p>
        ) : (
          <>
            <div className={styles.modalHeader}>
              <div className={styles.modalAvatarWrapper}>
                {data.musician.avatar ? (
                  <img src={`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${data.musician.avatar}`} alt={data.musician.full_name} className={styles.avatarImg} />
                ) : (
                  <User size={30} color="#facc15" />
                )}
              </div>
              <div>
                <h3 className={styles.modalName}>{data.musician.full_name}</h3>
                <span className={styles.modalInstrument}>
                  {data.musician.instruments || data.musician.role}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '8px' }}>النبذة التعريفية:</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }}>
                {data.musician.bio || 'لم يتم إضافة نبذة تعريفية.'}
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Film size={16} color="#facc15" /> الفيديوهات ومعرض الأعمال:
              </h4>
              {!data.videos || data.videos.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>لا توجد فيديوهات مرفوعة حتى الآن.</p>
              ) : (
                <div className={styles.modalVideosGrid}>
                  {data.videos.map((vid) => (
                    <div key={vid.id} className={styles.modalVideoCard}>
                      <video controls src={`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${vid.video_url}`} className={styles.modalVideoPlayer} />
                      <p className={styles.modalVideoTitle}>{vid.title || 'فيديو'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {currentUser && currentUser.id !== data.musician.id && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #27272a', paddingTop: '15px' }}>
                <button onClick={() => onStartChat(data.musician.id)} className={styles.startChatBtn}>
                  <MessageSquare size={16} /> تواصل عبر المحادثة المباشرة
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}