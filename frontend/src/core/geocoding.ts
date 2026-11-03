import { fetchWithRetry } from './http'
import { createCache } from './memoryCache'

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
