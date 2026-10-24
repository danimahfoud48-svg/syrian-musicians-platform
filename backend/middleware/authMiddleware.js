const jwt = require('jsonwebtoken');

// توقيع توكن للمستخدم بعد تسجيل الدخول (صالح 7 أيام)
function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ id: user.id, role: user.role }, secret, { expiresIn: '7d' });
}

// يتأكد إن الطلب جاي من مستخدم مسجّل دخول (توكن صحيح)
function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set');
    return res.status(500).json({ error: 'خطأ في إعدادات السيرفر' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول' });

  try {
    req.user = jwt.verify(token, secret); // { id, role, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'الجلسة غير صالحة أو منتهية' });
  }
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