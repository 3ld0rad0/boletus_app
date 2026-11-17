import { describe, expect, it } from 'vitest'
import { dailyRain, nearestIndex, rangeStatus, valueRange } from './chart'
import type { HourlyPoint } from './types'

const point = (iso: string, rainMm: number | null): HourlyPoint => ({
  t: new Date(iso).getTime() / 1000,
  tempC: 10,
  humidityPct: 80,
  rainMm,
})

describe('dailyRain', () => {
  it('somma per giorno locale e ignora i null', () => {
    const days = dailyRain([
      point('2026-10-05T08:00:00', 1),
      point('2026-10-05T09:00:00', 0.5),
      point('2026-10-05T10:00:00', null),
      point('2026-10-06T08:00:00', 2),
    ])
    expect(days.map((d) => [d.day, d.mm])).toEqual([
      ['2026-10-05', 1.5],
      ['2026-10-06', 2],
    ])
  })
})

describe('valueRange', () => {
  it('aggiunge un margine', () => {
    expect(valueRange([10, 20])).toEqual([9, 21])
  })
  it('non restituisce un intervallo nullo', () => {
    const [min, max] = valueRange([15, 15])
    expect(max - min).toBeGreaterThan(0)
  })
})

describe('nearestIndex', () => {
  it('trova il punto più vicino', () => {
    expect(nearestIndex([0, 10, 20], 12)).toBe(1)
    expect(nearestIndex([0, 10, 20], 100)).toBe(2)
  })
})

describe('rangeStatus', () => {
  const range = { min: 13, max: 22 }
  it('classifica rispetto alla fascia ottimale', () => {
    expect(rangeStatus(15, range)).toBe('ottimale')
    expect(rangeStatus(13, range)).toBe('ottimale')
    expect(rangeStatus(22, range)).toBe('ottimale')
    expect(rangeStatus(10, range)).toBe('sotto')
    expect(rangeStatus(25, range)).toBe('sopra')
  })
})
