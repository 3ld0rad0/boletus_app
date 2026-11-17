import { cardinal } from '../core/geo'
import { miniRange, projectToMini } from '../core/minimap'
import type { LatLon } from '../core/types'
import type { Compass as CompassState } from '../hooks/useCompass'

interface Props {
  compass: CompassState
  /** Posizione attuale: centro della mini mappa. */
  position: LatLon | null
  startPoint: LatLon | null
  /** Percorso registrato dalla partenza. */
  track: LatLon[]
}

const R = 40
const LETTERS: [string, number, number][] = [
  ['N', 0, -R + 7],
  ['E', R - 7, 0],
  ['S', 0, R - 7],
  ['O', -R + 7, 0],
]

const formatRange = (m: number) => (m >= 1000 ? `${m / 1000} km` : `${m} m`)

/**
 * Spenta è un pulsante; accesa diventa una mini mappa con i punti cardinali: l'alto è la direzione
 * in cui guardi, il nord reale ruota con il dispositivo e il punto di partenza resta al suo posto.
 */
export function Compass({ compass, position, startPoint, track }: Props) {
  const { status, angle, heading, toggle } = compass
  const on = status === 'active' || status === 'starting'
  const label = on ? 'Spegni la bussola' : 'Accendi la bussola'
  const title = heading === null ? label : `${label} · ${cardinal(heading)} ${Math.round(heading)}°`

  if (!on) {
    return (
      <button
        type="button"
        className="map-fab compact compass"
        onClick={() => void toggle()}
        aria-pressed={false}
        aria-label={label}
        title={title}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".45" />
          <path d="M13 3 17 13H9Z" fill="#d64933" />
          <path d="M13 23 9 13h8Z" fill="currentColor" opacity=".55" />
        </svg>
      </button>
    )
  }

  const rot = angle ?? 0
  const range = position ? miniRange(position, [...(startPoint ? [startPoint] : []), ...track]) : 100
  const at = (p: LatLon) => (position ? projectToMini(position, p, range, R) : { x: 0, y: 0 })
  const start = startPoint && position ? at(startPoint) : null
  const trackPath = position && track.length > 1 ? track.map((p, i) => `${i ? 'L' : 'M'}${at(p).x.toFixed(1)},${at(p).y.toFixed(1)}`).join('') : null

  return (
    <button
      type="button"
      className="mini-compass"
      onClick={() => void toggle()}
      aria-pressed
      aria-label={label}
      title={title}
    >
      <svg viewBox="-50 -50 100 100" aria-hidden="true">
        <circle r="49" className="mm-bg" />
        <g style={{ transform: `rotate(${-rot}deg)` }} className="mm-world">
          <circle r={R} className="mm-ring" />
          <circle r={R / 2} className="mm-ring faint" />
          <path d={`M0 ${-R}V${R}M${-R} 0H${R}`} className="mm-ring faint" />
          {trackPath && <path d={trackPath} className="mm-track" />}
          {start && (
            <>
              <line x1="0" y1="0" x2={start.x} y2={start.y} className="mm-home-line" />
              <circle cx={start.x} cy={start.y} r="4.5" className="mm-start" />
            </>
          )}
          {LETTERS.map(([l, x, y]) => (
            <text
              key={l}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={`mm-letter ${l === 'N' ? 'north' : ''}`}
              transform={`rotate(${rot} ${x} ${y})`}
            >
              {l}
            </text>
          ))}
        </g>
        <path d="M0 -9 6 7 0 3 -6 7Z" className="mm-me" />
        <path d="M-4 -49 4 -49 0 -43Z" className="mm-heading" />
        <text x="0" y="31" textAnchor="middle" className="mm-scale">
          {formatRange(range)}
        </text>
      </svg>
    </button>
  )
}
