type CacheLike = Pick<Cache, 'match' | 'put' | 'keys' | 'delete'>

export interface PersistentFetchOptions {
  cacheName: string
  /** Numero massimo di risposte tenute: oltre il tetto si eliminano le più vecchie. */
  maxEntries: number
  fetchFn: (url: string) => Promise<Response>
  /** Assente (es. contesto non sicuro) = nessuna cache persistente. */
  storage?: { open(name: string): Promise<CacheLike> }
}

async function store(cache: CacheLike, url: string, res: Response, maxEntries: number) {
  await cache.put(url, res)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((k) => cache.delete(k)))
}

/** Legge dalla Cache API, altrimenti scarica e salva solo le risposte ok; gli errori della cache non bloccano la rete. */
export async function fetchPersistent(url: string, opts: PersistentFetchOptions): Promise<Response> {
  const { cacheName, maxEntries, fetchFn, storage } = opts
  const cache = await storage?.open(cacheName).catch(() => null)
  if (!cache) return fetchFn(url)
  const hit = await cache.match(url).catch(() => undefined)
  if (hit) return hit
  const res = await fetchFn(url)
  if (res.ok) await store(cache, url, res.clone(), maxEntries).catch(() => {})
  return res
}
