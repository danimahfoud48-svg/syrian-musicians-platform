const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/authMiddleware');

// 🔐 كل مسارات الأدمن محمية: لازم توكن صحيح لحساب أدمن
router.use(requireAdmin);

// تحويل db.query (callback) إلى Promise
const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
  });

// كلمة سر مؤقتة سهلة القراءة (بدون حروف متشابهة مثل 0/O و1/l/I)
const TEMP_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generateTempPassword = (length = 10) =>
  Array.from({ length }, () => TEMP_ALPHABET[crypto.randomInt(TEMP_ALPHABET.length)]).join('');

// جلب كل الحسابات (بدون عمود كلمة المرور)
router.get('/profiles', (req, res) => {
  const query = `
    SELECT id, full_name, email, role, city, instruments, attachment, avatar, bio,
           status, created_at, pending_bio, pending_instruments, pending_attachment,
           is_online, last_active, reset_requested_at, must_change_password
    FROM profiles
    ORDER BY created_at DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// تفعيل الحساب / قبول التعديل المعلق / رفض التعديل المعلق
router.put('/profiles/:id', (req, res) => {
  const { status, approveUpdate, rejectUpdate } = req.body;
  const { id } = req.params;

  if (approveUpdate) {
    const query = `
      UPDATE profiles
      SET bio = COALESCE(pending_bio, bio),
          instruments = COALESCE(pending_instruments, instruments),
          attachment = COALESCE(pending_attachment, attachment),
          pending_bio = NULL,
          pending_instruments = NULL,
          pending_attachment = NULL
      WHERE id = ?
    `;
    db.query(query, [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: 'تمت الموافقة على تعديلات الحساب بنجاح!' });
    });
  } else if (rejectUpdate) {
    const selectQuery = 'SELECT pending_attachment FROM profiles WHERE id = ?';
    db.query(selectQuery, [id], (err, results) => {
      if (!err && results && results.length > 0 && results[0].pending_attachment) {
        try {
          const filePath = path.join(__dirname, '../uploads', results[0].pending_attachment);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (e) {
          console.log('File delete error:', e.message);
        }
      }

      // هنا نضمن أن الـ status يعود ليكون 'approved' أو يظل كما كان للعازف الأساسي
      const query = `
        UPDATE profiles
        SET pending_bio = NULL,
            pending_instruments = NULL,
            pending_attachment = NULL,
            status = 'approved'
        WHERE id = ?
      `;
      db.query(query, [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json({ message: 'تم رفض التعديلات المعلقة وبقي الحساب مفعّلاً!' });
      });
    });
  } else if (status) {
    const query = 'UPDATE profiles SET status = ? WHERE id = ?';
    db.query(query, [status, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: 'تم تحديث حالة الحساب بنجاح' });
    });
  } else {
    return res.status(400).json({ error: 'طلب غير مكتمل' });
  }
});

// 🔑 توليد كلمة سر مؤقتة لمستخدم (بترجع مرة وحدة بس للأدمن)
router.post('/profiles/:id/reset-password', async (req, res) => {
  try {
    const rows = await query('SELECT id, role FROM profiles WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'الحساب غير موجود' });
    if (rows[0].role === 'admin') {
      return res.status(400).json({ error: 'لا يمكن إعادة تعيين كلمة سر الأدمن من هنا' });
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await query(
      'UPDATE profiles SET password = ?, must_change_password = 1, reset_requested_at = NULL WHERE id = ?',
      [hash, req.params.id]
    );

    res.json({ tempPassword });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إعادة التعيين' });
  }
});

// حذف الحساب
router.delete('/profiles/:id', (req, res) => {
  const { id } = req.params;
  const selectQuery = 'SELECT attachment, avatar, pending_attachment FROM profiles WHERE id = ?';

  db.query(selectQuery, [id], (err, results) => {
    if (!err && results && results.length > 0) {
      ['attachment', 'avatar', 'pending_attachment'].forEach(field => {
        if (results[0][field]) {
          try {
            const filePath = path.join(__dirname, '../uploads', results[0][field]);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (e) {
            console.log('File error:', e.message);
          }
        }
      });
    }

    db.query('DELETE FROM profiles WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'تم حذف الحساب بنجاح' });
    });
  });
});

module.exports = router;