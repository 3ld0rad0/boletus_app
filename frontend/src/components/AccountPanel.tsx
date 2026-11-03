import { useState, type FormEvent } from 'react'
import type { LatLon } from '../core/types'
import type { Auth } from '../hooks/useAuth'
import type { Theme } from '../hooks/useTheme'
import type { Spot } from '../services/api'
import { Icon } from './Icon'

interface Props {
  auth: Auth
  spots: Spot[]
  spotsError: string | null
  theme: Theme
  onToggleTheme: () => void
  onClose: () => void
  onUseSpot: (p: LatLon) => void
  onDeleteSpot: (id: number) => void
}

export function AccountPanel({ auth, spots, spotsError, theme, onToggleTheme, onClose, onUseSpot, onDeleteSpot }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  const dark = theme === 'dark'

  return (
    <div className="full-panel" role="dialog" aria-label="Account">
      <header className="panel-header">
        <div>
          <p className="eyebrow">Profilo</p>
          <h2>Il tuo account</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi">
          <Icon name="close" />
        </button>
      </header>
      <button type="button" className="theme-row" onClick={onToggleTheme}>
        <span>
          <Icon name={dark ? 'sun' : 'moon'} /> Tema {dark ? 'chiaro' : 'scuro'}
        </span>
        <span className={`switch ${dark ? 'on' : ''}`} />
      </button>

      {auth.checking ? (
        <p className="panel-intro">Verifica sessione…</p>
      ) : auth.user ? (
        <>
          <div className="logged-card">
            <div className="avatar">{auth.user.email.slice(0, 2).toUpperCase()}</div>
            <div>
              <strong>{auth.user.email}</strong>
              <span>Account attivo</span>
            </div>
            <button type="button" className="text-button" onClick={auth.logout}>
              Esci
            </button>
          </div>
          <div className="saved-title">
            <h3>Punti salvati</h3>
            <span>{spots.length === 1 ? '1 punto' : `${spots.length} punti`}</span>
          </div>
          {spotsError && <p className="warning spots-error">{spotsError}</p>}
          {spots.length === 0 && !spotsError && <p className="panel-intro">Nessun punto salvato.</p>}
          {spots.map((s) => (
            <div className="saved-place" key={s.id}>
              <span className="place-icon">
                <Icon name="flag" />
              </span>
              <div>
                <strong>{s.name}</strong>
                <small>
                  {s.lat.toFixed(5)}, {s.lon.toFixed(5)}
                </small>
                <button type="button" onClick={() => onUseSpot(s)}>
                  Usa come partenza
                </button>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`Elimina ${s.name}`}
                onClick={() => window.confirm(`Eliminare "${s.name}"?`) && onDeleteSpot(s.id)}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </>
      ) : (
        <>
          <p className="panel-intro">
            Accedi per salvare i tuoi punti sul server. L’app funziona anche senza account.
          </p>
          <div className="tabs">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              Accedi
            </button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
              Registrati
            </button>
          </div>
          <form onSubmit={submit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                placeholder="nome@esempio.it"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <span className="input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Almeno 8 caratteri"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  <Icon name="eye" />
                </button>
              </span>
            </label>
            {mode === 'register' && <p className="field-help">Usa almeno 8 caratteri.</p>}
            {error && <p className="warning spots-error">{error}</p>}
            <button type="submit" className="button primary" disabled={busy}>
              {mode === 'login' ? 'Accedi' : 'Crea account'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
