import { fetchWithRetry } from '../core/http'
import { landcoverRequest, type BBox, type LandcoverImage } from '../core/landcover'
import { createCache } from '../core/memoryCache'
import { fetchPersistent } from '../core/persistentCache'
import { readPixels } from './pixels'
import { CORINE_CACHE_MAX_IMAGES } from '../config'

// Servizio immagini dell'EEA: restituisce CORINE Land Cover 2018 già colorato con la legenda ufficiale.
const CORINE_URL = 'https://image.discomap.eea.europa.eu/arcgis/rest/services/Corine/CLC2018_WM/MapServer/export'
const REQUEST_TIMEOUT_MS = 30_000

const cache = createCache(60 * 60 * 1000)

const timedFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })

function describeError(e: unknown): Error {
  if (e instanceof DOMException && e.name === 'TimeoutError') return new Error('il servizio CORINE non ha risposto in tempo')
  if (e instanceof TypeError) return new Error('servizio CORINE non raggiungibile')
  return e instanceof Error ? e : new Error(String(e))
}

// Gli errori del servizio possono arrivare come 200 con un corpo non immagine: non vanno in cache.
async function fetchImage(url: string): Promise<Response> {
  try {
    const res = await fetchWithRetry(url, timedFetch, { retries: 1 })
    if (!res.ok) throw new Error(`il servizio CORINE ha risposto ${res.status}`)
    if (!res.headers.get('content-type')?.startsWith('image/')) throw new Error('risposta CORINE non valida')
    return res
  } catch (e) {
    throw describeError(e)
  }
}

/** Immagine CORINE del rettangolo, con cache in memoria e nel browser. */
export function fetchLandcover(bbox: BBox): Promise<LandcoverImage> {
  const { extent: e, width, height } = landcoverRequest(bbox)
  const params = new URLSearchParams({
    bbox: `${e.minX},${e.minY},${e.maxX},${e.maxY}`,
    bboxSR: '3857',
    imageSR: '3857',
    size: `${width},${height}`,
    format: 'png8',
    transparent: 'false',
    f: 'image',
  })
  const url = `${CORINE_URL}?${params}`
  return cache.get(url, async () => {
    const res = await fetchPersistent(url, {
      cacheName: 'corine-v1',
      maxEntries: CORINE_CACHE_MAX_IMAGES,
      fetchFn: fetchImage,
      storage: typeof caches === 'undefined' ? undefined : caches,
    })
    const pixels = await readPixels(await res.blob())
    return { extent: e, ...pixels }
  })
}
