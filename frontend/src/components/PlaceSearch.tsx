import { useEffect, useRef, useState, type FormEvent } from 'react'
import { searchPlaces, type Place } from '../core/geocoding'
import { Icon } from './Icon'

const LIVE_DELAY_MS = 350
// Sotto i 3 caratteri il geocoding fa solo corrispondenza esatta: non vale la richiesta.
const LIVE_MIN_CHARS = 3

interface Props {
  onSelect: (place: Place) => void
}

/** Campo di ricerca + elenco risultati; da inserire in `.top-line` dentro `.top-controls` (posizionato). */
export function PlaceSearch({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const requestId = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const run = async (text: string) => {
    const id = ++requestId.current
    setBusy(true)
    setError(null)
    try {
      const found = await searchPlaces(text)
      if (id === requestId.current) setResults(found)
    } catch (err) {
      if (id !== requestId.current) return
      setResults(null)
      setError(err instanceof Error ? err.message : 'Ricerca non riuscita')
    } finally {
      if (id === requestId.current) setBusy(false)
    }
  }

  const reset = () => {
    window.clearTimeout(timer.current)
    // Invalida le risposte ancora in arrivo, che non sono più attuali.
    requestId.current++
    setResults(null)
    setBusy(false)
    setError(null)
  }

  const onChange = (value: string) => {
    setQuery(value)
    if (value.trim().length < LIVE_MIN_CHARS) {
      reset()
      return
    }
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void run(value), LIVE_DELAY_MS)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim().length < 2) return
    window.clearTimeout(timer.current)
    void run(query)
  }

  const choose = (place: Place) => {
    reset()
    setQuery(place.name)
    onSelect(place)
  }

  const clear = () => {
    reset()
    setQuery('')
  }

  const hasPanel = busy || error !== null || results !== null

  return (
    <>
      <form className="search-box" role="search" onSubmit={submit}>
        <Icon name="search" />
        <input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cerca un luogo…"
          aria-label="Cerca un luogo"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={clear} aria-label="Cancella ricerca">
            <Icon name="close" size={18} />
          </button>
        )}
      </form>
      {hasPanel && (
        <div className="search-results">
          {busy && <p>Cerco…</p>}
          {error && <p className="warning">{error}</p>}
          {!busy && results && results.length === 0 && <p>Nessun risultato</p>}
          {results?.map((p) => (
            <button key={p.id} type="button" onClick={() => choose(p)}>
              <Icon name="locate" />
              <span>
                {p.name}
                {p.detail && <small>{p.detail}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
