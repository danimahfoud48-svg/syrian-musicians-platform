const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const db = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// الملفات بتبقى بالذاكرة وبتنرفع مباشرة لـ Cloudinary (Vercel ما بيسمح بالكتابة على القرص)
// الحد 4MB لأن Vercel بيرفض الطلبات الأكبر من 4.5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const isMedia = file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    const publicId = Date.now() + '-' + Math.round(Math.random() * 1E9) + (isMedia ? '' : path.extname(file.originalname));
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: isMedia ? 'auto' : 'raw', folder: 'syrian-musicians', public_id: publicId },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

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
router.put('/:id', requireAuth, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'newAttachment', maxCount: 1 }]), (req, res) => {
  const { id } = req.params;

  // 🔐 كل مستخدم بيعدّل ملفه الشخصي هو بس
  if (Number(id) !== req.user.id) {
    return res.status(403).json({ error: 'لا يمكنك تعديل حساب غير حسابك' });
  }
  const { bio, instruments, instrumentsChanged, removeAvatar } = req.body;

  const avatarUpload = req.files && req.files['avatar'] ? req.files['avatar'][0] : null;
  const attachmentUpload = req.files && req.files['newAttachment'] ? req.files['newAttachment'][0] : null;

  const isChangingInstruments = instrumentsChanged === 'true';

  if (isChangingInstruments && !attachmentUpload) {
    return res.status(400).json({ error: 'عند إضافة أو تغيير الآلات الموسيقية، يجب إرفاق فيديو أو مستند إثبات للأدمن!' });
  }

  db.query('SELECT * FROM profiles WHERE id = ?', [id], async (err, currentResults) => {
    if (err || currentResults.length === 0) return res.status(500).json({ error: 'الحساب غير موجود' });

    const currentUserData = currentResults[0];
    let updatedAvatar = currentUserData.avatar;
    let newAttachment = null;

    try {
      if (removeAvatar === 'true') {
        updatedAvatar = null;
      } else if (avatarUpload) {
        const uploaded = await uploadToCloudinary(avatarUpload);
        updatedAvatar = uploaded.secure_url;
      }

      if (attachmentUpload) {
        const uploaded = await uploadToCloudinary(attachmentUpload);
        newAttachment = uploaded.secure_url;
      }
    } catch (uploadErr) {
      console.error('Cloudinary upload failed:', uploadErr);
      return res.status(500).json({ error: 'فشل رفع الملف، حاول مرة أخرى' });
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

        const { password: _omit, ...safeUser } = results[0];
        res.json({ message: responseMessage, user: safeUser });
      });
    });
  });
});

// 4️⃣ جلب فيديوهات عضو
router.get('/videos/:userId', (req, res) => {
  db.query(
    'SELECT * FROM videos WHERE user_id = ? ORDER BY created_at DESC',
    [req.params.userId],
    (err, videos) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ videos: videos || [] });
    }
  );
});

// 5️⃣ حفظ رابط فيديو مرفوع مسبقاً على Cloudinary (الرفع بيصير من المتصفح مباشرة)
router.post('/videos', requireAuth, (req, res) => {
  const { title, videoUrl } = req.body;
  const userId = req.user.id; // 🔐 الهوية من التوكن، مش من الطلب

  // لازم يكون الرابط من حساب Cloudinary تبعنا
  const allowedPrefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
  if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.startsWith(allowedPrefix)) {
    return res.status(400).json({ message: 'رابط الفيديو غير صالح' });
  }

  db.query(
    'INSERT INTO videos (user_id, title, video_url) VALUES (?, ?, ?)',
    [userId, String(title || '').slice(0, 255), videoUrl],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'تم حفظ الفيديو بنجاح' });
    }
  );
});

module.exports = router;