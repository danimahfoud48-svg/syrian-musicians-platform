import axios from 'axios';

// تحديد عنوان السيرفر تلقائياً (محلي أو على Vercel)
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// إنشاء نسخة مخصصة من axios جاهزة للاستخدام
const API = axios.create({
  baseURL: API_URL,
});

export default API;