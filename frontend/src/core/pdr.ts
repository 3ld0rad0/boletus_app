import { offsetMeters } from './geo'
import type { LatLon, TrackPoint } from './types'

export const DEFAULT_STEP_LENGTH_M = 0.7
export const MIN_STEP_LENGTH_M = 0.4
export const MAX_STEP_LENGTH_M = 1.1
/** Incertezza aggiunta per ogni metro camminato alla cieca (deriva tipica di passi + bussola). */
export const UNCERTAINTY_GROWTH = 0.12
/** Come sopra quando la direzione viene solo dalla bussola, inaffidabile se il telefono è in tasca. */
export const UNCERTAINTY_GROWTH_COMPASS = 0.2
/** Errore di partenza di una stima: quello di un buon fix GPS. */
export const PDR_BASE_UNCERTAINTY_M = 10

const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

export const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360

/** Differenza con segno `a - b`, in (-180, 180]. */
export const angleDiffDeg = (a: number, b: number) => {
  const d = ((((a - b) % 360) + 540) % 360) - 180
  return d === -180 ? 180 : d
}

/** Spostamento di `distanceM` metri dal punto `from`, nella direzione `headingDeg` (0 = nord, orario). */
export function advance(from: LatLon, headingDeg: number, distanceM: number): LatLon {
  const r = toRad(headingDeg)
  return offsetMeters(from, distanceM * Math.sin(r), distanceM * Math.cos(r))
}

/** Passi camminati in una finestra, con la somma vettoriale delle direzioni (pesata sui passi). */
export interface Walk {
  steps: number
  /** Passi con una direzione nota: pesi di `sin`/`cos`. */
  weight: number
  sin: number
  cos: number
}

export const EMPTY_WALK: Walk = { steps: 0, weight: 0, sin: 0, cos: 0 }

export function addWalk(walk: Walk, steps: number, headingDeg: number | null): Walk {
  if (headingDeg === null) return { ...walk, steps: walk.steps + steps }
  const r = toRad(headingDeg)
  return {
    steps: walk.steps + steps,
    weight: walk.weight + steps,
    sin: walk.sin + steps * Math.sin(r),
    cos: walk.cos + steps * Math.cos(r),
  }
}

export function meanHeadingDeg(walk: Walk): number | null {
  return walk.weight > 0 ? normalizeDeg(toDeg(Math.atan2(walk.sin, walk.cos))) : null
}

/** 1 se tutti i passi vanno nella stessa direzione, verso 0 se cambiano molto. */
export function straightness(walk: Walk): number {
  return walk.weight > 0 ? Math.hypot(walk.sin, walk.cos) / walk.weight : 0
}

export interface Calibration {
  stepLengthM: number
  stepSamples: number
  /** Da sommare alla bussola per ottenere la direzione di cammino. */
  headingOffsetDeg: number
  headingSamples: number
}

export const INITIAL_CALIBRATION: Calibration = {
  stepLengthM: DEFAULT_STEP_LENGTH_M,
  stepSamples: 0,
  headingOffsetDeg: 0,
  headingSamples: 0,
}

// Media mobile: i primi campioni pesano di più, poi si stabilizza.
const alphaFor = (samples: number) => Math.max(0.15, 1 / (samples + 2))

/** Aggiorna la lunghezza del passo con `distM` percorsi in `steps` passi misurati col GPS. */
export function learnStepLength(cal: Calibration, distM: number, steps: number): Calibration {
  if (steps <= 0) return cal
  const sample = distM / steps
  if (sample < MIN_STEP_LENGTH_M || sample > MAX_STEP_LENGTH_M) return cal
  const alpha = alphaFor(cal.stepSamples)
  return { ...cal, stepLengthM: cal.stepLengthM + (sample - cal.stepLengthM) * alpha, stepSamples: cal.stepSamples + 1 }
}

/** Aggiorna lo scarto bussola confrontando la direzione GPS con quella media letta dalla bussola. */
export function learnHeadingOffset(cal: Calibration, gpsBearingDeg: number, compassDeg: number): Calibration {
  const sample = angleDiffDeg(gpsBearingDeg, compassDeg)
  const alpha = alphaFor(cal.headingSamples)
  return {
    ...cal,
    headingOffsetDeg: angleDiffDeg(cal.headingOffsetDeg + angleDiffDeg(sample, cal.headingOffsetDeg) * alpha, 0),
    headingSamples: cal.headingSamples + 1,
  }
}

/** Numero di punti `pdr` in coda al percorso. */
export function pdrTailLength(points: TrackPoint[]): number {
  let n = 0
  while (n < points.length && points[points.length - 1 - n].source === 'pdr') n++
  return n
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6

/**
 * Aggancia il percorso a un fix GPS: i punti stimati in coda vengono spostati in modo
 * progressivo (l'ultimo coincide col fix) e il fix prende il posto della stima corrente.
 */
export function reanchorTail(points: TrackPoint[], fix: TrackPoint): TrackPoint[] {
  const n = pdrTailLength(points)
  const snapped = { ...fix, lat: round6(fix.lat), lon: round6(fix.lon) }
  if (n === 0) return [...points, snapped]
  const head = points.slice(0, points.length - n)
  const tail = points.slice(points.length - n)
  const estimate = tail[n - 1]
  const dLat = fix.lat - estimate.lat
  const dLon = fix.lon - estimate.lon
  const moved = tail.slice(0, -1).map((p, i): TrackPoint => {
    const f = (i + 1) / n
    return { ...p, lat: round6(p.lat + dLat * f), lon: round6(p.lon + dLon * f) }
  })
  return [...head, ...moved, snapped]
}
