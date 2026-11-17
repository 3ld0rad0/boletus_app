import { describe, expect, it } from 'vitest'
import { bearingDeg, haversineM, offsetMeters } from './geo'
import {
  applyFix,
  applySteps,
  createHybridState,
  currentEstimate,
  GPS_TIMEOUT_MS,
  normalizeStoredPoints,
  type HybridState,
} from './hybridTrack'
import { INITIAL_CALIBRATION } from './pdr'

const START = { lat: 39.3, lon: 16.25 }
const at = (eastM: number, northM = 0) => offsetMeters(START, eastM, northM)
const T0 = 1_000_000

const fresh = (): HybridState =>
  createHybridState([{ ...START, source: 'gps', uncertaintyM: 5 }], INITIAL_CALIBRATION, T0)
const fix = (eastM: number, t: number, accuracyM = 5) => ({ ...at(eastM), accuracyM, timestamp: t })
const last = (s: HybridState) => s.points[s.points.length - 1]

describe('applyFix', () => {
  it('ignora i fix imprecisi', () => {
    const s = fresh()
    expect(applyFix(s, fix(50, T0 + 1000, 80))).toBe(s)
  })
  it('aggiunge i fix buoni, rispettando la distanza minima', () => {
    let s = applyFix(fresh(), fix(5, T0 + 1000))
    expect(s.points).toHaveLength(1)
    s = applyFix(s, fix(30, T0 + 2000))
    expect(s.points).toHaveLength(2)
    expect(last(s).source).toBe('gps')
  })
})

describe('applySteps', () => {
  it('con GPS recente non muove la posizione ma accumula i passi', () => {
    const s = applySteps(fresh(), { steps: 10, headingDeg: 90, now: T0 + 2000 })
    expect(s.points).toHaveLength(1)
    expect(s.pending.steps).toBe(10)
  })

  it('senza GPS avanza verso la direzione della bussola con la lunghezza del passo', () => {
    const s = applySteps(fresh(), { steps: 100, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 1 })
    const p = last(s)
    expect(p.source).toBe('pdr')
    expect(haversineM(START, p)).toBeCloseTo(70, 0)
    expect(bearingDeg(START, p)).toBeCloseTo(90, 0)
  })

  it('applica lo scarto bussola appreso', () => {
    const state = { ...fresh(), calibration: { ...INITIAL_CALIBRATION, headingOffsetDeg: 10 } }
    const s = applySteps(state, { steps: 100, headingDeg: 80, now: T0 + GPS_TIMEOUT_MS + 1 })
    expect(bearingDeg(START, last(s))).toBeCloseTo(90, 0)
  })

  it('recupera i passi fatti prima della scadenza del timeout', () => {
    let s = applySteps(fresh(), { steps: 50, headingDeg: 0, now: T0 + 5000 })
    s = applySteps(s, { steps: 50, headingDeg: 0, now: T0 + GPS_TIMEOUT_MS + 1 })
    expect(haversineM(START, last(s))).toBeCloseTo(70, 0)
  })

  it('senza direzione non sposta nulla', () => {
    const s = applySteps(fresh(), { steps: 30, headingDeg: null, now: T0 + GPS_TIMEOUT_MS + 1 })
    expect(s.points).toHaveLength(1)
  })

  it('l\'incertezza cresce con la distanza e può diventare inaffidabile', () => {
    let s = fresh()
    let now = T0 + GPS_TIMEOUT_MS + 1
    s = applySteps(s, { steps: 50, headingDeg: 0, now })
    const first = currentEstimate(s.points)
    expect(first).not.toBeNull()
    for (let i = 0; i < 10; i++) s = applySteps(s, { steps: 50, headingDeg: 0, now: (now += 1000) })
    const later = currentEstimate(s.points)
    expect(later?.uncertaintyM).toBeGreaterThan(first?.uncertaintyM ?? Infinity)
    expect(later?.unreliable).toBe(true)
  })

  it('i punti stimati vicini fra loro spostano solo la punta', () => {
    let s = applySteps(fresh(), { steps: 10, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 1 })
    s = applySteps(s, { steps: 1, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 2 })
    s = applySteps(s, { steps: 1, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 3 })
    expect(s.points.length).toBe(3)
  })
})

describe('ritorno del GPS', () => {
  it('riancora la stima al fix reale e la chiude sul fix', () => {
    let s = applySteps(fresh(), { steps: 100, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 1 })
    s = applySteps(s, { steps: 100, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 2000 })
    expect(currentEstimate(s.points)).not.toBeNull()
    const real = { ...at(120, 25), accuracyM: 6, timestamp: T0 + 20_000 }
    s = applyFix(s, real)
    expect(currentEstimate(s.points)).toBeNull()
    expect(haversineM(last(s), real)).toBeLessThan(0.2)
    expect(s.points[0].source).toBe('gps')
  })

  it('con GPS di nuovo valido i passi non muovono più la stima', () => {
    let s = applySteps(fresh(), { steps: 100, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 1 })
    s = applyFix(s, { ...at(70), accuracyM: 5, timestamp: T0 + 15_000 })
    const before = s.points
    s = applySteps(s, { steps: 10, headingDeg: 90, now: T0 + 16_000 })
    expect(s.points).toBe(before)
  })
})

describe('calibrazione dal GPS', () => {
  it('impara passo e scarto bussola camminando in linea retta con GPS buono', () => {
    let s = applyFix(fresh(), fix(0, T0 + 1000, 4))
    // Un fix al secondo: 10 passi da 0,8 m verso est; la bussola segna 80°, scarto reale +10°.
    for (let i = 1; i <= 8; i++) {
      s = applySteps(s, { steps: 10, headingDeg: 80, now: T0 + 500 + i * 1000 })
      s = applyFix(s, { ...at(i * 8), accuracyM: 4, timestamp: T0 + 1000 + i * 1000 })
    }
    expect(s.calibration.stepSamples).toBe(1)
    expect(s.calibration.stepLengthM).toBeGreaterThan(0.7)
    expect(s.calibration.stepLengthM).toBeLessThan(0.8)
    expect(s.calibration.headingOffsetDeg).toBeGreaterThan(4)
    expect(s.calibration.headingOffsetDeg).toBeLessThan(10.01)
  })

  it('non impara se il tratto è troppo corto o il fix è impreciso', () => {
    let s = applyFix(fresh(), fix(0, T0 + 1000, 4))
    s = applySteps(s, { steps: 30, headingDeg: 90, now: T0 + 2000 })
    s = applyFix(s, { ...at(20), accuracyM: 4, timestamp: T0 + 3000 })
    expect(s.calibration).toBe(INITIAL_CALIBRATION)
    s = applySteps(s, { steps: 80, headingDeg: 90, now: T0 + 4000 })
    s = applyFix(s, { ...at(80), accuracyM: 20, timestamp: T0 + 5000 })
    expect(s.calibration).toBe(INITIAL_CALIBRATION)
  })
})

describe('direzione dal GPS e dal giroscopio', () => {
  // Sei fix a 8 m uno dall'altro verso est, con ottima precisione.
  const walkEast = () => {
    let s = fresh()
    for (let i = 1; i <= 6; i++) s = applyFix(s, fix(i * 8, T0 + i * 1000))
    return s
  }
  const lost = T0 + 6000 + GPS_TIMEOUT_MS + 1

  it('misura la direzione di cammino dai fix', () => {
    expect(walkEast().walkHeadingDeg).toBeCloseTo(90, 0)
  })

  it('senza GPS ignora la bussola (telefono in tasca) e segue la direzione GPS', () => {
    const before = walkEast()
    const s = applySteps(before, { steps: 100, headingDeg: 200, now: lost })
    expect(haversineM(last(before), last(s))).toBeCloseTo(70, 0)
    expect(bearingDeg(last(before), last(s))).toBeCloseTo(90, 0)
  })

  it('segue le svolte del giroscopio', () => {
    const s0 = walkEast()
    const s1 = applySteps(s0, { steps: 100, headingDeg: null, yawDeltaDeg: 90, now: lost })
    // A metà svolta: 90° + 45°.
    expect(bearingDeg(last(s0), last(s1))).toBeCloseTo(135, 0)
    const s2 = applySteps(s1, { steps: 100, headingDeg: null, now: lost + 1000 })
    expect(bearingDeg(last(s1), last(s2))).toBeCloseTo(180, 0)
    expect(s2.walkHeadingDeg).toBeCloseTo(180, 2)
  })

  it('la direzione GPS riprende il controllo quando il segnale torna e si cammina', () => {
    let s = applySteps(walkEast(), { steps: 100, headingDeg: null, yawDeltaDeg: 90, now: lost })
    const from = last(s)
    for (let i = 1; i <= 6; i++) {
      s = applyFix(s, { ...offsetMeters(from, -i * 8, 0), accuracyM: 5, timestamp: lost + 5000 + i * 1000 })
    }
    expect(s.walkHeadingDeg).toBeCloseTo(270, 0)
  })

  it('senza direzione GPS ricade sulla bussola e l\'incertezza cresce più in fretta', () => {
    const gyro = applySteps(walkEast(), { steps: 100, headingDeg: 90, now: lost })
    const compass = applySteps(fresh(), { steps: 100, headingDeg: 90, now: T0 + GPS_TIMEOUT_MS + 1 })
    expect(compass.walkHeadingDeg).toBeNull()
    expect(bearingDeg(START, last(compass))).toBeCloseTo(90, 0)
    expect(currentEstimate(compass.points)?.uncertaintyM).toBeGreaterThan(currentEstimate(gyro.points)?.uncertaintyM ?? 0)
  })
})

describe('normalizeStoredPoints', () => {
  it('considera misurati i vecchi punti senza origine', () => {
    expect(normalizeStoredPoints([{ lat: 1, lon: 2 }])[0].source).toBe('gps')
    expect(normalizeStoredPoints([{ lat: 1, lon: 2, source: 'pdr', uncertaintyM: 30 }])[0]).toEqual({
      lat: 1,
      lon: 2,
      source: 'pdr',
      uncertaintyM: 30,
    })
  })
})
