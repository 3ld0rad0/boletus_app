import type { GridCell, Habitat, LatLon } from './types'

export interface BBox {
  south: number
  west: number
  north: number
  east: number
}

/** Un'area di OpenStreetMap con il suo habitat: anelli esterni e anelli interni (radure). */
export interface HabitatArea {
  habitat: Habitat
  bbox: BBox
  outer: LatLon[][]
  inner: LatLon[][]
}

interface OsmPoint {
  lat: number
  lon: number
}

interface OsmElement {
  type: string
  tags?: Record<string, string>
  geometry?: OsmPoint[]
  members?: { type: string; role: string; geometry?: OsmPoint[] }[]
}

export interface OverpassResponse {
  elements: OsmElement[]
}

// Un bbox agganciato a questa griglia permette di riusare la risposta per calcoli vicini.
const SNAP_DEG = 0.005

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

/** Query Overpass per boschi e prati (ways e relazioni) nel rettangolo, con la geometria. */
export function overpassQuery(b: BBox): string {
  const bb = `${b.south},${b.west},${b.north},${b.east}`
  const natural = '["natural"~"^(wood|grassland)$"]'
  const landuse = '["landuse"~"^(forest|meadow)$"]'
  return `[out:json][timeout:25];(way${natural}(${bb});way${landuse}(${bb});relation${natural}(${bb});relation${landuse}(${bb}););out geom;`
}

export function habitatFromTags(tags: Record<string, string> | undefined): Habitat | null {
  if (!tags) return null
  if (tags.natural === 'wood' || tags.landuse === 'forest') {
    if (tags.leaf_type === 'needleleaved') return 'conifer'
    if (tags.leaf_type === 'broadleaved') return 'broadleaf'
    if (tags.leaf_type === 'mixed') return 'mixed'
    return 'forest'
  }
  if (tags.natural === 'grassland' || tags.landuse === 'meadow') return 'grassland'
  return null
}

const samePoint = (a: LatLon, b: LatLon) => a.lat === b.lat && a.lon === b.lon

/** Unisce i segmenti che condividono gli estremi in anelli chiusi; scarta quelli che restano aperti. */
export function assembleRings(segments: LatLon[][]): LatLon[][] {
  const rest = segments.filter((s) => s.length > 1).map((s) => [...s])
  const rings: LatLon[][] = []
  while (rest.length) {
    const ring = rest.shift()!
    let extended = true
    while (extended && !samePoint(ring[0], ring[ring.length - 1])) {
      extended = false
      const end = ring[ring.length - 1]
      const i = rest.findIndex((s) => samePoint(s[0], end) || samePoint(s[s.length - 1], end))
      if (i >= 0) {
        const [next] = rest.splice(i, 1)
        ring.push(...(samePoint(next[0], end) ? next : [...next].reverse()).slice(1))
        extended = true
      }
    }
    if (ring.length >= 4 && samePoint(ring[0], ring[ring.length - 1])) rings.push(ring)
  }
  return rings
}

function bboxOf(rings: LatLon[][]): BBox {
  const points = rings.flat()
  return {
    south: Math.min(...points.map((p) => p.lat)),
    west: Math.min(...points.map((p) => p.lon)),
    north: Math.max(...points.map((p) => p.lat)),
    east: Math.max(...points.map((p) => p.lon)),
  }
}

/** Converte la risposta Overpass (`out geom`) in aree con habitat. */
export function parseHabitatAreas(data: OverpassResponse): HabitatArea[] {
  const areas: HabitatArea[] = []
  for (const el of data.elements) {
    const habitat = habitatFromTags(el.tags)
    if (!habitat) continue
    let outer: LatLon[][] = []
    let inner: LatLon[][] = []
    if (el.type === 'way' && el.geometry) {
      outer = assembleRings([el.geometry])
    } else if (el.type === 'relation' && el.members) {
      const ways = el.members.filter((m) => m.type === 'way' && m.geometry)
      outer = assembleRings(ways.filter((m) => m.role !== 'inner').map((m) => m.geometry!))
      inner = assembleRings(ways.filter((m) => m.role === 'inner').map((m) => m.geometry!))
    }
    if (outer.length) areas.push({ habitat, bbox: bboxOf(outer), outer, inner })
  }
  return areas
}

/** Test del punto nel poligono (ray casting): x = longitudine, y = latitudine. */
export function pointInRing(p: LatLon, ring: LatLon[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    if (a.lat > p.lat !== b.lat > p.lat && p.lon < ((b.lon - a.lon) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lon) {
      inside = !inside
    }
  }
  return inside
}

// In caso di sovrapposizioni vince l'habitat più specifico.
const PRIORITY: Record<Habitat, number> = { conifer: 3, broadleaf: 3, mixed: 3, forest: 2, grassland: 1, none: 0 }

function contains(area: HabitatArea, p: LatLon): boolean {
  const { bbox } = area
  if (p.lat < bbox.south || p.lat > bbox.north || p.lon < bbox.west || p.lon > bbox.east) return false
  return area.outer.some((r) => pointInRing(p, r)) && !area.inner.some((r) => pointInRing(p, r))
}

/** Habitat più specifico che contiene il punto; `none` se nessuna area lo contiene. */
export function habitatAt(p: LatLon, areas: HabitatArea[]): Habitat {
  let best: Habitat = 'none'
  for (const area of areas) {
    if (PRIORITY[area.habitat] > PRIORITY[best] && contains(area, p)) best = area.habitat
  }
  return best
}
