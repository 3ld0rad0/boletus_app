import { describe, expect, it } from 'vitest'
import { lonLatToTile, tilesAround, tileUrl } from './tiles'

describe('lonLatToTile', () => {
  it('valori noti: origine e Roma a z10', () => {
    expect(lonLatToTile({ lat: 0, lon: 0 }, 1)).toEqual({ x: 1, y: 1 })
    expect(lonLatToTile({ lat: 41.9028, lon: 12.4964 }, 10)).toEqual({ x: 547, y: 380 })
  })
})

describe('tilesAround', () => {
  const center = { lat: 39.3, lon: 16.25 }
  it('include il tassello del centro a ogni zoom richiesto', () => {
    const tiles = tilesAround(center, 2500, [13, 15])
    for (const z of [13, 15]) {
      const c = lonLatToTile(center, z)
      expect(tiles).toContainEqual({ z, x: c.x, y: c.y })
    }
  })
  it('più zoom richiede più tasselli', () => {
    const count = (z: number) => tilesAround(center, 2500, [z]).length
    expect(count(16)).toBeGreaterThan(count(14))
    expect(count(13)).toBeGreaterThanOrEqual(1)
  })
})

describe('tileUrl', () => {
  it('sostituisce i segnaposto', () => {
    const url = tileUrl('https://{s}.example.org/{z}/{x}/{y}.png?k=1', { z: 14, x: 8000, y: 6000 })
    expect(url).toBe('https://c.example.org/14/8000/6000.png?k=1')
  })
  it('funziona senza sottodominio', () => {
    expect(tileUrl('https://t.org/{z}/{x}/{y}.png', { z: 1, x: 0, y: 1 })).toBe('https://t.org/1/0/1.png')
  })
})
