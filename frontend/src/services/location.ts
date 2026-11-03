import { Capacitor } from '@capacitor/core'
import { BackgroundGeolocation } from '@capgo/background-geolocation'
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

/** Astrazione sul GPS: implementazione web (browser) e nativa (Capacitor, anche in background). */
export interface LocationProvider {
  /**
   * Avvia il tracciamento; restituisce la funzione per fermarlo. Con `background` le posizioni
   * continuano ad arrivare a schermo spento o app in secondo piano, ma solo dove il provider lo supporta.
   */
  watch(
    onPosition: (p: Position) => void,
    onError: (e: LocationError) => void,
    options?: { background?: boolean },
  ): () => void
  getCurrent(): Promise<Position>
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }

const MESSAGES: Record<LocationErrorKind, string> = {
  unsupported: 'Il dispositivo non supporta la geolocalizzazione.',
  'insecure-context': 'La geolocalizzazione richiede HTTPS (o localhost).',
  'permission-denied': 'Permesso di posizione negato: abilitalo nelle impostazioni.',
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

// Le chiamate al plugin vanno in coda: uno stop seguito da uno start non devono sovrapporsi.
let nativeQueue: Promise<unknown> = Promise.resolve()
const enqueueNative = (task: () => Promise<unknown>) => {
  nativeQueue = nativeQueue.then(task, task)
}

const fromNativeError = (e: unknown): LocationError =>
  makeError((e as { code?: string } | null)?.code === 'NOT_AUTHORIZED' ? 'permission-denied' : 'unavailable')

export const nativeLocationProvider: LocationProvider = {
  watch(onPosition, onError, { background = false } = {}) {
    let active = true
    enqueueNative(() =>
      BackgroundGeolocation.start(
        {
          // Senza messaggio il plugin non avvia il servizio in primo piano: posizioni solo con l'app aperta.
          ...(background && {
            backgroundTitle: 'Boletus',
            backgroundMessage: 'Registro il percorso per aiutarti a tornare al punto di partenza',
          }),
          requestPermissions: true,
          stale: false,
        },
        (location, error) => {
          if (!active) return
          if (error) onError(fromNativeError(error))
          else if (location) {
            onPosition({
              lat: location.latitude,
              lon: location.longitude,
              accuracyM: location.accuracy,
              timestamp: location.time ?? Date.now(),
            })
          }
        },
      ).catch((e: unknown) => active && onError(fromNativeError(e))),
    )
    return () => {
      active = false
      enqueueNative(() => BackgroundGeolocation.stop())
    }
  },
  getCurrent: () => webLocationProvider.getCurrent(),
}

export const locationProvider: LocationProvider = Capacitor.isNativePlatform()
  ? nativeLocationProvider
  : webLocationProvider
