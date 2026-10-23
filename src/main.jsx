import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css' // تم تعديل A لتصبح كابيتال
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)