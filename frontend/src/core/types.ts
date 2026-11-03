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

/** Tipo di vegetazione/uso del suolo di una cella (da OpenStreetMap). */
export type Habitat = 'conifer' | 'broadleaf' | 'mixed' | 'forest' | 'grassland' | 'none'

/** Preferenza 0..1 della specie per ciascun habitat. */
export interface HabitatRule {
  weight: number
  preferences: Record<Habitat, number>
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
    /** Facoltativo: senza regola o senza dato di vegetazione il fattore non entra nel calcolo. */
    habitat?: HabitatRule
  }
}

export interface ScoreInputs {
  /** 1-12 */
  month: number
  /** Giorno del mese: se presente la stagione si interpola tra i mesi, altrimenti vale il valore del mese. */
  day?: number
  elevationM: number
  tempMeanC: number
  rainSumMm: number
  humidityMeanPct: number
  /** Assente se il dato di vegetazione non è disponibile. */
  habitat?: Habitat
}

export type FactorId = 'season' | 'elevation' | 'temperature' | 'rain' | 'humidity' | 'habitat'
export type Verdict = 'ottimale' | 'accettabile' | 'scarso'
export type Band = 'veryLow' | 'low' | 'mediumLow' | 'mediumHigh' | 'high' | 'veryHigh'

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

export interface GridCell {
  id: string
  center: LatLon
  /** Vertici del contorno della cella. */
  polygon: LatLon[]
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
