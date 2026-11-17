import { useEffect, useMemo, useState } from 'react'
import {
  applyFix,
  applySteps,
  createHybridState,
  currentEstimate,
  normalizeStoredPoints,
  type Estimate,
  type HybridState,
} from '../core/hybridTrack'
import { INITIAL_CALIBRATION, PDR_BASE_UNCERTAINTY_M, type Calibration } from '../core/pdr'
import type { LatLon, TrackPoint } from '../core/types'
import type { Position } from '../services/location'
import { motionProvider, type MotionProvider } from '../services/motion'
import { storage, STORAGE_KEYS } from '../services/storage'
import type { StartPoint } from './useStartPoint'

const NO_POINTS: TrackPoint[] = []

interface StoredTrack {
  startSavedAt: string
  points: (LatLon & Partial<TrackPoint>)[]
}

interface Session {
  startSavedAt: string
  hybrid: HybridState
}

const loadCalibration = () => storage.get<Calibration>(STORAGE_KEYS.pdrCalibration) ?? INITIAL_CALIBRATION

function load(): Session | null {
  const stored = storage.get<StoredTrack>(STORAGE_KEYS.track)
  if (!stored) return null
  const hybrid = createHybridState(normalizeStoredPoints(stored.points), loadCalibration(), Date.now())
  return { startSavedAt: stored.startSavedAt, hybrid }
}

function record(prev: Session | null, startPoint: StartPoint | null, position: Position | null): Session | null {
  if (!startPoint || !position) return prev
  const sameStart = prev?.startSavedAt === startPoint.savedAt
  const base = sameStart
    ? prev.hybrid
    : createHybridState(
        [{ lat: startPoint.lat, lon: startPoint.lon, source: 'gps', uncertaintyM: PDR_BASE_UNCERTAINTY_M }],
        prev?.hybrid.calibration ?? loadCalibration(),
        position.timestamp,
      )
  const hybrid = applyFix(base, position)
  return sameStart && hybrid === base ? prev : { startSavedAt: startPoint.savedAt, hybrid }
}

/**
 * Percorso dal punto di partenza alla posizione attuale: punti GPS, e punti stimati da passi e bussola
 * quando il GPS manca. Si registra solo con l'app attiva, dura quanto il punto di partenza e viene salvato.
 * `estimate` è non nullo finché la posizione attuale è una stima.
 */
export function useTrack(
  position: Position | null,
  startPoint: StartPoint | null,
  motion: MotionProvider = motionProvider,
): { points: TrackPoint[]; estimate: Estimate | null } {
  const [session, setSession] = useState<Session | null>(load)
  const [seen, setSeen] = useState({ position, startPoint })

  // Aggiornamento durante il render (schema previsto da React): evita un render in più dopo ogni fix GPS.
  if (seen.position !== position || seen.startPoint !== startPoint) {
    setSeen({ position, startPoint })
    const next = record(session, startPoint, position)
    if (next !== session) setSession(next)
  }

  const tracking = startPoint !== null
  useEffect(() => {
    if (!tracking) return
    return motion.watch(
      (e) =>
        setSession((prev) =>
          prev
            ? {
                ...prev,
                hybrid: applySteps(prev.hybrid, {
                  steps: e.steps,
                  headingDeg: e.headingDeg,
                  yawDeltaDeg: e.yawDeltaDeg,
                  now: e.timestamp,
                }),
              }
            : prev,
        ),
      () => {}, // Senza sensori il percorso resta solo GPS.
    )
  }, [motion, tracking])

  const startSavedAt = session?.startSavedAt
  const points = session?.hybrid.points
  const calibration = session?.hybrid.calibration
  useEffect(() => {
    if (!startPoint) storage.remove(STORAGE_KEYS.track)
    else if (startSavedAt === startPoint.savedAt && points) storage.set(STORAGE_KEYS.track, { startSavedAt, points })
  }, [startSavedAt, points, startPoint])
  useEffect(() => {
    if (calibration && calibration.stepSamples + calibration.headingSamples > 0) {
      storage.set(STORAGE_KEYS.pdrCalibration, calibration)
    }
  }, [calibration])

  const active = startPoint && session?.startSavedAt === startPoint.savedAt ? points : undefined
  const estimate = useMemo(() => (active ? currentEstimate(active) : null), [active])
  return { points: active ?? NO_POINTS, estimate }
}
