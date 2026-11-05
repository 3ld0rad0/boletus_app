import { describe, expect, it } from 'vitest'
import { sunsetTime } from './sun'

const MILANO = { lat: 45.4642, lon: 9.19 }
const minutesBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 60_000

describe('sunsetTime', () => {
  it('Milano solstizio d’estate: circa 19:20 UTC', () => {
    const s = sunsetTime(new Date('2026-06-21T10:00:00Z'), MILANO)!
    expect(minutesBetween(s, new Date('2026-06-21T19:21:00Z'))).toBeLessThan(10)
  })
  it('Milano solstizio d’inverno: circa 15:50 UTC', () => {
    const s = sunsetTime(new Date('2026-12-21T10:00:00Z'), MILANO)!
    expect(minutesBetween(s, new Date('2026-12-21T15:50:00Z'))).toBeLessThan(10)
  })
  it('stesso giorno solare per istanti diversi', () => {
    const a = sunsetTime(new Date('2026-10-10T05:00:00Z'), MILANO)!
    const b = sunsetTime(new Date('2026-10-10T20:00:00Z'), MILANO)!
    expect(a.getTime()).toBe(b.getTime())
  })
  it('null in notte polare', () => {
    expect(sunsetTime(new Date('2026-12-21T12:00:00Z'), { lat: 80, lon: 15 })).toBeNull()
  })
})
