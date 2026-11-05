import type { SpeciesLook } from '../data/speciesInfo'

const FALLBACK: SpeciesLook = { cap: '#8a5a33', stem: '#efe3cc', shape: 'dome' }

const CAPS: Record<SpeciesLook['shape'], string> = {
  dome: 'M8 36 Q8 12 32 12 Q56 12 56 36 Q32 41 8 36 Z',
  parasol: 'M3 35 Q32 4 61 35 Q32 40 3 35 Z',
  egg: 'M9 36 Q9 11 32 11 Q55 11 55 36 Q32 41 9 36 Z',
  funnel: 'M5 25 Q18 20 32 26 Q46 20 59 25 Q56 40 32 42 Q8 40 5 25 Z',
  morel: 'M32 4 Q47 8 47 34 Q32 39 17 34 Q17 8 32 4 Z',
}

const MOREL_CELLS = [
  [28, 12],
  [37, 14],
  [24, 20],
  [33, 21],
  [41, 22],
  [28, 28],
  [37, 29],
  [22, 31],
  [44, 31],
]

/** Illustrazione stilizzata di un fungo, colorata in base alla specie. */
export function MushroomIcon({ look = FALLBACK, size = 56 }: { look?: SpeciesLook; size?: number }) {
  const stem = look.bulb
    ? 'M26 36 h12 q3 9 4 19 q0 6 -6 6 h-8 q-6 0 -6 -6 q1 -10 4 -19 z'
    : look.shape === 'funnel'
      ? 'M24 38 h16 q-2 12 -4 21 q-1 3 -4 3 q-3 0 -4 -3 q-2 -9 -4 -21 z'
      : 'M27 36 h10 l1.5 22 q0 3 -3 3 h-7 q-3 0 -3 -3 z'
  return (
    <svg className="mushroom-icon" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d={stem} fill={look.stem} stroke="rgba(0,0,0,.25)" strokeWidth="1" />
      {look.ring && <path d="M25 41 Q32 46 39 41 L38 44 Q32 49 26 44 Z" fill="rgba(255,255,255,.75)" stroke="rgba(0,0,0,.2)" strokeWidth=".8" />}
      <path d={CAPS[look.shape]} fill={look.cap} stroke="rgba(0,0,0,.3)" strokeWidth="1" />
      {look.shape === 'morel' &&
        MOREL_CELLS.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.1" fill="rgba(0,0,0,.28)" />)}
      {look.shape === 'parasol' && <circle cx="32" cy="17" r="4" fill="rgba(0,0,0,.28)" />}
      {look.spots && [[20, 26], [32, 19], [44, 26]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r="2.5" fill={look.spots} />)}
    </svg>
  )
}
