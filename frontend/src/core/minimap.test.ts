import { describe, expect, it } from 'vitest'
import { offsetMeters } from './geo'
import { miniRange, niceRange, projectToMini } from './minimap'

const O = { lat: 42, lon: 12 }

describe('niceRange', () => {
  it('sceglie il primo raggio tondo che contiene la distanza', () => {
    expect(niceRange(0)).toBe(100)
    expect(niceRange(101)).toBe(250)
    expect(niceRange(1000)).toBe(1000)
    expect(niceRange(60_000)).toBe(100_000)
  })
})

describe('projectToMini', () => {
  it('nord in alto, est a destra', () => {
    const north = projectToMini(O, offsetMeters(O, 0, 100), 200, 40)
    expect(north.x).toBeCloseTo(0, 0)
    expect(north.y).toBeCloseTo(-20, 0)
    const east = projectToMini(O, offsetMeters(O, 200, 0), 200, 40)
    expect(east.x).toBeCloseTo(40, 0)
    expect(east.y).toBeCloseTo(0, 0)
  })
  it('lo stesso punto sta al centro', () => {
    expect(projectToMini(O, O, 100, 40)).toEqual({ x: 0, y: 0 })
  })
  it('oltre il raggio resta sul bordo', () => {
    const p = projectToMini(O, offsetMeters(O, 0, -1000), 100, 40)
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(40, 3)
    expect(p.y).toBeGreaterThan(0)
  })
})

describe('miniRange', () => {
  it('almeno 100 m e con margine sul punto più lontano', () => {
    expect(miniRange(O, [])).toBe(100)
    expect(miniRange(O, [offsetMeters(O, 0, 90)])).toBe(100)
    expect(miniRange(O, [offsetMeters(O, 0, 300)])).toBe(500)
  })
})
