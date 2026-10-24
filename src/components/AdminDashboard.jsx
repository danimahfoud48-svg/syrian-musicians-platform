import React, { useState, useEffect, useRef } from 'react';
import { Music, ShieldCheck, Check, XCircle, LogOut, CheckCircle2, Trash2, FileText, ExternalLink, User, AlertCircle } from 'lucide-react';
import gsap from 'gsap';
import styles from './AdminDashboard.module.css';
import API from '../api';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// يدعم الروابط الكاملة (Cloudinary) والملفات القديمة المخزنة باسم الملف فقط
const fileUrl = (f) =>
  !f ? '' : f.startsWith('http')
    ? f
    : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${f}`;

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
      if (res.ok) {