import { useEffect, useRef } from 'react'
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

interface Props {
  position: Position | null
  startPoint: LatLon | null
  /** Cambiando riferimento la mappa si sposta qui (es. località cercata). */
  focus: LatLon | null
  cells: ScoredCell[]
  selectedCellId: string | null
  onSelectCell: (id: string | null) => void
  onCenterChange: (center: LatLon) => void
}

const GRID_STYLE: L.PathOptions = { color: '#333', weight: 0.5, opacity: 0.4, fillOpacity: 0.4 }
const SELECTED_STYLE: L.PathOptions = { color: '#111', weight: 3, opacity: 1 }

const USER_ICON = L.divIcon({ className: 'user-dot', iconSize: [18, 18] })
const START_ICON = L.divIcon({ className: 'start-pin', iconSize: [20, 20] })

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

export function MapView({ position, startPoint, focus, cells, selectedCellId, onSelectCell, onCenterChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const gridRef = useRef<L.LayerGroup | null>(null)
  const rectsRef = useRef<Map<string, L.Polygon>>(new Map())
  const accuracyRef = useRef<L.Circle | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const startMarkerRef = useRef<L.Marker | null>(null)
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
    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abc',
      maxNativeZoom: TILE_MAX_ZOOM,
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map)
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
    if (focus) mapRef.current?.flyTo([focus.lat, focus.lon], PLACE_ZOOM)
  }, [focus])

  const recenter = () => {
    const map = mapRef.current
    if (position && map) map.flyTo([position.lat, position.lon], Math.max(map.getZoom(), USER_ZOOM))
  }

  return (
    <div className="map-wrapper">
      <div ref={containerRef} className="map" />
      <button
        type="button"
        className="map-recenter"
        onClick={recenter}
        disabled={!position}
        title="Centra sulla mia posizione"
        aria-label="Centra sulla mia posizione"
      >
        ◎
      </button>
    </div>
  )
}
