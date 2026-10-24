// يدعم الروابط الكاملة (Cloudinary) والملفات القديمة المخزنة باسم الملف فقط
export const fileUrl = (f) =>
  !f ? '' : f.startsWith('http')
    ? f
    : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}/uploads/${f}`;