const jwt = require('jsonwebtoken');
const db = require('../db');

// توقيع توكن للمستخدم بعد تسجيل الدخول (صالح 7 أيام)
function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '7d' });
}

// يتأكد إن الطلب جاي من مستخدم مسجّل دخول، وإن حسابه لسا فعّال بالداتابيز
// (هيك لما الأدمن بيحظر أو بيحذف حساب، بيوقف وصوله فوراً حتى لو توكنه لسا صالح)
function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set');
    return res.status(500).json({ error: 'خطأ في إعدادات السيرفر' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول' });

  let payload;
  try {
    payload = jwt.verify(token, secret); // { id, role, iat, exp }
  } catch (err) {
    return res.status(401).json({ error: 'الجلسة غير صالحة أو منتهية' });
  }

  db.query('SELECT id, role, status FROM profiles WHERE id = ?', [payload.id], (err, rows) => {
    if (err) {
      console.error('Auth lookup failed:', err);
      return res.status(500).json({ error: 'خطأ في السيرفر' });
    }
    if (!rows || rows.length === 0 || rows[0].status !== 'approved') {
      return res.status(401).json({ error: 'الحساب غير فعّال' });
    }
    // الدور بيجي من الداتابيز مش من التوكن، فأي تغيير بالصلاحيات بيسري فوراً
    req.user = { id: rows[0].id, role: rows[0].role };
    next();
  });
}

// يسمح للأدمن فقط
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'هذه العملية للأدمن فقط' });
    }
    next();
  });
}

module.exports = { signToken, requireAuth, requireAdmin };