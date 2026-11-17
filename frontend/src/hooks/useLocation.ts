import { useEffect, useState } from 'react'
import { locationProvider, type LocationError, type LocationProvider, type Position } from '../services/location'

/** `background`: continua a ricevere posizioni a schermo spento (solo app nativa). */
export function useLocation(background = false, provider: LocationProvider = locationProvider) {
  const [position, setPosition] = useState<Position | null>(null)
  const [error, setError] = useState<LocationError | null>(null)

  useEffect(
    () =>
      provider.watch(
        (p) => {
          setPosition(p)
          setError(null)
        },
        setError,
        { background },
      ),
    [provider, background],
  )

  return { position, error }
}
