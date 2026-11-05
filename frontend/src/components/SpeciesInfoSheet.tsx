import { useEffect, useState } from 'react'
import type { SpeciesRules } from '../core/types'
import { type Lookalike, type Photo, type SpeciesInfo, type Toxicity } from '../data/speciesInfo'
import { Icon } from './Icon'
import { MushroomIcon } from './MushroomIcon'

interface Props {
  species: SpeciesRules
  info: SpeciesInfo
  /** Se assente il pulsante "Cerca questo fungo" non viene mostrato. */
  onSearch?: () => void
  onClose: () => void
}

const MONTHS = ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D']
const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

const TOXICITY_LABEL: Record<Toxicity, string> = {
  mortale: 'Mortale',
  velenoso: 'Velenoso',
  tossico: 'Tossico',
}

function Credit({ photo }: { photo: Photo }) {
  return (
    <small className="photo-credit">
      Foto: {photo.author} ·{' '}
      <a href={photo.url} target="_blank" rel="noreferrer">
        {photo.license}
      </a>
    </small>
  )
}

export function SpeciesInfoSheet({ species, info, onSearch, onClose }: Props) {
  const season = species.blocking.season
  const [compare, setCompare] = useState<Lookalike | null>(null)

  // In fase di cattura, così Esc chiude prima il confronto e non l'intera scheda.
  useEffect(() => {
    if (!compare) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setCompare(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [compare])

  return (
    <>
    <div className="species-info-backdrop" onClick={onClose}>
      <div
        className="species-info"
        role="dialog"
        aria-modal="true"
        aria-label={`Scheda: ${species.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="species-info-bar">
          <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi scheda">
            <Icon name="close" />
          </button>
        </div>

        <header className="species-info-head">
          {info.photo ? (
            <figure className="species-photo-wrap">
              <img src={info.photo.src} alt={species.name} className="species-photo" />
              <figcaption>
                Foto: {info.photo.author} ·{' '}
                <a href={info.photo.url} target="_blank" rel="noreferrer">
                  {info.photo.license}
                </a>
              </figcaption>
            </figure>
          ) : (
            <div className="species-art">
              <MushroomIcon look={info.look} size={96} />
            </div>
          )}
          <h2>{species.name}</h2>
          <p className="latin">{species.latinName}</p>
          <span className={`edibility ${info.edibility.includes('SOLO') ? 'careful' : ''}`}>{info.edibility}</span>
        </header>

        <p className="species-lead">{info.description}</p>

        <section>
          <h3>Come riconoscerlo</h3>
          <dl className="species-features">
            {info.features.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3>Dove e quando</h3>
          <p className="species-habitat">{info.habitat}</p>
          <div className="season-strip" role="img" aria-label="Stagionalità mese per mese">
            {season.map((v, i) => (
              <div key={MONTH_NAMES[i]} title={`${MONTH_NAMES[i]}: ${Math.round(v * 100)}%`}>
                <span className="season-bar" style={{ opacity: 0.12 + v * 0.88 }} />
                <small>{MONTHS[i]}</small>
              </div>
            ))}
          </div>
        </section>

        {info.lookalikes.length > 0 && (
          <section className="lookalikes">
            <h3>
              <Icon name="warning" size={18} /> Attenzione ai sosia
            </h3>
            {info.lookalikes.map((l) => (
              <article key={l.latinName} className={`lookalike ${l.toxicity}`}>
                <div className="lookalike-head">
                  <div>
                    <strong>{l.name}</strong>
                    <small>{l.latinName}</small>
                  </div>
                  <span className={`tox-badge ${l.toxicity}`}>{TOXICITY_LABEL[l.toxicity]}</span>
                </div>
                {l.photo && (
                  <button type="button" className="lookalike-photo-btn" onClick={() => setCompare(l)}>
                    <Icon name="info" size={18} /> Vedi la foto e confronta
                  </button>
                )}
                <p>Come distinguerlo:</p>
                <ul>
                  {l.differences.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        )}

        <p className="species-disclaimer">
          Scheda orientativa: non basta per riconoscere un fungo. Fai sempre controllare il raccolto da un micologo
          o dall’ispettorato micologico della ASL.
        </p>

        {onSearch && (
          <button type="button" className="button primary" onClick={onSearch}>
            Cerca questo fungo
          </button>
        )}
      </div>
    </div>

    {compare?.photo && (
      <div className="compare-backdrop" onClick={() => setCompare(null)}>
        <div
          className="compare"
          role="dialog"
          aria-modal="true"
          aria-label={`Confronto: ${species.name} e ${compare.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="compare-head">
            <h3>Confronto diretto</h3>
            <button type="button" className="icon-button" onClick={() => setCompare(null)} aria-label="Chiudi confronto">
              <Icon name="close" />
            </button>
          </div>
          <div className="compare-grid">
            <figure>
              <span className="compare-tag ok">Commestibile</span>
              {info.photo ? (
                <img src={info.photo.src} alt={species.name} />
              ) : (
                <div className="compare-art">
                  <MushroomIcon look={info.look} size={72} />
                </div>
              )}
              <figcaption>
                <strong>{species.name}</strong>
                <em>{species.latinName}</em>
                {info.photo && <Credit photo={info.photo} />}
              </figcaption>
            </figure>
            <figure className={compare.toxicity}>
              <span className={`compare-tag ${compare.toxicity}`}>{TOXICITY_LABEL[compare.toxicity]}</span>
              <img src={compare.photo.src} alt={compare.name} />
              <figcaption>
                <strong>{compare.name}</strong>
                <em>{compare.latinName}</em>
                {compare.photoNote && <small>{compare.photoNote}</small>}
                <Credit photo={compare.photo} />
              </figcaption>
            </figure>
          </div>
          <p className="compare-title">Come distinguerli:</p>
          <ul>
            {compare.differences.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      </div>
    )}
    </>
  )
}
