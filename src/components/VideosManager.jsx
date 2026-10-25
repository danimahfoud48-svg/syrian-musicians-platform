import React, { useState, useEffect, useRef } from 'react';
import { Upload, Film, Video } from 'lucide-react';
import gsap from 'gsap';
import styles from './VideosManager.module.css';
import API from '../api';
import { authFetch } from '../authFetch';

// إعدادات Cloudinary: الفيديو بينرفع من المتصفح مباشرة (Vercel ما بيقبل طلبات أكبر من 4.5MB)
const CLOUD_NAME = 'mpiu1vqo';
const UPLOAD_PRESET = 'syrian_videos'; // لازم يكون Unsigned Upload Preset بنفس الاسم بحساب Cloudinary

// يدعم الروابط الكاملة (Cloudinary) والملفات القديمة المخزنة باسم الملف فقط
const fileUrl = (f) =>
  !f ? '' : f.startsWith('http')
    ? f
    : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${f}`;

export default function VideosManager({ API_URL, currentUser }) {
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const containerRef = useRef(null);
  const videoCardsRef = useRef([]);

  // 🎬 تأثير ظهور حاوية مدير الفيديوهات عند التحميل
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  // 🎬 تأثير ظهور كروت الفيديوهات بتتابع سلس
  useEffect(() => {
    const validCards = videoCardsRef.current.filter(Boolean);
    if (validCards.length > 0) {
      gsap.fromTo(
        validCards,
        { opacity: 0, scale: 0.95, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, [videos]);

  const fetchMyVideos = () => {
    if (!currentUser || !currentUser.id) return;
    fetch(`${API_URL}/profile/videos/${currentUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.videos) {
          setVideos(data.videos);
        }
      })
      .catch((err) => console.error('خطأ في جلب الفيديوهات:', err));
  };

  useEffect(() => {
    fetchMyVideos();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setMessage('يرجى اختيار ملف فيديو أولاً');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      // 1) رفع الفيديو مباشرة لـ Cloudinary
      const cloudForm = new FormData();
      cloudForm.append('file', videoFile);
      cloudForm.append('upload_preset', UPLOAD_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        { method: 'POST', body: cloudForm }
      );
      const cloudData = await cloudRes.json();

      if (!cloudRes.ok) {
        setMessage(cloudData?.error?.message || 'فشل رفع الفيديو، حاول مرة أخرى');
        return;
      }

      // 2) حفظ الرابط بالداتابيز
      const res = await authFetch(currentUser, `${API_URL}/profile/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title,
          videoUrl: cloudData.secure_url
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('تم رفع الفيديو بنجاح! 🎵');
        setTitle('');
        setVideoFile(null);
        fetchMyVideos();
      } else {
        setMessage(data.message || 'حدث خطأ أثناء حفظ الفيديو');
      }
    } catch (err) {
      console.error(err);
      setMessage('فشل الاتصال بالسيرفر');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {/* 1️⃣ كرت نموذج الرفع */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          <Upload size={20} color="#f59e0b" /> رفع مقطع عزف / فيديو جديد
        </h3>

        {message && (
          <div className={message.includes('بنجاح') ? styles.successMsg : styles.errorMsg}>
            {message}
          </div>
        )}

        <form onSubmit={handleUpload} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>عنوان الفيديو أو مقطع العزف:</label>
            <input
              type="text"
              placeholder="مثال: تقسيم عود - مقام حجاز"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>اختر ملف الفيديو (MP4 / WebM):</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files[0])}
              className={styles.fileInput}
            />
          </div>

          <button type="submit" disabled={uploading} className={styles.uploadBtn}>
            {uploading ? 'جاري الرفع...' : 'رفع الفيديو إلى معرض الأعمال 🚀'}
          </button>
        </form>
      </div>

      {/* 2️⃣ معرض الفيديوهات المرفوعة سابقاً */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          <Film size={20} color="#f59e0b" /> فيديوهاتي
        </h3>

        {videos.length === 0 ? (
          <div className={styles.emptyBox}>
            <Video size={42} color="#64748b" />
            <p>لم تقم برفع أي فيديوهات بعد. قم برفع أول مقطع لك ليراه الجمهور ومتعهدو الحفلات!</p>
          </div>
        ) : (
          <div className={styles.videoGrid}>
            {videos.map((vid, index) => (
              <div 
                key={vid.id} 
                ref={(el) => (videoCardsRef.current[index] = el)}
                className={styles.videoCard}
              >
                <video controls src={fileUrl(vid.video_url)} className={styles.videoPlayer} />
                <div className={styles.videoInfo}>
                  <p className={styles.videoTitle}>{vid.title || 'مقطع عزف'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}