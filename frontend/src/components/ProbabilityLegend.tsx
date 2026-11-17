import { useState } from 'react'
import { BAND_THRESHOLDS } from '../core/scoring'
import { BAND_COLORS, BAND_LABELS } from '../config'
import { Icon } from './Icon'

function rangeLabel(index: number): string {
  const { min } = BAND_THRESHOLDS[index]
  const next = BAND_THRESHOLDS[index + 1]
  if (!next) return `≥ ${min}`
  return index === 0 ? `< ${next.min}` : `${min}–${next.min - 1}`
}

export function ProbabilityLegend() {
  const [open, setOpen] = useState(false)
  return (
    <div className="legend">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          <strong>Legenda probabilità</strong>
          <small>{BAND_THRESHOLDS.length} fasce · punteggio 0–100</small>
        </span>
        <Icon name="chevron" />
      </button>
      {open && (
        <div className="legend-grid">
          {BAND_THRESHOLDS.map(({ band }, i) => (
            <div key={band}>
              <i style={{ background: BAND_COLORS[band] }} />
              <span>
                {BAND_LABELS[band]}
                <small>{rangeLabel(i)}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
