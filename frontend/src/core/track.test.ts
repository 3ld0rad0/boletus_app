import { describe, expect, it } from 'vitest'
import { haversineM, offsetMeters } from './geo'
import { appendPoint, pathLengthM, returnGuide } from './track'

const START = { lat: 39.3, lon: 16.25 }
const at = (eastM: number, northM = 0) => offsetMeters(START, eastM, northM)
// Percorso verso est: un punto ogni 20 m, fino a 200 m.
const TRACK = Array.from({ length: 11 }, (_, i) => at(i * 20))

describe('appendPoint', () => {
  it('ignora i punti troppo vicini all\'ultimo (stesso array)', () => {
    const track = [START]
    expect(appendPoint(track, at(5), 20, 100)).toBe(track)
  })
  it('aggiunge i punti abbastanza lontani', () => {
    expect(appendPoint([START], at(25), 20, 100)).toHaveLength(2)
  })
  it('oltre il massimo dimezza i punti tenendo primo e ultimo', () => {
    const track = Array.from({ length: 10 }, (_, i) => at(i * 30))
    const next = appendPoint(track, at(10 * 30), 20, 10)
    expect(next.length).toBeLessThan(10)
    expect(next[0]).toEqual(track[0])
    expect(haversineM(next[next.length - 1], at(300))).toBeLessThan(0.5)
  })
})

describe('pathLengthM', () => {
  it('somma i segmenti', () => {
    expect(pathLengthM(TRACK)).toBeCloseTo(200, 0)
    expect(pathLengthM([START])).toBe(0)
  })
})

describe('returnGuide', () => {
  it('senza percorso utile punta alla partenza in linea retta', () => {
    const g = returnGuide([], at(100), START)
    expect(g.followingTrack).toBe(false)
    expect(g.target).toEqual(START)
    expect(g.remainingM).toBeCloseTo(100, 0)
  })
  it('sul percorso punta al primo punto indietro oltre la distanza di anticipo e conta la distanza lungo il percorso', () => {
    const g = returnGuide(TRACK, at(200), START, 35)
    expect(g.followingTrack).toBe(true)
    expect(haversineM(g.target, at(160))).toBeLessThan(1)
    expect(g.remainingM).toBeCloseTo(200, 0)
  })
  it('vicino alla partenza punta alla partenza', () => {
    expect(returnGuide(TRACK, at(30), START).target).toEqual(START)
  })
  it('fuori dal percorso punta al punto del percorso più vicino', () => {
    const g = returnGuide(TRACK, at(100, 80), START)
    expect(haversineM(g.target, at(100))).toBeLessThan(1)
    expect(g.remainingM).toBeCloseTo(80 + 100, 0)
  })
})
