import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccountPanel } from './components/AccountPanel'
import { Compass } from './components/Compass'
import { ConfirmSheet } from './components/ConfirmSheet'
import { Disclaimer } from './components/Disclaimer'
import { Icon } from './components/Icon'
import { MapView } from './components/MapView'
import { PlaceSearch } from './components/PlaceSearch'
import { ProbabilityLegend } from './components/ProbabilityLegend'
import { ScoreDetails } from './components/ScoreDetails'
import { SpeciesSelector } from './components/SpeciesSelector'
import { StartPointPanel } from './components/StartPointPanel'
import type { LatLon } from './core/types'
import { SPECIES } from './data/species'
import { useAuth } from './hooks/useAuth'
import { useCompass } from './hooks/useCompass'
import { useLocation } from './hooks/useLocation'
import { useOnline } from './hooks/useOnline'
import { useProbabilityGrid } from './hooks/useProbabilityGrid'
import { useSpots } from './hooks/useSpots'
import { useStartPoint } from './hooks/useStartPoint'
import { useTheme } from './hooks/useTheme'
import { useTrack } from './hooks/useTrack'
import { DEFAULT_CENTER, GRID_RADIUS_M } from './config'
import { storage, STORAGE_KEYS } from './services/storage'
import { prefetchTiles } from './services/tilePrefetch'

const radiusLabel = `${(GRID_RADIUS_M / 1000).toLocaleString('it-IT')} km`

export default function App() {
  const auth = useAuth()
  const spots = useSpots(auth.user)
  const start = useStartPoint(auth.user, spots.refresh)
  // Con un punto di partenza salvato il percorso si registra anche a schermo spento (app nativa).
  const { position, error: locationError } = useLocation(start.startPoint !== null)
  const track = useTrack(position, start.startPoint)
  const online = useOnline()
  const compass = useCompass()
  const { theme, toggle: toggleTheme } = useTheme()

  const [speciesId, setSpeciesId] = useState(SPECIES[0].id)
  const species = useMemo(() => SPECIES.find((s) => s.id === speciesId) ?? SPECIES[0], [speciesId])
  const grid = useProbabilityGrid(species)
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)
  const selectedCell = grid.scored.find((c) => c.cell.id === selectedCellId) ?? null

  const mapCenter = useRef<LatLon>(DEFAULT_CENTER)
  const onCenterChange = useCallback((c: LatLon) => (mapCenter.current = c), [])
  const [focus, setFocus] = useState<LatLon | null>(null)

  const [accountOpen, setAccountOpen] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)
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
  const startLat = start.startPoint?.lat
  const startLon = start.startPoint?.lon
  useEffect(() => {
    if (startLat !== undefined && startLon !== undefined) void prefetchTiles({ lat: startLat, lon: startLon })
  }, [startLat, startLon])

  const hasGrid = grid.scored.length > 0
  const quickSaveStart = () => {
    if (!position) return
    if (start.startPoint) setReplaceStartOpen(true)
    else void start.save(position)
  }
  const habitatLoading = grid.habitatStatus === 'loading'
  const sheetLabel = sheetExpanded ? 'Riduci pannello' : 'Espandi pannello'

  return (
    <main className="app-shell">
      <MapView
        position={position}
        startPoint={start.startPoint}
        track={track}
        focus={focus}
        cells={grid.scored}
        selectedCellId={selectedCellId}
        onSelectCell={setSelectedCellId}
        onCenterChange={onCenterChange}
      >
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
        <Compass compass={compass} />
      </div>

      <header className="top-controls">
        <div className="top-line">
          <PlaceSearch onSelect={(p) => setFocus({ lat: p.lat, lon: p.lon })} />
          <button type="button" className="icon-button glass" onClick={() => setAccountOpen(true)} aria-label="Account">
            <Icon name="user" />
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
        <SpeciesSelector species={SPECIES} value={speciesId} onChange={setSpeciesId} />
      </header>

      <div className="status-chips">
        {!online && <span className="offline-chip">Offline</span>}
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

      {selectedCell ? (
        <ScoreDetails cell={selectedCell} species={species} onClose={() => setSelectedCellId(null)} />
      ) : (
        <section className={`bottom-sheet ${sheetExpanded ? 'expanded' : 'partial'}`}>
          <button
            type="button"
            className="sheet-grab-area"
            onClick={() => setSheetExpanded(!sheetExpanded)}
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
                  <span>🍄</span>
                  <p>
                    <strong>Dove cerchiamo?</strong> Calcola la probabilità nelle vicinanze.
                  </p>
                </div>
              )
            )}
            {!grid.loading && (
              <>
                <button
                  type="button"
                  className="button primary"
                  disabled={!position}
                  onClick={() => position && compute(position)}
                >
                  Calcola intorno a me
                </button>
                <button type="button" className="button secondary" onClick={() => compute(mapCenter.current)}>
                  Calcola sul centro della mappa
                </button>
              </>
            )}
            {sheetExpanded && (
              <>
                <StartPointPanel
                  position={position}
                  startPoint={start.startPoint}
                  track={track}
                  syncError={start.syncError}
                  onSave={start.save}
                  onClear={start.clear}
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

      {accountOpen && (
        <AccountPanel
          auth={auth}
          spots={spots.spots}
          spotsError={spots.error}
          theme={theme}
          onToggleTheme={toggleTheme}
          onClose={() => setAccountOpen(false)}
          onUseSpot={(p) => {
            start.restore(p)
            setAccountOpen(false)
          }}
          onDeleteSpot={spots.remove}
        />
      )}

      <Disclaimer open={disclaimerOpen} onClose={closeDisclaimer} />
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
