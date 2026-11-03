import { useEffect, useRef, type ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLon, ScoredCell } from '../core/types'
import type { Position } from '../services/location'
import {
  BAND_COLORS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  PLACE_ZOOM,
  TILE_ATTRIBUTION,
  TILE_MAX_ZOOM,
  TILE_URL,
  USER_ZOOM,
} from '../config'
import { CachedTileLayer } from './CachedTileLayer'
import { Icon } from './Icon'

interface Props {
  position: Position | null
  startPoint: LatLon | null
  /** Percorso registrato dalla partenza alla posizione attuale. */
  track: LatLon[]
  /** Cambiando riferimento la mappa si sposta qui (es. località cercata). */
  focus: LatLon | null
  cells: ScoredCell[]
  selectedCellId: string | null
  onSelectCell: (id: string | null) => void
  onCenterChange: (center: LatLon) => void
  /** Altri pulsanti flottanti, sotto quello di centratura. */
  children?: ReactNode
}

const GRID_STYLE: L.PathOptions = { color: '#333', weight: 0.5, opacity: 0.4, fillOpacity: 0.4 }
const SELECTED_STYLE: L.PathOptions = { color: '#111', weight: 3, opacity: 1 }
// Visibile anche senza tessere di mappa, per tornare al punto di partenza.
const HOME_LINE_STYLE: L.PolylineOptions = { color: '#173f32', weight: 4, opacity: 0.85, dashArray: '2 9', lineCap: 'round', interactive: false }
const TRACK_STYLE: L.PolylineOptions = { color: '#bd5c32', weight: 4, opacity: 0.9, lineJoin: 'round', interactive: false }

const USER_ICON = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [18, 18] })
// Stessa icona "flag" di Icon.tsx; punta del segnaposto in basso al centro.
const START_ICON = L.divIcon({
  className: '',
  html:
    '<div class="start-pin-body"><svg class="icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M6 21V4" /><path d="M6 5c4-3 7 3 12 0v9c-5 3-8-3-12 0" /></svg></div>',
  iconSize: [38, 38],
  iconAnchor: [19, 46],
})

function applySelection(rects: Map<string, L.Polygon>, selectedId: string | null) {
  rects.forEach((rect, id) => {
    if (id === selectedId) {
      rect.setStyle(SELECTED_STYLE)
      rect.bringToFront()
    } else {
      rect.setStyle(GRID_STYLE)
    }
  })
}

export function MapView({
  position,
  startPoint,
  track,
  focus,
  cells,
  selectedCellId,
  onSelectCell,
  onCenterChange,
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const gridRef = useRef<L.LayerGroup | null>(null)
  const rectsRef = useRef<Map<string, L.Polygon>>(new Map())
  const accuracyRef = useRef<L.Circle | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const startMarkerRef = useRef<L.Marker | null>(null)
  const homeLineRef = useRef<L.Polyline | null>(null)
  const trackRef = useRef<L.Polyline | null>(null)
  const centeredOnUser = useRef(false)
  const selectedRef = useRef<string | null>(null)
  const lastFitKey = useRef<string | null>(null)
  const callbacks = useRef({ onSelectCell, onCenterChange })

  useEffect(() => {
    callbacks.current = { onSelectCell, onCenterChange }
  })

  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, {
      center: [DEFAULT_CENTER.lat, DEFAULT_CENTER.lon],
      zoom: DEFAULT_ZOOM,
      maxZoom: 19,
      zoomControl: false,
    })
    new CachedTileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abc',
      maxNativeZoom: TILE_MAX_ZOOM,
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map)
    gridRef.current = L.layerGroup().addTo(map)

    map.on('click', () => callbacks.current.onSelectCell(null))
    map.on('moveend', () => {
      const c = map.getCenter()
      callbacks.current.onCenterChange({ lat: c.lat, lon: c.lng })
    })

    mapRef.current = map
    const rects = rectsRef.current
    return () => {
      map.remove()
      mapRef.current = null
      gridRef.current = null
      rects.clear()
      accuracyRef.current = null
      userMarkerRef.current = null
      startMarkerRef.current = null
      homeLineRef.current = null
      trackRef.current = null
      centeredOnUser.current = false
      lastFitKey.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const grid = gridRef.current
    if (!map || !grid) return
    grid.clearLayers()
    rectsRef.current.clear()
    for (const { cell, result } of cells) {
      const polygon = L.polygon(
        cell.polygon.map((p): L.LatLngTuple => [p.lat, p.lon]),
        { ...GRID_STYLE, fillColor: BAND_COLORS[result.band], bubblingMouseEvents: false },
      )
      polygon.on('click', () => callbacks.current.onSelectCell(cell.id))
      polygon.addTo(grid)
      rectsRef.current.set(cell.id, polygon)
    }
    applySelection(rectsRef.current, selectedRef.current)
    if (cells.length === 0) return
    // Inquadra la griglia solo quando cambia l'area, non quando cambia la specie.
    const { lat, lon } = cells[0].cell.center
    const key = `${lat},${lon}`
    if (key !== lastFitKey.current) {
      lastFitKey.current = key
      const bounds = L.latLngBounds(cells.flatMap((c) => c.cell.polygon.map((p): L.LatLngTuple => [p.lat, p.lon])))
      map.fitBounds(bounds, { padding: [40, 40], duration: 0.8 })
    }
  }, [cells])

  useEffect(() => {
    selectedRef.current = selectedCellId
    applySelection(rectsRef.current, selectedCellId)
  }, [selectedCellId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    const latLng: L.LatLngTuple = [position.lat, position.lon]
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(latLng, {
        icon: USER_ICON,
        interactive: false,
        keyboard: false,
      }).addTo(map)
      accuracyRef.current = L.circle(latLng, {
        radius: position.accuracyM,
        stroke: false,
        fillColor: '#1e88e5',
        fillOpacity: 0.15,
        interactive: false,
      }).addTo(map)
    } else {
      userMarkerRef.current.setLatLng(latLng)
      accuracyRef.current?.setLatLng(latLng).setRadius(position.accuracyM)
    }
    if (!centeredOnUser.current) {
      centeredOnUser.current = true
      map.flyTo(latLng, USER_ZOOM)
    }
  }, [position])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!startPoint) {
      startMarkerRef.current?.remove()
      startMarkerRef.current = null
      return
    }
    const latLng: L.LatLngTuple = [startPoint.lat, startPoint.lon]
    if (!startMarkerRef.current) {
      startMarkerRef.current = L.marker(latLng, { icon: START_ICON, interactive: false, keyboard: false }).addTo(map)
    } else {
      startMarkerRef.current.setLatLng(latLng)
    }
  }, [startPoint])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    homeLineRef.current?.remove()
    homeLineRef.current = null
    if (!position || !startPoint || track.length > 1) return
    homeLineRef.current = L.polyline(
      [
        [position.lat, position.lon],
        [startPoint.lat, startPoint.lon],
      ],
      HOME_LINE_STYLE,
    ).addTo(map)
  }, [position, startPoint, track])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const latLngs = track.map((p): L.LatLngTuple => [p.lat, p.lon])
    if (!trackRef.current) {
      if (latLngs.length > 1) trackRef.current = L.polyline(latLngs, TRACK_STYLE).addTo(map)
    } else if (latLngs.length > 1) {
      trackRef.current.setLatLngs(latLngs)
    } else {
      trackRef.current.remove()
      trackRef.current = null
    }
  }, [track])

  useEffect(() => {
    if (focus) mapRef.current?.flyTo([focus.lat, focus.lon], PLACE_ZOOM)
  }, [focus])

  const recenter = () => {
    const map = mapRef.current
    if (position && map) map.flyTo([position.lat, position.lon], Math.max(map.getZoom(), USER_ZOOM))
  }

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map" />
      <div className="float-controls">
        <button
          type="button"
          className="map-fab"
          onClick={recenter}
          disabled={!position}
          title="Centra sulla mia posizione"
          aria-label="Centra sulla mia posizione"
        >
          <Icon name="locate" />
        </button>
        {children}
      </div>
    </div>
  )
}
