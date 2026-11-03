import { offsetMeters } from './geo'
import type { LatLon } from './types'

export interface Tile {
  z: number
  x: number
  y: number
}

/** Indici (x, y) del tassello Web Mercator che contiene il punto allo zoom `z`. */
export function lonLatToTile(p: LatLon, z: number): { x: number; y: number } {
  const n = 2 ** z
  const latRad = (p.lat * Math.PI) / 180
  const x = Math.floor(((p.lon + 180) / 360) * n)
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) }
}

/** Tasselli che coprono il quadrato di lato 2·`radiusM` attorno a `center`, per ciascuno zoom. */
export function tilesAround(center: LatLon, radiusM: number, zooms: number[]): Tile[] {
  const sw = offsetMeters(center, -radiusM, -radiusM)
  const ne = offsetMeters(center, radiusM, radiusM)
  const tiles: Tile[] = []
  for (const z of zooms) {
    const topLeft = lonLatToTile({ lat: ne.lat, lon: sw.lon }, z)
    const bottomRight = lonLatToTile({ lat: sw.lat, lon: ne.lon }, z)
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) tiles.push({ z, x, y })
    }
  }
  return tiles
}

/** Compila il modello di URL dei tasselli ({s} sceglie un sottodominio tra a, b, c). */
export function tileUrl(template: string, { z, x, y }: Tile): string {
  return template
    .replace('{s}', 'abc'[(x + y) % 3])
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}
