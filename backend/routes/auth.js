const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
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

// 🎯 1. تسجيل حساب جديد
router.post('/register', upload.single('attachment'), (req, res) => {
  let { fullName, email, password, role, city, bio, instruments } = req.body;
  const attachment = req.file ? req.file.filename : null;

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
  if (!attachment && !isEmployerRole) {
    return res.status(400).json({ error: 'الملف المرفق إلزامي للتوثيق' });
  }

  const checkQuery = 'SELECT * FROM profiles WHERE email = ?';
  db.query(checkQuery, [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0) return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });

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
      attachment || '', 
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