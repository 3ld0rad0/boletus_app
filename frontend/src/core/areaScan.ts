import { bearingDeg, haversineM, offsetMeters } from './geo'
import type { PlaceName } from './geocoding'
import { LAPSE_RATE_C_PER_M, score, scoreGrid } from './scoring'
import type {
  Band,
  FactorResult,
  GridCell,
  Habitat,
  LatLon,
  ScoreInputs,
  ScoreResult,
  SpeciesRules,
  WeatherSummary,
} from './types'

export const SCAN_RADIUS_M = 120_000
export const SCAN_STEP_M = 12_000
/** Zoom delle tile di quota per la scansione grossolana: poche tile, circa 300 m per pixel. */
export const SCAN_ELEVATION_ZOOM = 9
export const ZONES_COUNT = 3
/** Due zone distinte distano almeno due passi del reticolo. */
export const MIN_ZONE_SEPARATION_M = 2 * SCAN_STEP_M
/** Sotto questo punteggio la zona migliore non è comunque favorevole. */
export const FAVORABLE_SCORE = 33

/** Avanzamento 0..1: meteo fino al 45%, riesame delle zone fino al 70%, preparazione della zona il resto. */
export function scanFraction(p: ScanProgress | null): number {
  if (!p) return 0.03
  const part = p.total > 0 ? p.done / p.total : 0
  if (p.phase === 'weather') return 0.03 + 0.42 * part
  if (p.phase === 'refine') return 0.45 + 0.25 * part
  return 0.7 + 0.3 * part
}

export interface ScanProgress {
  phase: 'weather' | 'refine' | 'prepare'
  done: number
  total: number
}

export interface SpeciesScore {
  id: string
  name: string
  score: number
}

export interface ZoneReport {
  point: LatLon
  place: PlaceName | null
  distanceM: number
  bearingDeg: number
  speciesId: string
  speciesName: string
  score: number
  band: Band
  factors: FactorResult[]
  inputs: ScoreInputs
  /** Punteggio della prima fase, senza vegetazione né abitati. */
  coarseScore: number
  /** Vegetazione e distanza dagli abitati considerate nel punteggio. */
  detailed: boolean
  /** Punteggio di ogni specie nella zona, dalla migliore. */
  speciesScores: SpeciesScore[]
  /** Meteo grezzo del modello (con storico per i grafici); solo per la zona consigliata riesaminata. */
  weather?: WeatherSummary
}

export interface AreaReport {
  generatedAt: number
  origin: LatLon
  radiusM: number
  nodesScanned: number
  month: number
  day: number
  zones: ZoneReport[]
}

/** Nodi di un reticolo quadrato dentro il cerchio di raggio `radiusM`; il centro è sempre incluso. */
export function generateScanNodes(center: LatLon, radiusM = SCAN_RADIUS_M, stepM = SCAN_STEP_M): LatLon[] {
  const n = Math.floor(radiusM / stepM)
  const nodes: LatLon[] = []
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const east = i * stepM
      const north = j * stepM
      if (Math.hypot(east, north) <= radiusM) nodes.push(offsetMeters(center, east, north))
    }
  }
  return nodes
}

export interface NodeScore {
  point: LatLon
  species: SpeciesRules
  inputs: ScoreInputs
  result: ScoreResult
}

/** Miglior specie in ogni nodo, con meteo e quota del nodo; i nodi senza meteo sono scartati. */
export function scoreNodes(
  nodes: LatLon[],
  elevationsM: number[],
  weathers: (WeatherSummary | null)[],
  allSpecies: SpeciesRules[],
  month: number,
  day: number,
): NodeScore[] {
  const out: NodeScore[] = []
  nodes.forEach((point, i) => {
    const weather = weathers[i]
    const elevationM = elevationsM[i]
    if (!weather || !Number.isFinite(elevationM)) return
    const inputs: ScoreInputs = {
      month,
      day,
      elevationM,
      tempMeanC: weather.tempMeanC - LAPSE_RATE_C_PER_M * (elevationM - weather.referenceElevationM),
      rainSumMm: weather.rainSumMm,
      humidityMeanPct: weather.humidityMeanPct,
    }
    let best: NodeScore | null = null
    for (const species of allSpecies) {
      const result = score(species, inputs)
      if (!best || result.score > best.result.score) best = { point, species, inputs, result }
    }
    if (best) out.push(best)
  })
  return out
}

/** Migliori nodi a parità di punteggio più vicini all'origine, distanziati tra loro di almeno `minSeparationM`. */
export function pickZones(
  nodes: NodeScore[],
  origin: LatLon,
  count = ZONES_COUNT,
  minSeparationM = MIN_ZONE_SEPARATION_M,
): NodeScore[] {
  const ranked = nodes
    .map((n) => ({ n, d: haversineM(origin, n.point) }))
    .sort((a, b) => b.n.result.score - a.n.result.score || a.d - b.d)
  const picked: NodeScore[] = []
  for (const { n } of ranked) {
    if (picked.every((p) => haversineM(p.point, n.point) >= minSeparationM)) picked.push(n)
    if (picked.length === count) break
  }
  return picked
}

export interface AreaBest {
  species: SpeciesRules
  /** Indice in `cells` della cella migliore. */
  cellIndex: number
  inputs: ScoreInputs
  result: ScoreResult
  speciesScores: SpeciesScore[]
}

/** Coppia specie e cella con il punteggio più alto in una griglia già scaricata. */
export function bestInGrid(
  cells: GridCell[],
  elevationsM: number[],
  weather: WeatherSummary,
  allSpecies: SpeciesRules[],
  month: number,
  day: number,
  habitats?: Habitat[],
  urbanDistancesM?: number[],
): AreaBest | null {
  let best: AreaBest | null = null
  const speciesScores: SpeciesScore[] = []
  for (const species of allSpecies) {
    const scored = scoreGrid(cells, elevationsM, weather, species, month, day, habitats, urbanDistancesM)
    if (!scored.length) continue
    let top = 0
    scored.forEach((s, i) => {
      if (s.result.score > scored[top].result.score) top = i
    })
    const { inputs, result } = scored[top]
    speciesScores.push({ id: species.id, name: species.name, score: result.score })
    if (!best || result.score > best.result.score) best = { species, cellIndex: top, inputs, result, speciesScores }
  }
  if (best) best.speciesScores.sort((a, b) => b.score - a.score)
  return best
}

/** Compone il resoconto di una zona; `Infinity` della distanza dall'abitato non è serializzabile e viene omesso. */
export function makeZone(
  origin: LatLon,
  point: LatLon,
  species: SpeciesRules,
  inputs: ScoreInputs,
  result: ScoreResult,
  coarseScore: number,
  detailed: boolean,
  speciesScores: SpeciesScore[],
  place: PlaceName | null,
  weather?: WeatherSummary,
): ZoneReport {
  const { urbanDistanceM, ...rest } = inputs
  return {
    point,
    place,
    distanceM: haversineM(origin, point),
    bearingDeg: bearingDeg(origin, point),
    speciesId: species.id,
    speciesName: species.name,
    score: result.score,
    band: result.band,
    factors: result.factors,
    inputs: urbanDistanceM !== undefined && Number.isFinite(urbanDistanceM) ? { ...rest, urbanDistanceM } : rest,
    coarseScore,
    detailed,
    speciesScores,
    weather,
  }
}

/** Zone in ordine di punteggio; a parità vince la più vicina. */
export function sortZones(zones: ZoneReport[]): ZoneReport[] {
  return [...zones].sort((a, b) => b.score - a.score || a.distanceM - b.distanceM)
}
