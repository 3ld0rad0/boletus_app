import { describe, expect, it } from 'vitest'
import { bearingDeg, cardinal, circleRing, formatDistance, generateGrid, haversineM } from './geo'

const ROMA = { lat: 41.9028, lon: 12.4964 }
const MILANO = { lat: 45.4642, lon: 9.19 }

describe('haversineM', () => {
  it('distanza nulla per lo stesso punto', () => {
    expect(haversineM(ROMA, ROMA)).toBe(0)
  })
  it('Roma–Milano circa 477 km', () => {
    expect(haversineM(ROMA, MILANO) / 1000).toBeCloseTo(477, -1)
  })
  it('1° di latitudine circa 111,2 km', () => {
    expect(haversineM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -2)
  })
})

describe('bearingDeg / cardinal', () => {
  it('direzioni cardinali', () => {
    const o = { lat: 45, lon: 10 }
    expect(bearingDeg(o, { lat: 46, lon: 10 })).toBeCloseTo(0)
    expect(bearingDeg(o, { lat: 44, lon: 10 })).toBeCloseTo(180)
    expect(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 1 })).toBeCloseTo(90)
    expect(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: -1 })).toBeCloseTo(270)
  })
  it('Roma → Milano è verso nord-ovest', () => {
    expect(cardinal(bearingDeg(ROMA, MILANO))).toBe('NO')
  })
  it('cardinal arrotonda e gestisce 360', () => {
    expect(cardinal(0)).toBe('N')
    expect(cardinal(359)).toBe('N')
    expect(cardinal(44)).toBe('NE')
    expect(cardinal(225)).toBe('SO')
  })
})

describe('formatDistance', () => {
  it('metri e chilometri', () => {
    expect(formatDistance(42.4)).toBe('42 m')
    expect(formatDistance(1234)).toBe('1,2 km')
    expect(formatDistance(15_600)).toBe('16 km')
  })
})

describe('generateGrid', () => {
  it('crea size×size celle centrate sul punto', () => {
    const cells = generateGrid(ROMA, 7, 3000)
    expect(cells).toHaveLength(49)
    const middle = cells.find((c) => c.id === '3-3')!
    expect(middle.center.lat).toBeCloseTo(ROMA.lat, 6)
    expect(middle.center.lon).toBeCloseTo(ROMA.lon, 6)
  })
  it('copre un quadrato di lato 2×raggio', () => {
    const cells = generateGrid(ROMA, 5, 1000)
    const north = Math.max(...cells.map((c) => c.bounds.north))
    const south = Math.min(...cells.map((c) => c.bounds.south))
    expect(haversineM({ lat: south, lon: ROMA.lon }, { lat: north, lon: ROMA.lon })).toBeCloseTo(2000, -1)
    const first = cells[0]
    expect(first.bounds.north).toBeCloseTo(north)
    expect(first.bounds.west).toBeLessThan(ROMA.lon)
  })
  it('rifiuta size non valido', () => {
    expect(() => generateGrid(ROMA, 0, 1000)).toThrow()
  })
})

describe('circleRing', () => {
  it('anello chiuso con punti alla distanza del raggio', () => {
    const ring = circleRing(ROMA, 50, 16)
    expect(ring).toHaveLength(17)
    expect(ring[0]).toEqual(ring[16].map((v) => expect.closeTo(v, 9)))
    expect(haversineM(ROMA, { lon: ring[4][0], lat: ring[4][1] })).toBeCloseTo(50, 0)
  })
})
