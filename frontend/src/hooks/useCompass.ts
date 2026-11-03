import { useCallback, useEffect, useState } from 'react'

export type CompassStatus = 'off' | 'starting' | 'active' | 'denied' | 'unavailable'

const NO_SIGNAL_TIMEOUT_MS = 3000
const ERROR_VISIBLE_MS = 5000
// Frazione della differenza applicata a ogni lettura: attenua il tremolio del sensore.
const SMOOTHING = 0.3

interface PermissionedOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

/**
 * Orientamento del dispositivo rispetto al nord geografico. Parte solo su richiesta
 * (iOS chiede un permesso, che deve nascere da un gesto dell'utente).
 */
export function useCompass() {
  const [enabled, setEnabled] = useState(false)
  const [status, setStatus] = useState<CompassStatus>('off')
  // Angolo non normalizzato (può superare 360°): evita lo scatto all'attraversamento del nord.
  const [angle, setAngle] = useState<number | null>(null)

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false)
      setStatus('off')
      setAngle(null)
      return
    }
    if (typeof DeviceOrientationEvent === 'undefined') {
      setStatus('unavailable')
      return
    }
    const { requestPermission } = DeviceOrientationEvent as unknown as PermissionedOrientationEvent
    if (typeof requestPermission === 'function') {
      try {
        if ((await requestPermission()) !== 'granted') {
          setStatus('denied')
          return
        }
      } catch {
        setStatus('denied')
        return
      }
    }
    setStatus('starting')
    setEnabled(true)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let current: number | null = null
    const update = (raw: number) => {
      const diff = ((((raw - (current ?? raw)) % 360) + 540) % 360) - 180
      current = (current ?? raw) + diff * SMOOTHING
      setAngle(current)
      setStatus('active')
    }
    // Android/Chrome: alpha assoluto, antiorario dal nord.
    const onAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) update((360 - e.alpha) % 360)
    }
    // iOS/Safari: direzione della bussola già oraria dal nord.
    const onRelative = (e: DeviceOrientationEvent) => {
      const heading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      if (typeof heading === 'number') update(heading)
    }
    const noSignal = window.setTimeout(() => {
      if (current === null) {
        setEnabled(false)
        setStatus('unavailable')
      }
    }, NO_SIGNAL_TIMEOUT_MS)
    window.addEventListener('deviceorientationabsolute', onAbsolute as EventListener)
    window.addEventListener('deviceorientation', onRelative)
    return () => {
      window.clearTimeout(noSignal)
      window.removeEventListener('deviceorientationabsolute', onAbsolute as EventListener)
      window.removeEventListener('deviceorientation', onRelative)
    }
  }, [enabled])

  useEffect(() => {
    if (status !== 'denied' && status !== 'unavailable') return
    const t = window.setTimeout(() => setStatus('off'), ERROR_VISIBLE_MS)
    return () => window.clearTimeout(t)
  }, [status])

  const heading = angle === null ? null : ((angle % 360) + 360) % 360
  return { status, angle, heading, toggle }
}

export type Compass = ReturnType<typeof useCompass>
