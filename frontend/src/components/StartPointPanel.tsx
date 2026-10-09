import { bearingDeg, cardinal, formatDistance, haversineM } from '../core/geo'
import type { LatLon } from '../core/types'
import type { StartPoint } from '../hooks/useStartPoint'
import type { Position } from '../services/location'

interface Props {
  position: Position | null
  startPoint: StartPoint | null
  syncError: string | null
  onSave: (p: LatLon) => void
  onClear: () => void
}

export function StartPointPanel({ position, startPoint, syncError, onSave, onClear }: Props) {
  const save = () => {
    if (!position) return
    if (startPoint && !window.confirm('Sostituire il punto di partenza attuale con la posizione corrente?')) return
    onSave(position)
  }
  const clear = () => {
    if (window.confirm('Eliminare il punto di partenza?')) onClear()
  }

  if (!startPoint) {
    return (
      <div className="start-panel">
        <button type="button" className="primary" onClick={save} disabled={!position}>
          📍 Salva punto di partenza
        </button>
        {!position && <small>In attesa della posizione GPS…</small>}
      </div>
    )
  }

  const savedAt = new Date(startPoint.savedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  let guidance = <span>Posizione attuale non disponibile</span>
  if (position) {
    const distance = haversineM(position, startPoint)
    const bearing = bearingDeg(position, startPoint)
    guidance =
      distance <= Math.max(position.accuracyM, 15) ? (
        <strong>Sei al punto di partenza</strong>
      ) : (
        <span className="guidance">
          <span className="arrow" style={{ transform: `rotate(${bearing}deg)` }} aria-hidden>
            ↑
          </span>
          <strong>{formatDistance(distance)}</strong> verso {cardinal(bearing)} ({Math.round(bearing)}°)
          <small> · precisione ±{Math.round(position.accuracyM)} m</small>
        </span>
      )
  }

  return (
    <div className="start-panel">
      <div>
        <div className="muted">Punto di partenza (salvato alle {savedAt}) · freccia rispetto al nord</div>
        {guidance}
        {syncError && <div className="warning">{syncError}</div>}
      </div>
      <div className="actions">
        <button type="button" onClick={save} disabled={!position}>
          Sostituisci
        </button>
        <button type="button" onClick={clear}>
          Elimina
        </button>
      </div>
    </div>
  )
}
