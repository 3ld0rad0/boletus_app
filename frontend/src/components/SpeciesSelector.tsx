import type { SpeciesRules } from '../core/types'

interface Props {
  species: SpeciesRules[]
  value: string
  onChange: (id: string) => void
}

export function SpeciesSelector({ species, value, onChange }: Props) {
  return (
    <div className="species-row" role="group" aria-label="Specie">
      {species.map((s) => (
        <button
          key={s.id}
          type="button"
          className={s.id === value ? 'active' : ''}
          aria-pressed={s.id === value}
          onClick={() => onChange(s.id)}
        >
          <strong>{s.name}</strong>
          <small>{s.latinName}</small>
        </button>
      ))}
    </div>
  )
}
