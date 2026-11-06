import { bandFor } from '../core/scoring'
import type { SpeciesRules } from '../core/types'
import { BAND_COLORS, BAND_LABELS } from '../config'

export interface SpeciesScore {
  species: SpeciesRules
  score: number
}

interface Props {
  items: SpeciesScore[]
  selectedId: string
  onSelect: (id: string) => void
}

export function SpeciesProbabilityList({ items, selectedId, onSelect }: Props) {
  const sorted = [...items].sort((a, b) => b.score - a.score)
  return (
    <div className="species-prob">
      <strong>Probabilità per fungo</strong>
      <small>Cella migliore dell'area calcolata</small>
      <ul>
        {sorted.map(({ species, score }) => {
          const band = bandFor(score)
          return (
            <li key={species.id}>
              <button
                type="button"
                className={species.id === selectedId ? 'active' : ''}
                onClick={() => onSelect(species.id)}
                aria-pressed={species.id === selectedId}
              >
                <i style={{ background: BAND_COLORS[band] }} />
                <span className="species-prob-name">{species.name}</span>
                <span className="species-prob-bar">
                  <span style={{ width: `${score}%`, background: BAND_COLORS[band] }} />
                </span>
                <span className="species-prob-score">
                  {score}
                  <small>{BAND_LABELS[band]}</small>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
