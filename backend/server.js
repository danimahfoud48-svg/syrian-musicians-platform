const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// التأكد من وجود مجلد uploads (محلياً فقط لتجنب أخطاء Vercel)
try {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
} catch (err) {
  console.log('Filesystem is read-only, skipping uploads dir creation.');
}

// ربط المسارات المقسمة (Routes) بشكل دقيق ومضبوط
app.use('/api', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat')); // 💬 مسار المحادثات ونبضات النشاط

// مسار تجريبي
app.get('/', (req, res) => {
  res.json({ message: 'Syrian Musicians Backend is running successfully! 🚀' });
});

// التشغيل محلياً فقط، وتصدير التطبيق ليعمل على Vercel كـ Serverless Function
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} 🚀`);
  });
}

module.exports = app;