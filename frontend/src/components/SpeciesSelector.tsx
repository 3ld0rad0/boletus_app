import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SpeciesRules } from '../core/types'
import { SPECIES_INFO } from '../data/speciesInfo'
import { Icon } from './Icon'
import { MushroomIcon } from './MushroomIcon'
import { SpeciesInfoSheet } from './SpeciesInfoSheet'

interface Props {
  species: SpeciesRules[]
  value: string
  onChange: (id: string) => void
  /** Sceglie il fungo e avvia il calcolo dell'area. */
  onSearch: (id: string) => void
}

// Raggio della ruota in % del suo lato.
const RADIUS = 40

export function SpeciesSelector({ species, value, onChange, onSearch }: Props) {
  const [open, setOpen] = useState(false)
  const [infoId, setInfoId] = useState<string | null>(null)

  const current = species.find((s) => s.id === value) ?? species[0]
  const infoSpecies = species.find((s) => s.id === infoId)
  const info = infoSpecies ? SPECIES_INFO[infoSpecies.id] : undefined

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (infoId) setInfoId(null)
      else setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, infoId])

  const choose = (id: string) => {
    onChange(id)
    setInfoId(null)
    setOpen(false)
  }

  const search = (id: string) => {
    onSearch(id)
    setInfoId(null)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="species-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Fungo cercato: ${current.name}. Cambia`}
      >
        <span className="species-trigger-icon">
          <Icon name="mushroom" size={22} />
        </span>
        <span className="species-trigger-text">
          <strong>{current.name}</strong>
          <small>{current.latinName}</small>
        </span>
        <Icon name="chevron" size={18} />
      </button>

      {open &&
        // Il portale esce dallo stacking context dell'header, che altrimenti resta sotto il pannello in basso.
        createPortal(
        <div className="wheel-backdrop" onClick={() => setOpen(false)}>
          <div className="wheel" role="dialog" aria-modal="true" aria-label="Scegli il fungo" onClick={(e) => e.stopPropagation()}>
            <div className="wheel-center">
              <small>Che fungo cerchi?</small>
              <strong>{current.name}</strong>
              <button type="button" className="wheel-close" onClick={() => setOpen(false)}>
                <Icon name="close" size={16} /> Chiudi
              </button>
            </div>
            {species.map((s, i) => {
              const angle = (i / species.length) * 2 * Math.PI
              const look = SPECIES_INFO[s.id]?.look
              return (
                <div
                  key={s.id}
                  className="wheel-item"
                  style={{ left: `${50 + RADIUS * Math.sin(angle)}%`, top: `${50 - RADIUS * Math.cos(angle)}%` }}
                >
                  <button
                    type="button"
                    className={`wheel-choice ${s.id === value ? 'active' : ''}`}
                    aria-pressed={s.id === value}
                    onClick={() => choose(s.id)}
                  >
                    <span className="wheel-art">
                      {SPECIES_INFO[s.id]?.photo ? (
                        <img src={SPECIES_INFO[s.id].photo?.src} alt="" loading="lazy" />
                      ) : (
                        <MushroomIcon look={look} size={52} />
                      )}
                    </span>
                    <span className="wheel-name">{s.name}</span>
                  </button>
                  {SPECIES_INFO[s.id] && (
                    <button
                      type="button"
                      className="wheel-info"
                      onClick={() => setInfoId(s.id)}
                      aria-label={`Scheda informativa: ${s.name}`}
                    >
                      <Icon name="info" size={18} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>,
        document.body,
        )}

      {infoSpecies && info &&
        createPortal(
        <SpeciesInfoSheet
          species={infoSpecies}
          info={info}
          onSearch={() => search(infoSpecies.id)}
          onClose={() => setInfoId(null)}
        />,
        document.body,
        )}
    </>
  )
}
