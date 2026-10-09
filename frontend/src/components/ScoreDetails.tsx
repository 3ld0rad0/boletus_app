import type { ScoredCell, SpeciesRules } from '../core/types'
import { RAIN_WINDOW_DAYS, TEMP_WINDOW_DAYS } from '../core/weather'
import { BAND_COLORS, BAND_LABELS } from '../config'

interface Props {
  cell: ScoredCell
  species: SpeciesRules
  onClose: () => void
}

export function ScoreDetails({ cell, species, onClose }: Props) {
  const { result } = cell
  return (
    <section className="score-details" aria-label="Dettagli punteggio">
      <header>
        <h2>
          {species.name}: <span style={{ color: BAND_COLORS[result.band] }}>{result.score}/100</span>
        </h2>
        <button type="button" className="icon" onClick={onClose} aria-label="Chiudi">
          ✕
        </button>
      </header>
      <p className="muted">
        Probabilità {BAND_LABELS[result.band].toLowerCase()}. Stagione e quota sono fattori bloccanti: se uno è
        a zero, il punteggio è zero.
      </p>
      <ul className="factors">
        {result.factors.map((f) => (
          <li key={f.id}>
            <div className="factor-head">
              <span>
                {f.label}
                {f.blocking && <small className="tag">bloccante</small>}
              </span>
              <span className={`verdict verdict-${f.verdict}`}>{f.verdict}</span>
            </div>
            <div className="bar">
              <div style={{ width: `${Math.round(f.value * 100)}%` }} />
            </div>
            <small>{f.detail}</small>
          </li>
        ))}
      </ul>
      <p className="muted">
        Meteo Open-Meteo: temperatura media degli ultimi {TEMP_WINDOW_DAYS} giorni corretta per la quota, pioggia
        totale e umidità media degli ultimi {RAIN_WINDOW_DAYS} giorni.
      </p>
    </section>
  )
}
