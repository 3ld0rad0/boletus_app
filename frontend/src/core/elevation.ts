import type { LatLon } from './types'

export const TILE_SIZE = 256
/** Zoom 12: circa 30 m per pixel a 45° di latitudine. */
export const TERRARIUM_ZOOM = 12

/** Pixel RGBA (256×256) di una tile Terrarium. */
export type TileLoader = (z: number, x: number, y: number) => Promise<Uint8ClampedArray>

/** Quota in metri dal colore di un pixel Terrarium. */
export const decodeTerrarium = (r: number, g: number, b: number) => r * 256 + g + b / 256 - 32768

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Tile e pixel (proiezione Web Mercator) che contengono il punto. */
export function pointToTilePixel(p: LatLon, zoom: number) {
  const n = 2 ** zoom
  const latRad = (p.lat * Math.PI) / 180
  const worldX = ((p.lon + 180) / 360) * n * TILE_SIZE
  const worldY = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n * TILE_SIZE
  const x = clamp(Math.floor(worldX / TILE_SIZE), 0, n - 1)
  const y = clamp(Math.floor(worldY / TILE_SIZE), 0, n - 1)
  return {
    x,
    y,
    px: clamp(Math.floor(worldX - x * TILE_SIZE), 0, TILE_SIZE - 1),
    py: clamp(Math.floor(worldY - y * TILE_SIZE), 0, TILE_SIZE - 1),
  }
}

/** Quota di ogni punto, caricando una sola volta ciascuna tile coinvolta. */
export async function elevationsFromTiles(
  points: LatLon[],
  loadTile: TileLoader,
  zoom = TERRARIUM_ZOOM,
): Promise<number[]> {
  const located = points.map((p) => pointToTilePixel(p, zoom))
  const tiles = new Map<string, Promise<Uint8ClampedArray>>()
  for (const { x, y } of located) {
    const key = `${x}/${y}`
    if (!tiles.has(key)) tiles.set(key, loadTile(zoom, x, y))
  }
  const loaded = new Map(await Promise.all([...tiles].map(async ([key, tile]) => [key, await tile] as const)))
  return located.map(({ x, y, px, py }) => {
    const data = loaded.get(`${x}/${y}`)!
    const i = (py * TILE_SIZE + px) * 4
    return decodeTerrarium(data[i], data[i + 1], data[i + 2])
  })
}
