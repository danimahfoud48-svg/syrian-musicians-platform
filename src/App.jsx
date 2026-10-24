import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import API from '../api';

const API_URL = `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/api`;
export default function App() {
  // استعادة بيانات المستخدم من ذاكرة المتصفح تلقائياً
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('syrian_musicians_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 🟢 تفعيل التمرير الناعم والفاخر باستخدام Lenis و GSAP
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: true, // تفعيل السلاسة حتى على اللمس للأجهزة الذكية والآيباد
      touchMultiplier: 2,
    });

    lenis.on('scroll', gsap.updateRoot);

    const update = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(update);
    };
  }, []);

  // إدارة زر "الرجوع" في المتصفح لمنع الخروج المفاجئ
  useEffect(() => {
    if (currentUser) {
      window.history.pushState({ loggedIn: true }, '');

      const handlePopState = (event) => {
        const confirmLogout = window.confirm('هل تريد تسجيل الخروج والعودة للرئيسية؟');
        if (confirmLogout) {
          handleSetCurrentUser(null);
        } else {
          window.history.pushState({ loggedIn: true }, '');
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [currentUser]);

  // دالة حفظ وتحديث بيانات الجلسة
  const handleSetCurrentUser = (user) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('syrian_musicians_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('syrian_musicians_user');
      localStorage.removeItem('token'); // تنظيف التوكن أيضاً عند الخروج
    }
  };

  return (
    <Router>
      <Routes>
        {!currentUser ? (
          <Route path="*" element={<Auth API_URL={API_URL} setCurrentUser={handleSetCurrentUser} />} />
        ) : currentUser.role === 'admin' ? (
          <Route path="/*" element={<AdminDashboard currentUser={currentUser} setCurrentUser={handleSetCurrentUser} />} />
        ) : (
          <Route path="/*" element={<UserDashboard currentUser={currentUser} setCurrentUser={handleSetCurrentUser} />} />
        )}
      </Routes>
    </Router>
  );
}