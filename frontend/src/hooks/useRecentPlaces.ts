import { useCallback, useState } from 'react'
import type { Place } from '../core/geocoding'
import { storage, STORAGE_KEYS } from '../services/storage'

const MAX_RECENT = 5

const load = (): Place[] => {
  const stored = storage.get<Place[]>(STORAGE_KEYS.recentPlaces)
  return Array.isArray(stored) ? stored.slice(0, MAX_RECENT) : []
}

/** Ultimi luoghi scelti nella ricerca, dal più recente; persistiti nel browser. */
export function useRecentPlaces() {
  const [recent, setRecent] = useState<Place[]>(load)

  const add = useCallback((place: Place) => {
    setRecent((list) => {
      const next = [place, ...list.filter((p) => p.id !== place.id)].slice(0, MAX_RECENT)
      storage.set(STORAGE_KEYS.recentPlaces, next)
      return next
    })
  }, [])

  return { recent, add }
}
