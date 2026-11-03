import { TILE_URL } from '../config'

/** Pattern dell'host delle tessere, con `*` al posto del sottodominio `{s}`. */
function tileHostPattern(): string {
  const host = new URL(TILE_URL.replace('{s}', 'a')).hostname
  return TILE_URL.includes('{s}') ? host.replace(/^a\./, '*.') : host
}

/** Solo in produzione: in sviluppo il service worker nasconderebbe le modifiche. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`/sw.js?tiles=${encodeURIComponent(tileHostPattern())}`)
      .catch((e: unknown) => console.warn('Service worker non registrato', e))
  })
}
