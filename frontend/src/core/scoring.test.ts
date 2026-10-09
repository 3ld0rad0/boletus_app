import { describe, expect, it } from 'vitest'
import { bandFor, LAPSE_RATE_C_PER_M, score, scoreGrid, trapezoid, validateSpecies } from './scoring'
import type { GridCell, ScoreInputs, SpeciesRules } from './types'
import porcinoJson from '../data/species/porcino.json'
import finferloJson from '../data/species/finferlo.json'

const T = { min: 0, optMin: 10, optMax: 20, max: 40 }

const species: SpeciesRules = {
  id: 'test',
  name: 'Test',
  latinName: 'Testus testus',
  blocking: {
    season: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0.5, 0],
    elevation: { min: 0, optMin: 500, optMax: 1500, max: 2000 },
  },
  weighted: {
    temperature: { min: 5, optMin: 10, optMax: 20, max: 25, weight: 1 },
    rain: { min: 0, optMin: 50, optMax: 100, max: 200, weight: 2 },
    humidity: { min: 50, optMin: 70, optMax: 100, max: 100, weight: 1 },
  },
}

const optimal: ScoreInputs = { month: 9, elevationM: 1000, tempMeanC: 15, rainSumMm: 70, humidityMeanPct: 85 }

describe('trapezoid', () => {
  it('0 fuori dai limiti', () => {
    expect(trapezoid(-1, T)).toBe(0)
    expect(trapezoid(41, T)).toBe(0)
    expect(trapezoid(Number.NaN, T)).toBe(0)
  })
  it('bordi', () => {
    expect(trapezoid(0, T)).toBe(0)
    expect(trapezoid(10, T)).toBe(1)
    expect(trapezoid(20, T)).toBe(1)
    expect(trapezoid(40, T)).toBe(0)
  })
  it('rampe lineari', () => {
    expect(trapezoid(5, T)).toBeCloseTo(0.5)
    expect(trapezoid(30, T)).toBeCloseTo(0.5)
    expect(trapezoid(35, T)).toBeCloseTo(0.25)
  })
  it('gestisce optMax = max', () => {
    expect(trapezoid(100, { min: 50, optMin: 70, optMax: 100, max: 100 })).toBe(1)
  })
})

describe('bandFor', () => {
  it('soglie', () => {
    expect(bandFor(0)).toBe('low')
    expect(bandFor(32)).toBe('low')
    expect(bandFor(33)).toBe('medium')
    expect(bandFor(65)).toBe('medium')
    expect(bandFor(66)).toBe('high')
    expect(bandFor(100)).toBe('high')
  })
})

describe('score', () => {
  it('100 con tutti i fattori ottimali', () => {
    const r = score(species, optimal)
    expect(r.score).toBe(100)
    expect(r.band).toBe('high')
    expect(r.factors.every((f) => f.verdict === 'ottimale')).toBe(true)
  })
  it('un fattore bloccante a 0 azzera il punteggio', () => {
    expect(score(species, { ...optimal, month: 3 }).score).toBe(0)
    expect(score(species, { ...optimal, elevationM: 2500 }).score).toBe(0)
  })
  it('i bloccanti si moltiplicano', () => {
    // stagione 0,5 × quota 0,5 (250 m) × media pesata 1
    expect(score(species, { ...optimal, month: 11, elevationM: 250 }).score).toBe(25)
  })
  it('media pesata dei fattori non bloccanti', () => {
    // pioggia 0 (peso 2), temperatura e umidità 1 (peso 1+1) → 2/4
    const r = score(species, { ...optimal, rainSumMm: 0 })
    expect(r.score).toBe(50)
    expect(r.band).toBe('medium')
    expect(r.factors.find((f) => f.id === 'rain')?.verdict).toBe('scarso')
  })
  it('motivazioni leggibili', () => {
    const r = score(species, { ...optimal, month: 3, elevationM: 300 })
    expect(r.factors.find((f) => f.id === 'season')?.detail).toContain('fuori stagione')
    expect(r.factors.find((f) => f.id === 'elevation')?.detail).toContain('troppo bassa')
  })
})

describe('scoreGrid', () => {
  it('corregge la temperatura in base alla quota della cella', () => {
    const cells: GridCell[] = [
      { id: 'a', center: { lat: 0, lon: 0 }, bounds: { south: 0, west: 0, north: 0, east: 0 } },
      { id: 'b', center: { lat: 0, lon: 0 }, bounds: { south: 0, west: 0, north: 0, east: 0 } },
    ]
    const weather = { referenceElevationM: 1000, tempMeanC: 15, rainSumMm: 70, humidityMeanPct: 85 }
    const [a, b] = scoreGrid(cells, [1000, 1500], weather, species, 9)
    expect(a.inputs.tempMeanC).toBeCloseTo(15)
    expect(b.inputs.tempMeanC).toBeCloseTo(15 - LAPSE_RATE_C_PER_M * 500)
    expect(b.inputs.elevationM).toBe(1500)
  })
})

describe('validateSpecies', () => {
  it('accetta le specie incluse', () => {
    expect(validateSpecies(porcinoJson).id).toBe('porcino')
    expect(validateSpecies(finferloJson).id).toBe('finferlo')
  })
  it('rifiuta dati non validi', () => {
    expect(() => validateSpecies(null)).toThrow()
    expect(() => validateSpecies({ ...species, name: '' })).toThrow(/name/)
    expect(() =>
      validateSpecies({ ...species, blocking: { ...species.blocking, season: [1, 1] } }),
    ).toThrow(/season/)
    expect(() =>
      validateSpecies({
        ...species,
        blocking: { ...species.blocking, elevation: { min: 10, optMin: 5, optMax: 20, max: 30 } },
      }),
    ).toThrow(/elevation/)
    expect(() =>
      validateSpecies({
        ...species,
        weighted: { ...species.weighted, rain: { min: 0, optMin: 1, optMax: 2, max: 3, weight: -1 } },
      }),
    ).toThrow(/weight/)
  })
})
