import { elevationsFromTiles } from '../core/elevation'
import { fetchWithRetry } from '../core/http'
import { fetchPersistent } from '../core/persistentCache'
import type { LatLon } from '../core/types'
import { readPixels } from './pixels'
import { TERRARIUM_CACHE_MAX_TILES } from '../config'

const TILE_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

// Le tile sono statiche: si tengono per tutta la sessione, comprese quelle ancora in download.
const tiles = new Map<string, Promise<Uint8ClampedArray>>()

async function downloadTile(z: number, x: number, y: number): Promise<Uint8ClampedArray> {
  const url = TILE_URL.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y))
  const res = await fetchPersistent(url, {
    cacheName: 'terrarium-v1',
    maxEntries: TERRARIUM_CACHE_MAX_TILES,
    fetchFn: (u) => fetchWithRetry(u),
    storage: typeof caches === 'undefined' ? undefined : caches,
  })
  if (!res.ok) throw new Error(`Tile quote non disponibile (${res.status})`)
  return (await readPixels(await res.blob())).data
}

function loadTile(z: number, x: number, y: number): Promise<Uint8ClampedArray> {
  const key = `${z}/${x}/${y}`
  let tile = tiles.get(key)
  if (!tile) {
    tile = downloadTile(z, x, y)
    tiles.set(key, tile)
    tile.catch(() => tiles.delete(key))
  }
  return tile
}

/** Quote (m) per una lista di punti, lette dalle tile Terrarium. */
export function fetchElevations(points: LatLon[]): Promise<number[]> {
  return elevationsFromTiles(points, loadTile)
}
