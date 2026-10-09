import type { LatLon } from '../core/types'

export interface Position extends LatLon {
  accuracyM: number
  timestamp: number
}

export type LocationErrorKind = 'unsupported' | 'insecure-context' | 'permission-denied' | 'unavailable' | 'timeout'

export interface LocationError {
  kind: LocationErrorKind
  message: string
}

/**
 * Astrazione sul GPS. Oggi c'è l'implementazione web; per la app mobile basterà
 * aggiungerne una basata su @capacitor/geolocation e cambiare `locationProvider`.
 */
export interface LocationProvider {
  /** Avvia il tracciamento; restituisce la funzione per fermarlo. */
  watch(onPosition: (p: Position) => void, onError: (e: LocationError) => void): () => void
  getCurrent(): Promise<Position>
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }

const MESSAGES: Record<LocationErrorKind, string> = {
  unsupported: 'Il dispositivo non supporta la geolocalizzazione.',
  'insecure-context': 'La geolocalizzazione richiede HTTPS (o localhost).',
  'permission-denied': 'Permesso di posizione negato: abilitalo nelle impostazioni del browser.',
  unavailable: 'Posizione non disponibile: segnale GPS assente o debole.',
  timeout: 'Tempo scaduto nel rilevare la posizione, riprovo…',
}

const makeError = (kind: LocationErrorKind): LocationError => ({ kind, message: MESSAGES[kind] })

function fromGeoError(e: GeolocationPositionError): LocationError {
  if (e.code === e.PERMISSION_DENIED) return makeError('permission-denied')
  if (e.code === e.TIMEOUT) return makeError('timeout')
  return makeError('unavailable')
}

function fromGeoPosition(p: GeolocationPosition): Position {
  return {
    lat: p.coords.latitude,
    lon: p.coords.longitude,
    accuracyM: p.coords.accuracy,
    timestamp: p.timestamp,
  }
}

function precheck(): LocationError | null {
  if (typeof window !== 'undefined' && !window.isSecureContext) return makeError('insecure-context')
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return makeError('unsupported')
  return null
}

export const webLocationProvider: LocationProvider = {
  watch(onPosition, onError) {
    const err = precheck()
    if (err) {
      onError(err)
      return () => {}
    }
    const id = navigator.geolocation.watchPosition(
      (p) => onPosition(fromGeoPosition(p)),
      (e) => onError(fromGeoError(e)),
      OPTIONS,
    )
    return () => navigator.geolocation.clearWatch(id)
  },
  getCurrent() {
    return new Promise((resolve, reject) => {
      const err = precheck()
      if (err) return reject(err)
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(fromGeoPosition(p)),
        (e) => reject(fromGeoError(e)),
        OPTIONS,
      )
    })
  },
}

export const locationProvider: LocationProvider = webLocationProvider
