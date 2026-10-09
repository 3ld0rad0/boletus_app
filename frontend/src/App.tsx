import { useCallback, useMemo, useRef, useState } from 'react'
import { Disclaimer } from './components/Disclaimer'
import { LoginForm } from './components/LoginForm'
import { MapView } from './components/MapView'
import { ProbabilityLegend } from './components/ProbabilityLegend'
import { ScoreDetails } from './components/ScoreDetails'
import { SpeciesSelector } from './components/SpeciesSelector'
import { StartPointPanel } from './components/StartPointPanel'
import type { LatLon } from './core/types'
import { SPECIES } from './data/species'
import { useAuth } from './hooks/useAuth'
import { useLocation } from './hooks/useLocation'
import { useProbabilityGrid } from './hooks/useProbabilityGrid'
import { useSpots } from './hooks/useSpots'
import { useStartPoint } from './hooks/useStartPoint'
import { DEFAULT_CENTER } from './config'
import { storage, STORAGE_KEYS } from './services/storage'

export default function App() {
  const auth = useAuth()
  const { position, error: locationError } = useLocation()
  const spots = useSpots(auth.user)
  const start = useStartPoint(auth.user, spots.refresh)

  const [speciesId, setSpeciesId] = useState(SPECIES[0].id)
  const species = useMemo(() => SPECIES.find((s) => s.id === speciesId) ?? SPECIES[0], [speciesId])
  const grid = useProbabilityGrid(species)
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)
  const selectedCell = grid.scored.find((c) => c.cell.id === selectedCellId) ?? null

  const mapCenter = useRef<LatLon>(DEFAULT_CENTER)
  const onCenterChange = useCallback((c: LatLon) => (mapCenter.current = c), [])

  const [accountOpen, setAccountOpen] = useState(false)
  const [disclaimerOpen, setDisclaimerOpen] = useState(() => !storage.get<boolean>(STORAGE_KEYS.disclaimerAccepted))
  const closeDisclaimer = () => {
    storage.set(STORAGE_KEYS.disclaimerAccepted, true)
    setDisclaimerOpen(false)
  }

  const compute = (center: LatLon) => {
    setSelectedCellId(null)
    void grid.compute(center)
  }

  return (
    <div className="app">
      <MapView
        position={position}
        startPoint={start.startPoint}
        cells={grid.scored}
        selectedCellId={selectedCellId}
        onSelectCell={setSelectedCellId}
        onCenterChange={onCenterChange}
      />

      <header className="panel panel-top">
        <div className="title-row">
          <h1>🍄 Boletus</h1>
          <span className="actions">
            <button type="button" onClick={() => setAccountOpen((o) => !o)}>
              {auth.user ? 'Account' : 'Accedi'}
            </button>
            <button type="button" onClick={() => setDisclaimerOpen(true)} aria-label="Avvertenze">
              ⓘ
            </button>
          </span>
        </div>
        <SpeciesSelector species={SPECIES} value={speciesId} onChange={setSpeciesId} />
        <div className="actions">
          <button
            type="button"
            className="primary"
            disabled={!position || grid.loading}
            onClick={() => position && compute(position)}
          >
            Calcola intorno a me
          </button>
          <button type="button" disabled={grid.loading} onClick={() => compute(mapCenter.current)}>
            Centro mappa
          </button>
          {grid.scored.length > 0 && (
            <button type="button" onClick={grid.clear} aria-label="Rimuovi griglia">
              ✕
            </button>
          )}
        </div>
        {grid.loading && <p className="muted">Scarico meteo e quote…</p>}
        {grid.error && <p className="warning">{grid.error}</p>}
        {grid.scored.length > 0 && (
          <>
            <ProbabilityLegend />
            <small className="muted">Tocca una cella per vedere i motivi del punteggio.</small>
          </>
        )}
      </header>

      {(selectedCell || accountOpen) && (
        <aside className="panel panel-side">
          {selectedCell ? (
            <ScoreDetails cell={selectedCell} species={species} onClose={() => setSelectedCellId(null)} />
          ) : (
            <>
              <button type="button" className="icon close" onClick={() => setAccountOpen(false)} aria-label="Chiudi">
                ✕
              </button>
              <LoginForm
                auth={auth}
                spots={spots.spots}
                spotsError={spots.error}
                onUseSpot={(p) => {
                  start.restore(p)
                  setAccountOpen(false)
                }}
                onDeleteSpot={spots.remove}
              />
            </>
          )}
        </aside>
      )}

      <footer className="panel panel-bottom">
        {locationError && <p className="warning">{locationError.message}</p>}
        <StartPointPanel
          position={position}
          startPoint={start.startPoint}
          syncError={start.syncError}
          onSave={start.save}
          onClear={start.clear}
        />
      </footer>

      <Disclaimer open={disclaimerOpen} onClose={closeDisclaimer} />
    </div>
  )
}
