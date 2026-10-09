import { BAND_THRESHOLDS } from '../core/scoring'
import type { Band } from '../core/types'
import { BAND_COLORS, BAND_LABELS } from '../config'

const RANGES: Record<Band, string> = {
  low: `< ${BAND_THRESHOLDS.medium}`,
  medium: `${BAND_THRESHOLDS.medium}–${BAND_THRESHOLDS.high - 1}`,
  high: `≥ ${BAND_THRESHOLDS.high}`,
}

export function ProbabilityLegend() {
  return (
    <ul className="legend" aria-label="Legenda probabilità">
      {(['low', 'medium', 'high'] as const).map((band) => (
        <li key={band}>
          <span className="swatch" style={{ background: BAND_COLORS[band] }} />
          {BAND_LABELS[band]} <small>({RANGES[band]})</small>
        </li>
      ))}
    </ul>
  )
}
