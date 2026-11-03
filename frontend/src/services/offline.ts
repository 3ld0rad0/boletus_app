import { Capacitor } from '@capacitor/core'
import { TILE_URL } from '../config'

/** Pattern dell'host delle tessere, con `*` al posto del sottodominio `{s}`. */
function tileHostPattern(): string {
  const host = new URL(TILE_URL.replace('{s}', 'a')).hostname
  return TILE_URL.includes('{s}') ? host.replace(/^a\./, '*.') : host
}

/** Solo web in produzione: nell'app nativa i file sono già nel pacchetto e in sviluppo il SW nasconderebbe le modifiche. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || Capacitor.isNativePlatform() || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?tiles=${encodeURIComponent(tileHostPattern())}`)
      .catch((e: unknown) => console.warn('Service worker non registrato', e))
  })
}
