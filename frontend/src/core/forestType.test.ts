import { describe, expect, it } from 'vitest'
import { forestLabel, inCalabria, probableForest } from './forestType'
import type { Habitat, ScoredCell } from './types'

const cell = (lat: number, lon: number, habitat: Habitat | undefined, elevationM: number): ScoredCell => ({
  cell: { id: 'a', center: { lat, lon }, polygon: [] },
  inputs: { month: 10, elevationM, tempMeanC: 12, rainSumMm: 50, humidityMeanPct: 80, habitat },
  result: { score: 50, band: 'mediumHigh', factors: [] },
})

describe('inCalabria', () => {
  it('Sila e Aspromonte sì, Roma e Milano no', () => {
    expect(inCalabria({ lat: 39.3, lon: 16.5 })).toBe(true) // Sila
    expect(inCalabria({ lat: 38.15, lon: 15.9 })).toBe(true) // Aspromonte
    expect(inCalabria({ lat: 41.9, lon: 12.5 })).toBe(false)
    expect(inCalabria({ lat: 45.5, lon: 9.2 })).toBe(false)
  })
})

describe('forestLabel', () => {
  it('latifoglie per fascia di quota', () => {
    expect(forestLabel('broadleaf', 1300)).toBe('faggeta')
    expect(forestLabel('broadleaf', 1000)).toBe('faggeta')
    expect(forestLabel('broadleaf', 700)).toBe('castagneto o querceto')
    expect(forestLabel('broadleaf', 200)).toBe('querceto o lecceta')
  })
  it('conifere per fascia di quota', () => {
    expect(forestLabel('conifer', 1400)).toContain('laricio')
    expect(forestLabel('conifer', 300)).toContain('mediterranea')
  })
  it('misto e habitat senza etichetta', () => {
    expect(forestLabel('mixed', 1200)).toContain('faggio e abete')
    expect(forestLabel('mixed', 400)).toBe('bosco misto')
    expect(forestLabel('grassland', 1200)).toBeNull()
    expect(forestLabel('forest', 1200)).toBeNull()
    expect(forestLabel('none', 1200)).toBeNull()
  })
})

describe('probableForest', () => {
  it('solo in Calabria e con dato di vegetazione', () => {
    expect(probableForest(cell(39.3, 16.5, 'broadleaf', 1300))).toBe('faggeta')
    expect(probableForest(cell(46, 11, 'broadleaf', 1300))).toBeNull()
    expect(probableForest(cell(39.3, 16.5, undefined, 1300))).toBeNull()
  })
})
