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
