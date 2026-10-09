import type { Band, LatLon } from './core/types'

/** Griglia di probabilità: GRID_SIZE × GRID_SIZE celle in un quadrato di semilato GRID_RADIUS_M. */
export const GRID_SIZE = 7
export const GRID_RADIUS_M = 3000

export const DEFAULT_CENTER: LatLon = { lat: 42.5, lon: 12.5 }
export const DEFAULT_ZOOM = 5.5
export const USER_ZOOM = 14

const DEFAULT_TILE_URL = 'https://tile.opentopomap.org/{z}/{x}/{y}.png'
const DEFAULT_TILE_ATTRIBUTION =
  'Dati: © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Stile: © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'

/** Una o più URL di tile raster separate da virgola. */
export const TILE_URLS = (import.meta.env.VITE_TILE_URL || DEFAULT_TILE_URL).split(',').map((s) => s.trim())
export const TILE_ATTRIBUTION = import.meta.env.VITE_TILE_ATTRIBUTION || DEFAULT_TILE_ATTRIBUTION
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
