import { fetchPersistent } from '../core/persistentCache'
import { TILE_CACHE_MAX_TILES } from '../config'

/** Oltre questo tempo un tassello si considera bloccato e si libera la connessione. */
export const TILE_TIMEOUT_MS = 15_000

// Tasselli attorno al punto di partenza: fuori dal tetto della cache generale, così non vengono mai potati.
const START_CACHE = 'start-tiles-v1'
let startCachePromise: Promise<Cache | null> | undefined

function openStartCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return Promise.resolve(null)
  startCachePromise ??= caches.open(START_CACHE).catch(() => {
    startCachePromise = undefined
    return null
  })
  return startCachePromise
}

/**
 * Tassello di mappa: dalla cache del dispositivo se presente, altrimenti dalla rete (e lo salva).
 * `signal` annulla il download (es. tassello uscito dalla vista); scaduto il tempo la richiesta fallisce.
 */
export async function fetchMapTile(url: string, signal?: AbortSignal): Promise<Blob> {
  const pinned = await (await openStartCache())?.match(url).catch(() => undefined)
  if (pinned) return pinned.blob()
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

/** Salva il tassello nella cache del punto di partenza (copiandolo dalla cache generale se c'è già). */
export async function pinStartTile(url: string): Promise<void> {
  const cache = await openStartCache()
  if (!cache || (await cache.match(url))) return
  const blob = await fetchMapTile(url)
  await cache.put(url, new Response(blob, { headers: { 'Content-Type': blob.type } }))
}

/** Toglie dalla cache del punto di partenza i tasselli non in `keep` (senza argomenti: tutti). */
export async function unpinStartTiles(keep: string[] = []): Promise<void> {
  const cache = await openStartCache()
  if (!cache) return
  const wanted = new Set(keep.map((u) => new URL(u).href))
  const keys = await cache.keys()
  await Promise.all(keys.filter((k) => !wanted.has(k.url)).map((k) => cache.delete(k)))
}
