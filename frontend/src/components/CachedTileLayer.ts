import L from 'leaflet'
import { fetchMapTile } from '../services/tileCache'

/** Layer di tasselli che usa la cache del dispositivo, così la mappa si vede anche senza rete. */
export class CachedTileLayer extends L.TileLayer {
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img')
    tile.alt = ''
    tile.setAttribute('role', 'presentation')
    const url = this.getTileUrl(coords)

    // Se il server non ammette CORS (o la cache non c'è) si ripiega sul caricamento normale dell'immagine.
    void fetchMapTile(url)
      .then((blob) => URL.createObjectURL(blob))
      .catch(() => url)
      .then((src) => {
        const release = () => src !== url && URL.revokeObjectURL(src)
        tile.onload = () => {
          release()
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
