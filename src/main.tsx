import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { loadBranding } from './lib/theme'

// Name, logo and colours (Settings > Branding) are applied before the first paint.
loadBranding().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
