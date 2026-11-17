import { describe, expect, it, vi } from 'vitest'
import { decodeTerrarium, elevationsFromTiles, pointToTilePixel, TILE_SIZE } from './elevation'

describe('decodeTerrarium', () => {
  it('decodifica le quote', () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0)
    expect(decodeTerrarium(128, 100, 128)).toBeCloseTo(100.5)
    expect(decodeTerrarium(127, 255, 0)).toBe(-1)
  })
})

describe('pointToTilePixel', () => {
  it('origine delle coordinate a zoom 1', () => {
    expect(pointToTilePixel({ lat: 0, lon: 0 }, 1)).toEqual({ x: 1, y: 1, px: 0, py: 0 })
  })
  it('angolo nord-ovest e limiti', () => {
    expect(pointToTilePixel({ lat: 85, lon: -180 }, 2)).toMatchObject({ x: 0, y: 0 })
    expect(pointToTilePixel({ lat: -89.9, lon: 179.99 }, 2)).toMatchObject({ x: 3, y: 3 })
  })
  it('Roma a zoom 12 cade nella tile 2190/1521', () => {
    const t = pointToTilePixel({ lat: 41.9028, lon: 12.4964 }, 12)
    expect([t.x, t.y]).toEqual([2190, 1521])
  })
})

describe('elevationsFromTiles', () => {
  const tileWith = (elevationM: number) => {
    const data = new Uint8ClampedArray(TILE_SIZE * TILE_SIZE * 4)
    const v = elevationM + 32768
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(v / 256)
      data[i + 1] = Math.floor(v % 256)
      data[i + 3] = 255
    }
    return data
  }

  it('carica una sola volta ogni tile e legge la quota dei punti', async () => {
    const loader = vi.fn(async () => tileWith(850))
    const points = [
      { lat: 46.0, lon: 11.0 },
      { lat: 46.001, lon: 11.001 },
    ]
    expect(await elevationsFromTiles(points, loader, 12)).toEqual([850, 850])
    expect(loader).toHaveBeenCalledTimes(1)
  })
  it('più tile per punti lontani', async () => {
    const loader = vi.fn(async () => tileWith(0))
    await elevationsFromTiles([{ lat: 46, lon: 11 }, { lat: 47, lon: 12 }], loader, 12)
    expect(loader).toHaveBeenCalledTimes(2)
  })
})
