import type { Band, LatLon } from './core/types'

/** Griglia di probabilità polare: GRID_RINGS anelli (disco centrale + corone) entro il cerchio di raggio GRID_RADIUS_M. */
export const GRID_RINGS = 5
export const GRID_RADIUS_M = 2500

/** Tile di quota tenute nella cache del browser tra una sessione e l'altra (circa 100 KB ciascuna). */
export const TERRARIUM_CACHE_MAX_TILES = 200

/** Immagini CORINE (boschi e prati) tenute nella cache del browser; ognuna pesa pochi KB. */
export const CORINE_CACHE_MAX_IMAGES = 50

/** Tasselli di mappa tenuti sul dispositivo per vedere la mappa senza rete (circa 20-40 KB ciascuno). */
export const TILE_CACHE_MAX_TILES = 1500

export const DEFAULT_CENTER: LatLon = { lat: 42.5, lon: 12.5 }
export const DEFAULT_ZOOM = 5.5
export const USER_ZOOM = 14
export const PLACE_ZOOM = 13

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

/** Zoom delle tessere prescaricate attorno a punto di partenza e area calcolata. */
export const OFFLINE_TILE_ZOOMS = [13, 14, 15, 16]

export const BAND_COLORS: Record<Band, string> = {
  veryLow: '#8e1b1b',
  low: '#d64933',
  mediumLow: '#f08a24',
  mediumHigh: '#f2c334',
  high: '#9ccc3c',
  veryHigh: '#1b7a3a',
}

export const BAND_LABELS: Record<Band, string> = {
  veryLow: 'Molto bassa',
  low: 'Bassa',
  mediumLow: 'Medio-bassa',
  mediumHigh: 'Medio-alta',
  high: 'Alta',
  veryHigh: 'Molto alta',
}
