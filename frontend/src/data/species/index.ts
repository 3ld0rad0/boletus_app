import { validateSpecies } from '../../core/scoring'
import type { SpeciesRules } from '../../core/types'

// Per aggiungere una specie basta creare un nuovo file JSON in questa cartella.
const modules = import.meta.glob<{ default: unknown }>('./*.json', { eager: true })

export const SPECIES: SpeciesRules[] = Object.values(modules)
  .map((m) => validateSpecies(m.default))
  .sort((a, b) => a.name.localeCompare(b.name, 'it'))
