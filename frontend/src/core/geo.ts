import type { GridCell, LatLon } from './types'

const EARTH_RADIUS_M = 6_371_000
const METERS_PER_DEG_LAT = 111_320

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

export function haversineM(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Direzione iniziale da `from` a `to`, in gradi 0..360 (0 = nord, senso orario). */
export function bearingDeg(from: LatLon, to: LatLon): number {
  const lat1 = toRad(from.lat)
  const lat2 = toRad(to.lat)
  const dLon = toRad(to.lon - from.lon)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']

export function cardinal(bearing: number): string {
  return CARDINALS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0).replace('.', ',')} km`
}

/** Sposta un punto di (east, north) metri; approssimazione valida per piccole distanze. */
export function offsetMeters(origin: LatLon, eastM: number, northM: number): LatLon {
  return {
    lat: origin.lat + northM / METERS_PER_DEG_LAT,
    lon: origin.lon + eastM / (METERS_PER_DEG_LAT * Math.cos(toRad(origin.lat))),
  }
}

const polarPoint = (center: LatLon, distM: number, angleRad: number): LatLon =>
  offsetMeters(center, distM * Math.sin(angleRad), distM * Math.cos(angleRad))

/** Settore anulare tra `innerM` e `outerM` e tra gli angoli (da nord, orari); con `innerM` = 0 è un disco. */
function annularSector(center: LatLon, innerM: number, outerM: number, startRad: number, endRad: number): LatLon[] {
  const steps = Math.max(2, Math.ceil(((endRad - startRad) / (2 * Math.PI)) * 48))
  const angleAt = (i: number) => startRad + ((endRad - startRad) * i) / steps
  const polygon: LatLon[] = []
  for (let i = 0; i <= steps; i++) polygon.push(polarPoint(center, outerM, angleAt(i)))
  if (innerM > 0) for (let i = steps; i >= 0; i--) polygon.push(polarPoint(center, innerM, angleAt(i)))
  return polygon
}

/**
 * Griglia polare entro il cerchio di raggio `radiusM`: un disco centrale e `rings - 1` corone,
 * divise in 8·k settori (k = indice della corona) per mantenere le celle di area simile.
 */
export function generateGrid(center: LatLon, rings: number, radiusM: number): GridCell[] {
  if (!Number.isInteger(rings) || rings < 1) throw new Error('rings deve essere un intero >= 1')
  const width = radiusM / rings
  const cells: GridCell[] = [
    { id: '0-0', center, polygon: annularSector(center, 0, width, 0, 2 * Math.PI) },
  ]
  for (let ring = 1; ring < rings; ring++) {
    const innerM = ring * width
    const outerM = innerM + width
    const sectors = 8 * ring
    for (let s = 0; s < sectors; s++) {
      const start = (2 * Math.PI * s) / sectors
      const end = (2 * Math.PI * (s + 1)) / sectors
      cells.push({
        id: `${ring}-${s}`,
        center: polarPoint(center, (innerM + outerM) / 2, (start + end) / 2),
        polygon: annularSector(center, innerM, outerM, start, end),
      })
    }
  }
  return cells
}

/** Anello chiuso di [lon, lat] che approssima un cerchio. */
export function circleRing(center: LatLon, radiusM: number, steps = 48): [number, number][] {
  const ring: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const angle = (2 * Math.PI * i) / steps
    const p = offsetMeters(center, radiusM * Math.sin(angle), radiusM * Math.cos(angle))
    ring.push([p.lon, p.lat])
  }
  return ring
}
