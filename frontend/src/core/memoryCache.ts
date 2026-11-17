/** Cache in memoria con scadenza; memorizza la promessa, così richieste identiche e simultanee condividono lo stesso download. */
export function createCache(ttlMs: number) {
  const entries = new Map<string, { expires: number; promise: Promise<unknown> }>()
  return {
    get<T>(key: string, load: () => Promise<T>): Promise<T> {
      const hit = entries.get(key)
      if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>
      const promise = load()
      entries.set(key, { expires: Date.now() + ttlMs, promise })
      promise.catch(() => {
        if (entries.get(key)?.promise === promise) entries.delete(key)
      })
      return promise
    },
    clear() {
      entries.clear()
    },
  }
}
