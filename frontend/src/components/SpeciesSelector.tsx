import type { SpeciesRules } from '../core/types'

interface Props {
  species: SpeciesRules[]
  value: string
  onChange: (id: string) => void
}

export function SpeciesSelector({ species, value, onChange }: Props) {
  return (
    <label className="field">
      <span>Specie</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {species.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.latinName})
          </option>
        ))}
      </select>
    </label>
  )
}
