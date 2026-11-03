import type { ScoredCell, SpeciesRules } from '../core/types'
import { probableForest } from '../core/forestType'
import { RAIN_WINDOW_DAYS, TEMP_WINDOW_DAYS } from '../core/weather'
import { BAND_COLORS, BAND_LABELS } from '../config'
import { Icon } from './Icon'

interface Props {
  cell: ScoredCell
  species: SpeciesRules
  onClose: () => void
}

const LIGHT_BANDS = new Set(['mediumHigh', 'high'])

export function ScoreDetails({ cell, species, onClose }: Props) {
  const { result } = cell
  const forest = probableForest(cell)
  return (
    <div className="detail-sheet" role="dialog" aria-label="Dettaglio probabilità">
      <div className="sheet-handle" />
      <div className="detail-head">
        <div>
          <p className="eyebrow">Dettaglio della cella</p>
          <h2>
            {species.name}: <span style={{ color: BAND_COLORS[result.band] }}>{result.score}/100</span>
          </h2>
          <span
            className="probability-badge"
            style={{ background: BAND_COLORS[result.band], color: LIGHT_BANDS.has(result.band) ? '#1d2a24' : '#fff' }}
          >
            Probabilità {BAND_LABELS[result.band].toLowerCase()}
          </span>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi dettaglio">
          <Icon name="close" />
        </button>
      </div>
      <p className="detail-note">
        Stagione, quota e vicinanza ai centri abitati abbassano il punteggio in modo graduale, senza azzerarlo.
      </p>
      <div className="factors">
        {result.factors.map((f) => (
          <div className="factor" key={f.id}>
            <div className="factor-head">
              <strong>{f.label}</strong>
              {f.blocking && <span className="mini-tag">moltiplicatore</span>}
              <span className={`verdict ${f.verdict}`}>{f.verdict}</span>
            </div>
            <div className="progress" aria-label={`${f.label}: ${Math.round(f.value * 100)}%`}>
              <span style={{ width: `${Math.round(f.value * 100)}%` }} />
            </div>
            <p>{f.detail}</p>
          </div>
        ))}
      </div>
      {forest && (
        <div className="forest-estimate">
          <strong>Bosco probabile:</strong> {forest}
          <span>Stima da CORINE e quota, valida per la Calabria; può differire dalla vegetazione reale.</span>
        </div>
      )}
      <p className="sources">
        Meteo Open-Meteo: temperatura media degli ultimi {TEMP_WINDOW_DAYS} giorni corretta per la quota, pioggia
        totale e umidità media degli ultimi {RAIN_WINDOW_DAYS} giorni.
        {result.factors.some((f) => f.id === 'habitat') &&
          ' Vegetazione da CORINE Land Cover 2018 (100 m): boschi e prati più piccoli di circa 25 ha possono non comparire.'}
      </p>
    </div>
  )
}
