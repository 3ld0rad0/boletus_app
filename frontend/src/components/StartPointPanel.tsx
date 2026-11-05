import { useState } from 'react'
import { bearingDeg, cardinal, formatDistance, haversineM } from '../core/geo'
import { returnGuide } from '../core/track'
import type { LatLon } from '../core/types'
import type { StartPoint } from '../hooks/useStartPoint'
import type { Position } from '../services/location'
import { ConfirmSheet } from './ConfirmSheet'
import { Icon } from './Icon'

interface Props {
  position: Position | null
  startPoint: StartPoint | null
  /** Percorso registrato dalla partenza: se presente la guida di ritorno lo segue. */
  track: LatLon[]
  onSave: (p: LatLon) => void
  onClear: () => void
}

export function StartPointPanel({ position, startPoint, track, onSave, onClear }: Props) {
  const [confirm, setConfirm] = useState<'replace' | 'delete' | null>(null)

  const save = () => {
    if (!position) return
    if (startPoint) setConfirm('replace')
    else onSave(position)
  }

  const confirmSheet = confirm && (
    <ConfirmSheet
      title={confirm === 'delete' ? 'Eliminare il punto?' : 'Sostituire il punto?'}
      text={
        confirm === 'delete'
          ? 'Non potrai più usarlo per tornare al punto di partenza.'
          : 'Il punto attuale verrà sostituito con la tua posizione GPS.'
      }
      confirmLabel={confirm === 'delete' ? 'Elimina punto' : 'Sostituisci punto'}
      danger={confirm === 'delete'}
      onConfirm={() => {
        if (confirm === 'delete') onClear()
        else if (position) onSave(position)
        setConfirm(null)
      }}
      onCancel={() => setConfirm(null)}
    />
  )

  if (!startPoint) {
    return (
      <section className="point compact-section">
        <div>
          <h3>Punto di partenza</h3>
          <p>{position ? 'Salva la posizione per ritrovare la strada.' : 'In attesa della posizione GPS…'}</p>
        </div>
        <button type="button" className="button primary" onClick={save} disabled={!position}>
          <Icon name="flag" /> Salva punto di partenza
        </button>
      </section>
    )
  }

  if (!position) {
    return (
      <section className="point error-point">
        <h3>Punto di partenza</h3>
        <p>
          <Icon name="warning" /> Posizione attuale non disponibile
        </p>
        <button type="button" className="text-button" onClick={() => setConfirm('delete')}>
          Elimina
        </button>
        {confirmSheet}
      </section>
    )
  }

  const distance = haversineM(position, startPoint)
  const guide = returnGuide(track, position, startPoint)
  const bearing = bearingDeg(position, guide.target)
  const arrived = distance <= Math.max(position.accuracyM, 15)
  const savedAt = new Date(startPoint.savedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

  if (arrived) {
    return (
      <section className="point arrived">
        <div className="arrived-icon">
          <Icon name="check" size={30} />
        </div>
        <div>
          <p className="eyebrow">Punto di partenza</p>
          <h3>Sei al punto di partenza</h3>
          <p>Precisione GPS ±{Math.round(position.accuracyM)} m</p>
        </div>
        <button type="button" className="text-button" onClick={() => setConfirm('delete')}>
          Elimina
        </button>
        {confirmSheet}
      </section>
    )
  }

  return (
    <section className="point saved">
      <div className="direction">
        <div className="direction-arrow" style={{ transform: `rotate(${bearing}deg)` }}>
          <Icon name="arrow" size={43} />
        </div>
        <span>{cardinal(bearing)}</span>
      </div>
      <div className="distance">
        <p className="eyebrow">Punto di partenza</p>
        <strong>{formatDistance(guide.remainingM)}</strong>
        <span>
          {guide.followingTrack ? 'lungo il percorso · ' : ''}verso {cardinal(bearing)} ({Math.round(bearing)}°)
        </span>
        <small>
          {guide.followingTrack ? `In linea d’aria ${formatDistance(distance)} · ` : ''}Precisione ±
          {Math.round(position.accuracyM)} m · salvato alle {savedAt}
        </small>
      </div>
      <div className="point-actions">
        <button type="button" onClick={save}>
          Sostituisci
        </button>
        <button type="button" onClick={() => setConfirm('delete')}>
          Elimina
        </button>
      </div>
      {confirmSheet}
    </section>
  )
}
