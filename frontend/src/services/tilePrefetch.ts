import { tilesAround, tileUrl } from '../core/tiles'
import type { LatLon } from '../core/types'
import { GRID_RADIUS_M, OFFLINE_TILE_ZOOMS, TILE_URL } from '../config'
import { isConstrainedConnection } from './network'
import { fetchMapTile, pinStartTile, unpinStartTiles } from './tileCache'

// Poche richieste in parallelo: la precarica non deve togliere banda ai tasselli che si stanno guardando.
const CONCURRENCY = 2
// Se la mappa non finisce di caricare (es. rete bloccata) si parte comunque dopo questo tempo.
const IDLE_WAIT_MS = 10_000
const done = new Set<string>()
// Punto di partenza i cui tasselli sono (o stanno per essere) salvati; vuoto = nessuno.
let pinnedKey = ''

let markIdle!: () => void
const mapIdle = new Promise<void>((resolve) => (markIdle = resolve))

/** La mappa visibile ha finito di caricare: da qui si può precaricare. */
export function markMapIdle() {
  markIdle()
}

interface PrefetchOptions {
  /** Tessere scaricate sul totale. */
  onProgress?: (done: number, total: number) => void
  concurrency?: number
  /** Tasselli del punto di partenza: cache a parte che non viene potata e sostituisce quella del punto precedente. */
  pin?: boolean
}

/**
 * Scarica e salva sul dispositivo le tessere attorno a un punto, per avere una mappa anche senza rete.
 * Aspetta che la mappa visibile sia caricata; non fa nulla offline o con risparmio dati/2G.
 * Le tessere già salvate non vengono richieste di nuovo.
 */
export async function prefetchTiles(
  center: LatLon,
  { onProgress, concurrency = CONCURRENCY, pin = false }: PrefetchOptions = {},
): Promise<void> {
  const key = `${center.lat.toFixed(3)},${center.lon.toFixed(3)}`
  const urls = tilesAround(center, GRID_RADIUS_M, OFFLINE_TILE_ZOOMS).map((t) => tileUrl(TILE_URL, t))
  if (pin) {
    if (pinnedKey === key) return
    pinnedKey = key
    await unpinStartTiles(urls).catch(() => {})
  } else {
    if (done.has(key)) return
    done.add(key)
  }
  if (!navigator.onLine || isConstrainedConnection()) return

  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([mapIdle, new Promise<void>((resolve) => (timer = setTimeout(resolve, IDLE_WAIT_MS)))])
  clearTimeout(timer)
  if (!navigator.onLine || isConstrainedConnection()) return

  const fetchTile = pin ? pinStartTile : fetchMapTile
  let next = 0
  let finished = 0
  const worker = async () => {
    while (next < urls.length) {
      // Il punto di partenza è cambiato: questi tasselli non servono più.
      if (pin && pinnedKey !== key) return
      try {
        await fetchTile(urls[next++])
      } catch {
        // Tessera non scaricabile: la mappa online la chiederà di nuovo quando serve.
      }
      onProgress?.(++finished, urls.length)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
}

/** Il punto di partenza è stato eliminato: libera i suoi tasselli. */
export function forgetStartTiles(): Promise<void> {
  pinnedKey = ''
  return unpinStartTiles().catch(() => {})
}
