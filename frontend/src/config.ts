import type { Band, LatLon } from './core/types'

/** Griglia di probabilità: GRID_SIZE × GRID_SIZE celle in un quadrato di semilato GRID_RADIUS_M. */
export const GRID_SIZE = 7
export const GRID_RADIUS_M = 3000

export const DEFAULT_CENTER: LatLon = { lat: 42.5, lon: 12.5 }
export const DEFAULT_ZOOM = 5.5
export const USER_ZOOM = 14

const THUNDERFOREST_KEY = import.meta.env.VITE_THUNDERFOREST_API_KEY

const THUNDERFOREST_TILE_URL = `https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${THUNDERFOREST_KEY}`
const THUNDERFOREST_ATTRIBUTION =
  'Mappa: © <a href="https://www.thunderforest.com">Thunderforest</a> | Dati: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// Senza chiave Thunderforest si ripiega su OpenTopoMap.
const FALLBACK_TILE_URL = 'https://tile.opentopomap.org/{z}/{x}/{y}.png'
const FALLBACK_ATTRIBUTION =
  'Dati: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Stile: © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'

/** URL di tile raster; `VITE_TILE_URL` ha la precedenza su Thunderforest. */
export const TILE_URL =
  import.meta.env.VITE_TILE_URL || (THUNDERFOREST_KEY ? THUNDERFOREST_TILE_URL : FALLBACK_TILE_URL)
export const TILE_ATTRIBUTION =
  import.meta.env.VITE_TILE_ATTRIBUTION || (THUNDERFOREST_KEY ? THUNDERFOREST_ATTRIBUTION : FALLBACK_ATTRIBUTION)
export const TILE_MAX_ZOOM = 17

export const BAND_COLORS: Record<Band, string> = {
  low: '#d64933',
  medium: '#f2b134',
  high: '#2e9e4f',
}

export const BAND_LABELS: Record<Band, string> = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
}
