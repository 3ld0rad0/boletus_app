import { BAND_THRESHOLDS } from '../core/scoring'
import { BAND_COLORS, BAND_LABELS } from '../config'

function rangeLabel(index: number): string {
  const { min } = BAND_THRESHOLDS[index]
  const next = BAND_THRESHOLDS[index + 1]
  if (!next) return `≥ ${min}`
  return index === 0 ? `< ${next.min}` : `${min}–${next.min - 1}`
}

export function ProbabilityLegend() {
  return (
    <ul className="legend" aria-label="Legenda probabilità">
      {BAND_THRESHOLDS.map(({ band }, i) => (
        <li key={band}>
          <span className="swatch" style={{ background: BAND_COLORS[band] }} />
          {BAND_LABELS[band]} <small>({rangeLabel(i)})</small>
        </li>
      ))}
    </ul>
  )
}
