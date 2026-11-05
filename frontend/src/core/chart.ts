import type { HourlyPoint } from './types'

export interface DailyRain {
  /** Giorno locale come `YYYY-MM-DD`. */
  day: string
  /** Mezzogiorno locale del giorno, in secondi Unix. */
  t: number
  mm: number
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Somma la pioggia oraria per giorno locale (il primo e l'ultimo giorno possono essere parziali). */
export function dailyRain(history: HourlyPoint[]): DailyRain[] {
  const days = new Map<string, DailyRain>()
  for (const p of history) {
    if (p.rainMm === null) continue
    const d = new Date(p.t * 1000)
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTime() / 1000
    const entry = days.get(key) ?? { day: key, t: noon, mm: 0 }
    entry.mm += p.rainMm
    days.set(key, entry)
  }
  return [...days.values()]
}

/** Intervallo [min, max] dei valori, con un margine e mai di ampiezza nulla. */
export function valueRange(values: number[], padRatio = 0.1): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max((max - min) * padRatio, 0.5)
  return [min - pad, max + pad]
}

/** Indice del punto con `t` più vicino a quello richiesto (array ordinato per `t`). */
export function nearestIndex(ts: number[], t: number): number {
  let best = 0
  for (let i = 1; i < ts.length; i++) if (Math.abs(ts[i] - t) < Math.abs(ts[best] - t)) best = i
  return best
}
