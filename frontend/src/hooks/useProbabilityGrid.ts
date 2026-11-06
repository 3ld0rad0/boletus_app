import { useCallback, useMemo, useRef, useState } from 'react'
import { generateGrid } from '../core/geo'
import { habitatBbox, habitatsFromImage, urbanDistancesFromImage } from '../core/landcover'
import { scoreGrid, SETTLEMENT_FAR_M } from '../core/scoring'
import type { GridCell, Habitat, LatLon, SpeciesRules, WeatherSummary } from '../core/types'
import { fetchWeatherSummary } from '../core/weather'
import { fetchLandcover } from '../services/corine'
import { fetchElevations } from '../services/terrarium'
import { GRID_RADIUS_M, GRID_RINGS } from '../config'

export type HabitatStatus = 'loading' | 'ready' | 'failed'

// Margine attorno alla griglia per vedere anche gli abitati appena fuori (1° di latitudine ≈ 111 km).
const URBAN_MARGIN_DEG = SETTLEMENT_FAR_M / 111_000 * 1.5

interface GridData {
  center: LatLon
  cells: GridCell[]
  elevations: number[]
  weather: WeatherSummary
  month: number
  day: number
  habitats: Habitat[] | null
  urbanDistances: number[] | null
  habitatStatus: HabitatStatus
  habitatError: string | null
}

/**
 * Scarica meteo e quote una volta per area; il punteggio viene ricalcolato
 * localmente (senza nuove richieste) quando cambia la specie. La vegetazione
 * arriva dopo e aggiorna il punteggio senza bloccare la prima visualizzazione.
 */
export function useProbabilityGrid(species: SpeciesRules, allSpecies: SpeciesRules[] = []) {
  const [data, setData] = useState<GridData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const compute = useCallback(async (center: LatLon) => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const cells = generateGrid(center, GRID_RINGS, GRID_RADIUS_M)
      const landcover = fetchLandcover(habitatBbox(cells, undefined, URBAN_MARGIN_DEG)).then(
        (image) => ({ image, error: null }),
        (e: unknown) => {
          console.warn('Vegetazione (CORINE) non disponibile', e)
          return { image: null, error: e instanceof Error ? e.message : 'errore sconosciuto' }
        },
      )
      const [weather, elevations] = await Promise.all([
        fetchWeatherSummary(center),
        fetchElevations(cells.map((c) => c.center)),
      ])
      if (id !== requestId.current) return
      const now = new Date()
      setData({
        center,
        cells,
        elevations,
        weather,
        month: now.getMonth() + 1,
        day: now.getDate(),
        habitats: null,
        urbanDistances: null,
        habitatStatus: 'loading',
        habitatError: null,
      })
      setLoading(false)
      const { image, error: habitatError } = await landcover
      if (id !== requestId.current) return
      setData((d) =>
        d && {
          ...d,
          habitats: image
            ? habitatsFromImage(
                cells.map((c) => c.center),
                image,
              )
            : null,
          urbanDistances: image
            ? urbanDistancesFromImage(
                cells.map((c) => c.center),
                image,
              )
            : null,
          habitatStatus: image ? 'ready' : 'failed',
          habitatError,
        },
      )
    } catch (e) {
      if (id === requestId.current) {
        setError(`Impossibile ottenere i dati meteo: ${e instanceof Error ? e.message : 'errore sconosciuto'}`)
      }
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    requestId.current++
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  const scored = useMemo(
    () =>
      data
        ? scoreGrid(
            data.cells,
            data.elevations,
            data.weather,
            species,
            data.month,
            data.day,
            data.habitats ?? undefined,
            data.urbanDistances ?? undefined,
          )
        : [],
    [data, species],
  )

  // Punteggio della cella migliore dell'area per ogni specie.
  const speciesScores = useMemo(() => {
    if (!data) return []
    return allSpecies.map((s) => {
      const cells = scoreGrid(
        data.cells,
        data.elevations,
        data.weather,
        s,
        data.month,
        data.day,
        data.habitats ?? undefined,
        data.urbanDistances ?? undefined,
      )
      return { species: s, score: Math.max(0, ...cells.map((c) => c.result.score)) }
    })
  }, [data, allSpecies])

  return {
    scored,
    speciesScores,
    center: data?.center ?? null,
    weather: data?.weather ?? null,
    habitatStatus: data?.habitatStatus ?? null,
    habitatError: data?.habitatError ?? null,
    habitatCells: data?.habitats ? data.habitats.filter((h) => h !== 'none').length : null,
    loading,
    error,
    compute,
    clear,
  }
}
