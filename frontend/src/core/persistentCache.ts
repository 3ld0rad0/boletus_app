type CacheLike = Pick<Cache, 'match' | 'put' | 'keys' | 'delete'>

export interface PersistentFetchOptions {
  cacheName: string
  /** Numero massimo di risposte tenute: oltre il tetto si eliminano le più vecchie. */
  maxEntries: number
  fetchFn: (url: string) => Promise<Response>
  /** Assente (es. contesto non sicuro) = nessuna cache persistente. */
  storage?: { open(name: string): Promise<CacheLike> }
}

const pending = new Set<Promise<void>>()
const opened = new WeakMap<object, Map<string, Promise<CacheLike>>>()
const writesSincePrune = new Map<string, number>()

/** Attende i salvataggi in corso (serve ai test e a chi vuole leggere subito dopo). */
export async function flushPersistentWrites(): Promise<void> {
  while (pending.size) await Promise.all([...pending])
}

function openCache(storage: NonNullable<PersistentFetchOptions['storage']>, name: string): Promise<CacheLike> {
  let byName = opened.get(storage)
  if (!byName) opened.set(storage, (byName = new Map()))
  let cache = byName.get(name)
  if (!cache) {
    cache = storage.open(name)
    byName.set(name, cache)
    // Un'apertura fallita non va ricordata: la volta dopo si riprova.
    cache.catch(() => byName.delete(name))
  }
  return cache
}

async function store(cache: CacheLike, name: string, url: string, res: Response, maxEntries: number) {
  await cache.put(url, res)
  // Elencare le chiavi costa: si pota ogni tanto (la prima volta sempre, per le cache già piene).
  const every = Math.max(1, Math.floor(maxEntries / 10))
  const writes = (writesSincePrune.get(name) ?? every) + 1
  if (writes < every) return void writesSincePrune.set(name, writes)
  writesSincePrune.set(name, 0)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((k) => cache.delete(k)))
}

/**
 * Legge dalla Cache API, altrimenti scarica e restituisce subito la risposta: il salvataggio avviene
 * in background e salva solo le risposte ok. Gli errori della cache non bloccano la rete.
 */
export async function fetchPersistent(url: string, opts: PersistentFetchOptions): Promise<Response> {
  const { cacheName, maxEntries, fetchFn, storage } = opts
  const cache = storage ? await openCache(storage, cacheName).catch(() => null) : null
  if (!cache) return fetchFn(url)
  const hit = await cache.match(url).catch(() => undefined)
  if (hit) return hit
  const res = await fetchFn(url)
  if (res.ok) {
    const saving: Promise<void> = store(cache, cacheName, url, res.clone(), maxEntries)
      .catch(() => {})
      .finally(() => pending.delete(saving))
    pending.add(saving)
  }
  return res
}
