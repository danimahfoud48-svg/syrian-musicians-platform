import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, MessageSquare, User, Search } from 'lucide-react';
import gsap from 'gsap';
import styles from './ChatPage.module.css';
import API from './api';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

export default function ChatPage({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const targetConvId = searchParams.get('convId');

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const messagesRef = useRef([]);

  // 🎬 تأثير ظهور حاوية الشات العامة
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.98, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  // 🎬 تأثير ظهور الرسائل الجديدة
  useEffect(() => {
    const validMsgs = messagesRef.current.filter(Boolean);
    if (validMsgs.length > 0) {
      gsap.fromTo(
        validMsgs[validMsgs.length - 1],
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [messages.length]);

  // 🟢 إرسال نبضة نشاط (Heartbeat)
  useEffect(() => {
    if (!currentUser?.id) return;

    const sendPing = async () => {
      try {
        await fetch(`${API_URL}/chat/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (err) {
        console.error('خطأ في إرسال الـ Ping:', err);
      }
    };

    sendPing();
    const pingInterval = setInterval(sendPing, 20000);
    return () => clearInterval(pingInterval);
  }, [currentUser?.id]);

  // 🔴 إرسال طلب أوفلاين عند المغادرة
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleBeforeUnload = () => {
      const data = JSON.stringify({ userId: currentUser.id });
      const blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(`${API_URL}/chat/offline`, blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.id]);

  // 1️⃣ جلب قائمة المحادثات
  const fetchConversations = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_URL}/chat/conversations/${currentUser.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
      }
    } catch (err) {
      console.error('خطأ في جلب المحادثات:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  // 🎯 2️⃣ جلب الرسائل للمحادثة النشطة
  const fetchMessages = async (convId) => {
    try {
      const res = await fetch(`${API_URL}/chat/messages/${convId}/${currentUser.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error('خطأ في جلب الرسائل:', err);
    }
  };

  // 🎯 3️⃣ المعالجة الذكية للرابط القادم من الدليل (فتح أو إنشاء المحادثة فوراً)
  useEffect(() => {
    if (!targetConvId || !currentUser?.id) return;

    // محاولة جلب أو بدء محادثة مباشرة مع الطرف الآخر
    const initTargetConversation = async () => {
      try {
        const res = await fetch(`${API_URL}/chat/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            user1: currentUser.id, 
            user2: targetConvId 
          })
        });
        const convData = await res.json();
        if (convData && convData.conversation_id) {
          setActiveConv(convData);
          fetchMessages(convData.conversation_id);
          setSearchParams({}); // تنظيف الرابط بعد الفتح
          fetchConversations();
        }
      } catch (err) {
        console.error('خطأ في بدء المحادثة:', err);
      }
    };

    initTargetConversation();
  }, [targetConvId, currentUser?.id]);

  // تحديث الرسائل دورياً للمحادثة النشطة
  useEffect(() => {
    if (!activeConv) return;
    fetchMessages(activeConv.conversation_id);

    const interval = setInterval(() => {
      fetchMessages(activeConv.conversation_id);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // 4️⃣ اختيار محادثة يدوياً من القائمة الجانبية
  const handleSelectConversation = (conv) => {
    setActiveConv(conv);
    fetchMessages(conv.conversation_id);
    fetchConversations();
  };

  // 5️⃣ إرسال رسالة
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv) return;

    try {
      const res = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeConv.conversation_id,
          senderId: currentUser.id,
          text: newMessage
        })
      });

      if (res.ok) {
        setNewMessage('');
        fetchMessages(activeConv.conversation_id);
        fetchConversations();
      }
    } catch (err) {
      console.error('خطأ في إرسال الرسالة:', err);
    }
  };

  // 🟢 فحص الاتصال
  const isPeerOnline = (lastActiveTime) => {
    if (!lastActiveTime) return false;
    const formattedDate = lastActiveTime.includes('T') ? lastActiveTime : lastActiveTime.replace(' ', 'T');
    const peerTime = new Date(formattedDate).getTime();
    if (isNaN(peerTime)) return false;
    const nowTime = new Date().getTime();
    const diffSeconds = Math.abs((nowTime - peerTime) / 1000);
    return diffSeconds <= 60;
  };

  const filteredConversations = conversations.filter(c =>
    c.peer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const peerIsOnline = activeConv ? isPeerOnline(activeConv.peer_last_active) : false;

  return (
    <div ref={containerRef} className={styles.chatContainer}>
      {/* 📱 القائمة اليمنى: المحادثات */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h3 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem' }}>المحادثات والرسائل 💬</h3>
        </div>

        <div className={styles.searchBox}>
          <Search size={16} color="#f59e0b" />
          <input
            type="text"
            placeholder="ابحث في المحادثات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.convList}>
          {filteredConversations.length === 0 ? (
            <p className={styles.noConvText}>لا توجد محادثات. تواصل مع الأعضاء من دليل المنصة!</p>
          ) : (
            filteredConversations.map((conv) => {
              const isUnread = conv.unread_count > 0;
              const isActive = activeConv?.conversation_id === conv.conversation_id;
              const online = isPeerOnline(conv.peer_last_active);

              return (
                <div
                  key={conv.conversation_id}
                  onClick={() => handleSelectConversation(conv)}
                  className={isActive ? styles.convItemActive : styles.convItem}
                >
                  <div className={styles.avatarContainer}>
                    <div className={styles.avatarWrapper}>
                      {conv.peer_avatar ? (
                        <img src={`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${conv.peer_avatar}`} alt={conv.peer_name} className={styles.avatarImg} />
                      ) : (
                        <User size={24} color="#f59e0b" />
                      )}
                    </div>
                    {online && <span className={styles.statusDot} />}
                  </div>

                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className={styles.convNameRow}>
                      <span className={styles.convName} style={{ fontWeight: isUnread ? '700' : '600' }}>
                        {conv.peer_name}
                      </span>
                      {isUnread && <span className={styles.unreadBadge}>{conv.unread_count}</span>}
                    </div>
                    <div className={styles.lastMessage} style={{ color: isUnread ? '#fcd34d' : '#cbd5e1', fontWeight: isUnread ? '700' : '400' }}>
                      {conv.last_message || 'ابدأ المحادثة الآن...'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 💬 المنطقة اليسرى: منطقة الشات */}
      <div className={styles.chatArea}>
        {activeConv ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.avatarContainer}>
                <div className={styles.avatarWrapperSmall}>
                  {activeConv.peer_avatar ? (
                    <img src={`${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${activeConv.peer_avatar}`} alt={activeConv.peer_name} className={styles.avatarImg} />
                  ) : (
                    <User size={20} color="#f59e0b" />
                  )}
                </div>
                {peerIsOnline && <span className={styles.statusDotSmall} />}
              </div>
              <div>
                <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1rem', fontWeight: '700' }}>{activeConv.peer_name}</h4>
                {peerIsOnline ? (
                  <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: '700' }}>
                    🟢 نشط الآن
                  </span>
                ) : (
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    غير متصل
                  </span>
                )}
              </div>
            </div>

            <div className={styles.messagesBox}>
              {messages.map((msg, index) => {
                const isMe = msg.sender_id === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    ref={(el) => (messagesRef.current[index] = el)}
                    className={styles.messageRow}
                    style={{ justifyContent: isMe ? 'flex-start' : 'flex-end' }}
                  >
                    <div className={isMe ? styles.myMessageBubble : styles.otherMessageBubble}>
                      <p style={{ margin: 0, wordBreak: 'break-word' }}>{msg.text}</p>
                      <span className={styles.msgTime}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className={styles.sendForm}>
              <input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className={styles.sendInput}
              />
              <button type="submit" className={styles.sendBtn}>
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className={styles.emptyChatState}>
            <MessageSquare size={52} color="#f59e0b" style={{ marginBottom: '12px', opacity: 0.85 }} />
            <h3 style={{ color: '#ffffff', margin: '0 0 6px', fontSize: '1.15rem' }}>اختر محادثة من القائمة</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>أو تواصل مع الأعضاء مباشرة من دليل المنصة.</p>
          </div>
        )}
      </div>
    </div>
  );
}