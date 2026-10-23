import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import MusicianDashboard from './MusicianDashboard';
import EmployerDashboard from './EmployerDashboard';
import styles from './UserDashboard.module.css';

export default function UserDashboard({ currentUser, setCurrentUser }) {
  const containerRef = useRef(null);

  // فحص نوع المستخدم
  const userRole = currentUser?.role?.toLowerCase().trim();
  const isEmployer = userRole === 'restaurant' || userRole === 'organizer';

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, [isEmployer]);

  if (!currentUser) {
    return (
      <div className={styles.unauthorizedMessage}>
        يرجى تسجيل الدخول أولاً.
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      {isEmployer ? (
        <EmployerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} />
      ) : (
        <MusicianDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} />
      )}
    </div>
  );
}