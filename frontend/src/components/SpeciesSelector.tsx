import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeciesRules } from '../core/types'
import { Icon } from './Icon'

interface Props {
  species: SpeciesRules[]
  value: string
  onChange: (id: string) => void
}

export function SpeciesSelector({ species, value, onChange }: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const update = useCallback(() => {
    const el = rowRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, species])

  const scrollBy = (dir: -1 | 1) => {
    const el = rowRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  return (
    <div className="species-wrap">
      {canLeft && (
        <button type="button" className="species-nav left" aria-label="Scorri a sinistra" onClick={() => scrollBy(-1)}>
          <Icon name="chevron" size={20} />
        </button>
      )}
      <div
        ref={rowRef}
        className={`species-row${canLeft ? ' fade-left' : ''}${canRight ? ' fade-right' : ''}`}
        role="group"
        aria-label="Specie"
        onScroll={update}
      >
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
      {canRight && (
        <button type="button" className="species-nav right" aria-label="Scorri a destra" onClick={() => scrollBy(1)}>
          <Icon name="chevron" size={20} />
        </button>
      )}
    </div>
  )
}
