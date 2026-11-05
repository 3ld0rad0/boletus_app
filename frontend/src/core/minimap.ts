import { bearingDeg, haversineM } from './geo'
import type { LatLon } from './types'

const RANGE_STEPS_M = [100, 250, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000]

/** Raggio "tondo" (m) della mini mappa che contiene almeno `maxM` metri. */
export function niceRange(maxM: number): number {
  return RANGE_STEPS_M.find((s) => s >= maxM) ?? Math.ceil(maxM / 50_000) * 50_000
}

/**
 * Posizione di `p` rispetto a `origin` su un disco di raggio `radius` (nord in alto, y verso il basso).
 * I punti oltre `rangeM` vengono tenuti sul bordo.
 */
export function projectToMini(origin: LatLon, p: LatLon, rangeM: number, radius: number): { x: number; y: number } {
  const dist = haversineM(origin, p)
  if (dist === 0) return { x: 0, y: 0 }
  const b = (bearingDeg(origin, p) * Math.PI) / 180
  const r = (Math.min(dist, rangeM) / rangeM) * radius
  return { x: Math.sin(b) * r, y: -Math.cos(b) * r }
}

/** Scala della mini mappa: sempre almeno 100 m, con un 10% di margine oltre il punto più lontano. */
export function miniRange(origin: LatLon, points: LatLon[]): number {
  const far = points.reduce((m, p) => Math.max(m, haversineM(origin, p)), 0)
  return niceRange(far * 1.1)
}
