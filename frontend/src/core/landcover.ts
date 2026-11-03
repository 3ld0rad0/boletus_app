import type { GridCell, Habitat, LatLon } from './types'

export interface BBox {
  south: number
  west: number
  north: number
  east: number
}

/** Rettangolo in metri Web Mercator (EPSG:3857). */
export interface Extent {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Immagine CORINE Land Cover (RGBA) che copre `extent`. */
export interface LandcoverImage {
  extent: Extent
  width: number
  height: number
  data: Uint8ClampedArray
}

const EARTH_RADIUS_M = 6_378_137
// Un bbox agganciato a questa griglia permette di riusare l'immagine per calcoli vicini.
const SNAP_DEG = 0.005
// CORINE ha celle da 100 m: a 45° un pixel di 75 m Mercator sono circa 50 m reali.
const PIXEL_MERCATOR_M = 75
const MAX_SIZE_PX = 2048

const toRad = (deg: number) => (deg * Math.PI) / 180
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export function toMercator(p: LatLon): { x: number; y: number } {
  return {
    x: EARTH_RADIUS_M * toRad(p.lon),
    y: EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + toRad(p.lat) / 2)),
  }
}

/** Rettangolo che contiene tutte le celle, allargato fino alla griglia di aggancio. */
export function habitatBbox(cells: GridCell[], stepDeg = SNAP_DEG): BBox {
  const points = cells.flatMap((c) => c.polygon)
  const lats = points.map((p) => p.lat)
  const lons = points.map((p) => p.lon)
  const snap = (v: number, round: (x: number) => number) => Number((round(v / stepDeg) * stepDeg).toFixed(5))
  return {
    south: snap(Math.min(...lats), Math.floor),
    west: snap(Math.min(...lons), Math.floor),
    north: snap(Math.max(...lats), Math.ceil),
    east: snap(Math.max(...lons), Math.ceil),
  }
}

/** Estensione Mercator e dimensione in pixel dell'immagine da richiedere per il rettangolo. */
export function landcoverRequest(b: BBox): { extent: Extent; width: number; height: number } {
  const sw = toMercator({ lat: b.south, lon: b.west })
  const ne = toMercator({ lat: b.north, lon: b.east })
  const pixels = (meters: number) => clamp(Math.ceil(meters / PIXEL_MERCATOR_M), 1, MAX_SIZE_PX)
  return {
    extent: { minX: sw.x, minY: sw.y, maxX: ne.x, maxY: ne.y },
    width: pixels(ne.x - sw.x),
    height: pixels(ne.y - sw.y),
  }
}

// Colori della legenda ufficiale CORINE (codice di classe a destra).
const CLC_HABITATS: { rgb: [number, number, number]; habitat: Habitat }[] = [
  { rgb: [128, 255, 0], habitat: 'broadleaf' }, // 311 boschi di latifoglie
  { rgb: [0, 166, 0], habitat: 'conifer' }, // 312 boschi di conifere
  { rgb: [77, 255, 0], habitat: 'mixed' }, // 313 boschi misti
  { rgb: [166, 242, 0], habitat: 'forest' }, // 324 bosco e arbusteto in evoluzione
  { rgb: [230, 230, 77], habitat: 'grassland' }, // 231 prati stabili e pascoli
  { rgb: [204, 242, 77], habitat: 'grassland' }, // 321 praterie naturali
]
const COLOR_TOLERANCE = 12

/** Habitat della classe CORINE con il colore più vicino (entro la tolleranza), altrimenti `none`. */
export function habitatFromColor(r: number, g: number, b: number): Habitat {
  let best: Habitat = 'none'
  let bestDist = COLOR_TOLERANCE ** 2
  for (const { rgb, habitat } of CLC_HABITATS) {
    const dist = (rgb[0] - r) ** 2 + (rgb[1] - g) ** 2 + (rgb[2] - b) ** 2
    if (dist <= bestDist) {
      best = habitat
      bestDist = dist
    }
  }
  return best
}

/** Habitat di ogni punto, letto dal pixel dell'immagine che lo contiene. */
export function habitatsFromImage(points: LatLon[], image: LandcoverImage): Habitat[] {
  const { extent: e, width, height, data } = image
  return points.map((p) => {
    const m = toMercator(p)
    const px = clamp(Math.floor(((m.x - e.minX) / (e.maxX - e.minX)) * width), 0, width - 1)
    const py = clamp(Math.floor(((e.maxY - m.y) / (e.maxY - e.minY)) * height), 0, height - 1)
    const i = (py * width + px) * 4
    return data[i + 3] === 0 ? 'none' : habitatFromColor(data[i], data[i + 1], data[i + 2])
  })
}
