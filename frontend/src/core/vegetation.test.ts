import { describe, expect, it } from 'vitest'
import {
  assembleRings,
  habitatAt,
  habitatBbox,
  habitatFromTags,
  overpassQuery,
  parseHabitatAreas,
  pointInRing,
  type OverpassResponse,
} from './vegetation'
import type { GridCell, LatLon } from './types'

const pt = (lat: number, lon: number): LatLon => ({ lat, lon })

// Quadrato da (0,0) a (1,1), chiuso.
const SQUARE = [pt(0, 0), pt(0, 1), pt(1, 1), pt(1, 0), pt(0, 0)]

describe('pointInRing', () => {
  it('dentro e fuori', () => {
    expect(pointInRing(pt(0.5, 0.5), SQUARE)).toBe(true)
    expect(pointInRing(pt(1.5, 0.5), SQUARE)).toBe(false)
    expect(pointInRing(pt(0.5, -0.1), SQUARE)).toBe(false)
  })
})

describe('habitatFromTags', () => {
  it('boschi per tipo di foglia', () => {
    expect(habitatFromTags({ natural: 'wood', leaf_type: 'needleleaved' })).toBe('conifer')
    expect(habitatFromTags({ landuse: 'forest', leaf_type: 'broadleaved' })).toBe('broadleaf')
    expect(habitatFromTags({ natural: 'wood', leaf_type: 'mixed' })).toBe('mixed')
    expect(habitatFromTags({ natural: 'wood' })).toBe('forest')
  })
  it('prati e altro', () => {
    expect(habitatFromTags({ landuse: 'meadow' })).toBe('grassland')
    expect(habitatFromTags({ natural: 'grassland' })).toBe('grassland')
    expect(habitatFromTags({ landuse: 'farmland' })).toBeNull()
    expect(habitatFromTags(undefined)).toBeNull()
  })
})

describe('assembleRings', () => {
  it('unisce segmenti anche invertiti', () => {
    const a = [pt(0, 0), pt(0, 1), pt(1, 1)]
    const b = [pt(0, 0), pt(1, 0), pt(1, 1)] // collegato al fondo di `a` ma al contrario
    const rings = assembleRings([a, b])
    expect(rings).toHaveLength(1)
    expect(rings[0][0]).toEqual(rings[0][rings[0].length - 1])
    expect(pointInRing(pt(0.5, 0.5), rings[0])).toBe(true)
  })
  it('scarta gli anelli che restano aperti', () => {
    expect(assembleRings([[pt(0, 0), pt(0, 1), pt(1, 1)]])).toHaveLength(0)
  })
})

describe('parseHabitatAreas / habitatAt', () => {
  const data: OverpassResponse = {
    elements: [
      { type: 'way', tags: { landuse: 'forest' }, geometry: SQUARE },
      {
        type: 'way',
        tags: { natural: 'wood', leaf_type: 'needleleaved' },
        geometry: [pt(0, 0), pt(0, 0.4), pt(0.4, 0.4), pt(0.4, 0), pt(0, 0)],
      },
      {
        // prato con radura interna: il punto (2.5, 2.5) cade nel buco
        type: 'relation',
        tags: { landuse: 'meadow' },
        members: [
          { type: 'way', role: 'outer', geometry: [pt(2, 2), pt(2, 3), pt(3, 3)] },
          { type: 'way', role: 'outer', geometry: [pt(3, 3), pt(3, 2), pt(2, 2)] },
          { type: 'way', role: 'inner', geometry: [pt(2.4, 2.4), pt(2.4, 2.6), pt(2.6, 2.6), pt(2.6, 2.4), pt(2.4, 2.4)] },
        ],
      },
      { type: 'way', tags: { highway: 'path' }, geometry: SQUARE },
      { type: 'node', tags: { natural: 'wood' } },
    ],
  }
  const areas = parseHabitatAreas(data)

  it('ignora elementi non pertinenti', () => {
    expect(areas.map((a) => a.habitat).sort()).toEqual(['conifer', 'forest', 'grassland'])
  })
  it('prefere l\'habitat più specifico dove le aree si sovrappongono', () => {
    expect(habitatAt(pt(0.2, 0.2), areas)).toBe('conifer')
    expect(habitatAt(pt(0.8, 0.8), areas)).toBe('forest')
  })
  it('prato dalla relazione, escludendo la radura interna', () => {
    expect(habitatAt(pt(2.2, 2.7), areas)).toBe('grassland')
    expect(habitatAt(pt(2.5, 2.5), areas)).toBe('none')
  })
  it('nessuna area: none', () => {
    expect(habitatAt(pt(10, 10), areas)).toBe('none')
  })
})

describe('habitatBbox / overpassQuery', () => {
  const cell: GridCell = {
    id: 'a',
    center: pt(46.0, 11.0),
    polygon: [pt(45.9962, 10.9971), pt(46.0021, 11.0049)],
  }
  it('si aggancia alla griglia verso l\'esterno', () => {
    expect(habitatBbox([cell], 0.005)).toEqual({ south: 45.995, west: 10.995, north: 46.005, east: 11.005 })
  })
  it('la query include box, tag e geometria', () => {
    const q = overpassQuery({ south: 45.995, west: 10.995, north: 46.005, east: 11.005 })
    expect(q).toContain('(45.995,10.995,46.005,11.005)')
    expect(q).toContain('relation')
    expect(q).toContain('landuse')
    expect(q.endsWith('out geom;')).toBe(true)
  })
})
