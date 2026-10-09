import { beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from './__fixtures__/open-meteo-hourly.json'
import { aggregateHourly, clearWeatherCache, fetchElevations, fetchWeatherSummary, type HourlyResponse } from './weather'

// Fixture: 12 giorni orari (dal 2026-09-25T00:00Z), temp 10→ +0,1 ogni ora fino a 288 h,
// umidità 80, pioggia 1 mm ogni 24 ore (alle 12:00). "Ora" = 2026-10-06T00:00Z (264 h).
const data = fixture as HourlyResponse
const NOW_MS = Date.UTC(2026, 9, 6, 0, 0, 0)

describe('aggregateHourly', () => {
  it('aggrega solo le ore passate nelle finestre giuste', () => {
    const w = aggregateHourly(data, NOW_MS)
    expect(w.referenceElevationM).toBe(850)
    expect(w.humidityMeanPct).toBeCloseTo(80)
    // pioggia: un evento al giorno negli ultimi 10 giorni
    expect(w.rainSumMm).toBeCloseTo(10)
    // temperatura: ultime 120 ore (ore 145..264) → media di 10 + 0,1·h
    expect(w.tempMeanC).toBeCloseTo(10 + 0.1 * ((145 + 264) / 2))
  })
  it('ignora i valori null', () => {
    const withNulls: HourlyResponse = {
      ...data,
      hourly: { ...data.hourly, relative_humidity_2m: data.hourly.relative_humidity_2m.map((v, i) => (i % 2 ? null : v)) },
    }
    expect(aggregateHourly(withNulls, NOW_MS).humidityMeanPct).toBeCloseTo(80)
  })
  it('errore se mancano dati', () => {
    expect(() => aggregateHourly(data, Date.UTC(2020, 0, 1))).toThrow()
  })
})

describe('fetch con cache', () => {
  beforeEach(() => clearWeatherCache())

  it('fetchWeatherSummary interroga Open-Meteo una sola volta per punto', async () => {
    vi.useFakeTimers({ now: NOW_MS })
    const fetchFn = vi.fn(async (_input: string | URL | Request) => new Response(JSON.stringify(data)))
    const a = await fetchWeatherSummary({ lat: 46.0012, lon: 11.0049 }, fetchFn)
    const b = await fetchWeatherSummary({ lat: 46.0049, lon: 11.0012 }, fetchFn)
    expect(a).toEqual(b)
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const url = new URL(String(fetchFn.mock.calls[0][0]))
    expect(url.searchParams.get('latitude')).toBe('46.00')
    expect(url.searchParams.get('past_days')).toBe('10')
    vi.useRealTimers()
  })

  it('fetchElevations divide in batch da 100', async () => {
    const points = Array.from({ length: 150 }, (_, i) => ({ lat: 45 + i * 0.001, lon: 10 }))
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const n = new URL(String(input)).searchParams.get('latitude')!.split(',').length
      return new Response(JSON.stringify({ elevation: Array(n).fill(500) }))
    })
    const result = await fetchElevations(points, fetchFn)
    expect(result).toHaveLength(150)
    expect(fetchFn).toHaveBeenCalledTimes(2)
  })

  it('propaga gli errori HTTP', async () => {
    const fetchFn = vi.fn(async () => new Response('err', { status: 500 }))
    await expect(fetchElevations([{ lat: 1, lon: 1 }], fetchFn)).rejects.toThrow(/500/)
  })
})
