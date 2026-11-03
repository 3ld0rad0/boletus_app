import type {
  Band,
  FactorId,
  FactorResult,
  GridCell,
  Habitat,
  ScoredCell,
  ScoreInputs,
  ScoreResult,
  SpeciesRules,
  Trapezoid,
  Verdict,
  WeatherSummary,
} from './types'

/** Fasce in ordine crescente; `min` è il punteggio minimo della fascia. */
export const BAND_THRESHOLDS: readonly { band: Band; min: number }[] = [
  { band: 'veryLow', min: 0 },
  { band: 'low', min: 17 },
  { band: 'mediumLow', min: 33 },
  { band: 'mediumHigh', min: 50 },
  { band: 'high', min: 66 },
  { band: 'veryHigh', min: 83 },
]

/** Gradiente termico verticale medio: −0,65 °C ogni 100 m di quota. */
export const LAPSE_RATE_C_PER_M = 0.0065

// Quanto stagione e quota possono abbassare il punteggio: moltiplicatore = 1 − influenza × (1 − valore).
export const SEASON_INFLUENCE = 0.7
export const ELEVATION_INFLUENCE = 0.5

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const HABITATS: readonly Habitat[] = ['conifer', 'broadleaf', 'mixed', 'forest', 'grassland', 'none']

export const HABITAT_LABELS: Record<Habitat, string> = {
  conifer: 'bosco di conifere',
  broadleaf: 'bosco di latifoglie',
  mixed: 'bosco misto',
  forest: 'bosco',
  grassland: 'prato o pascolo',
  none: 'nessun bosco o prato rilevato',
}

/** Valore di stagione: i valori mensili valgono a metà mese e si interpolano linearmente tra mesi adiacenti. */
export function seasonValueAt(season: number[], month: number, day?: number): number {
  const exact = season[month - 1] ?? 0
  if (day === undefined) return exact
  const position = month - 1 + (day - 0.5) / DAYS_IN_MONTH[month - 1] - 0.5
  const lower = Math.floor(position)
  const t = position - lower
  const a = season[(lower + 12) % 12] ?? 0
  const b = season[(lower + 13) % 12] ?? 0
  return a + (b - a) * t
}

export function trapezoid(x: number, t: Trapezoid): number {
  if (!Number.isFinite(x) || x < t.min || x > t.max) return 0
  if (x < t.optMin) return (x - t.min) / (t.optMin - t.min)
  if (x > t.optMax) return (t.max - x) / (t.max - t.optMax)
  return 1
}

export function bandFor(score: number): Band {
  return (BAND_THRESHOLDS.findLast((t) => score >= t.min) ?? BAND_THRESHOLDS[0]).band
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
  const seasonValue = seasonValueAt(blocking.season, inputs.month, inputs.day)
  const bestMonths = MONTHS.filter((_, i) => blocking.season[i] >= 0.999)

  const factors: FactorResult[] = [
    {
      id: 'season',
      label: 'Stagione',
      value: seasonValue,
      verdict: verdictFor(seasonValue),
      blocking: true,
      detail: `${MONTHS[inputs.month - 1] ?? '?'}${seasonValue < 0.05 ? ': fuori stagione' : ''} (migliori: ${bestMonths.join(', ') || '—'})`,
    },
    trapezoidFactor('elevation', 'Quota', 'm', inputs.elevationM, blocking.elevation, true),
    trapezoidFactor('temperature', 'Temperatura media', '°C', inputs.tempMeanC, weighted.temperature, false),
    trapezoidFactor('rain', 'Pioggia recente', 'mm', inputs.rainSumMm, weighted.rain, false),
    trapezoidFactor('humidity', 'Umidità media', '%', inputs.humidityMeanPct, weighted.humidity, false),
  ]
  if (weighted.habitat && inputs.habitat) {
    const { preferences } = weighted.habitat
    const value = preferences[inputs.habitat]
    const ideal = HABITATS.filter((h) => preferences[h] >= 0.999).map((h) => HABITAT_LABELS[h])
    factors.push({
      id: 'habitat',
      label: 'Vegetazione',
      value,
      verdict: verdictFor(value),
      blocking: false,
      detail: `${HABITAT_LABELS[inputs.habitat]} (ideale: ${ideal.join(', ') || '—'})`,
    })
  }

  const influence: Partial<Record<FactorId, number>> = { season: SEASON_INFLUENCE, elevation: ELEVATION_INFLUENCE }
  const blockingProduct = factors
    .filter((f) => f.blocking)
    .reduce((acc, f) => acc * (1 - (influence[f.id] ?? 1) * (1 - f.value)), 1)

  const weights: Partial<Record<FactorId, number>> = {
    temperature: weighted.temperature.weight,
    rain: weighted.rain.weight,
    humidity: weighted.humidity.weight,
    habitat: weighted.habitat?.weight,
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
  day?: number,
  habitats?: Habitat[],
): ScoredCell[] {
  return cells.map((cell, i) => {
    const elevationM = elevationsM[i] ?? weather.referenceElevationM
    const inputs: ScoreInputs = {
      month,
      day,
      elevationM,
      tempMeanC: weather.tempMeanC - LAPSE_RATE_C_PER_M * (elevationM - weather.referenceElevationM),
      // Approssimazione: pioggia e umidità uguali in tutta la griglia (un solo punto meteo).
      rainSumMm: weather.rainSumMm,
      humidityMeanPct: weather.humidityMeanPct,
      habitat: habitats?.[i],
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

/** Valida le preferenze di habitat: peso >= 0 e un valore 0..1 per ogni habitat. */
function checkHabitat(h: unknown, path: string): void {
  if (!h || typeof h !== 'object') throw new Error(`${path}: oggetto mancante`)
  const o = h as Record<string, unknown>
  if (!(isNum(o.weight) && o.weight >= 0)) throw new Error(`${path}.weight: deve essere un numero >= 0`)
  const prefs = o.preferences as Record<string, unknown> | undefined
  if (!prefs || typeof prefs !== 'object') throw new Error(`${path}.preferences: oggetto mancante`)
  for (const k of HABITATS) {
    const v = prefs[k]
    if (!(isNum(v) && v >= 0 && v <= 1)) throw new Error(`${path}.preferences.${k}: deve essere un numero tra 0 e 1`)
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
  if (weighted.habitat !== undefined) checkHabitat(weighted.habitat, `${id}.weighted.habitat`)
  return raw as SpeciesRules
}
