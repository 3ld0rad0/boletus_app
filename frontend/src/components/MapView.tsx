import { useEffect, useRef, useState } from 'react'
import {
  GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  ScaleControl,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, Polygon } from 'geojson'
import { circleRing } from '../core/geo'
import type { LatLon, ScoredCell } from '../core/types'
import type { Position } from '../services/location'
import {
  BAND_COLORS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  TILE_ATTRIBUTION,
  TILE_MAX_ZOOM,
  TILE_URLS,
  USER_ZOOM,
} from '../config'

interface Props {
  position: Position | null
  startPoint: LatLon | null
  cells: ScoredCell[]
  selectedCellId: string | null
  onSelectCell: (id: string | null) => void
  onCenterChange: (center: LatLon) => void
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: 'raster',
      tiles: TILE_URLS,
      tileSize: 256,
      maxzoom: TILE_MAX_ZOOM,
      attribution: TILE_ATTRIBUTION,
    },
  },
  layers: [{ id: 'base', type: 'raster', source: 'base' }],
}

function cellsToGeoJson(cells: ScoredCell[]): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: cells.map(({ cell, result }) => {
      const { south, west, north, east } = cell.bounds
      return {
        type: 'Feature',
        properties: { id: cell.id, score: result.score, band: result.band },
        geometry: {
          type: 'Polygon',
          coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]],
        },
      }
    }),
  }
}

function createUserDot(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'user-dot'
  el.setAttribute('aria-label', 'La tua posizione')
  return el
}

export function MapView({ position, startPoint, cells, selectedCellId, onSelectCell, onCenterChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const userMarkerRef = useRef<Marker | null>(null)
  const startMarkerRef = useRef<Marker | null>(null)
  const centeredOnUser = useRef(false)
  const lastFitKey = useRef<string | null>(null)
  const callbacks = useRef({ onSelectCell, onCenterChange })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    callbacks.current = { onSelectCell, onCenterChange }
  })

  useEffect(() => {
    if (!containerRef.current) return
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE,
      center: [DEFAULT_CENTER.lon, DEFAULT_CENTER.lat],
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl({ visualizePitch: false }), 'top-right')
    map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      map.addSource('grid', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'grid-fill',
        type: 'fill',
        source: 'grid',
        paint: {
          'fill-color': ['match', ['get', 'band'], 'low', BAND_COLORS.low, 'medium', BAND_COLORS.medium, BAND_COLORS.high],
          'fill-opacity': 0.4,
        },
      })
      map.addLayer({
        id: 'grid-outline',
        type: 'line',
        source: 'grid',
        paint: { 'line-color': '#333', 'line-width': 0.5, 'line-opacity': 0.4 },
      })
      map.addLayer({
        id: 'grid-selected',
        type: 'line',
        source: 'grid',
        filter: ['==', ['get', 'id'], ''],
        paint: { 'line-color': '#111', 'line-width': 3 },
      })
      map.addSource('accuracy', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'accuracy-fill',
        type: 'fill',
        source: 'accuracy',
        paint: { 'fill-color': '#1e88e5', 'fill-opacity': 0.15 },
      })
      setReady(true)
    })

    map.on('click', (e) => {
      const feature = map.getLayer('grid-fill')
        ? map.queryRenderedFeatures(e.point, { layers: ['grid-fill'] })[0]
        : undefined
      callbacks.current.onSelectCell(feature ? String(feature.properties.id) : null)
    })
    map.on('mouseenter', 'grid-fill', () => (map.getCanvas().style.cursor = 'pointer'))
    map.on('mouseleave', 'grid-fill', () => (map.getCanvas().style.cursor = ''))
    map.on('moveend', () => {
      const c = map.getCenter()
      callbacks.current.onCenterChange({ lat: c.lat, lon: c.lng })
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      userMarkerRef.current = null
      startMarkerRef.current = null
      centeredOnUser.current = false
      lastFitKey.current = null
      setReady(false)
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.getSource<GeoJSONSource>('grid')?.setData(cellsToGeoJson(cells))
    const first = cells[0]?.cell
    const last = cells[cells.length - 1]?.cell
    if (!first || !last) return
    // Inquadra la griglia solo quando cambia l'area, non quando cambia la specie.
    const key = `${first.bounds.north},${first.bounds.west}`
    if (key !== lastFitKey.current) {
      lastFitKey.current = key
      map.fitBounds(
        [
          [first.bounds.west, last.bounds.south],
          [last.bounds.east, first.bounds.north],
        ],
        { padding: 40, duration: 800 },
      )
    }
  }, [cells, ready])

  useEffect(() => {
    if (ready) mapRef.current?.setFilter('grid-selected', ['==', ['get', 'id'], selectedCellId ?? ''])
  }, [selectedCellId, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    const lngLat: [number, number] = [position.lon, position.lat]
    if (!userMarkerRef.current) {
      userMarkerRef.current = new Marker({ element: createUserDot() }).setLngLat(lngLat).addTo(map)
    } else {
      userMarkerRef.current.setLngLat(lngLat)
    }
    if (ready) {
      map.getSource<GeoJSONSource>('accuracy')?.setData({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [circleRing(position, position.accuracyM)] },
      })
    }
    if (!centeredOnUser.current) {
      centeredOnUser.current = true
      map.flyTo({ center: lngLat, zoom: USER_ZOOM })
    }
  }, [position, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!startPoint) {
      startMarkerRef.current?.remove()
      startMarkerRef.current = null
      return
    }
    const lngLat: [number, number] = [startPoint.lon, startPoint.lat]
    if (!startMarkerRef.current) {
      startMarkerRef.current = new Marker({ color: '#8e24aa' }).setLngLat(lngLat).addTo(map)
    } else {
      startMarkerRef.current.setLngLat(lngLat)
    }
  }, [startPoint, ready])

  const recenter = () => {
    if (position) mapRef.current?.flyTo({ center: [position.lon, position.lat], zoom: Math.max(mapRef.current.getZoom(), USER_ZOOM) })
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
