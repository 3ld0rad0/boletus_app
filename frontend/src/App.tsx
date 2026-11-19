import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BestAreaCard } from './components/BestAreaCard'
import { Compass } from './components/Compass'
import { ConfirmSheet } from './components/ConfirmSheet'
import { Disclaimer } from './components/Disclaimer'
import { Icon } from './components/Icon'
import { MapView } from './components/MapView'
import { PlaceSearch } from './components/PlaceSearch'
import { ProbabilityLegend } from './components/ProbabilityLegend'
import { ScoreDetails } from './components/ScoreDetails'
import { SpeciesProbabilityList } from './components/SpeciesProbabilityList'
import { SpeciesSelector } from './components/SpeciesSelector'
import { SplashScreen } from './components/SplashScreen'
import { StartPointPanel } from './components/StartPointPanel'
import { WeatherPanel } from './components/WeatherPanel'
import type { ZoneReport } from './core/areaScan'
import type { LatLon } from './core/types'
import { bearingDeg, cardinal, formatDistance, haversineM } from './core/geo'
import { SPECIES } from './data/species'
import { useCompass } from './hooks/useCompass'
import { useLocation } from './hooks/useLocation'
import { useOnline } from './hooks/useOnline'
import { useBestArea } from './hooks/useBestArea'
import { useProbabilityGrid } from './hooks/useProbabilityGrid'
import { useStartPoint } from './hooks/useStartPoint'
import { useSunsetWarning } from './hooks/useSunsetWarning'
import { useTrack } from './hooks/useTrack'
import { DEFAULT_CENTER, GRID_RADIUS_M } from './config'
import { storage, STORAGE_KEYS } from './services/storage'
import type { Position } from './services/location'
import { forgetStartTiles, prefetchTiles } from './services/tilePrefetch'

const radiusLabel = `${(GRID_RADIUS_M / 1000).toLocaleString('it-IT')} km`
const SPLASH_DONE_MS = 700
const SPLASH_POSITION_WAIT_MS = 8000
// La schermata iniziale aspetta un GPS così preciso, ma al massimo per questo tempo.
const GPS_GOOD_M = 100
const GPS_WAIT_MS = 15_000

export default function App() {
  const start = useStartPoint()
  // Con un punto di partenza salvato il percorso si registra anche a schermo spento (app nativa).
  const { position, error: locationError } = useLocation(start.startPoint !== null)
  const { points: track, estimate } = useTrack(position, start.startPoint)
  // Senza GPS la posizione è la punta del percorso stimato, con l'incertezza al posto della precisione.
  const here = useMemo<Position | null>(() => {
    const tip = track[track.length - 1]
    if (!estimate || !tip) return position
    return { lat: tip.lat, lon: tip.lon, accuracyM: estimate.uncertaintyM, timestamp: position?.timestamp ?? 0 }
  }, [position, track, estimate])
  const sunset = useSunsetWarning(start.startPoint)
  const online = useOnline()
  const compass = useCompass()

  // Analisi della zona migliore attorno al dispositivo, o al punto di partenza finché manca il GPS.
  const startLat = start.startPoint?.lat
  const startLon = start.startPoint?.lon
  const areaOrigin = useMemo<LatLon | null>(() => {
    if (position) return { lat: position.lat, lon: position.lon }
    return startLat !== undefined && startLon !== undefined ? { lat: startLat, lon: startLon } : null
  }, [position, startLat, startLon])
  const area = useBestArea(areaOrigin, SPECIES, online)
  const [areaOpen, setAreaOpen] = useState(false)
  // Schermata iniziale solo se l'analisi di oggi deve ancora essere fatta.
  const [splashOpen, setSplashOpen] = useState(() => online && area.status === 'idle')
  const noPosition = area.status === 'idle' && locationError !== null && areaOrigin === null
  const [gpsWaitOver, setGpsWaitOver] = useState(false)
  useEffect(() => {
    if (!splashOpen) return
    setGpsWaitOver(false)
    const id = window.setTimeout(() => setGpsWaitOver(true), GPS_WAIT_MS)
    return () => window.clearTimeout(id)
  }, [splashOpen])
  const gpsGaveUp = gpsWaitOver || (locationError !== null && locationError.kind !== 'timeout')
  const gpsPending = !(position !== null && position.accuracyM <= GPS_GOOD_M) && !gpsGaveUp
  useEffect(() => {
    if (!splashOpen) return
    if (!online || area.status === 'failed' || noPosition) return setSplashOpen(false)
    // Si lascia vedere il 100% prima di chiudere; senza posizione non si aspetta all'infinito.
    const settled = area.status === 'ready' && !area.preparing && !gpsPending
    const wait = settled ? SPLASH_DONE_MS : area.status === 'idle' ? SPLASH_POSITION_WAIT_MS : null
    if (wait === null) return
    const id = window.setTimeout(() => setSplashOpen(false), wait)
    return () => window.clearTimeout(id)
  }, [splashOpen, online, area.status, area.preparing, noPosition, gpsPending])
  // Nuovo giorno con l'app aperta: la schermata riparte come al primo avvio.
  const seenGeneration = useRef(area.generation)
  useEffect(() => {
    if (area.generation === seenGeneration.current) return
    seenGeneration.current = area.generation
    if (online && areaOrigin) setSplashOpen(true)
  }, [area.generation, online, areaOrigin])

  const [speciesId, setSpeciesId] = useState(SPECIES[0].id)
  const species = useMemo(() => SPECIES.find((s) => s.id === speciesId) ?? SPECIES[0], [speciesId])
  const grid = useProbabilityGrid(species, SPECIES)
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)
  const selectedCell = grid.scored.find((c) => c.cell.id === selectedCellId) ?? null

  const mapCenter = useRef<LatLon>(DEFAULT_CENTER)
  const onCenterChange = useCallback((c: LatLon) => (mapCenter.current = c), [])
  const [focus, setFocus] = useState<LatLon | null>(null)
  const [fitGridRequest, setFitGridRequest] = useState(0)

  const [weatherMapCenter, setWeatherMapCenter] = useState<LatLon | null>(null)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const sheetRef = useRef<HTMLElement>(null)
  const swipe = useRef<{ startY: number; swiped: boolean } | null>(null)
  const hasSheet = selectedCell === null
  const onGrabDown = (e: React.PointerEvent) => {
    swipe.current = { startY: e.clientY, swiped: false }
  }
  const onGrabUp = (e: React.PointerEvent) => {
    const s = swipe.current
    if (!s) return
    const dy = e.clientY - s.startY
    if (Math.abs(dy) > 24) {
      s.swiped = true
      setSheetExpanded(dy < 0)
    }
  }
  const onGrabClick = () => {
    if (swipe.current?.swiped) swipe.current = null
    else setSheetExpanded((v) => !v)
  }
  // I controlli sulla mappa seguono l'altezza reale del pannello chiuso.
  useEffect(() => {
    const el = sheetRef.current
    if (!el || sheetExpanded) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--sheet-offset', `${el.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sheetExpanded, hasSheet])
  const [habitatBannerHidden, setHabitatBannerHidden] = useState(false)
  const [replaceStartOpen, setReplaceStartOpen] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(() => !storage.get<boolean>(STORAGE_KEYS.disclaimerAccepted))
  const closeDisclaimer = () => {
    storage.set(STORAGE_KEYS.disclaimerAccepted, true)
    setDisclaimerOpen(false)
  }

  const compute = (center: LatLon) => {
    setSelectedCellId(null)
    setHabitatBannerHidden(false)
    void grid.compute(center)
  }

  // Mappa disponibile anche senza rete attorno al punto di partenza (per tornare indietro).
  useEffect(() => {
    if (startLat !== undefined && startLon !== undefined) void prefetchTiles({ lat: startLat, lon: startLon }, { pin: true })
    else void forgetStartTiles()
  }, [startLat, startLon])

  const hasGrid = grid.scored.length > 0
  const showZone = (zone: ZoneReport) => {
    setAreaOpen(false)
    setSpeciesId(zone.speciesId)
    setFocus({ lat: zone.point.lat, lon: zone.point.lon })
    compute(zone.point)
  }
  const quickSaveStart = () => {
    if (!position) return
    if (start.startPoint) setReplaceStartOpen(true)
    else void start.save(position)
  }
  const habitatLoading = grid.habitatStatus === 'loading'
  const sheetLabel = sheetExpanded ? 'Riduci pannello' : 'Espandi pannello'

  const sunsetText = (() => {
    if (!sunset.warning) return ''
    const { sunset: at, minutesLeft } = sunset.warning
    const time = at.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    const when = minutesLeft > 0 ? `Tramonto alle ${time} (tra ${minutesLeft} min)` : `Il sole è tramontato (${time})`
    if (!here || !start.startPoint) return `${when}. Torna verso il punto di partenza.`
    const distance = formatDistance(haversineM(here, start.startPoint))
    const direction = cardinal(bearingDeg(here, start.startPoint))
    return `${when}. Torna al punto di partenza: ${distance} verso ${direction}.`
  })()

  return (
    <main className="app-shell">
      <MapView
        position={here}
        estimated={estimate !== null}
        startPoint={start.startPoint}
        track={track}
        focus={focus}
        fitGridRequest={fitGridRequest}
        cells={grid.scored}
        selectedCellId={selectedCellId}
        onSelectCell={setSelectedCellId}
        onCenterChange={onCenterChange}
        onComputePoint={compute}
      >
        <button
          type="button"
          className={`map-fab compact area-fab ${area.status}`}
          onClick={() => setAreaOpen(true)}
          title="Zona migliore entro 120 km"
          aria-label="Zona migliore entro 120 km"
        >
          <Icon name="star" size={20} />
        </button>
        <button
          type="button"
          className="map-fab compact"
          onClick={quickSaveStart}
          disabled={!position}
          title="Salva punto di partenza"
          aria-label="Salva punto di partenza qui"
        >
          <Icon name="flag" size={20} />
        </button>
        {hasGrid && (
          <button type="button" className="map-fab compact remove" onClick={grid.clear} aria-label="Rimuovi griglia">
            <Icon name="close" size={20} />
          </button>
        )}
      </MapView>

      <div className="left-controls">
        <Compass compass={compass} position={here} startPoint={start.startPoint} track={track} />
      </div>

      <header className="top-controls">
        <div className="top-line">
          <PlaceSearch onSelect={(p) => setFocus({ lat: p.lat, lon: p.lon })} />
          <button
            type="button"
            className="icon-button glass"
            onClick={() => setWeatherMapCenter(mapCenter.current)}
            aria-label="Meteo"
          >
            <Icon name="cloud" />
          </button>
          <button
            type="button"
            className="icon-button glass"
            onClick={() => setDisclaimerOpen(true)}
            aria-label="Avvertenze"
          >
            <Icon name="info" />
          </button>
        </div>
        <SpeciesSelector
          species={SPECIES}
          value={speciesId}
          onChange={setSpeciesId}
          onSearch={(id) => {
            setSpeciesId(id)
            compute(mapCenter.current)
          }}
        />
      </header>

      <div className="status-chips">
        {!online && <span className="offline-chip">Offline</span>}
        {estimate && (
          <span className={estimate.unreliable ? 'offline-chip' : 'radius-chip'}>
            Posizione stimata ±{Math.round(estimate.uncertaintyM)} m{estimate.unreliable ? ' · poco affidabile' : ''}
          </span>
        )}
        {compass.status === 'unavailable' && (
          <span className="radius-chip">Bussola non disponibile su questo dispositivo</span>
        )}
        {compass.status === 'denied' && <span className="radius-chip">Permesso per la bussola negato</span>}
        {hasGrid && (
          <span className="radius-chip">
            <Icon name="layers" size={16} /> Raggio {radiusLabel}
          </span>
        )}
      </div>

      {sunset.warning && (
        <div className="banner sunset-alert" role="alert">
          <Icon name="clock" />
          <span>{sunsetText}</span>
          <button type="button" onClick={sunset.dismiss}>
            Chiudi
          </button>
        </div>
      )}

      {selectedCell ? (
        <ScoreDetails cell={selectedCell} species={species} onClose={() => setSelectedCellId(null)} />
      ) : (
        <section ref={sheetRef} className={`bottom-sheet ${sheetExpanded ? 'expanded' : 'partial'}`}>
          <button
            type="button"
            className="sheet-grab-area"
            onPointerDown={onGrabDown}
            onPointerUp={onGrabUp}
            onClick={onGrabClick}
            aria-label={sheetLabel}
          >
            <span className="sheet-handle" />
            <Icon name="chevron" />
          </button>
          <div className="sheet-content">
            {locationError && (
              <div className="banner gps">
                <Icon name="warning" />
                <span>{locationError.message}</span>
              </div>
            )}
            {grid.error && (
              <div className="banner gps">
                <Icon name="warning" />
                <span>{grid.error}</span>
              </div>
            )}
            {grid.habitatStatus === 'failed' && !habitatBannerHidden && (
              <div className="banner vegetation">
                <Icon name="info" />
                <span>
                  Vegetazione non disponibile{grid.habitatError ? ` (${grid.habitatError})` : ''}: il punteggio non la
                  include.
                </span>
                <button type="button" onClick={() => setHabitatBannerHidden(true)}>
                  Chiudi
                </button>
              </div>
            )}
            {grid.loading || habitatLoading ? (
              <div className="loading-state">
                <span className="spinner" />
                <div>
                  <strong>{grid.loading ? 'Scarico meteo e quote…' : 'Carico la vegetazione…'}</strong>
                  <p>Puoi continuare a esplorare la mappa.</p>
                </div>
              </div>
            ) : (
              sheetExpanded &&
              !hasGrid && (
                <div className="empty-hint">
                  <p>
                    <strong>Dove cerchiamo?</strong> Calcola la probabilità nelle vicinanze.
                  </p>
                </div>
              )
            )}
            {!grid.loading && !hasGrid && (
              <button type="button" className="button primary" onClick={() => compute(mapCenter.current)}>
                Calcola sul centro della mappa
              </button>
            )}
            {!grid.loading && hasGrid && (
              <div className="area-row">
                <span>
                  <strong>Area calcolata</strong>
                  <small>Raggio {radiusLabel}</small>
                </span>
                <button type="button" onClick={() => compute(mapCenter.current)}>
                  Ricalcola qui
                </button>
              </div>
            )}
            {hasGrid && (
              <SpeciesProbabilityList
                compact={!sheetExpanded}
                items={grid.speciesScores}
                selectedId={speciesId}
                onSelect={(id) => {
                  setSpeciesId(id)
                  setSelectedCellId(null)
                  setSheetExpanded(false)
                  setFitGridRequest((n) => n + 1)
                }}
              />
            )}
            {sheetExpanded && (
              <>
                <StartPointPanel
                  position={here}
                  estimated={estimate !== null}
                  startPoint={start.startPoint}
                  track={track}
                  onSave={start.save}
                  onClear={start.clear}
                  onShowOnMap={() => {
                    if (!start.startPoint) return
                    setFocus({ lat: start.startPoint.lat, lon: start.startPoint.lon })
                    setSheetExpanded(false)
                  }}
                />
                <ProbabilityLegend />
                {grid.habitatStatus === 'ready' && grid.habitatCells !== null && (
                  <p className="info-line">
                    Vegetazione: {grid.habitatCells} celle su {grid.scored.length} in bosco o prato.
                  </p>
                )}
                <p className="tip">
                  <Icon name="info" size={17} /> Tocca una cella per vedere i motivi del punteggio.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      <Disclaimer open={disclaimerOpen && !splashOpen} onClose={closeDisclaimer} />
      {splashOpen && (
        <SplashScreen
          status={area.status}
          progress={area.progress}
          waitingGps={gpsPending}
          gpsAccuracyM={position?.accuracyM ?? null}
          onSkip={() => setSplashOpen(false)}
        />
      )}
      {areaOpen && <BestAreaCard area={area} onShow={showZone} onClose={() => setAreaOpen(false)} />}
      {weatherMapCenter && (
        <WeatherPanel
          species={species}
          places={[
            ...(position ? [{ id: 'position', label: 'La tua posizione', point: position }] : []),
            ...(grid.center ? [{ id: 'area', label: 'Area calcolata', point: grid.center }] : []),
            ...(!position && !grid.center ? [{ id: 'map', label: 'Centro mappa', point: weatherMapCenter }] : []),
          ]}
          onClose={() => setWeatherMapCenter(null)}
        />
      )}
      {replaceStartOpen && position && (
        <ConfirmSheet
          title="Sostituire il punto?"
          text="Il punto attuale verrà sostituito con la tua posizione GPS."
          confirmLabel="Sostituisci punto"
          onConfirm={() => {
            void start.save(position)
            setReplaceStartOpen(false)
          }}
          onCancel={() => setReplaceStartOpen(false)}
        />
      )}
    </main>
  )
}
