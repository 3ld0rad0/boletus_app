import { fetchWithRetry } from './http'
import { createCache } from './memoryCache'
import type { LatLon } from './types'

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const MAX_RESULTS = 6

export interface Place {
  id: number
  name: string
  /** Regione e paese, per distinguere località omonime. */
  detail: string
  lat: number
  lon: number
}

interface GeocodingResponse {
  results?: {
    id: number
    name: string
    latitude: number
    longitude: number
    admin1?: string
    country?: string
  }[]
}

export function parsePlaces(data: GeocodingResponse): Place[] {
  return (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }))
}

const cache = createCache(60 * 60 * 1000)

/** Cerca località per nome (geocoding Open-Meteo); query vuote o di un solo carattere danno nessun risultato. */
export function searchPlaces(query: string, fetchFn: typeof fetch = fetch): Promise<Place[]> {
  const name = query.trim()
  if (name.length < 2) return Promise.resolve([])
  return cache.get(name.toLowerCase(), async () => {
    const params = new URLSearchParams({ name, count: String(MAX_RESULTS), language: 'it', format: 'json' })
    const res = await fetchWithRetry(`${GEOCODING_URL}?${params}`, fetchFn)
    if (!res.ok) throw new Error(`Ricerca non disponibile (${res.status})`)
    return parsePlaces((await res.json()) as GeocodingResponse)
  })
}

export interface PlaceName {
  name: string
  /** Provincia e regione. */
  detail: string
}

interface ReverseResponse {
  name?: string
  address?: Record<string, string | undefined>
}

/** Comune più vicino dalla risposta di Nominatim; `null` se non c'è un indirizzo. */
export function parseReverse(data: ReverseResponse): PlaceName | null {
  const a = data.address
  if (!a) return null
  const name = a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet ?? data.name
  if (!name) return null
  return { name, detail: [a.county ?? a.state_district, a.state].filter(Boolean).join(', ') }
}

const REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse'
const reverseCache = createCache(24 * 60 * 60 * 1000)

/** Comune più vicino a un punto (Nominatim, livello comune); una sola richiesta per punto, poi in cache. */
export function reverseGeocode(point: LatLon, fetchFn: typeof fetch = fetch): Promise<PlaceName | null> {
  const lat = point.lat.toFixed(3)
  const lon = point.lon.toFixed(3)
  return reverseCache.get(`${lat},${lon}`, async () => {
    const params = new URLSearchParams({ format: 'jsonv2', lat, lon, zoom: '10', 'accept-language': 'it' })
    const res = await fetchWithRetry(`${REVERSE_URL}?${params}`, fetchFn)
    if (!res.ok) throw new Error(`Località non disponibile (${res.status})`)
    return parseReverse((await res.json()) as ReverseResponse)
  })
}
