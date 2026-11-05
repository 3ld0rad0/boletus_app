import { useEffect, useState } from 'react'
import type { LatLon, WeatherSummary } from '../core/types'
import { fetchWeatherSummary } from '../core/weather'
import { describeWeatherCode } from '../core/weatherCode'
import { Icon } from './Icon'
import { WeatherHistory } from './WeatherHistory'

interface Place {
  id: string
  label: string
  point: LatLon
}

interface Props {
  places: Place[]
  onClose: () => void
}

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })
const timeLabel = (t: number) => new Date(t * 1000).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

type Result = { key: string; data: WeatherSummary } | { key: string; error: string }

export function WeatherPanel({ places, onClose }: Props) {
  const [selectedId, setSelectedId] = useState(places[0]?.id)
  const place = places.find((p) => p.id === selectedId) ?? places[0]
  const point = place.point
  const key = `${point.lat.toFixed(2)},${point.lon.toFixed(2)}`
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchWeatherSummary(point).then(
      (data) => !cancelled && setResult({ key, data }),
      (e: unknown) => !cancelled && setResult({ key, error: e instanceof Error ? e.message : 'errore sconosciuto' }),
    )
    return () => {
      cancelled = true
    }
    // `point` cambia a ogni render del chiamante: conta solo la chiave arrotondata.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const current = result && key === result.key && 'data' in result ? result.data : null
  const error = result && key === result.key && 'error' in result ? result.error : null
  const now = current?.current
  const condition = now ? describeWeatherCode(now.weatherCode) : null

  return (
    <div className="full-panel" role="dialog" aria-label="Meteo">
      <header className="panel-header">
        <div>
          <p className="eyebrow">{place.label}</p>
          <h2>Meteo</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi">
          <Icon name="close" />
        </button>
      </header>

      {places.length > 1 && (
        <div className="tabs weather-tabs" role="tablist">
          {places.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === place.id}
              className={p.id === place.id ? 'active' : ''}
              onClick={() => setSelectedId(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {!current && !error && (
        <div className="loading-state">
          <span className="spinner" />
          <strong>Scarico il meteo…</strong>
        </div>
      )}
      {error && <p className="warning">Meteo non disponibile: {error}</p>}

      {current && (
        <>
          {now && condition && (
            <section className="weather-now">
              <span className="weather-now-emoji" aria-hidden="true">
                {condition.emoji}
              </span>
              <div>
                <strong className="weather-now-temp">{nf.format(now.tempC)}°C</strong>
                <span>{condition.label}</span>
              </div>
              <dl>
                <div>
                  <dt>Umidità</dt>
                  <dd>{Math.round(now.humidityPct)}%</dd>
                </div>
                <div>
                  <dt>Vento</dt>
                  <dd>{Math.round(now.windKmh)} km/h</dd>
                </div>
                <div>
                  <dt>Pioggia</dt>
                  <dd>{nf.format(now.precipitationMm)} mm</dd>
                </div>
              </dl>
              <small>Misura delle {timeLabel(now.t)}</small>
            </section>
          )}
          {current.history && current.history.length > 1 && (
            <>
              <h3 className="weather-subtitle">Ultimi 10 giorni</h3>
              <WeatherHistory history={current.history} elevationM={current.referenceElevationM} />
            </>
          )}
        </>
      )}
    </div>
  )
}
