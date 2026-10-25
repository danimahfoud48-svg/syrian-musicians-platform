const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v2: cloudinary } = require('cloudinary');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/authMiddleware');

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

// تحويل db.query (callback) إلى Promise لتسهيل الكتابة بـ async/await
const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
  });

const SALT_ROUNDS = 10;

// هل القيمة المخزنة هاش bcrypt؟ (بتبدأ بـ $2a$ أو $2b$ أو $2y$)
const isHashed = (value) => /^\$2[aby]\$\d{2}\$/.test(value || '');

// 🎯 1. تسجيل حساب جديد
router.post('/register', upload.single('attachment'), async (req, res) => {
  try {
    let { fullName, email, password, role, city, bio, instruments } = req.body;

    if (!fullName || !email || !password || !city) {
      return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب ألا تقل عن 6 أحرف' });
    }

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

    const existing = await query('SELECT id FROM profiles WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    }

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

    // 🔐 تشفير كلمة المرور قبل التخزين
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await query(
      `INSERT INTO profiles
       (full_name, email, password, role, city, bio, instruments, attachment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [fullName, email, passwordHash, finalRole, city, bio || '', finalInstruments, attachment, 'pending']
    );

    res.json({ message: 'تم إرسال الطلب بنجاح بانتظار موافقة الأدمن' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🎯 2. تسجيل الدخول
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
    }

    const results = await query('SELECT * FROM profiles WHERE email = ?', [email]);
    if (results.length === 0) {
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
    }

    const user = results[0];
    const stored = user.password || '';
    let valid = false;

    if (isHashed(stored)) {
      valid = await bcrypt.compare(password, stored);
    } else {
      // 🔄 حساب قديم بكلمة مرور نص عادي: نتحقق منها، وإذا صحيحة نشفّرها ونحدّث الداتابيز فوراً
      valid = stored === password;
      if (valid) {
        const newHash = await bcrypt.hash(password, SALT_ROUNDS);
        await query('UPDATE profiles SET password = ? WHERE id = ?', [newHash, user.id]);
      }
    }

    if (!valid) {
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
    }

    if (user.status === 'pending' && user.role !== 'admin') {
      return res.status(403).json({ error: 'حسابك قيد المراجعة من قِبل الأدمن' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ error: 'عذراً، تم رفض حسابك' });
    }

    // ما بنرجّع كلمة المرور (ولا الهاش) للمتصفح
    const { password: _omit, ...safeUser } = user;
    res.json({ message: 'تم تسجيل الدخول بنجاح', user: { ...safeUser, token: signToken(user) } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔑 3. طلب استعادة كلمة السر (بيوصل للأدمن بلوحته)
router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    if (!email) return res.status(400).json({ error: 'اكتب بريدك الإلكتروني' });

    await query(
      `UPDATE profiles SET reset_requested_at = NOW()
       WHERE email = ? AND status = 'approved' AND role != 'admin' AND reset_requested_at IS NULL`,
      [email]
    );

    // نفس الرد دايماً، حتى ما حدا يقدر يعرف إذا الإيميل مسجّل عندنا
    res.json({ message: 'إذا كان الحساب موجوداً، وصل طلبك للأدمن وبيتواصل معك قريباً.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى' });
  }
});

// 🔐 4. تغيير كلمة السر (للمستخدم المسجّل دخول)
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'يرجى تعبئة كل الحقول' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية' });
    }

    const rows = await query('SELECT password FROM profiles WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'الحساب غير موجود' });

    const stored = rows[0].password || '';
    const ok = isHashed(stored) ? await bcrypt.compare(currentPassword, stored) : stored === currentPassword;

    // ملاحظة: بنرجّع 400 مش 401، لأن 401 بيطلّع المستخدم من الموقع
    if (!ok) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query('UPDATE profiles SET password = ?, must_change_password = 0 WHERE id = ?', [hash, req.user.id]);

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'حدث خطأ، حاول مرة أخرى' });
  }
});

module.exports = router;