import { fetchPersistent } from '../core/persistentCache'
import { TILE_CACHE_MAX_TILES } from '../config'

/** Tassello di mappa: dalla cache del dispositivo se presente, altrimenti dalla rete (e lo salva). */
export async function fetchMapTile(url: string): Promise<Blob> {
  const res = await fetchPersistent(url, {
    cacheName: 'map-tiles-v1',
    maxEntries: TILE_CACHE_MAX_TILES,
    // Richiesta CORS: la risposta non è opaca e quindi si può salvare.
    fetchFn: (u) => fetch(u, { mode: 'cors' }),
    storage: typeof caches === 'undefined' ? undefined : caches,
  })
  if (!res.ok) throw new Error(`Tassello non disponibile (${res.status})`)
  return res.blob()
}
