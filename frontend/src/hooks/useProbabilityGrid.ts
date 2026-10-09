import { useCallback, useMemo, useRef, useState } from 'react'
import { generateGrid } from '../core/geo'
import { scoreGrid } from '../core/scoring'
import type { GridCell, LatLon, SpeciesRules, WeatherSummary } from '../core/types'
import { fetchElevations, fetchWeatherSummary } from '../core/weather'
import { GRID_RADIUS_M, GRID_SIZE } from '../config'

interface GridData {
  cells: GridCell[]
  elevations: number[]
  weather: WeatherSummary
  month: number
}

/**
 * Scarica meteo e quote una volta per area; il punteggio viene ricalcolato
 * localmente (senza nuove richieste) quando cambia la specie.
 */
export function useProbabilityGrid(species: SpeciesRules) {
  const [data, setData] = useState<GridData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const compute = useCallback(async (center: LatLon) => {
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const cells = generateGrid(center, GRID_SIZE, GRID_RADIUS_M)
      const [weather, elevations] = await Promise.all([
        fetchWeatherSummary(center),
        fetchElevations(cells.map((c) => c.center)),
      ])
      if (id === requestId.current) setData({ cells, elevations, weather, month: new Date().getMonth() + 1 })
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
    () => (data ? scoreGrid(data.cells, data.elevations, data.weather, species, data.month) : []),
    [data, species],
  )

  return { scored, weather: data?.weather ?? null, loading, error, compute, clear }
}
