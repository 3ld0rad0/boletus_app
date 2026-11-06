import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TILE_URL } from './config'
import { preconnect, tileOrigin } from './services/network'
import { registerServiceWorker } from './services/offline'

registerServiceWorker()
const tileHost = tileOrigin(TILE_URL)
if (tileHost) preconnect(tileHost)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
