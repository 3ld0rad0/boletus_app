import type { LatLon, WeatherSummary } from './types'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation'
const ELEVATION_BATCH = 100
const CACHE_TTL_MS = 60 * 60 * 1000

export const RAIN_WINDOW_DAYS = 10
export const HUMIDITY_WINDOW_DAYS = 10
export const TEMP_WINDOW_DAYS = 5

export interface HourlyResponse {
  elevation: number
  hourly: {
    time: number[]
    temperature_2m: (number | null)[]
    relative_humidity_2m: (number | null)[]
    precipitation: (number | null)[]
  }
}

type FetchFn = typeof fetch

function valuesInWindow(times: number[], values: (number | null)[], nowSec: number, days: number): number[] {
  const from = nowSec - days * 86_400
  const out: number[] = []
  times.forEach((t, i) => {
    const v = values[i]
    if (t > from && t <= nowSec && typeof v === 'number') out.push(v)
  })
  return out
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/** Aggrega i dati orari passati, escludendo le ore future di previsione. */
export function aggregateHourly(data: HourlyResponse, nowMs: number): WeatherSummary {
  const nowSec = Math.floor(nowMs / 1000)
  const h = data.hourly
  const temps = valuesInWindow(h.time, h.temperature_2m, nowSec, TEMP_WINDOW_DAYS)
  const hums = valuesInWindow(h.time, h.relative_humidity_2m, nowSec, HUMIDITY_WINDOW_DAYS)
  const rains = valuesInWindow(h.time, h.precipitation, nowSec, RAIN_WINDOW_DAYS)
  if (!temps.length || !hums.length) throw new Error('Dati meteo insufficienti')
  return {
    referenceElevationM: data.elevation,
    tempMeanC: mean(temps),
    rainSumMm: sum(rains),
    humidityMeanPct: mean(hums),
  }
}

const cache = new Map<string, { expires: number; value: unknown }>()

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await load()
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value })
  return value
}

export function clearWeatherCache(): void {
  cache.clear()
}

async function getJson<T>(url: string, fetchFn: FetchFn): Promise<T> {
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`Open-Meteo ha risposto ${res.status}`)
  return (await res.json()) as T
}

/** Riepilogo meteo degli ultimi giorni per un punto (coordinate arrotondate a 2 decimali per la cache). */
export function fetchWeatherSummary(point: LatLon, fetchFn: FetchFn = fetch): Promise<WeatherSummary> {
  const latitude = point.lat.toFixed(2)
  const longitude = point.lon.toFixed(2)
  return cached(`weather:${latitude},${longitude}`, async () => {
    const params = new URLSearchParams({
      latitude,
      longitude,
      hourly: 'temperature_2m,relative_humidity_2m,precipitation',
      past_days: String(RAIN_WINDOW_DAYS),
      forecast_days: '1',
      timeformat: 'unixtime',
    })
    const data = await getJson<HourlyResponse>(`${FORECAST_URL}?${params}`, fetchFn)
    return aggregateHourly(data, Date.now())
  })
}

/** Quote (m) per una lista di punti, richieste in batch da 100. */
export function fetchElevations(points: LatLon[], fetchFn: FetchFn = fetch): Promise<number[]> {
  const key = `elev:${points.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join(';')}`
  return cached(key, async () => {
    const result: number[] = []
    for (let i = 0; i < points.length; i += ELEVATION_BATCH) {
      const batch = points.slice(i, i + ELEVATION_BATCH)
      const params = new URLSearchParams({
        latitude: batch.map((p) => p.lat.toFixed(5)).join(','),
        longitude: batch.map((p) => p.lon.toFixed(5)).join(','),
      })
      const data = await getJson<{ elevation: number[] }>(`${ELEVATION_URL}?${params}`, fetchFn)
      result.push(...data.elevation)
    }
    return result
  })
}
