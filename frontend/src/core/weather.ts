import { fetchWithRetry } from './http'
import { createCache } from './memoryCache'
import type { CurrentWeather, HourlyPoint, LatLon, WeatherSummary } from './types'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
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
  current?: {
    time: number
    temperature_2m: number | null
    relative_humidity_2m: number | null
    precipitation: number | null
    wind_speed_10m: number | null
    weather_code: number | null
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

function currentFrom(c: HourlyResponse['current']): CurrentWeather | undefined {
  if (!c || c.temperature_2m === null || c.weather_code === null) return undefined
  return {
    t: c.time,
    tempC: c.temperature_2m,
    humidityPct: c.relative_humidity_2m ?? 0,
    precipitationMm: c.precipitation ?? 0,
    windKmh: c.wind_speed_10m ?? 0,
    weatherCode: c.weather_code,
  }
}

function historyInWindow(h: HourlyResponse['hourly'], nowSec: number, days: number): HourlyPoint[] {
  const from = nowSec - days * 86_400
  const out: HourlyPoint[] = []
  h.time.forEach((t, i) => {
    if (t > from && t <= nowSec) {
      out.push({ t, tempC: h.temperature_2m[i], humidityPct: h.relative_humidity_2m[i], rainMm: h.precipitation[i] })
    }
  })
  return out
}

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
    history: historyInWindow(h, nowSec, Math.max(RAIN_WINDOW_DAYS, HUMIDITY_WINDOW_DAYS, TEMP_WINDOW_DAYS)),
    current: currentFrom(data.current),
  }
}

const cache = createCache(CACHE_TTL_MS)

export function clearWeatherCache(): void {
  cache.clear()
}

async function getJson<T>(url: string, fetchFn: FetchFn): Promise<T> {
  const res = await fetchWithRetry(url, fetchFn)
  if (!res.ok) throw new Error(`Open-Meteo ha risposto ${res.status}`)
  return (await res.json()) as T
}

/** Riepilogo meteo degli ultimi giorni per un punto (coordinate arrotondate a 2 decimali per la cache). */
export function fetchWeatherSummary(point: LatLon, fetchFn: FetchFn = fetch): Promise<WeatherSummary> {
  const latitude = point.lat.toFixed(2)
  const longitude = point.lon.toFixed(2)
  return cache.get(`weather:${latitude},${longitude}`, async () => {
    const params = new URLSearchParams({
      latitude,
      longitude,
      hourly: 'temperature_2m,relative_humidity_2m,precipitation',
      current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
      past_days: String(RAIN_WINDOW_DAYS),
      forecast_days: '1',
      timeformat: 'unixtime',
    })
    const data = await getJson<HourlyResponse>(`${FORECAST_URL}?${params}`, fetchFn)
    return aggregateHourly(data, Date.now())
  })
}
