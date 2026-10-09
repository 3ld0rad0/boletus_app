import type {
  Band,
  FactorId,
  FactorResult,
  GridCell,
  ScoredCell,
  ScoreInputs,
  ScoreResult,
  SpeciesRules,
  Trapezoid,
  Verdict,
  WeatherSummary,
} from './types'

export const BAND_THRESHOLDS = { medium: 33, high: 66 } as const

/** Gradiente termico verticale medio: −0,65 °C ogni 100 m di quota. */
export const LAPSE_RATE_C_PER_M = 0.0065

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export function trapezoid(x: number, t: Trapezoid): number {
  if (!Number.isFinite(x) || x < t.min || x > t.max) return 0
  if (x < t.optMin) return (x - t.min) / (t.optMin - t.min)
  if (x > t.optMax) return (t.max - x) / (t.max - t.optMax)
  return 1
}

export function bandFor(score: number): Band {
  if (score < BAND_THRESHOLDS.medium) return 'low'
  if (score < BAND_THRESHOLDS.high) return 'medium'
  return 'high'
}

function verdictFor(value: number): Verdict {
  if (value >= 0.999) return 'ottimale'
  if (value >= 0.5) return 'accettabile'
  return 'scarso'
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',')

function trapezoidFactor(
  id: FactorId,
  label: string,
  unit: string,
  x: number,
  t: Trapezoid,
  blocking: boolean,
): FactorResult {
  const value = trapezoid(x, t)
  const position = x < t.optMin ? ': troppo bassa' : x > t.optMax ? ': troppo alta' : ''
  return {
    id,
    label,
    value,
    verdict: verdictFor(value),
    blocking,
    detail: `${fmt(x)} ${unit}${position} (ottimale ${fmt(t.optMin)}–${fmt(t.optMax)} ${unit})`,
  }
}

export function score(species: SpeciesRules, inputs: ScoreInputs): ScoreResult {
  const { blocking, weighted } = species
  const seasonValue = blocking.season[inputs.month - 1] ?? 0
  const bestMonths = MONTHS.filter((_, i) => blocking.season[i] >= 0.999)

  const factors: FactorResult[] = [
    {
      id: 'season',
      label: 'Stagione',
      value: seasonValue,
      verdict: verdictFor(seasonValue),
      blocking: true,
      detail: `${MONTHS[inputs.month - 1] ?? '?'}${seasonValue === 0 ? ': fuori stagione' : ''} (migliori: ${bestMonths.join(', ') || '—'})`,
    },
    trapezoidFactor('elevation', 'Quota', 'm', inputs.elevationM, blocking.elevation, true),
    trapezoidFactor('temperature', 'Temperatura media', '°C', inputs.tempMeanC, weighted.temperature, false),
    trapezoidFactor('rain', 'Pioggia recente', 'mm', inputs.rainSumMm, weighted.rain, false),
    trapezoidFactor('humidity', 'Umidità media', '%', inputs.humidityMeanPct, weighted.humidity, false),
  ]

  const blockingProduct = factors.filter((f) => f.blocking).reduce((acc, f) => acc * f.value, 1)

  const weights: Partial<Record<FactorId, number>> = {
    temperature: weighted.temperature.weight,
    rain: weighted.rain.weight,
    humidity: weighted.humidity.weight,
  }
  const weightedFactors = factors.filter((f) => !f.blocking)
  const totalWeight = weightedFactors.reduce((acc, f) => acc + (weights[f.id] ?? 0), 0)
  const weightedMean =
    totalWeight > 0
      ? weightedFactors.reduce((acc, f) => acc + f.value * (weights[f.id] ?? 0), 0) / totalWeight
      : 0

  const value = Math.round(100 * blockingProduct * weightedMean)
  return { score: value, band: bandFor(value), factors }
}

/** Applica il punteggio a ogni cella, correggendo la temperatura in base alla quota della cella. */
export function scoreGrid(
  cells: GridCell[],
  elevationsM: number[],
  weather: WeatherSummary,
  species: SpeciesRules,
  month: number,
): ScoredCell[] {
  return cells.map((cell, i) => {
    const elevationM = elevationsM[i] ?? weather.referenceElevationM
    const inputs: ScoreInputs = {
      month,
      elevationM,
      tempMeanC: weather.tempMeanC - LAPSE_RATE_C_PER_M * (elevationM - weather.referenceElevationM),
      // Approssimazione: pioggia e umidità uguali in tutta la griglia (un solo punto meteo).
      rainSumMm: weather.rainSumMm,
      humidityMeanPct: weather.humidityMeanPct,
    }
    return { cell, inputs, result: score(species, inputs) }
  })
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function checkTrapezoid(t: unknown, path: string, withWeight: boolean): void {
  if (!t || typeof t !== 'object') throw new Error(`${path}: oggetto mancante`)
  const o = t as Record<string, unknown>
  for (const k of ['min', 'optMin', 'optMax', 'max']) {
    if (!isNum(o[k])) throw new Error(`${path}.${k}: deve essere un numero`)
  }
  const { min, optMin, optMax, max } = o as unknown as Trapezoid
  if (!(min <= optMin && optMin <= optMax && optMax <= max)) {
    throw new Error(`${path}: deve valere min <= optMin <= optMax <= max`)
  }
  if (withWeight && !(isNum(o.weight) && o.weight >= 0)) {
    throw new Error(`${path}.weight: deve essere un numero >= 0`)
  }
}

/** Valida una regola di specie caricata da JSON; lancia un errore descrittivo se non è valida. */
export function validateSpecies(raw: unknown): SpeciesRules {
  if (!raw || typeof raw !== 'object') throw new Error('specie: oggetto mancante')
  const o = raw as Record<string, unknown>
  for (const k of ['id', 'name', 'latinName']) {
    if (typeof o[k] !== 'string' || o[k] === '') throw new Error(`specie.${k}: stringa obbligatoria`)
  }
  const id = o.id as string
  const blocking = o.blocking as Record<string, unknown> | undefined
  const weighted = o.weighted as Record<string, unknown> | undefined
  if (!blocking || !weighted) throw new Error(`${id}: servono "blocking" e "weighted"`)

  const season = blocking.season
  if (!Array.isArray(season) || season.length !== 12 || !season.every((v) => isNum(v) && v >= 0 && v <= 1)) {
    throw new Error(`${id}.blocking.season: servono 12 valori tra 0 e 1`)
  }
  checkTrapezoid(blocking.elevation, `${id}.blocking.elevation`, false)
  for (const k of ['temperature', 'rain', 'humidity']) {
    checkTrapezoid(weighted[k], `${id}.weighted.${k}`, true)
  }
  return raw as SpeciesRules
}
