// fetch يضيف التوكن تلقائياً لكل طلب بيروح لسيرفرنا.
// إذا السيرفر رفض التوكن (منتهي أو الحساب انحظر)، بنمسح الجلسة وبنرجّع المستخدم لتسجيل الدخول.
let sessionExpiredHandled = false;

export async function authFetch(user, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${user?.token || ''}`
    }
  });

  if (res.status === 401 && !sessionExpiredHandled) {
    sessionExpiredHandled = true;
    try {
      localStorage.removeItem('syrian_musicians_user');
    } catch (e) {
      // تجاهل: التخزين غير متاح
    }
    window.location.reload();
  }

  return res;
}