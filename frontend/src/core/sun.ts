import type { LatLon } from './types'

const MS_PER_DAY = 86_400_000
const J2000 = 2_451_545
const UNIX_EPOCH_JD = 2_440_587.5

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Istante del tramonto (precisione ~1 min) nel giorno solare locale di `now`; null se il sole non tramonta. */
export function sunsetTime(now: Date, { lat, lon }: LatLon): Date | null {
  const solarDay = Math.floor((now.getTime() + (lon / 15) * 3_600_000) / MS_PER_DAY)
  const n = solarDay + 0.5 + UNIX_EPOCH_JD - J2000
  const jStar = n - lon / 360

  const m = (357.5291 + 0.98560028 * jStar) % 360
  const mRad = toRad(m)
  const c = 1.9148 * Math.sin(mRad) + 0.02 * Math.sin(2 * mRad) + 0.0003 * Math.sin(3 * mRad)
  const lambda = toRad((m + c + 180 + 102.9372) % 360)
  const transit = J2000 + jStar + 0.0053 * Math.sin(mRad) - 0.0069 * Math.sin(2 * lambda)

  const sinDec = Math.sin(lambda) * Math.sin(toRad(23.4397))
  const cosDec = Math.sqrt(1 - sinDec ** 2)
  const cosH = (Math.sin(toRad(-0.833)) - Math.sin(toRad(lat)) * sinDec) / (Math.cos(toRad(lat)) * cosDec)
  if (cosH < -1 || cosH > 1) return null

  const hourAngleDeg = (Math.acos(cosH) * 180) / Math.PI
  return new Date((transit + hourAngleDeg / 360 - UNIX_EPOCH_JD) * MS_PER_DAY)
}
