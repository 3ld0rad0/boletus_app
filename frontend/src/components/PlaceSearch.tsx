import { useEffect, useRef, useState, type FormEvent } from 'react'
import { searchPlaces, type Place } from '../core/geocoding'

const LIVE_DELAY_MS = 350
// Sotto i 3 caratteri il geocoding fa solo corrispondenza esatta: non vale la richiesta.
const LIVE_MIN_CHARS = 3

interface Props {
  onSelect: (place: Place) => void
}

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

  const onChange = (value: string) => {
    setQuery(value)
    window.clearTimeout(timer.current)
    if (value.trim().length < LIVE_MIN_CHARS) {
      // Invalida le risposte ancora in arrivo, che non sono più attuali.
      requestId.current++
      setResults(null)
      setBusy(false)
      setError(null)
      return
    }
    timer.current = window.setTimeout(() => void run(value), LIVE_DELAY_MS)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    window.clearTimeout(timer.current)
    void run(query)
  }

  const choose = (place: Place) => {
    window.clearTimeout(timer.current)
    requestId.current++
    setResults(null)
    setBusy(false)
    setQuery(place.name)
    onSelect(place)
  }

  return (
    <div className="place-search">
      <form onSubmit={submit} role="search">
        <input
          type="search"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Cerca una località…"
          aria-label="Cerca una località"
          autoComplete="off"
        />
        <button type="submit" disabled={busy || query.trim().length < 2}>
          Cerca
        </button>
      </form>
      {busy && <p className="muted">Cerco…</p>}
      {error && <p className="warning">{error}</p>}
      {!busy && results && results.length === 0 && <p className="muted">Nessun risultato.</p>}
      {results && results.length > 0 && (
        <ul className="place-results">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => choose(p)}>
                {p.name}
                {p.detail && <small className="muted"> {p.detail}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
