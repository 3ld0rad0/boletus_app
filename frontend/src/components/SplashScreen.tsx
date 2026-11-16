import { useEffect, useState } from 'react'
import { SCAN_RADIUS_M, scanFraction } from '../core/areaScan'
import { markSeen, pickUnseen } from '../core/pickUnseen'
import { QUIPS, TIPS, type Tip } from '../data/tips'
import type { AreaStatus, useBestArea } from '../hooks/useBestArea'
import { storage, STORAGE_KEYS } from '../services/storage'
import { APP_VERSION } from '../config'
import { Icon } from './Icon'

type Progress = ReturnType<typeof useBestArea>['progress']

interface Props {
  status: AreaStatus
  progress: Progress
  /** L'analisi è finita ma manca ancora un GPS abbastanza preciso. */
  waitingGps: boolean
  gpsAccuracyM: number | null
  onSkip: () => void
}

const TIP_MS = 6000
const QUIP_MS = 3200

const tipKey = (t: Tip) => t.title
const readSeenTips = () => storage.get<string[]>(STORAGE_KEYS.seenTips) ?? []

/** Ordine casuale, così le frasi non si ripetono finché non sono finite tutte. */
function shuffled<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function phaseText(status: AreaStatus, progress: Progress, waitingGps: boolean, accuracyM: number | null) {
  if (progress?.phase === 'prepare') return 'Preparo la mappa della zona…'
  if (status === 'ready' && waitingGps) {
    return accuracyM === null ? 'Aggancio il segnale GPS…' : `Aggancio il segnale GPS… (±${Math.round(accuracyM)} m)`
  }
  if (status === 'ready') return 'Analisi completata'
  if (status === 'idle') return 'Cerco la tua posizione…'
  if (!progress) return 'Preparo la scansione…'
  return progress.phase === 'weather' ? 'Scarico il meteo dell’area…' : 'Analizzo in dettaglio le zone migliori…'
}

/** Schermata iniziale con avanzamento reale della scansione e consigli che scorrono; si può saltare. */
export function SplashScreen({ status, progress, waitingGps, gpsAccuracyM, onSkip }: Props) {
  // I consigli già letti nei lanci precedenti si ripetono solo dopo averli visti tutti.
  const [tip, setTip] = useState(() => pickUnseen(TIPS, tipKey, readSeenTips()))
  useEffect(() => {
    storage.set(STORAGE_KEYS.seenTips, markSeen(TIPS, tipKey, readSeenTips(), tip.title))
  }, [tip])
  const [quips] = useState(() => shuffled(QUIPS))
  const [quipIndex, setQuipIndex] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setQuipIndex((i) => i + 1), QUIP_MS)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => setTip(() => pickUnseen(TIPS, tipKey, readSeenTips())), TIP_MS)
    return () => window.clearInterval(id)
  }, [])
  // Foto dei consigli già pronte quando scorrono.
  useEffect(() => {
    for (const t of TIPS) if (t.photo) new Image().src = t.photo.src
  }, [])

  const fraction = progress ? scanFraction(progress) : status === 'ready' ? 1 : scanFraction(null)
  // Il 100% arriva solo con il GPS agganciato.
  const percent = Math.round((waitingGps ? Math.min(fraction, 0.97) : fraction) * 100)

  return (
    <div className="splash" role="dialog" aria-label="Caricamento">
      <div className="splash-brand">
        <Icon name="mushroom" size={28} />
        <div>
          <strong>Boletus</strong>
          <small>Cerco la zona migliore entro {SCAN_RADIUS_M / 1000} km</small>
        </div>
      </div>

      <div className="splash-tip" key={tip.title}>
        <div className={tip.photo ? 'splash-photo' : 'splash-photo plain'}>
          {tip.photo ? (
            <>
              <img src={tip.photo.src} alt="" />
              <small>
                Foto: {tip.photo.author} · {tip.photo.license}
              </small>
            </>
          ) : (
            <Icon name={tip.icon} size={64} />
          )}
        </div>
        <h2>{tip.title}</h2>
        <p>{tip.text}</p>
      </div>

      <div className="splash-footer">
        <p className="splash-quip" key={quipIndex} aria-hidden="true">
          {quips[quipIndex % quips.length]}
        </p>
        <div
          className="splash-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label="Avanzamento dell'analisi"
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <p className="splash-phase" aria-live="polite">
          <span>{phaseText(status, progress, waitingGps, gpsAccuracyM)}</span>
          <strong>{percent}%</strong>
        </p>
        <button type="button" className="splash-skip" onClick={onSkip}>
          Salta, continua in background
        </button>
        <p className="splash-version">Versione {APP_VERSION}</p>
      </div>
    </div>
  )
}
