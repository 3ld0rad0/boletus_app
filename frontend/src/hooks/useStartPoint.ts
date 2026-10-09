import { useCallback, useState } from 'react'
import type { LatLon } from '../core/types'
import { api, type User } from '../services/api'
import { storage, STORAGE_KEYS } from '../services/storage'

export interface StartPoint extends LatLon {
  savedAt: string
}

/**
 * Punto di partenza: salvato sempre in locale (funziona senza rete e senza account);
 * se l'utente è autenticato viene anche inviato al server.
 */
export function useStartPoint(user: User | null, onSynced?: () => void) {
  const [startPoint, setStartPoint] = useState<StartPoint | null>(() =>
    storage.get<StartPoint>(STORAGE_KEYS.startPoint),
  )
  const [syncError, setSyncError] = useState<string | null>(null)

  const save = useCallback(
    async ({ lat, lon }: LatLon) => {
      const point: StartPoint = { lat, lon, savedAt: new Date().toISOString() }
      setStartPoint(point)
      storage.set(STORAGE_KEYS.startPoint, point)
      setSyncError(null)
      if (!user) return
      try {
        const when = new Date(point.savedAt).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
        await api.createSpot({ name: `Partenza ${when}`, kind: 'start', lat, lon })
        onSynced?.()
      } catch {
        setSyncError('Punto salvato solo sul dispositivo (sincronizzazione non riuscita).')
      }
    },
    [user, onSynced],
  )

  const clear = useCallback(() => {
    setStartPoint(null)
    storage.remove(STORAGE_KEYS.startPoint)
    setSyncError(null)
  }, [])

  /** Imposta come partenza un punto esistente (es. recuperato dal server) senza ricrearlo. */
  const restore = useCallback(({ lat, lon }: LatLon) => {
    const point: StartPoint = { lat, lon, savedAt: new Date().toISOString() }
    setStartPoint(point)
    storage.set(STORAGE_KEYS.startPoint, point)
  }, [])

  return { startPoint, syncError, save, clear, restore }
}
