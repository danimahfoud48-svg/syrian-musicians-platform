const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// 1️⃣ جلب كافة الحسابات المعتمدة المعروضة بالدليل الشامل
router.get('/public/list', (req, res) => {
  const query = `
    SELECT id, full_name, bio, instruments, avatar, role 
    FROM profiles 
    WHERE status = 'approved'
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 2️⃣ جلب الملف الشخصي العام لعضو مع فيديوهاته وأعماله
router.get('/public/:id', (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT id, full_name, bio, instruments, avatar, role, created_at 
    FROM profiles 
    WHERE id = ? AND status = 'approved'
  `;

  db.query(query, [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'لم يتم العثور على بروفايل العضو' });
    }

    const musician = results[0];

    db.query('SELECT * FROM videos WHERE user_id = ?', [id], (err, videos) => {
      res.json({
        musician,
        videos: videos || []
      });
    });
  });
});

// 3️⃣ تحديث البروفايل
router.put('/:id', upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'newAttachment', maxCount: 1 }]), (req, res) => {
  const { id } = req.params;
  const { bio, instruments, instrumentsChanged, removeAvatar } = req.body;

  const avatarFile = req.files && req.files['avatar'] ? req.files['avatar'][0].filename : null;
  const newAttachment = req.files && req.files['newAttachment'] ? req.files['newAttachment'][0].filename : null;

  const isChangingInstruments = instrumentsChanged === 'true';

  if (isChangingInstruments && !newAttachment) {
    return res.status(400).json({ error: 'عند إضافة أو تغيير الآلات الموسيقية، يجب إرفاق فيديو أو مستند إثبات للأدمن!' });
  }

  db.query('SELECT * FROM profiles WHERE id = ?', [id], (err, currentResults) => {
    if (err || currentResults.length === 0) return res.status(500).json({ error: 'الحساب غير موجود' });

    const currentUserData = currentResults[0];
    let updatedAvatar = currentUserData.avatar;

    if (removeAvatar === 'true') {
      if (currentUserData.avatar) {
        const oldPath = path.join(__dirname, '../uploads', currentUserData.avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updatedAvatar = null;
    } else if (avatarFile) {
      if (currentUserData.avatar) {
        const oldPath = path.join(__dirname, '../uploads', currentUserData.avatar);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updatedAvatar = avatarFile;
    }

    const updatedBio = bio !== undefined ? bio : currentUserData.bio;

    let query = '';
    let params = [];

    if (isChangingInstruments) {
      query = `
        UPDATE profiles 
        SET avatar = ?, 
            bio = ?, 
            pending_instruments = ?, 
            pending_attachment = ? 
        WHERE id = ?
      `;
      params = [updatedAvatar, updatedBio, instruments, newAttachment, id];
    } else {
      query = `
        UPDATE profiles 
        SET avatar = ?, 
            bio = ? 
        WHERE id = ?
      `;
      params = [updatedAvatar, updatedBio, id];
    }

    db.query(query, params, (err) => {
      if (err) return res.status(500).json({ error: err.message });

      db.query('SELECT * FROM profiles WHERE id = ?', [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        const responseMessage = isChangingInstruments 
          ? 'تم حفظ السيرة والصورة فوراً، وإرسال طلب الآلات الجديدة للمراجعة! 🎷' 
          : 'تم حفظ وتثبيت بيانات الملف الشخصي بنجاح! ✨';

        res.json({ message: responseMessage, user: results[0] });
      });
    });
  });
});

module.exports = router;