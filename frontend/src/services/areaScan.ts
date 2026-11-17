import {
  bestInGrid,
  generateScanNodes,
  makeZone,
  pickZones,
  SCAN_ELEVATION_ZOOM,
  SCAN_RADIUS_M,
  scoreNodes,
  sortZones,
  type AreaReport,
  type NodeScore,
  type ScanProgress,
  type ZoneReport,
} from '../core/areaScan'
import { generateGrid } from '../core/geo'
import { reverseGeocode } from '../core/geocoding'
import { habitatBbox, habitatsFromImage, urbanDistancesFromImage, URBAN_MARGIN_DEG } from '../core/landcover'
import type { LatLon, SpeciesRules } from '../core/types'
import { fetchWeatherSummaries, fetchWeatherSummary } from '../core/weather'
import { GRID_RADIUS_M, GRID_RINGS } from '../config'
import { fetchLandcover } from './corine'
import { fetchElevations } from './terrarium'
import { prefetchTiles } from './tilePrefetch'

interface Options {
  signal?: AbortSignal
  onProgress?: (p: ScanProgress) => void
}

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Analisi annullata', 'AbortError')
}

/** Riesamina un nodo con la griglia da 2,5 km, vegetazione e distanza dagli abitati. */
async function refine(
  node: NodeScore,
  origin: LatLon,
  allSpecies: SpeciesRules[],
  month: number,
  day: number,
): Promise<ZoneReport | null> {
  const cells = generateGrid(node.point, GRID_RINGS, GRID_RADIUS_M)
  const centers = cells.map((c) => c.center)
  const landcover = fetchLandcover(habitatBbox(cells, undefined, URBAN_MARGIN_DEG)).catch((e: unknown) => {
    console.warn('Vegetazione (CORINE) non disponibile per la zona', e)
    return null
  })
  const [weather, elevations] = await Promise.all([fetchWeatherSummary(node.point), fetchElevations(centers)])
  const image = await landcover
  const habitats = image ? habitatsFromImage(centers, image) : undefined
  const urban = image ? urbanDistancesFromImage(centers, image) : undefined
  const best = bestInGrid(cells, elevations, weather, allSpecies, month, day, habitats, urban)
  if (!best) return null
  const point = cells[best.cellIndex].center
  const place = await reverseGeocode(point).catch(() => null)
  return makeZone(
    origin,
    point,
    best.species,
    best.inputs,
    best.result,
    node.result.score,
    image !== null,
    best.speciesScores,
    place,
    weather,
  )
}

/**
 * Cerca le zone migliori entro `SCAN_RADIUS_M` dall'origine: prima una scansione grossolana (meteo e quota
 * su un reticolo), poi il riesame dettagliato dei nodi migliori. Una zona che non si riesce a riesaminare
 * resta con il punteggio grossolano.
 */
export async function scanBestAreas(
  origin: LatLon,
  allSpecies: SpeciesRules[],
  { signal, onProgress }: Options = {},
): Promise<AreaReport> {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const nodes = generateScanNodes(origin)

  const [weathers, elevations] = await Promise.all([
    fetchWeatherSummaries(nodes, (done, total) => onProgress?.({ phase: 'weather', done, total })),
    fetchElevations(nodes, SCAN_ELEVATION_ZOOM),
  ])
  checkAborted(signal)
  const scored = scoreNodes(nodes, elevations, weathers, allSpecies, month, day)
  if (!scored.length) throw new Error('Dati meteo non disponibili')

  const picked = pickZones(scored, origin)
  const zones: ZoneReport[] = []
  for (const [i, node] of picked.entries()) {
    checkAborted(signal)
    onProgress?.({ phase: 'refine', done: i, total: picked.length })
    let zone: ZoneReport | null = null
    try {
      zone = await refine(node, origin, allSpecies, month, day)
    } catch (e) {
      console.warn('Riesame della zona non riuscito', e)
    }
    zones.push(
      zone ??
        makeZone(origin, node.point, node.species, node.inputs, node.result, node.result.score, false, [], null),
    )
  }
  checkAborted(signal)
  return {
    generatedAt: Date.now(),
    origin,
    radiusM: SCAN_RADIUS_M,
    nodesScanned: scored.length,
    month,
    day,
    zones: sortZones(zones).map((z, i) => (i === 0 ? z : { ...z, weather: undefined })),
  }
}

/**
 * Prepara la zona consigliata: scalda le cache con le stesse richieste del calcolo sul punto, così
 * "Mostra sulla mappa" è immediato, e salva sul dispositivo le tessere della mappa attorno.
 */
export async function prepareZone(point: LatLon, onProgress?: (p: ScanProgress) => void): Promise<void> {
  const report = (done: number) => onProgress?.({ phase: 'prepare', done, total: 100 })
  report(0)
  const cells = generateGrid(point, GRID_RINGS, GRID_RADIUS_M)
  await Promise.allSettled([
    fetchWeatherSummary(point),
    fetchElevations(cells.map((c) => c.center)),
    fetchLandcover(habitatBbox(cells, undefined, URBAN_MARGIN_DEG)),
  ])
  report(20)
  await prefetchTiles(point, {
    concurrency: 4,
    onProgress: (done, total) => report(20 + Math.round((80 * done) / Math.max(1, total))),
  })
  report(100)
}
