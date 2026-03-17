/**
 * 역할: 앱 진입점 — React 앱을 DOM에 마운트
 * 의존성: App.jsx, index.css
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
