import { bearingDeg, haversineM } from './geo'
import {
  addWalk,
  advance,
  EMPTY_WALK,
  learnHeadingOffset,
  learnStepLength,
  meanHeadingDeg,
  normalizeDeg,
  PDR_BASE_UNCERTAINTY_M,
  pdrTailLength,
  reanchorTail,
  straightness,
  UNCERTAINTY_GROWTH,
  UNCERTAINTY_GROWTH_COMPASS,
  type Calibration,
  type Walk,
} from './pdr'
import { appendPoint, capPoints } from './track'
import type { LatLon, TrackPoint } from './types'

export const MAX_ACCURACY_M = 35
export const MIN_STEP_M = 20
export const MAX_POINTS = 3000
/** Senza un fix valido da tanto, i passi muovono la posizione stimata. */
export const GPS_TIMEOUT_MS = 10_000
/** Passi stimati più vicini di così all'ultimo punto ne spostano solo la punta. */
const PDR_MIN_STEP_M = 5
/** Oltre questa incertezza la stima non è più da considerare affidabile. */
export const UNRELIABLE_UNCERTAINTY_M = 50

// Calibrazione col GPS: solo con fix precisi, su tratti lunghi e dritti.
const CAL_MAX_ACCURACY_M = 10
const CAL_MIN_DIST_M = 50
const CAL_MIN_STEPS = 25
const CAL_MIN_STRAIGHTNESS = 0.9

// Direzione di cammino dai fix GPS: serve un tratto lungo rispetto all'errore.
const BEARING_MAX_ACCURACY_M = 12
const BEARING_MIN_DIST_M = 25

export interface Fix extends LatLon {
  accuracyM: number
  timestamp: number
}

export interface HybridState {
  points: TrackPoint[]
  calibration: Calibration
  lastGoodFixAt: number
  /** Inizio della finestra di calibrazione GPS. */
  anchor: LatLon | null
  window: Walk
  /** Passi dall'ultimo fix valido: servono a recuperare il tratto prima che scada il timeout. */
  pending: Walk
  /**
   * Direzione di cammino rispetto al nord reale: parte dal GPS e segue le svolte del giroscopio,
   * quindi non dipende da come è tenuto il telefono. `null` finché il GPS non l'ha misurata.
   */
  walkHeadingDeg: number | null
  /** Ultimo fix da cui misurare la direzione GPS. */
  bearingAnchor: LatLon | null
}

export function createHybridState(points: TrackPoint[], calibration: Calibration, now: number): HybridState {
  return {
    points,
    calibration,
    lastGoodFixAt: now,
    anchor: null,
    window: EMPTY_WALK,
    pending: EMPTY_WALK,
    walkHeadingDeg: null,
    bearingAnchor: null,
  }
}

/** Percorsi salvati prima del PDR: contengono solo coordinate, tutte misurate. */
export function normalizeStoredPoints(points: (LatLon & Partial<TrackPoint>)[]): TrackPoint[] {
  return points.map((p) => ({
    lat: p.lat,
    lon: p.lon,
    source: p.source ?? 'gps',
    uncertaintyM: p.uncertaintyM ?? PDR_BASE_UNCERTAINTY_M,
  }))
}

export function applyFix(state: HybridState, fix: Fix): HybridState {
  if (fix.accuracyM > MAX_ACCURACY_M) return state
  const point: TrackPoint = { lat: fix.lat, lon: fix.lon, source: 'gps', uncertaintyM: fix.accuracyM }
  const afterPdr = pdrTailLength(state.points) > 0
  const points = afterPdr
    ? capPoints(reanchorTail(state.points, point), MAX_POINTS)
    : appendPoint(state.points, point, MIN_STEP_M, MAX_POINTS)

  const reliable = fix.accuracyM <= CAL_MAX_ACCURACY_M
  let { calibration, anchor, window } = state
  if (afterPdr) {
    anchor = reliable ? fix : null
    window = EMPTY_WALK
  } else if (reliable) {
    if (anchor === null) {
      anchor = fix
      window = EMPTY_WALK
    } else {
      const distM = haversineM(anchor, fix)
      if (distM >= CAL_MIN_DIST_M) {
        const compass = meanHeadingDeg(window)
        if (compass !== null && window.steps >= CAL_MIN_STEPS && straightness(window) >= CAL_MIN_STRAIGHTNESS) {
          calibration = learnStepLength(calibration, distM, window.steps)
          calibration = learnHeadingOffset(calibration, bearingDeg(anchor, fix), compass)
        }
        anchor = fix
        window = EMPTY_WALK
      }
    }
  }

  let { walkHeadingDeg, bearingAnchor } = state
  if (fix.accuracyM <= BEARING_MAX_ACCURACY_M) {
    if (afterPdr || bearingAnchor === null) {
      bearingAnchor = fix
    } else if (haversineM(bearingAnchor, fix) >= BEARING_MIN_DIST_M) {
      walkHeadingDeg = bearingDeg(bearingAnchor, fix)
      bearingAnchor = fix
    }
  }
  return {
    points,
    calibration,
    anchor,
    window,
    pending: EMPTY_WALK,
    walkHeadingDeg,
    bearingAnchor,
    lastGoodFixAt: Math.max(state.lastGoodFixAt, fix.timestamp),
  }
}

function walkForward(points: TrackPoint[], walk: Walk, stepLengthM: number, growth: number): TrackPoint[] {
  const last = points[points.length - 1]
  const heading = meanHeadingDeg(walk)
  if (!last || heading === null) return points
  const distM = walk.weight * stepLengthM
  const next = advance(last, heading, distM)
  const point: TrackPoint = {
    lat: Math.round(next.lat * 1e6) / 1e6,
    lon: Math.round(next.lon * 1e6) / 1e6,
    source: 'pdr',
    uncertaintyM: Math.max(last.uncertaintyM, PDR_BASE_UNCERTAINTY_M) + distM * growth,
  }
  const prev = points[points.length - 2]
  const mergeTip = last.source === 'pdr' && prev !== undefined && haversineM(prev, point) < PDR_MIN_STEP_M
  return capPoints([...(mergeTip ? points.slice(0, -1) : points), point], MAX_POINTS)
}

export interface StepBatch {
  steps: number
  /** Direzione media letta dalla bussola rispetto al nord reale; `null` se non disponibile. */
  headingDeg: number | null
  /** Rotazione oraria attorno alla verticale dal batch precedente (giroscopio). */
  yawDeltaDeg?: number
  now: number
}

export function applySteps(state: HybridState, { steps, headingDeg, yawDeltaDeg = 0, now }: StepBatch): HybridState {
  if (steps <= 0) return state
  const { walkHeadingDeg } = state
  // Direzione del batch: quella di cammino (a metà della svolta) se nota, altrimenti la bussola corretta.
  const dir =
    walkHeadingDeg !== null
      ? normalizeDeg(walkHeadingDeg + yawDeltaDeg / 2)
      : headingDeg === null
        ? null
        : normalizeDeg(headingDeg + state.calibration.headingOffsetDeg)
  const nextWalkHeading = walkHeadingDeg === null ? null : normalizeDeg(walkHeadingDeg + yawDeltaDeg)

  if (now - state.lastGoodFixAt <= GPS_TIMEOUT_MS) {
    return {
      ...state,
      walkHeadingDeg: nextWalkHeading,
      // La calibrazione confronta il GPS con la bussola grezza.
      window: addWalk(state.window, steps, headingDeg),
      pending: addWalk(state.pending, steps, dir),
    }
  }
  const growth = walkHeadingDeg !== null ? UNCERTAINTY_GROWTH : UNCERTAINTY_GROWTH_COMPASS
  const stepLengthM = state.calibration.stepLengthM
  let points = walkForward(state.points, state.pending, stepLengthM, growth)
  points = walkForward(points, addWalk(EMPTY_WALK, steps, dir), stepLengthM, growth)
  return { ...state, points, walkHeadingDeg: nextWalkHeading, pending: EMPTY_WALK, window: EMPTY_WALK, anchor: null }
}

export interface Estimate {
  uncertaintyM: number
  unreliable: boolean
}

/** Non `null` finché la posizione attuale è una stima e non una misura GPS. */
export function currentEstimate(points: TrackPoint[]): Estimate | null {
  const last = points[points.length - 1]
  if (!last || last.source !== 'pdr') return null
  return { uncertaintyM: last.uncertaintyM, unreliable: last.uncertaintyM >= UNRELIABLE_UNCERTAINTY_M }
}
