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
  private readonly downloads = new WeakMap<HTMLElement, AbortController>()

  constructor(urlTemplate: string, options?: L.TileLayerOptions) {
    super(urlTemplate, options)
    // Un tassello uscito dalla vista non deve più occupare la connessione.
    this.on('tileunload', (e) => this.downloads.get((e as L.TileEvent).tile)?.abort())
  }

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img')
    tile.alt = ''
    tile.decoding = 'async'
    tile.setAttribute('role', 'presentation')
    const url = this.getTileUrl(coords)
    const started = performance.now()
    const ctrl = new AbortController()
    this.downloads.set(tile, ctrl)

    // Se il server non ammette CORS, la cache non c'è o il download scade si ripiega sull'immagine normale.
    void fetchMapTile(url, ctrl.signal)
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => url)
      .then((src) => {
        if (ctrl.signal.aborted) return void (src !== url && URL.revokeObjectURL(src))
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
