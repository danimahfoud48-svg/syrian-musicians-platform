const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');

// جلب كل الحسابات
router.get('/profiles', (req, res) => {
  const query = 'SELECT * FROM profiles ORDER BY created_at DESC';
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