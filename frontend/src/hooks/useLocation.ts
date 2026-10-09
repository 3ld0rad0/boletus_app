import { useEffect, useState } from 'react'
import { locationProvider, type LocationError, type LocationProvider, type Position } from '../services/location'

export function useLocation(provider: LocationProvider = locationProvider) {
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
      ),
    [provider],
  )

  return { position, error }
}
