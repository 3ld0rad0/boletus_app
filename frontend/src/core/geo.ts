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

/** Griglia size×size di celle quadrate che copre il quadrato di semilato `radiusM` attorno a `center`. */
export function generateGrid(center: LatLon, size: number, radiusM: number): GridCell[] {
  if (!Number.isInteger(size) || size < 1) throw new Error('size deve essere un intero >= 1')
  const side = (2 * radiusM) / size
  const cells: GridCell[] = []
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const east = -radiusM + side * (col + 0.5)
      const north = radiusM - side * (row + 0.5)
      const sw = offsetMeters(center, east - side / 2, north - side / 2)
      const ne = offsetMeters(center, east + side / 2, north + side / 2)
      cells.push({
        id: `${row}-${col}`,
        center: offsetMeters(center, east, north),
        bounds: { south: sw.lat, west: sw.lon, north: ne.lat, east: ne.lon },
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
