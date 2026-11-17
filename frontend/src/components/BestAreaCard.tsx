import { createPortal } from 'react-dom'
import { useState } from 'react'
import { FAVORABLE_SCORE, SCAN_STEP_M, ZONES_COUNT, type ZoneReport } from '../core/areaScan'
import { cardinal, formatDistance } from '../core/geo'
import { bandFor, HABITAT_LABELS } from '../core/scoring'
import { RAIN_WINDOW_DAYS, TEMP_WINDOW_DAYS } from '../core/weather'
import { BAND_COLORS, BAND_LABELS } from '../config'
import { SPECIES } from '../data/species'
import type { AreaStatus, useBestArea } from '../hooks/useBestArea'
import { Icon } from './Icon'
import { WeatherHistory } from './WeatherHistory'

type AreaState = ReturnType<typeof useBestArea>

interface Props {
  area: AreaState
  onShow: (zone: ZoneReport) => void
  onClose: () => void
}

const LIGHT_BANDS = new Set(['mediumHigh', 'high'])

function progressText({ phase, done, total }: NonNullable<AreaState['progress']>) {
  if (phase === 'weather') return `Scarico il meteo dell'area (${done}/${total})…`
  if (phase === 'refine') return `Analizzo in dettaglio la zona ${Math.min(done + 1, total)} di ${total}…`
  return 'Preparo la mappa della zona…'
}

const placeLabel = (z: ZoneReport) => z.place?.name ?? `Zona a ${formatDistance(z.distanceM)} verso ${cardinal(z.bearingDeg)}`
const whereLabel = (z: ZoneReport) => `a ${formatDistance(z.distanceM)} verso ${cardinal(z.bearingDeg)}`

function emptyMessage(status: AreaStatus, area: AreaState) {
  if (status === 'failed') return `Analisi non riuscita: ${area.error ?? 'errore sconosciuto'}. Riproverà al prossimo avvio.`
  if (!area.hasOrigin) return 'Serve la tua posizione (o un punto di partenza salvato) per cercare la zona migliore.'
  if (!area.online) return 'Serve la connessione per analizzare la zona.'
  return 'Analisi non ancora avviata.'
}

export function BestAreaCard({ area, onShow, onClose }: Props) {
  const { status, report, progress } = area
  const best = report?.zones[0]
  const bestSpecies = SPECIES.find((s) => s.id === best?.speciesId)
  const scanning = status === 'scanning'
  const [chartsOpen, setChartsOpen] = useState(false)

  return createPortal(
    <div className="modal-layer align-bottom" onClick={onClose}>
      <div className="area-card" role="dialog" aria-modal="true" aria-label="Zona consigliata" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="detail-head">
          <div>
            <p className="eyebrow">Zona mediamente più redditizia oggi</p>
            {best && (
              <>
                <h2>{placeLabel(best)}</h2>
                <p className="area-where">
                  {best.place?.detail ? `${best.place.detail} · ` : ''}
                  {whereLabel(best)}
                </p>
              </>
            )}
            {!best && <h2>{scanning ? 'Analisi in corso…' : 'Nessuna analisi'}</h2>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi">
            <Icon name="close" />
          </button>
        </div>

        {scanning && (
          <div className="loading-state">
            <span className="spinner" />
            <div>
              <strong>{progress ? progressText(progress) : 'Preparo la scansione…'}</strong>
              <p>Puoi chiudere: l'analisi continua in background.</p>
            </div>
          </div>
        )}

        {!best && !scanning && <div className="banner gps">{emptyMessage(status, area)}</div>}
        {status === 'failed' && best && <div className="banner gps">{emptyMessage(status, area)}</div>}

        {best && report && (
          <>
            <div className="area-headline">
              <span
                className="probability-badge"
                style={{ background: BAND_COLORS[best.band], color: LIGHT_BANDS.has(best.band) ? '#1d2a24' : '#fff' }}
              >
                {best.speciesName}: {best.score}/100 · {BAND_LABELS[best.band].toLowerCase()}
              </span>
            </div>
            {best.score < FAVORABLE_SCORE && (
              <div className="banner">
                <Icon name="warning" />
                <span>Oggi nessuna zona nel raggio è davvero favorevole: questa è la migliore disponibile.</span>
              </div>
            )}

            <dl className="area-facts">
              <div>
                <dt>Quota</dt>
                <dd>{Math.round(best.inputs.elevationM)} m</dd>
              </div>
              <div>
                <dt>Temperatura ({TEMP_WINDOW_DAYS} gg)</dt>
                <dd>{best.inputs.tempMeanC.toFixed(1).replace('.', ',')} °C</dd>
              </div>
              <div>
                <dt>Pioggia ({RAIN_WINDOW_DAYS} gg)</dt>
                <dd>{Math.round(best.inputs.rainSumMm)} mm</dd>
              </div>
              <div>
                <dt>Umidità media</dt>
                <dd>{Math.round(best.inputs.humidityMeanPct)} %</dd>
              </div>
              {best.inputs.habitat && (
                <div className="wide">
                  <dt>Vegetazione</dt>
                  <dd>{HABITAT_LABELS[best.inputs.habitat]}</dd>
                </div>
              )}
            </dl>

            {best.weather?.history && best.weather.history.length > 1 && bestSpecies && (
              <div className={`area-charts${chartsOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className="area-charts-toggle"
                  onClick={() => setChartsOpen((v) => !v)}
                  aria-expanded={chartsOpen}
                >
                  <span>Andamento meteo · 10 giorni</span>
                  <Icon name="chevron" size={18} />
                </button>
                <h3 className="area-title area-charts-title">Andamento meteo degli ultimi 10 giorni</h3>
                <div className="area-charts-body">
                  <p className="weather-subtitle-note">
                    Fascia verde = condizioni ottimali per <strong>{bestSpecies.name}</strong>
                  </p>
                  <WeatherHistory
                    history={best.weather.history}
                    elevationM={best.weather.referenceElevationM}
                    species={bestSpecies}
                    summary={best.weather}
                  />
                </div>
              </div>
            )}

            {best.speciesScores.length > 0 && (
              <>
                <h3 className="area-title">Le specie in questa zona</h3>
                <ul className="area-species">
                  {best.speciesScores.map((s) => {
                    const band = bandFor(s.score)
                    return (
                      <li key={s.id} className={s.id === best.speciesId ? 'active' : undefined}>
                        <span>
                          {s.name}
                          <small>{BAND_LABELS[band]}</small>
                        </span>
                        <i className="area-species-bar" aria-hidden="true">
                          <b style={{ width: `${s.score}%`, background: BAND_COLORS[band] }} />
                        </i>
                        <strong>{s.score}%</strong>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}

            <h3 className="area-title">Come è stata scelta</h3>
            <p className="sources">
              Analizzati {report.nodesScanned} punti entro {report.radiusM / 1000} km (uno ogni {SCAN_STEP_M / 1000} km)
              con meteo degli ultimi {RAIN_WINDOW_DAYS} giorni, quota e stagione; in ogni punto conta la specie con il
              punteggio più alto. Le {ZONES_COUNT} zone migliori, distanti tra loro, sono state riesaminate su un'area
              di 2,5 km di raggio
              {report.zones.every((z) => z.detailed)
                ? ' con vegetazione (CORINE) e vicinanza ai centri abitati.'
                : ', ma per alcune vegetazione e centri abitati non erano disponibili: il punteggio può essere ottimistico.'}{' '}
              Vince la zona con il punteggio finale più alto. Analisi del{' '}
              {new Date(report.generatedAt).toLocaleString('it-IT', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </p>

            <button type="button" className="button primary" onClick={() => onShow(best)}>
              <Icon name="locate" size={20} /> Mostra sulla mappa
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
