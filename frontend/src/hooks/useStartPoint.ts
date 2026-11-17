import { useCallback, useState } from 'react'
import type { LatLon } from '../core/types'
import { storage, STORAGE_KEYS } from '../services/storage'

export interface StartPoint extends LatLon {
  savedAt: string
}

/** Punto di partenza, salvato solo sul dispositivo (funziona senza rete). */
export function useStartPoint() {
  const [startPoint, setStartPoint] = useState<StartPoint | null>(() =>
    storage.get<StartPoint>(STORAGE_KEYS.startPoint),
  )

  const save = useCallback(({ lat, lon }: LatLon) => {
    const point: StartPoint = { lat, lon, savedAt: new Date().toISOString() }
    setStartPoint(point)
    storage.set(STORAGE_KEYS.startPoint, point)
  }, [])

  const clear = useCallback(() => {
    setStartPoint(null)
    storage.remove(STORAGE_KEYS.startPoint)
  }, [])

  return { startPoint, save, clear }
}
