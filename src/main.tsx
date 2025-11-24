import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './design-system.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // StrictMode отключён, чтобы эффекты не вызывались дважды в dev и не дублировали запросы
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
