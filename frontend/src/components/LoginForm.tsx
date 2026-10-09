import { useState, type FormEvent } from 'react'
import type { LatLon } from '../core/types'
import type { Auth } from '../hooks/useAuth'
import type { Spot } from '../services/api'

interface Props {
  auth: Auth
  spots: Spot[]
  spotsError: string | null
  onUseSpot: (p: LatLon) => void
  onDeleteSpot: (id: number) => void
}

export function LoginForm({ auth, spots, spotsError, onUseSpot, onDeleteSpot }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (auth.checking) return <p className="muted">Verifica sessione…</p>

  if (auth.user) {
    return (
      <section className="account">
        <p>
          Accesso come <strong>{auth.user.email}</strong>{' '}
          <button type="button" onClick={auth.logout}>
            Esci
          </button>
        </p>
        <h3>Punti salvati</h3>
        {spotsError && <p className="warning">{spotsError}</p>}
        {spots.length === 0 ? (
          <p className="muted">Nessun punto salvato.</p>
        ) : (
          <ul className="spots">
            {spots.map((s) => (
              <li key={s.id}>
                <span>
                  {s.name}
                  <small className="muted"> ({s.lat.toFixed(5)}, {s.lon.toFixed(5)})</small>
                </span>
                <span className="actions">
                  <button type="button" onClick={() => onUseSpot(s)}>
                    Usa come partenza
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Eliminare "${s.name}"?`) && onDeleteSpot(s.id)}
                  >
                    Elimina
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await auth.login(email, password)
      else await auth.register(email, password)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="account" onSubmit={submit}>
      <h3>{mode === 'login' ? 'Accedi' : 'Crea un account'}</h3>
      <p className="muted">Facoltativo: serve solo per salvare i punti sul server.</p>
      <label className="field">
        <span>Email</span>
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="warning">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>
        {mode === 'login' ? 'Accedi' : 'Registrati'}
      </button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
      </button>
    </form>
  )
}
