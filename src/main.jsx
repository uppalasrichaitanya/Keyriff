import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/jetbrains-mono/800.css'
import './index.css'
import App from './App.jsx'
import { applyTheme } from './lib/themes'

try {
  const saved = localStorage.getItem('typer:v2:theme')
  if (saved) applyTheme(JSON.parse(saved))
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
