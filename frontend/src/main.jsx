import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

async function arrancar() {
  // Modo demo local (`npm run dev:demo`, ver frontend/DEMO.md): el import
  // es dinámico y va dentro de esta condición para que `vite build` lo
  // elimine del bundle de producción.
  if (import.meta.env.DEV && import.meta.env.VITE_MODO_DEMO === 'true') {
    const { instalarDemo } = await import('./demo/instalarDemo.js')
    instalarDemo()
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

arrancar()
