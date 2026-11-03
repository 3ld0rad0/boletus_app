import { cardinal } from '../core/geo'
import type { Compass as CompassState } from '../hooks/useCompass'

interface Props {
  compass: CompassState
}

/** Il nord (ago rosso) resta puntato al nord reale mentre il dispositivo ruota. */
export function Compass({ compass }: Props) {
  const { status, angle, heading, toggle } = compass
  const on = status === 'active' || status === 'starting'
  const label = on ? 'Spegni la bussola' : 'Accendi la bussola'
  return (
    <button
      type="button"
      className={`map-fab compact compass ${on ? 'on' : ''}`}
      onClick={() => void toggle()}
      aria-pressed={on}
      aria-label={label}
      title={heading === null ? label : `${label} · ${cardinal(heading)} ${Math.round(heading)}°`}
    >
      <svg className="compass-rose" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ transform: `rotate(${-(angle ?? 0)}deg)` }}>
        <circle cx="13" cy="13" r="11.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".45" />
        <path d="M13 3 17 13H9Z" fill="#d64933" />
        <path d="M13 23 9 13h8Z" fill="currentColor" opacity=".55" />
      </svg>
      {heading !== null && <small>{cardinal(heading)}</small>}
    </button>
  )
}
