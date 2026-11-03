import { describe, expect, it, vi } from 'vitest'
import { parsePlaces, searchPlaces } from './geocoding'

const response = {
  results: [
    { id: 1, name: 'Asiago', latitude: 45.87, longitude: 11.51, admin1: 'Veneto', country: 'Italia' },
    { id: 2, name: 'Asiago', latitude: 1, longitude: 2 },
  ],
}

describe('parsePlaces', () => {
  it('mappa i risultati e compone il dettaglio', () => {
    const [a, b] = parsePlaces(response)
    expect(a).toEqual({ id: 1, name: 'Asiago', detail: 'Veneto, Italia', lat: 45.87, lon: 11.51 })
    expect(b.detail).toBe('')
  })
  it('nessun risultato: lista vuota', () => {
    expect(parsePlaces({})).toEqual([])
  })
})

describe('searchPlaces', () => {
  it('non chiama la rete per query troppo corte', async () => {
    const fetchFn = vi.fn()
    expect(await searchPlaces(' a ', fetchFn)).toEqual([])
    expect(fetchFn).not.toHaveBeenCalled()
  })
  it('interroga il geocoding in italiano e usa la cache', async () => {
    const fetchFn = vi.fn(async (_input: string | URL | Request) => new Response(JSON.stringify(response)))
    const first = await searchPlaces('Asiago', fetchFn)
    await searchPlaces('  asiago ', fetchFn)
    expect(first).toHaveLength(2)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const url = new URL(String(fetchFn.mock.calls[0][0]))
    expect(url.searchParams.get('name')).toBe('Asiago')
    expect(url.searchParams.get('language')).toBe('it')
  })
  it('propaga gli errori HTTP', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 400 }))
    await expect(searchPlaces('Errore', fetchFn)).rejects.toThrow(/400/)
  })
})
