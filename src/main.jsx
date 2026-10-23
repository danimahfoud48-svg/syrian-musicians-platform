import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './app.css' // ملف التنسيقات الخاص بك
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)