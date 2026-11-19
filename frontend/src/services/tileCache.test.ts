import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMapTile, TILE_TIMEOUT_MS } from './tileCache'

// Fetch che non risponde mai, ma rispetta l'annullamento come quello vero.
function hangingFetch() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_, reject) => {
      const fail = () => reject(new DOMException('annullato', 'AbortError'))
      if (init?.signal?.aborted) fail()
      init?.signal?.addEventListener('abort', fail)
    })
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('fetchMapTile', () => {
  it('scarica il tassello', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('png')))
    expect(await (await fetchMapTile('http://x/1')).text()).toBe('png')
  })
  it('annulla la richiesta quando il segnale scatta', async () => {
    const fetchFn = hangingFetch()
    vi.stubGlobal('fetch', fetchFn)
    const ctrl = new AbortController()
    const result = fetchMapTile('http://x/1', ctrl.signal)
    ctrl.abort()
    await expect(result).rejects.toThrow('annullato')
  })
  it('non parte nemmeno se il segnale è già scattato', async () => {
    vi.stubGlobal('fetch', hangingFetch())
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(fetchMapTile('http://x/1', ctrl.signal)).rejects.toThrow()
  })
  it('scaduto il tempo la richiesta fallisce', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', hangingFetch())
    const result = fetchMapTile('http://x/1')
    const assertion = expect(result).rejects.toThrow('annullato')
    await vi.advanceTimersByTimeAsync(TILE_TIMEOUT_MS)
    await assertion
  })
  it('un errore HTTP non produce un tassello', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    await expect(fetchMapTile('http://x/1')).rejects.toThrow('503')
  })
})

function fakeCaches() {
  const stores = new Map<string, Map<string, Response>>()
  const open = async (name: string) => {
    const entries = stores.get(name) ?? new Map<string, Response>()
    stores.set(name, entries)
    return {
      match: async (url: string) => entries.get(url)?.clone(),
      put: async (url: string, res: Response) => void entries.set(url, res),
      keys: async () => [...entries.keys()].map((url) => new Request(url)),
      delete: async (req: Request) => entries.delete(req.url),
    }
  }
  return { stores, caches: { open } }
}

describe('tasselli del punto di partenza', () => {
  // Modulo nuovo a ogni test: la cache aperta viene ricordata a livello di modulo.
  async function setup() {
    vi.resetModules()
    const fake = fakeCaches()
    vi.stubGlobal('caches', fake.caches)
    const fetchFn = vi.fn(async () => new Response('png'))
    vi.stubGlobal('fetch', fetchFn)
    return { ...fake, fetchFn, mod: await import('./tileCache') }
  }

  it('un tassello salvato si legge senza rete', async () => {
    const { mod, fetchFn } = await setup()
    await mod.pinStartTile('http://x/1')
    fetchFn.mockRejectedValue(new TypeError('offline'))
    expect(await (await mod.fetchMapTile('http://x/1')).text()).toBe('png')
  })
  it('non riscarica un tassello già salvato', async () => {
    const { mod, fetchFn } = await setup()
    await mod.pinStartTile('http://x/1')
    await mod.pinStartTile('http://x/1')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('libera solo i tasselli che non servono più', async () => {
    const { mod, stores } = await setup()
    await mod.pinStartTile('http://x/1')
    await mod.pinStartTile('http://x/2')
    await mod.unpinStartTiles(['http://x/2'])
    expect([...stores.get('start-tiles-v1')!.keys()]).toEqual(['http://x/2'])
    await mod.unpinStartTiles()
    expect(stores.get('start-tiles-v1')!.size).toBe(0)
  })
})
