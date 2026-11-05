import { describe, expect, it, vi } from 'vitest'
import { fetchPersistent, flushPersistentWrites } from './persistentCache'

function fakeStorage() {
  const entries = new Map<string, Response>()
  const cache = {
    match: async (url: string) => entries.get(url)?.clone(),
    put: async (url: string, res: Response) => void entries.set(url, res),
    keys: async () => [...entries.keys()].map((url) => new Request(url)),
    delete: async (req: Request) => entries.delete(req.url),
  }
  return { entries, cache, storage: { open: async () => cache as never } }
}

const ok = () => Promise.resolve(new Response('png'))
const base = { cacheName: 'c', maxEntries: 2 }

describe('fetchPersistent', () => {
  it('al secondo accesso usa la cache senza rete', async () => {
    const { storage } = fakeStorage()
    const fetchFn = vi.fn(ok)
    await fetchPersistent('http://x/a', { ...base, fetchFn, storage })
    await flushPersistentWrites()
    const second = await fetchPersistent('http://x/a', { ...base, fetchFn, storage })
    expect(await second.text()).toBe('png')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('non salva le risposte non ok', async () => {
    const { entries, storage } = fakeStorage()
    const fetchFn = vi.fn(async () => new Response('', { status: 429 }))
    const res = await fetchPersistent('http://x/a', { ...base, fetchFn, storage })
    expect(res.status).toBe(429)
    expect(entries.size).toBe(0)
  })
  it('oltre il tetto elimina le voci più vecchie', async () => {
    const { entries, storage } = fakeStorage()
    for (const name of ['a', 'b', 'c']) await fetchPersistent(`http://x/${name}`, { ...base, fetchFn: ok, storage })
    await flushPersistentWrites()
    expect([...entries.keys()]).toEqual(['http://x/b', 'http://x/c'])
  })
  it('restituisce la risposta senza attendere il salvataggio', async () => {
    const { cache } = fakeStorage()
    let release!: () => void
    const slow = { ...cache, put: () => new Promise<void>((r) => (release = r)) }
    const res = await fetchPersistent('http://x/a', { ...base, fetchFn: ok, storage: { open: async () => slow as never } })
    expect(await res.text()).toBe('png')
    release()
    await flushPersistentWrites()
  })
  it('non elenca le chiavi a ogni scrittura nelle cache grandi', async () => {
    const { cache } = fakeStorage()
    const keys = vi.spyOn(cache, 'keys')
    const opts = { cacheName: 'big', maxEntries: 100, fetchFn: ok, storage: { open: async () => cache as never } }
    for (let i = 0; i < 30; i++) await fetchPersistent(`http://x/${i}`, opts)
    await flushPersistentWrites()
    expect(keys.mock.calls.length).toBeLessThanOrEqual(4)
  })
  it('senza storage va direttamente in rete', async () => {
    const fetchFn = vi.fn(ok)
    await fetchPersistent('http://x/a', { ...base, fetchFn })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('un errore della cache non blocca il download', async () => {
    const storage = { open: async () => Promise.reject(new Error('quota')) }
    const res = await fetchPersistent('http://x/a', { ...base, fetchFn: ok, storage })
    expect(await res.text()).toBe('png')
  })
})
