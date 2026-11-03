import { tilesAround, tileUrl } from '../core/tiles'
import type { LatLon } from '../core/types'
import { GRID_RADIUS_M, OFFLINE_TILE_ZOOMS, TILE_URL } from '../config'
import { fetchMapTile } from './tileCache'

const CONCURRENCY = 4
const done = new Set<string>()

/**
 * Scarica e salva sul dispositivo le tessere attorno a un punto, per avere una mappa anche senza rete.
 * Non fa nulla offline; le tessere già salvate non vengono richieste di nuovo.
 */
export async function prefetchTiles(center: LatLon): Promise<void> {
  if (!navigator.onLine) return
  const key = `${center.lat.toFixed(3)},${center.lon.toFixed(3)}`
  if (done.has(key)) return
  done.add(key)

  const urls = tilesAround(center, GRID_RADIUS_M, OFFLINE_TILE_ZOOMS).map((t) => tileUrl(TILE_URL, t))
  let next = 0
  const worker = async () => {
    while (next < urls.length) {
      try {
        await fetchMapTile(urls[next++])
      } catch {
        // Tessera non scaricabile: la mappa online la chiederà di nuovo quando serve.
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}
