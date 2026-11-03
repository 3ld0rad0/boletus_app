import { haversineM } from './geo'
import type { LatLon } from './types'

// 6 decimali ≈ 0,1 m: abbastanza, e il percorso salvato resta leggero.
const round6 = (v: number) => Math.round(v * 1e6) / 1e6

/**
 * Aggiunge `p` al percorso se dista almeno `minStepM` dall'ultimo punto; altrimenti restituisce
 * lo stesso array. Oltre `maxPoints` dimezza i punti intermedi, tenendo primo e ultimo.
 */
export function appendPoint(track: LatLon[], p: LatLon, minStepM: number, maxPoints: number): LatLon[] {
  const last = track[track.length - 1]
  if (last && haversineM(last, p) < minStepM) return track
  const next = [...track, { lat: round6(p.lat), lon: round6(p.lon) }]
  if (next.length <= maxPoints) return next
  return next.filter((_, i) => i === 0 || i === next.length - 1 || i % 2 === 0)
}

export function pathLengthM(points: LatLon[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1], points[i])
  return total
}

export interface ReturnGuide {
  /** Punto verso cui camminare ora. */
  target: LatLon
  /** Metri ancora da percorrere fino al punto di partenza, lungo il percorso se disponibile. */
  remainingM: number
  followingTrack: boolean
}

/**
 * Guida di ritorno lungo il percorso già fatto: punta al punto del percorso a circa `lookaheadM`
 * di distanza verso la partenza (o al punto più vicino se si è usciti dal percorso).
 * Senza percorso utile va in linea retta alla partenza.
 */
export function returnGuide(track: LatLon[], position: LatLon, start: LatLon, lookaheadM = 40): ReturnGuide {
  if (track.length < 2) {
    return { target: start, remainingM: haversineM(position, start), followingTrack: false }
  }
  let nearest = 0
  let nearestM = Infinity
  track.forEach((p, i) => {
    const d = haversineM(position, p)
    if (d <= nearestM) {
      nearestM = d
      nearest = i
    }
  })
  const remainingM = nearestM + pathLengthM(track.slice(0, nearest + 1)) + haversineM(track[0], start)

  if (nearestM > lookaheadM) return { target: track[nearest], remainingM, followingTrack: true }
  for (let k = nearest - 1; k >= 0; k--) {
    if (haversineM(position, track[k]) >= lookaheadM) return { target: track[k], remainingM, followingTrack: true }
  }
  return { target: start, remainingM, followingTrack: true }
}
