const express = require('express');
const router = express.Router();
const db = require('../db'); // اتصال MySQL
const { requireAuth } = require('../middleware/authMiddleware');

// 🛠️ إنشاء الجداول وتأمين عمود last_active
const initTables = () => {
  const createConvTable = `
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user1_id INT NOT NULL,
      user2_id INT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_users (user1_id, user2_id)
    );
  `;
  const createMsgTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      text TEXT NOT NULL,
      is_read TINYINT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.query(createConvTable);
  db.query(createMsgTable);

  db.query(`SHOW COLUMNS FROM profiles LIKE 'last_active'`, (err, cols) => {
    if (!err && cols.length === 0) {
      db.query(`ALTER TABLE profiles ADD COLUMN last_active DATETIME DEFAULT CURRENT_TIMESTAMP`, (alterErr) => {
        if (alterErr) console.error('خطأ في إضافة عمود last_active:', alterErr.message);
      });
    }
  });
};
initTables();

const MAX_MESSAGE_LENGTH = 2000;

// يتأكد إن المستخدم طرف بالمحادثة
const checkMembership = (conversationId, userId, cb) => {
  db.query(
    'SELECT id FROM conversations WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
    [conversationId, userId, userId],
    cb
  );
};

// المسار :userId لازم يطابق صاحب التوكن (كل واحد بيشوف بياناته بس)
const isSameUser = (req) => Number(req.params.userId) === req.user.id;

// 🔴 نقطة تسجيل الخروج أو إغلاق الشات
// sendBeacon ما بيقدر يبعت هيدر Authorization، فبنقبل التوكن من جسم الطلب لهالمسار بس
router.post(
  '/offline',
  (req, res, next) => {
    if (!req.headers.authorization && req.body && req.body.token) {
      req.headers.authorization = 'Bearer ' + req.body.token;
    }
    next();
  },
  requireAuth,
  (req, res) => {
    db.query(
      `UPDATE profiles SET last_active = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE id = ?`,
      [req.user.id],
      (err) => {
        if (err) return res.status(500).json({ error: 'خطأ في تعيين الحالة أوفلاين' });
        res.json({ success: true });
      }
    );
  }
);

// 🔐 كل المسارات تحت هون بتحتاج تسجيل دخول
router.use(requireAuth);

// 🟢 نقطة تسجيل نبضة نشاط المستخدم (Heartbeat)
router.post('/ping', (req, res) => {
  db.query(`UPDATE profiles SET last_active = NOW() WHERE id = ?`, [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: 'خطأ في تحديث النشاط' });
    res.json({ success: true });
  });
});

// 🔴 1️⃣ فحص إجمالي الرسائل غير المقروءة
router.get('/unread-count/:userId', (req, res) => {
  if (!isSameUser(req)) return res.status(403).json({ error: 'غير مسموح' });

  const userId = req.user.id;
  const query = `
    SELECT COUNT(m.id) AS unreadCount
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.user1_id = ? OR c.user2_id = ?)
      AND m.sender_id != ?
      AND m.is_read = 0
  `;
  db.query(query, [userId, userId, userId], (err, results) => {
    if (err) return res.status(500).json({ unreadCount: 0 });
    res.json({ unreadCount: results[0]?.unreadCount || 0 });
  });
});

// 2️⃣ بدء محادثة جديدة (الطرف الأول دايماً هو صاحب التوكن)
router.post('/start', (req, res) => {
  const me = req.user.id;
  const otherId = Number(req.body.user2Id || req.body.user2);

  if (!otherId || otherId === me) return res.status(400).json({ error: 'مستخدم غير صالح' });

  // الطرف التاني لازم يكون حساب معتمد
  db.query(`SELECT id FROM profiles WHERE id = ? AND status = 'approved'`, [otherId], (errU, users) => {
    if (errU) return res.status(500).json({ error: 'خطأ في التحقق من المستخدم' });
    if (!users || users.length === 0) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const u1 = Math.min(me, otherId);
    const u2 = Math.max(me, otherId);

    const findQuery = `SELECT * FROM conversations WHERE user1_id = ? AND user2_id = ?`;
    db.query(findQuery, [u1, u2], (err, results) => {
      if (err) return res.status(500).json({ error: 'خطأ في البحث عن المحادثة' });

      if (results && results.length > 0) {
        return res.json({ conversation_id: results[0].id, ...results[0] });
      }

      const insertQuery = `INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)`;
      db.query(insertQuery, [u1, u2], (err2, insertResult) => {
        if (err2) return res.status(500).json({ error: 'فشل إنشاء المحادثة' });
        return res.json({ conversation_id: insertResult.insertId, user1_id: u1, user2_id: u2 });
      });
    });
  });
});

// 3️⃣ جلب المحادثات + وقت آخر نشاط للطرف الآخر
router.get('/conversations/:userId', (req, res) => {
  if (!isSameUser(req)) return res.status(403).json({ error: 'غير مسموح' });

  const userId = req.user.id;

  db.query(`UPDATE profiles SET last_active = NOW() WHERE id = ?`, [userId]);

  const query = `
    SELECT
      c.id AS conversation_id,
      c.updated_at,
      p.id AS peer_id,
      p.full_name AS peer_name,
      p.avatar AS peer_avatar,
      p.role AS peer_role,
      p.last_active AS peer_last_active,
      (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message_time,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND is_read = 0) AS unread_count
    FROM conversations c
    JOIN profiles p ON p.id = (CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END)
    WHERE c.user1_id = ? OR c.user2_id = ?
    ORDER BY c.updated_at DESC
  `;

  db.query(query, [userId, userId, userId, userId], (err, rows) => {
    if (err) {
      console.error('Error fetching conversations:', err);
      return res.status(500).json({ error: 'خطأ في جلب المحادثات' });
    }
    res.json(rows || []);
  });
});

// 4️⃣ جلب رسائل محادثة معينة (بس لأطرافها)
router.get('/messages/:conversationId/:userId', (req, res) => {
  if (!isSameUser(req)) return res.status(403).json({ error: 'غير مسموح' });

  const { conversationId } = req.params;
  const userId = req.user.id;

  checkMembership(conversationId, userId, (errM, rows) => {
    if (errM) return res.status(500).json({ error: 'خطأ في جلب الرسائل' });
    if (!rows || rows.length === 0) return res.status(403).json({ error: 'غير مسموح' });

    db.query(
      `UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ?`,
      [conversationId, userId],
      () => {
        db.query(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC`, [conversationId], (err, msgs) => {
          if (err) return res.status(500).json({ error: 'خطأ في جلب الرسائل' });
          res.json(msgs || []);
        });
      }
    );
  });
});

// 5️⃣ إرسال رسالة جديدة (المرسل دايماً هو صاحب التوكن)
router.post('/send', (req, res) => {
  const { conversationId, text } = req.body;
  const senderId = req.user.id;

  if (!conversationId || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'مطلوب حقول أساسية' });
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'الرسالة طويلة جداً' });
  }

  checkMembership(conversationId, senderId, (errM, rows) => {
    if (errM) return res.status(500).json({ error: 'فشل إرسال الرسالة' });
    if (!rows || rows.length === 0) return res.status(403).json({ error: 'غير مسموح' });

    db.query(
      `INSERT INTO messages (conversation_id, sender_id, text, is_read) VALUES (?, ?, ?, 0)`,
      [conversationId, senderId, text.trim()],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'فشل إرسال الرسالة' });

        db.query(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [conversationId], () => {
          res.json({ success: true, messageId: result.insertId });
        });
      }
    );
  });
});

module.exports = router;