import { fetchWithRetry } from '../core/http'
import { createCache } from '../core/memoryCache'
import { fetchPersistent } from '../core/persistentCache'
import { overpassQuery, parseHabitatAreas, type BBox, type HabitatArea } from '../core/vegetation'
import { OVERPASS_CACHE_MAX_AREAS } from '../config'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const cache = createCache(60 * 60 * 1000)

/** Boschi e prati di OpenStreetMap nel rettangolo, con cache in memoria e nel browser. */
export function fetchHabitatAreas(bbox: BBox): Promise<HabitatArea[]> {
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(overpassQuery(bbox))}`
  return cache.get(url, async () => {
    const res = await fetchPersistent(url, {
      cacheName: 'overpass-v1',
      maxEntries: OVERPASS_CACHE_MAX_AREAS,
      fetchFn: (u) => fetchWithRetry(u),
      storage: typeof caches === 'undefined' ? undefined : caches,
    })
    if (!res.ok) throw new Error(`Overpass ha risposto ${res.status}`)
    return parseHabitatAreas(await res.json())
  })
}
