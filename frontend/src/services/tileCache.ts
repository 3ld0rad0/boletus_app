import { fetchPersistent } from '../core/persistentCache'
import { TILE_CACHE_MAX_TILES } from '../config'

/** Oltre questo tempo un tassello si considera bloccato e si libera la connessione. */
export const TILE_TIMEOUT_MS = 15_000

/**
 * Tassello di mappa: dalla cache del dispositivo se presente, altrimenti dalla rete (e lo salva).
 * `signal` annulla il download (es. tassello uscito dalla vista); scaduto il tempo la richiesta fallisce.
 */
export async function fetchMapTile(url: string, signal?: AbortSignal): Promise<Blob> {
  const ctrl = new AbortController()
  const abort = () => ctrl.abort()
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort)
  const timer = setTimeout(abort, TILE_TIMEOUT_MS)
  try {
    const res = await fetchPersistent(url, {
      cacheName: 'map-tiles-v1',
      maxEntries: TILE_CACHE_MAX_TILES,
      // Richiesta CORS: la risposta non è opaca e quindi si può salvare.
      fetchFn: (u) => fetch(u, { mode: 'cors', signal: ctrl.signal }),
      storage: typeof caches === 'undefined' ? undefined : caches,
    })
    if (!res.ok) throw new Error(`Tassello non disponibile (${res.status})`)
    return await res.blob()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
