import { useEffect, useState } from 'react'
import { sunsetTime } from '../core/sun'
import { cancelSunsetNotification, scheduleSunsetNotification } from '../services/notifications'
import type { StartPoint } from './useStartPoint'

const WARN_BEFORE_MS = 60 * 60_000
const MAX_START_AGE_MS = 18 * 3_600_000
const TICK_MS = 30_000

export interface SunsetWarning {
  sunset: Date
  minutesLeft: number
}

/** Avviso da un'ora prima del tramonto finché l'app è aperta e c'è un punto di partenza salvato oggi. */
export function useSunsetWarning(startPoint: StartPoint | null) {
  const [now, setNow] = useState(() => Date.now())
  const [dismissedFor, setDismissedFor] = useState<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  // Notifica nativa: arriva anche con l'app in background o chiusa.
  const lat = startPoint?.lat
  const lon = startPoint?.lon
  const hasStart = startPoint !== null
  const savedAt = startPoint?.savedAt
  useEffect(() => {
    if (!hasStart || lat === undefined || lon === undefined || !savedAt) {
      void cancelSunsetNotification().catch(() => undefined)
      return
    }
    if (Date.now() - new Date(savedAt).getTime() >= MAX_START_AGE_MS) return
    const sunset = sunsetTime(new Date(), { lat, lon })
    if (!sunset) return
    const at = new Date(sunset.getTime() - WARN_BEFORE_MS)
    void scheduleSunsetNotification(at, sunset).catch(() => undefined)
  }, [hasStart, lat, lon, savedAt])

  let warning: SunsetWarning | null = null
  const sunset = startPoint ? sunsetTime(new Date(now), startPoint) : null
  if (startPoint && sunset) {
    const savedAt = new Date(startPoint.savedAt).getTime()
    const active =
      now >= sunset.getTime() - WARN_BEFORE_MS && savedAt < sunset.getTime() && now - savedAt < MAX_START_AGE_MS
    if (active && dismissedFor !== sunset.getTime()) {
      warning = { sunset, minutesLeft: Math.round((sunset.getTime() - now) / 60_000) }
    }
  }

  const dismiss = () => sunset && setDismissedFor(sunset.getTime())
  return { warning, dismiss }
}
