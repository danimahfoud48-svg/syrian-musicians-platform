const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const db = require('../db');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// الملف بيبقى بالذاكرة ويتم رفعه مباشرة لـ Cloudinary (Vercel ما بيسمح بالكتابة على القرص)
// الحد 4MB لأن Vercel بيرفض الطلبات الأكبر من 4.5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const publicId = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', folder: 'syrian-musicians', public_id: publicId },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(file.buffer);
  });
}

// 🎯 1. تسجيل حساب جديد
router.post('/register', upload.single('attachment'), (req, res) => {
  let { fullName, email, password, role, city, bio, instruments } = req.body;

  // تنظيف مدخل الـ role
  const cleanRole = role ? role.trim().toLowerCase() : 'musician';

  // 🎯 تحديد الدور القياسي الصارم (Standard Role Assignment)
  let finalRole = 'musician';
  if (cleanRole === 'restaurant') {
    finalRole = 'restaurant';
  } else if (cleanRole === 'organizer') {
    finalRole = 'organizer';
  } else if (cleanRole === 'maestro' || (instruments && (instruments.includes('قائد فرقة') || instruments.includes('فرقة موسيقية')))) {
    finalRole = 'maestro';
  }

  // التأكد من إرفاق الملف التوثيقي لأصحاب العمل (المطاعم والمتعهدين) أو العازفين حسب سياسة الموقع
  const isEmployerRole = finalRole === 'restaurant' || finalRole === 'organizer';
  if (!req.file && !isEmployerRole) {
    return res.status(400).json({ error: 'الملف المرفق إلزامي للتوثيق' });
  }

  const checkQuery = 'SELECT * FROM profiles WHERE email = ?';
  db.query(checkQuery, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });

    // 🎯 رفع الملف لـ Cloudinary (بعد التأكد أن الإيميل غير مستخدم)
    let attachment = '';
    if (req.file) {
      try {
        const uploaded = await uploadToCloudinary(req.file);
        attachment = uploaded.secure_url;
      } catch (uploadErr) {
        console.error('Cloudinary upload failed:', uploadErr);
        return res.status(500).json({ error: 'فشل رفع الملف، حاول مرة أخرى' });
      }
    }

    // 🎯 ضبط التخصص/الآلة الافتراضية
    let finalInstruments = instruments;
    if (!finalInstruments || finalInstruments.trim() === '') {
      if (finalRole === 'restaurant') finalInstruments = 'مطعم';
      else if (finalRole === 'organizer') finalInstruments = 'متعهد حفلات';
      else if (finalRole === 'maestro') finalInstruments = 'مايسترو / فرقة';
      else finalInstruments = 'عازف';
    }

    // 🎯 جملة INSERT نظيفة ومحددة بترتيب الأعمدة الدقيق لمنع انزياح البيانات
    const insertQuery = `
      INSERT INTO profiles 
      (full_name, email, password, role, city, bio, instruments, attachment, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [
      fullName,
      email,
      password,
      finalRole,
      city,
      bio || '',
      finalInstruments,
      attachment,
      'pending'
    ], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'تم إرسال الطلب بنجاح بانتظار موافقة الأدمن' });
    });
  });
});

// 🎯 2. تسجيل الدخول
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM profiles WHERE email = ? AND password = ?';

  db.query(query, [email, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    let user = results[0];

    if (user.status === 'pending' && user.role !== 'admin') {
      return res.status(403).json({ error: 'حسابك قيد المراجعة من قِبل الأدمن' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'عذراً، تم رفض حسابك' });
    }

    res.json({ message: 'تم تسجيل الدخول بنجاح', user });
  });
});

module.exports = router;