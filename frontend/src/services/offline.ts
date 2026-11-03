import { Capacitor } from '@capacitor/core'

/** Solo web in produzione: nell'app nativa i file sono già nel pacchetto e in sviluppo il SW nasconderebbe le modifiche. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e: unknown) => console.warn('Service worker non registrato', e))
  })
}
