import { describe, expect, it } from 'vitest'
import {
  habitatBbox,
  habitatFromColor,
  habitatsFromImage,
  isUrbanColor,
  landcoverRequest,
  toMercator,
  urbanDistancesFromImage,
  type LandcoverImage,
} from './landcover'
import type { GridCell } from './types'

describe('habitatFromColor', () => {
  it('riconosce le classi della legenda CORINE', () => {
    expect(habitatFromColor(128, 255, 0)).toBe('broadleaf')
    expect(habitatFromColor(0, 166, 0)).toBe('conifer')
    expect(habitatFromColor(77, 255, 0)).toBe('mixed')
    expect(habitatFromColor(166, 242, 0)).toBe('forest')
    expect(habitatFromColor(230, 230, 77)).toBe('grassland')
    expect(habitatFromColor(204, 242, 77)).toBe('grassland')
  })
  it('tollera piccole differenze e scarta le altre classi', () => {
    expect(habitatFromColor(0, 170, 4)).toBe('conifer')
    expect(habitatFromColor(230, 0, 77)).toBe('none') // tessuto urbano
    expect(habitatFromColor(255, 255, 255)).toBe('none')
  })
})

describe('toMercator / landcoverRequest', () => {
  it('origine e longitudine', () => {
    const o = toMercator({ lat: 0, lon: 0 })
    expect(o.x).toBeCloseTo(0)
    expect(o.y).toBeCloseTo(0)
    expect(toMercator({ lat: 0, lon: 180 }).x).toBeCloseTo(20_037_508, -1)
  })
  it('dimensione in pixel proporzionale all\'estensione e limitata', () => {
    const req = landcoverRequest({ south: 46, west: 11, north: 46.04, east: 11.06 })
    expect(req.width).toBeGreaterThan(req.height * 0.8)
    expect(req.extent.maxX).toBeGreaterThan(req.extent.minX)
    const huge = landcoverRequest({ south: 0, west: 0, north: 40, east: 40 })
    expect(huge.width).toBe(2048)
  })
})

describe('habitatsFromImage', () => {
  // Immagine 2×2 su 0..2 m di lato (in Mercator): in alto a sinistra conifere, in basso a destra prato.
  const data = new Uint8ClampedArray([
    0, 166, 0, 255, /**/ 255, 255, 255, 255,
    255, 255, 255, 255, /**/ 230, 230, 77, 255,
  ])
  const image: LandcoverImage = { extent: { minX: 0, minY: 0, maxX: 2, maxY: 2 }, width: 2, height: 2, data }

  // Punto di coordinate Mercator (x, y) in metri, ricavato con la trasformazione inversa.
  const at = (x: number, y: number) => {
    const R = 6_378_137
    return { lon: (x / R) * (180 / Math.PI), lat: (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI) }
  }

  it('legge il pixel che contiene il punto', () => {
    const [a, b, c, d] = habitatsFromImage([at(0.5, 1.5), at(1.5, 1.5), at(0.5, 0.5), at(1.5, 0.5)], image)
    expect([a, b, c, d]).toEqual(['conifer', 'none', 'none', 'grassland'])
  })
  it('punti fuori dall\'immagine usano il pixel più vicino', () => {
    expect(habitatsFromImage([at(-5, 5)], image)).toEqual(['conifer'])
  })
  it('pixel trasparente: none', () => {
    const clear: LandcoverImage = { ...image, data: new Uint8ClampedArray([0, 166, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]) }
    expect(habitatsFromImage([at(0.5, 1.5)], clear)).toEqual(['none'])
  })
})

describe('habitatBbox', () => {
  const cell: GridCell = {
    id: 'a',
    center: { lat: 46.0, lon: 11.0 },
    polygon: [
      { lat: 45.9962, lon: 10.9971 },
      { lat: 46.0021, lon: 11.0049 },
    ],
  }
  it('si aggancia alla griglia verso l\'esterno', () => {
    expect(habitatBbox([cell], 0.005)).toEqual({ south: 45.995, west: 10.995, north: 46.005, east: 11.005 })
  })
  it('allarga il rettangolo del margine', () => {
    expect(habitatBbox([cell], 0.005, 0.01)).toEqual({ south: 45.985, west: 10.985, north: 46.015, east: 11.015 })
  })
})

describe('isUrbanColor', () => {
  it('riconosce tessuto urbano e aree industriali', () => {
    expect(isUrbanColor(230, 0, 77)).toBe(true)
    expect(isUrbanColor(255, 0, 0)).toBe(true)
    expect(isUrbanColor(204, 77, 242)).toBe(true)
  })
  it('scarta boschi e prati', () => {
    expect(isUrbanColor(0, 166, 0)).toBe(false)
    expect(isUrbanColor(230, 230, 77)).toBe(false)
  })
})

describe('urbanDistancesFromImage', () => {
  // 10×1 pixel da 100 m (Mercator) all'equatore; solo il primo pixel è urbano.
  const px = (rgba: number[]) => rgba
  const data = new Uint8ClampedArray(
    Array.from({ length: 10 }, (_, i) => px(i === 0 ? [255, 0, 0, 255] : [0, 166, 0, 255])).flat(),
  )
  const image: LandcoverImage = { extent: { minX: 0, minY: 0, maxX: 1000, maxY: 100 }, width: 10, height: 1, data }
  const at = (x: number, y: number) => {
    const R = 6_378_137
    return { lon: (x / R) * (180 / Math.PI), lat: (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI) }
  }

  it('0 dentro il pixel urbano', () => {
    expect(urbanDistancesFromImage([at(50, 50)], image)[0]).toBe(0)
  })
  it('distanza dal bordo del pixel urbano', () => {
    // centro pixel urbano a x=50, metà pixel 50 → punto a x=550: 500 − 50 = 450 m
    expect(urbanDistancesFromImage([at(550, 50)], image)[0]).toBeCloseTo(450, 0)
  })
  it('Infinity senza pixel urbani', () => {
    const none: LandcoverImage = { ...image, data: new Uint8ClampedArray(Array.from({ length: 10 }, () => [0, 166, 0, 255]).flat()) }
    expect(urbanDistancesFromImage([at(500, 50)], none)[0]).toBe(Infinity)
  })
  it('pixel trasparenti non contano', () => {
    const clear: LandcoverImage = { ...image, data: new Uint8ClampedArray(Array.from({ length: 10 }, () => [255, 0, 0, 0]).flat()) }
    expect(urbanDistancesFromImage([at(50, 50)], clear)[0]).toBe(Infinity)
  })
})
