import { describe, expect, it } from 'vitest'
import {
  bestInGrid,
  generateScanNodes,
  makeZone,
  pickZones,
  scanFraction,
  scoreNodes,
  sortZones,
  type NodeScore,
} from './areaScan'
import { generateGrid, haversineM } from './geo'
import { score } from './scoring'
import type { ScoreInputs, SpeciesRules, WeatherSummary } from './types'

const base = (id: string, elevation: { min: number; optMin: number; optMax: number; max: number }): SpeciesRules => ({
  id,
  name: id,
  latinName: id,
  blocking: { season: Array(12).fill(1), elevation },
  weighted: {
    temperature: { min: 5, optMin: 10, optMax: 20, max: 25, weight: 1 },
    rain: { min: 0, optMin: 50, optMax: 100, max: 200, weight: 1 },
    humidity: { min: 50, optMin: 70, optMax: 100, max: 100, weight: 1 },
  },
})

const low = base('basso', { min: 0, optMin: 100, optMax: 600, max: 800 })
const high = base('alto', { min: 800, optMin: 1000, optMax: 1600, max: 2000 })
const weather: WeatherSummary = { referenceElevationM: 1000, tempMeanC: 15, rainSumMm: 70, humidityMeanPct: 85 }
const origin = { lat: 42, lon: 12 }

describe('scanFraction', () => {
  it('cresce con le fasi e resta tra 0 e 1', () => {
    const steps = [
      scanFraction(null),
      scanFraction({ phase: 'weather', done: 0, total: 7 }),
      scanFraction({ phase: 'weather', done: 7, total: 7 }),
      scanFraction({ phase: 'refine', done: 0, total: 3 }),
      scanFraction({ phase: 'refine', done: 2, total: 3 }),
      scanFraction({ phase: 'prepare', done: 0, total: 100 }),
      scanFraction({ phase: 'prepare', done: 99, total: 100 }),
    ]
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(Math.min(...steps)).toBeGreaterThan(0)
    expect(Math.max(...steps)).toBeLessThan(1)
  })
})

describe('generateScanNodes', () => {
  const nodes = generateScanNodes(origin, 120_000, 12_000)
  it('include il centro e resta nel raggio', () => {
    expect(nodes.some((n) => haversineM(n, origin) < 1)).toBe(true)
    expect(Math.max(...nodes.map((n) => haversineM(n, origin)))).toBeLessThanOrEqual(120_500)
  })
  it('ha circa un nodo ogni 144 km²', () => {
    expect(nodes.length).toBeGreaterThan(280)
    expect(nodes.length).toBeLessThan(360)
  })
})

describe('scoreNodes', () => {
  const points = [origin, { lat: 42.1, lon: 12 }, { lat: 42.2, lon: 12 }]
  it('sceglie in ogni nodo la specie migliore per la quota', () => {
    const res = scoreNodes(points, [300, 1200, 300], [weather, weather, weather], [low, high], 9, 10)
    expect(res.map((r) => r.species.id)).toEqual(['basso', 'alto', 'basso'])
  })
  it('scarta i nodi senza meteo o quota', () => {
    const res = scoreNodes(points, [300, Number.NaN, 300], [weather, weather, null], [low, high], 9, 10)
    expect(res).toHaveLength(1)
  })
  it('corregge la temperatura per la quota rispetto al riferimento del meteo', () => {
    const [r] = scoreNodes([origin], [2000], [weather], [high], 9, 10)
    expect(r.inputs.tempMeanC).toBeLessThan(weather.tempMeanC)
  })
})

describe('pickZones', () => {
  const mk = (lat: number, s: number): NodeScore => {
    const inputs: ScoreInputs = { month: 9, elevationM: 1000, tempMeanC: 15, rainSumMm: 70, humidityMeanPct: 85 }
    const result = { ...score(high, inputs), score: s }
    return { point: { lat, lon: 12 }, species: high, inputs, result }
  }
  it('ordina per punteggio e distanzia le zone', () => {
    // 0,05° ≈ 5,5 km: il secondo nodo è troppo vicino al primo.
    const picked = pickZones([mk(42.05, 80), mk(42.1, 90), mk(42.4, 70), mk(43.0, 60)], origin, 3, 24_000)
    expect(picked.map((p) => p.result.score)).toEqual([90, 70, 60])
  })
  it('a parità vince il più vicino', () => {
    const picked = pickZones([mk(43, 80), mk(42.2, 80)], origin, 1)
    expect(picked[0].point.lat).toBe(42.2)
  })
})

describe('bestInGrid', () => {
  const cells = generateGrid(origin, 2, 2000)
  it('restituisce specie e cella con il punteggio più alto', () => {
    const elevations = cells.map((_, i) => (i === 1 ? 300 : 1200))
    const best = bestInGrid(cells, elevations, weather, [low, high], 9, 10)
    expect(best?.speciesScores).toHaveLength(2)
    const top = Math.max(...best!.speciesScores.map((s) => s.score))
    expect(best?.result.score).toBeGreaterThanOrEqual(top)
  })
  it('griglia vuota: nessun risultato', () => {
    expect(bestInGrid([], [], weather, [low], 9, 10)).toBeNull()
  })
})

describe('makeZone, sortZones', () => {
  const inputs: ScoreInputs = {
    month: 9,
    elevationM: 1000,
    tempMeanC: 15,
    rainSumMm: 70,
    humidityMeanPct: 85,
    urbanDistanceM: Infinity,
  }
  const zone = (s: SpeciesRules, i: ScoreInputs, point = { lat: 42.5, lon: 12 }) =>
    makeZone(origin, point, s, i, score(s, i), 50, true, [], { name: 'Test', detail: 'XX' })

  it('omette la distanza infinita e calcola distanza e direzione', () => {
    const z = zone(high, inputs)
    expect('urbanDistanceM' in z.inputs).toBe(false)
    expect(z.distanceM).toBeGreaterThan(50_000)
    expect(z.bearingDeg).toBeCloseTo(0, 0)
    expect(JSON.parse(JSON.stringify(z)).score).toBe(z.score)
  })
  it('sortZones: punteggio decrescente, a parità la più vicina', () => {
    const a = zone(high, inputs, { lat: 43, lon: 12 })
    const b = zone(high, inputs, { lat: 42.2, lon: 12 })
    const c = zone(high, { ...inputs, rainSumMm: 0 })
    expect(sortZones([c, a, b]).map((z) => z.point.lat)).toEqual([42.2, 43, 42.5])
  })
})
