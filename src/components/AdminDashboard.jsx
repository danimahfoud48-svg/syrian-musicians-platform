import React, { useState, useEffect, useRef } from 'react';
import { Music, ShieldCheck, Check, XCircle, LogOut, CheckCircle2, Trash2, FileText, ExternalLink, User, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import styles from './AdminDashboard.module.css';

const API_URL = 'http://localhost:5000/api';

export default function AdminDashboard({ currentUser, setCurrentUser }) {
  const [profilesList, setProfilesList] = useState([]);
  const cardsRef = useRef([]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  // 🎬 حركات GSAP الاحترافية للكروت عند تحميل أو تحديث البيانات
  useEffect(() => {
    if (cardsRef.current.length > 0) {
      // تنظيف المراجع الفارغة إن وجدت
      const validCards = cardsRef.current.filter(Boolean);
      gsap.fromTo(
        validCards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
        }
      );
    }
  }, [profilesList]);

  const fetchProfiles = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/profiles`);
      const data = await res.json();
      if (res.ok) setProfilesList(data);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  const handleApprove = async (id) => {
    const res = await fetch(`${API_URL}/admin/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' })
    });
    if (res.ok) { alert('تم تفعيل الحساب بنجاح! ✨'); fetchProfiles(); }
  };

  const handleApproveUpdate = async (id) => {
    const res = await fetch(`${API_URL}/admin/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approveUpdate: true })
    });
    if (res.ok) { alert('تمت الموافقة على تعديلات الآلات والبيانات الجديدة!'); fetchProfiles(); }
  };

  const handleRejectUpdate = async (id) => {
    const res = await fetch(`${API_URL}/admin/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejectUpdate: true })
    });
    if (res.ok) { 
      alert('تم رفض التعديلات الجديدة وإبقاء الحساب الأصلي كما هو دون مساس.'); 
      fetchProfiles(); 
    }
  };

  const handleReject = async (id) => {
    const res = await fetch(`${API_URL}/admin/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' })
    });
    if (res.ok) { alert('تم رفض الطلب والحساب بالكامل.'); fetchProfiles(); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('هل أنت تأكد من حذف الحساب نهائياً؟')) {
      const res = await fetch(`${API_URL}/admin/profiles/${id}`, { method: 'DELETE' });
      if (res.ok) { alert('تم حذف الحساب'); fetchProfiles(); }
    }
  };

  const nonAdminProfiles = profilesList.filter(req => req.role !== 'admin');

  const renderInstruments = (instString) => {
    if (!instString || instString.trim() === '') {
      return <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>بلا آلات أو تخصص</span>;
    }

    const list = instString.split(',').map(i => i.trim()).filter(Boolean);
    if (list.length === 0) {
      return <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>بلا آلات أو تخصص</span>;
    }

    return list.map((inst, idx) => (
      <span key={idx} className={styles.instTag}>🎵 {inst}</span>
    ));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}><Music size={22} color="#070709" /></div>
          <div>
            <h1 className={styles.logoTitle}>موسيقيين سوريا</h1>
            <span className={styles.logoSubtitle}>ADMIN DASHBOARD</span>
          </div>
        </div>
        <div className={styles.userBar}>
          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>👑 أدمن المنصة</span>
          <button className={styles.logoutBtn} onClick={() => setCurrentUser(null)}><LogOut size={16} /> خروج</button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.adminSection}>
          <div className={styles.adminHeader}>
            <ShieldCheck size={28} color="#f59e0b" />
            <div>
              <h2 style={{ margin: 0 }}>إدارة الحسابات وطلبات التعديل</h2>
              <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.88rem' }}>
                إجمالي الطلبات والحسابات: <strong style={{ color: '#f59e0b' }}>{nonAdminProfiles.length}</strong>
              </p>
            </div>
          </div>

          {nonAdminProfiles.length === 0 ? (
            <div className={styles.emptyBox}><CheckCircle2 size={38} color="#f59e0b" /><p>لا توجد طلبات معلقة</p></div>
          ) : (
            <div className={styles.adminGrid}>
              {nonAdminProfiles.map((req, index) => {
                const hasPendingUpdate = req.pending_bio !== null || req.pending_instruments !== null;
                return (
                  <div 
                    key={req.id} 
                    ref={el => cardsRef.current[index] = el}
                    className={styles.adminCard}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div className={styles.avatarCircle}>
                          {req.avatar ? (
                            <img src={`http://localhost:5000/uploads/${req.avatar}`} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <User size={22} color="#f59e0b" />
                          )}
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 2px', color: '#ffffff', fontSize: '1rem' }}>{req.full_name}</h3>
                          <span className={styles.roleTag}>
                            {req.role === 'musician' ? '🎻 عازف فردي' : req.role === 'maestro' ? '🎼 مايسترو / فرقة موسيقية' : '🏢 مطعم / متعهد'}
                          </span>
                        </div>
                      </div>

                      <p style={{ color: '#cbd5e1', fontSize: '0.82rem', margin: '0 0 8px' }}>{req.email} | {req.city}</p>
                      
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {renderInstruments(req.instruments)}
                      </div>

                      {req.bio && (
                        <div className={styles.bioBox}>
                          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.82rem' }}>{req.bio}</p>
                        </div>
                      )}

                      {hasPendingUpdate && (
                        <div className={styles.pendingUpdateBox}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 'bold', fontSize: '0.8rem' }}>
                            <AlertCircle size={15} /> طلب تعديل آلات / بيانات معلق:
                          </div>
                          {req.pending_instruments && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '6px 0' }}>
                              {renderInstruments(req.pending_instruments)}
                            </div>
                          )}
                          {req.pending_attachment && (
                            <a href={`http://localhost:5000/uploads/${req.pending_attachment}`} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
                              <FileText size={12} /> معاينة فيديو الآلة الجديد <ExternalLink size={10} />
                            </a>
                          )}
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                            <button className={styles.approveUpdateBtn} onClick={() => handleApproveUpdate(req.id)}>
                              <Check size={13} /> قبول التعديلات
                            </button>
                            <button className={styles.rejectUpdateBtn} onClick={() => handleRejectUpdate(req.id)}>
                              <XCircle size={13} /> رفض التعديلات
                            </button>
                          </div>
                        </div>
                      )}

                      {req.attachment && !hasPendingUpdate && (
                        <div style={{ margin: '10px 0' }}>
                          <a href={`http://localhost:5000/uploads/${req.attachment}`} target="_blank" rel="noopener noreferrer" className={styles.attachmentLink}>
                            <FileText size={14} /> عرض الفيديو الإثبات <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #23232b', paddingTop: '10px' }}>
                      <span style={{ fontSize: '0.75rem', color: req.status === 'approved' ? '#22c55e' : '#f59e0b', fontWeight: 'bold' }}>
                        {req.status ? req.status.toUpperCase() : 'PENDING'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(!req.status || req.status === 'pending') && (
                          <button className={styles.approveBtn} onClick={() => handleApprove(req.id)}>
                            <Check size={13} /> قبول الحساب
                          </button>
                        )}
                        <button className={styles.rejectBtn} onClick={() => handleReject(req.id)}>
                          <XCircle size={13} /> حظر/رفض
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDelete(req.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}