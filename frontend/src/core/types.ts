export interface LatLon {
  lat: number
  lon: number
}

/** Curva trapezoidale: 0 fuori da [min, max], 1 in [optMin, optMax], lineare in mezzo. */
export interface Trapezoid {
  min: number
  optMin: number
  optMax: number
  max: number
}

export interface WeightedTrapezoid extends Trapezoid {
  weight: number
}

export interface SpeciesRules {
  id: string
  name: string
  latinName: string
  _note?: string
  blocking: {
    /** 12 valori 0..1, indice 0 = gennaio. */
    season: number[]
    elevation: Trapezoid
  }
  weighted: {
    temperature: WeightedTrapezoid
    rain: WeightedTrapezoid
    humidity: WeightedTrapezoid
  }
}

export interface ScoreInputs {
  /** 1-12 */
  month: number
  elevationM: number
  tempMeanC: number
  rainSumMm: number
  humidityMeanPct: number
}

export type FactorId = 'season' | 'elevation' | 'temperature' | 'rain' | 'humidity'
export type Verdict = 'ottimale' | 'accettabile' | 'scarso'
export type Band = 'low' | 'medium' | 'high'

export interface FactorResult {
  id: FactorId
  label: string
  value: number
  verdict: Verdict
  blocking: boolean
  detail: string
}

export interface ScoreResult {
  score: number
  band: Band
  factors: FactorResult[]
}

export interface Bounds {
  south: number
  west: number
  north: number
  east: number
}

export interface GridCell {
  id: string
  center: LatLon
  bounds: Bounds
}

export interface WeatherSummary {
  /** Quota (m) a cui si riferisce la temperatura del modello meteo. */
  referenceElevationM: number
  tempMeanC: number
  rainSumMm: number
  humidityMeanPct: number
}

export interface ScoredCell {
  cell: GridCell
  inputs: ScoreInputs
  result: ScoreResult
}
