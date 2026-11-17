import { describe, expect, it } from 'vitest'
import { bearingDeg, haversineM, offsetMeters } from './geo'
import {
  addWalk,
  advance,
  angleDiffDeg,
  EMPTY_WALK,
  INITIAL_CALIBRATION,
  learnHeadingOffset,
  learnStepLength,
  meanHeadingDeg,
  normalizeDeg,
  pdrTailLength,
  reanchorTail,
  straightness,
} from './pdr'
import type { TrackPoint } from './types'

const START = { lat: 39.3, lon: 16.25 }
const gps = (p = START): TrackPoint => ({ ...p, source: 'gps', uncertaintyM: 5 })
const pdr = (p = START): TrackPoint => ({ ...p, source: 'pdr', uncertaintyM: 20 })

describe('angoli', () => {
  it('normalizza in 0..360', () => {
    expect(normalizeDeg(-10)).toBe(350)
    expect(normalizeDeg(370)).toBe(10)
  })
  it('differenza con segno attraverso il nord', () => {
    expect(angleDiffDeg(10, 350)).toBe(20)
    expect(angleDiffDeg(350, 10)).toBe(-20)
    expect(angleDiffDeg(180, 0)).toBe(180)
  })
})

describe('advance', () => {
  it('va verso la direzione indicata', () => {
    const p = advance(START, 90, 100)
    expect(haversineM(START, p)).toBeCloseTo(100, 0)
    expect(bearingDeg(START, p)).toBeCloseTo(90, 0)
    expect(bearingDeg(START, advance(START, 225, 50))).toBeCloseTo(225, 0)
  })
})

describe('Walk', () => {
  it('direzione media circolare attraverso il nord', () => {
    const w = addWalk(addWalk(EMPTY_WALK, 10, 350), 10, 10)
    expect(meanHeadingDeg(w)).toBeCloseTo(0, 5)
    expect(straightness(w)).toBeGreaterThan(0.98)
  })
  it('senza direzione conta i passi ma non ha una media', () => {
    const w = addWalk(EMPTY_WALK, 5, null)
    expect(w.steps).toBe(5)
    expect(meanHeadingDeg(w)).toBeNull()
  })
  it('direzioni opposte danno bassa linearità', () => {
    const w = addWalk(addWalk(EMPTY_WALK, 10, 0), 10, 180)
    expect(straightness(w)).toBeLessThan(0.01)
  })
})

describe('calibrazione', () => {
  it('impara la lunghezza del passo avvicinandosi al valore misurato', () => {
    let cal = INITIAL_CALIBRATION
    for (let i = 0; i < 20; i++) cal = learnStepLength(cal, 80, 100)
    expect(cal.stepLengthM).toBeCloseTo(0.8, 1)
  })
  it('scarta campioni implausibili', () => {
    expect(learnStepLength(INITIAL_CALIBRATION, 300, 100)).toBe(INITIAL_CALIBRATION)
    expect(learnStepLength(INITIAL_CALIBRATION, 10, 100)).toBe(INITIAL_CALIBRATION)
    expect(learnStepLength(INITIAL_CALIBRATION, 10, 0)).toBe(INITIAL_CALIBRATION)
  })
  it('impara lo scarto bussola, anche attraverso il nord', () => {
    let cal = INITIAL_CALIBRATION
    for (let i = 0; i < 20; i++) cal = learnHeadingOffset(cal, 5, 355)
    expect(cal.headingOffsetDeg).toBeCloseTo(10, 0)
    for (let i = 0; i < 40; i++) cal = learnHeadingOffset(cal, 350, 10)
    expect(cal.headingOffsetDeg).toBeCloseTo(-20, 0)
  })
})

describe('reanchorTail', () => {
  it('senza stime in coda aggiunge solo il fix', () => {
    const out = reanchorTail([gps()], gps(offsetMeters(START, 30, 0)))
    expect(out).toHaveLength(2)
    expect(out.every((p) => p.source === 'gps')).toBe(true)
  })
  it('sposta la coda stimata in modo progressivo e la chiude sul fix', () => {
    const track = [gps(), pdr(offsetMeters(START, 10, 0)), pdr(offsetMeters(START, 20, 0)), pdr(offsetMeters(START, 30, 0))]
    const fix = gps(offsetMeters(START, 30, 30))
    const out = reanchorTail(track, fix)
    expect(pdrTailLength(track)).toBe(3)
    expect(out).toHaveLength(4)
    expect(out[0]).toEqual(track[0])
    expect(haversineM(out[3], fix)).toBeLessThan(0.2)
    expect(out[3].source).toBe('gps')
    // La correzione cresce lungo la coda: 1/3 e 2/3 dello scostamento nord.
    expect(haversineM(out[1], offsetMeters(START, 10, 10))).toBeLessThan(0.3)
    expect(haversineM(out[2], offsetMeters(START, 20, 20))).toBeLessThan(0.3)
    expect(out[1].source).toBe('pdr')
  })
})
