import { useCallback, useEffect, useState } from 'react'
import { api, type Spot, type User } from '../services/api'

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

/** Punti salvati sul server dall'utente autenticato. */
export function useSpots(user: User | null) {
  const [spots, setSpots] = useState<Spot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .listSpots()
      .then((list) => {
        if (cancelled) return
        setSpots(list)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(message(e, 'Errore nel caricamento dei punti'))
      })
    return () => {
      cancelled = true
    }
  }, [user, version])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  const remove = useCallback(async (id: number) => {
    try {
      await api.deleteSpot(id)
      setSpots((list) => list.filter((s) => s.id !== id))
    } catch (e) {
      setError(message(e, 'Errore nell’eliminazione'))
    }
  }, [])

  // Dopo il logout la lista precedente non va mostrata.
  return { spots: user ? spots : [], error: user ? error : null, refresh, remove }
}
