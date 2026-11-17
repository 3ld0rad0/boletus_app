import { describe, expect, it, vi } from 'vitest'
import { fetchWithRetry } from './http'

const noSleep = () => Promise.resolve()

describe('fetchWithRetry', () => {
  it('ritenta sul 429 e poi restituisce la risposta', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok'))
    const res = await fetchWithRetry('u', fetchFn, { sleep: noSleep })
    expect(res.status).toBe(200)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
  it('non ritenta sugli errori 4xx diversi da 429', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('', { status: 404 }))
    expect((await fetchWithRetry('u', fetchFn, { sleep: noSleep })).status).toBe(404)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('dopo i tentativi restituisce l\'ultima risposta', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => new Response('', { status: 429 }))
    expect((await fetchWithRetry('u', fetchFn, { retries: 2, sleep: noSleep })).status).toBe(429)
    expect(fetchFn).toHaveBeenCalledTimes(3)
  })
  it('ritenta sugli errori di rete e poi li propaga', async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError('rete')
    })
    await expect(fetchWithRetry('u', fetchFn, { retries: 1, sleep: noSleep })).rejects.toThrow('rete')
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })
  it('rispetta Retry-After e raddoppia l\'attesa altrimenti', async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve())
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'Retry-After': '2' } }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok'))
    await fetchWithRetry('u', fetchFn, { baseDelayMs: 100, sleep })
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([2000, 200])
  })
})
