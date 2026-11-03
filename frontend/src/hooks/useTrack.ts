import { useEffect, useState } from 'react'
import { appendPoint } from '../core/track'
import type { LatLon } from '../core/types'
import type { Position } from '../services/location'
import { storage, STORAGE_KEYS } from '../services/storage'
import type { StartPoint } from './useStartPoint'

const MIN_STEP_M = 20
const MAX_ACCURACY_M = 35
const MAX_POINTS = 3000
const NO_POINTS: LatLon[] = []

interface StoredTrack {
  startSavedAt: string
  points: LatLon[]
}

function record(prev: StoredTrack | null, startPoint: StartPoint | null, position: Position | null) {
  if (!startPoint || !position || position.accuracyM > MAX_ACCURACY_M) return prev
  const sameStart = prev?.startSavedAt === startPoint.savedAt
  const base = sameStart ? prev.points : [{ lat: startPoint.lat, lon: startPoint.lon }]
  const points = appendPoint(base, position, MIN_STEP_M, MAX_POINTS)
  return sameStart && points === base ? prev : { startSavedAt: startPoint.savedAt, points }
}

/**
 * Percorso (breadcrumb) dal punto di partenza alla posizione attuale. Si registra solo con la
 * pagina aperta, dura quanto il punto di partenza e viene salvato nel browser.
 */
export function useTrack(position: Position | null, startPoint: StartPoint | null): LatLon[] {
  const [stored, setStored] = useState<StoredTrack | null>(() => storage.get<StoredTrack>(STORAGE_KEYS.track))
  const [seen, setSeen] = useState({ position, startPoint })

  // Aggiornamento durante il render (schema previsto da React): evita un render in più dopo ogni fix GPS.
  if (seen.position !== position || seen.startPoint !== startPoint) {
    setSeen({ position, startPoint })
    const next = record(stored, startPoint, position)
    if (next !== stored) setStored(next)
  }

  useEffect(() => {
    if (!startPoint) storage.remove(STORAGE_KEYS.track)
    else if (stored?.startSavedAt === startPoint.savedAt) storage.set(STORAGE_KEYS.track, stored)
  }, [stored, startPoint])

  return startPoint && stored?.startSavedAt === startPoint.savedAt ? stored.points : NO_POINTS
}
