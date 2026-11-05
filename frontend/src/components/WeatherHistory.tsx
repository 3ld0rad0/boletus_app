import { useState, type PointerEvent, type ReactNode } from 'react'
import { dailyRain, nearestIndex, rangeStatus, valueRange, type RangeStatus } from '../core/chart'
import type { HourlyPoint, SpeciesRules, WeatherSummary } from '../core/types'

const W = 320
const H = 120
const PAD = { l: 34, r: 8, t: 8, b: 20 }
const PLOT_W = W - PAD.l - PAD.r
const PLOT_H = H - PAD.t - PAD.b

interface Point {
  t: number
  v: number
}

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 })
const dayLabel = (t: number) => new Date(t * 1000).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
const dayTimeLabel = (t: number) =>
  new Date(t * 1000).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Mezzanotte locale ogni `everyDays` giorni dentro [from, to] (secondi Unix). */
function dayTicks(from: number, to: number, everyDays: number): number[] {
  const d = new Date(from * 1000)
  d.setHours(24, 0, 0, 0)
  const ticks: number[] = []
  for (; d.getTime() / 1000 <= to; d.setDate(d.getDate() + everyDays)) ticks.push(d.getTime() / 1000)
  return ticks
}

function Frame({
  title,
  readout,
  children,
  ticks,
  yTicks,
  x,
  y,
  unit,
  footer,
}: {
  title: string
  readout: string
  children: ReactNode
  ticks: number[]
  yTicks: number[]
  x: (t: number) => number
  y: (v: number) => number
  unit: string
  footer?: ReactNode
}) {
  return (
    <figure className="weather-chart">
      <figcaption>
        <strong>{title}</strong>
        <span>{readout}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={PAD.l - 4} y={y(v) + 3} textAnchor="end" className="chart-label">
              {nf.format(v)}
              {unit}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 6} textAnchor="middle" className="chart-label">
            {dayLabel(t)}
          </text>
        ))}
        {children}
      </svg>
      {footer}
    </figure>
  )
}

interface Optimal {
  min: number
  max: number
}

const STATUS_LABEL: Record<RangeStatus, string> = {
  ottimale: '✓ Nella fascia',
  sotto: '↓ Sotto la fascia',
  sopra: '↑ Sopra la fascia',
}

function OptimalNote({ optimal, unit, label, value }: { optimal: Optimal; unit: string; label: string; value: number }) {
  const status = rangeStatus(value, optimal)
  return (
    <div className={`chart-optimal ${status}`}>
      <div className="optimal-cell">
        <small>
          <span className="optimal-swatch" aria-hidden="true" /> Fascia ottimale
        </small>
        <strong>
          {nf.format(optimal.min)}–{nf.format(optimal.max)}
          {unit}
        </strong>
      </div>
      <div className="optimal-cell">
        <small>{label}</small>
        <strong>
          {nf.format(value)}
          {unit}
        </strong>
      </div>
      <span className="optimal-badge">{STATUS_LABEL[status]}</span>
    </div>
  )
}

function LineChart({
  title,
  unit,
  color,
  points,
  optimal,
  footer,
}: {
  title: string
  unit: string
  color: string
  points: Point[]
  optimal?: Optimal
  footer?: ReactNode
}) {
  const [active, setActive] = useState<number | null>(null)
  if (points.length < 2) return null

  const tMin = points[0].t
  const tMax = points[points.length - 1].t
  const [vMin, vMax] = valueRange([...points.map((p) => p.v), ...(optimal ? [optimal.min, optimal.max] : [])])
  const x = (t: number) => PAD.l + ((t - tMin) / (tMax - tMin)) * PLOT_W
  const y = (v: number) => PAD.t + (1 - (v - vMin) / (vMax - vMin)) * PLOT_H
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join('')

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const svg = e.currentTarget.querySelector('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const t = tMin + ((px - PAD.l) / PLOT_W) * (tMax - tMin)
    setActive(nearestIndex(points.map((p) => p.t), t))
  }

  const cur = active === null ? null : points[active]
  const last = points[points.length - 1]
  const readout = cur
    ? `${dayTimeLabel(cur.t)} · ${nf.format(cur.v)}${unit}`
    : `ora ${nf.format(last.v)}${unit}`

  return (
    <div onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setActive(null)} className="chart-hit">
      <Frame
        title={title}
        readout={readout}
        ticks={dayTicks(tMin, tMax, 2)}
        yTicks={[vMin + (vMax - vMin) * 0.1, vMax - (vMax - vMin) * 0.1].map((v) => Math.round(v))}
        x={x}
        y={y}
        unit={unit}
        footer={footer}
      >
        {optimal && (
          <rect
            x={PAD.l}
            width={PLOT_W}
            y={y(optimal.max)}
            height={Math.max(0, y(optimal.min) - y(optimal.max))}
            className="chart-optimal-band"
          />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
        {cur && (
          <>
            <line x1={x(cur.t)} x2={x(cur.t)} y1={PAD.t} y2={PAD.t + PLOT_H} className="chart-cursor" />
            <circle cx={x(cur.t)} cy={y(cur.v)} r={3.5} fill={color} />
          </>
        )}
      </Frame>
    </div>
  )
}

function RainChart({ history, footer }: { history: HourlyPoint[]; footer?: ReactNode }) {
  const [active, setActive] = useState<number | null>(null)
  const days = dailyRain(history)
  if (!days.length) return null

  const vMax = Math.max(5, ...days.map((d) => d.mm))
  const slot = PLOT_W / days.length
  const y = (v: number) => PAD.t + (1 - v / vMax) * PLOT_H
  const x = (t: number) => PAD.l + ((t - days[0].t) / Math.max(1, days[days.length - 1].t - days[0].t)) * (PLOT_W - slot) + slot / 2

  const cur = active === null ? null : days[active]
  const total = days.reduce((a, d) => a + d.mm, 0)
  const readout = cur ? `${dayLabel(cur.t)} · ${nf.format(cur.mm)} mm` : `totale ${nf.format(total)} mm`

  return (
    <Frame
      title="Pioggia giornaliera"
      readout={readout}
      ticks={days.filter((_, i) => i % 2 === 0).map((d) => d.t)}
      yTicks={[0, Math.round(vMax)]}
      x={x}
      y={y}
      unit=" mm"
      footer={footer}
    >
      {days.map((d, i) => (
        <rect
          key={d.day}
          x={x(d.t) - slot * 0.35}
          y={y(d.mm)}
          width={slot * 0.7}
          height={PAD.t + PLOT_H - y(d.mm)}
          rx={2}
          className={i === active ? 'chart-bar active' : 'chart-bar'}
          onPointerEnter={() => setActive(i)}
          onPointerDown={() => setActive(i)}
          onPointerLeave={() => setActive(null)}
        />
      ))}
    </Frame>
  )
}

const series = (history: HourlyPoint[], pick: (p: HourlyPoint) => number | null): Point[] =>
  history.flatMap((p) => {
    const v = pick(p)
    return v === null ? [] : [{ t: p.t, v }]
  })

export function WeatherHistory({
  history,
  elevationM,
  species,
  summary,
}: {
  history: HourlyPoint[]
  elevationM: number
  species: SpeciesRules
  summary: WeatherSummary
}) {
  const { temperature, humidity, rain } = species.weighted
  const tempOpt = { min: temperature.optMin, max: temperature.optMax }
  const humOpt = { min: humidity.optMin, max: humidity.optMax }
  const rainOpt = { min: rain.optMin, max: rain.optMax }
  return (
    <div className="weather-history">
      <LineChart
        title="Temperatura"
        unit="°"
        color="#bd5c32"
        points={series(history, (p) => p.tempC)}
        optimal={tempOpt}
        footer={<OptimalNote optimal={tempOpt} unit="°" label="Media 5 giorni" value={summary.tempMeanC} />}
      />
      <LineChart
        title="Umidità"
        unit="%"
        color="#2b7bb9"
        points={series(history, (p) => p.humidityPct)}
        optimal={humOpt}
        footer={<OptimalNote optimal={humOpt} unit="%" label="Media 10 giorni" value={summary.humidityMeanPct} />}
      />
      <RainChart
        history={history}
        footer={<OptimalNote optimal={rainOpt} unit=" mm" label="Totale 10 giorni" value={summary.rainSumMm} />}
      />
      <p className="chart-note">
        Tocca un grafico per vedere i valori. La pioggia si valuta sul totale di 10 giorni. Temperatura del modello a{' '}
        {Math.round(elevationM)} m, non corretta per la quota della cella.
      </p>
    </div>
  )
}
