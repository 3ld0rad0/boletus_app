import L from 'leaflet'
import { fetchMapTile } from '../services/tileCache'

// Solo sviluppo: riepilogo dei tempi di caricamento dei tasselli, per confrontare prima e dopo una modifica.
const timings: number[] = []
let report: number | undefined
function recordTiming(ms: number) {
  if (!import.meta.env.DEV) return
  timings.push(ms)
  window.clearTimeout(report)
  report = window.setTimeout(() => {
    const sorted = [...timings].sort((a, b) => a - b)
    console.debug(
      `[tasselli] ${sorted.length} caricati · mediana ${Math.round(sorted[Math.floor(sorted.length / 2)])} ms · max ${Math.round(sorted[sorted.length - 1])} ms`,
    )
    timings.length = 0
  }, 1500)
}

/** Layer di tasselli che usa la cache del dispositivo, così la mappa si vede anche senza rete. */
export class CachedTileLayer extends L.TileLayer {
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img')
    tile.alt = ''
    tile.setAttribute('role', 'presentation')
    const url = this.getTileUrl(coords)
    const started = performance.now()

    // Se il server non ammette CORS (o la cache non c'è) si ripiega sul caricamento normale dell'immagine.
    void fetchMapTile(url)
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => url)
      .then((src) => {
        const release = () => src !== url && URL.revokeObjectURL(src)
        tile.onload = () => {
          release()
          recordTiming(performance.now() - started)
          done(undefined, tile)
        }
        tile.onerror = () => {
          release()
          done(new Error('Tassello non caricato'), tile)
        }
        tile.src = src
      })
    return tile
  }
}
