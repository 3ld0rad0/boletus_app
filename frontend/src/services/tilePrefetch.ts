import { tilesAround, tileUrl } from '../core/tiles'
import type { LatLon } from '../core/types'
import { GRID_RADIUS_M, OFFLINE_TILE_ZOOMS, TILE_URL } from '../config'
import { isConstrainedConnection } from './network'
import { fetchMapTile } from './tileCache'

// Poche richieste in parallelo: la precarica non deve togliere banda ai tasselli che si stanno guardando.
const CONCURRENCY = 2
// Se la mappa non finisce di caricare (es. rete bloccata) si parte comunque dopo questo tempo.
const IDLE_WAIT_MS = 10_000
const done = new Set<string>()

let markIdle!: () => void
const mapIdle = new Promise<void>((resolve) => (markIdle = resolve))

/** La mappa visibile ha finito di caricare: da qui si può precaricare. */
export function markMapIdle() {
  markIdle()
}

/**
 * Scarica e salva sul dispositivo le tessere attorno a un punto, per avere una mappa anche senza rete.
 * Aspetta che la mappa visibile sia caricata; non fa nulla offline o con risparmio dati/2G.
 * Le tessere già salvate non vengono richieste di nuovo.
 */
export async function prefetchTiles(center: LatLon): Promise<void> {
  if (!navigator.onLine || isConstrainedConnection()) return
  const key = `${center.lat.toFixed(3)},${center.lon.toFixed(3)}`
  if (done.has(key)) return
  done.add(key)

  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([mapIdle, new Promise<void>((resolve) => (timer = setTimeout(resolve, IDLE_WAIT_MS)))])
  clearTimeout(timer)
  if (!navigator.onLine || isConstrainedConnection()) return

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
