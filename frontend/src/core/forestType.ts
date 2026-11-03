import type { Habitat, LatLon, ScoredCell } from './types'

// Rettangolo approssimato della Calabria: include qualche margine di Basilicata e Sicilia.
const CALABRIA = { south: 37.9, north: 40.15, west: 15.6, east: 17.25 }

export function inCalabria(p: LatLon): boolean {
  return p.lat >= CALABRIA.south && p.lat <= CALABRIA.north && p.lon >= CALABRIA.west && p.lon <= CALABRIA.east
}

/**
 * Stima del tipo di bosco in Calabria da habitat CORINE e quota: in regione la specie
 * dominante dipende molto dalla fascia altitudinale. È un'euristica, non un dato rilevato.
 */
export function forestLabel(habitat: Habitat, elevationM: number): string | null {
  if (habitat === 'broadleaf') {
    if (elevationM >= 1000) return 'faggeta'
    if (elevationM >= 500) return 'castagneto o querceto'
    return 'querceto o lecceta'
  }
  if (habitat === 'conifer') {
    if (elevationM >= 800) return 'pineta di pino laricio o abetina'
    return 'pineta mediterranea (pino d\'Aleppo o domestico)'
  }
  if (habitat === 'mixed') {
    return elevationM >= 1000 ? 'bosco misto montano di faggio e abete' : 'bosco misto'
  }
  return null
}

/** Etichetta del bosco probabile di una cella, solo per le celle in Calabria. */
export function probableForest(cell: ScoredCell): string | null {
  const { habitat, elevationM } = cell.inputs
  if (!habitat || !inCalabria(cell.cell.center)) return null
  return forestLabel(habitat, elevationM)
}
