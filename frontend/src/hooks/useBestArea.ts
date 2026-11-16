import { useEffect, useRef, useState } from 'react'
import type { AreaReport, ScanProgress } from '../core/areaScan'
import type { LatLon, SpeciesRules } from '../core/types'
import { prepareZone, scanBestAreas } from '../services/areaScan'
import { storage, STORAGE_KEYS } from '../services/storage'

export type AreaStatus = 'idle' | 'scanning' | 'ready' | 'failed'

const msToMidnight = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5).getTime() - now.getTime()
}

interface Stored {
  day: string
  report: AreaReport
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function readStored(): AreaReport | null {
  const stored = storage.get<Stored>(STORAGE_KEYS.areaReport)
  return stored?.day === today() ? stored.report : null
}

/**
 * Una sola analisi al giorno della zona migliore attorno alla prima posizione disponibile, in background;
 * se l'app resta aperta oltre la mezzanotte, ne parte una nuova. Finita l'analisi prepara la zona
 * (dati e tessere della mappa), e `preparing` resta vero finché non ha finito.
 */
export function useBestArea(origin: LatLon | null, allSpecies: SpeciesRules[], online: boolean) {
  const [report, setReport] = useState<AreaReport | null>(readStored)
  const [status, setStatus] = useState<AreaStatus>(report ? 'ready' : 'idle')
  const [progress, setProgress] = useState<ScanProgress | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cresce a ogni nuovo giorno: chi lo osserva sa che sta partendo una nuova analisi.
  const [generation, setGeneration] = useState(0)
  const started = useRef(report !== null)
  const attemptDay = useRef<string | null>(report ? today() : null)
  const busy = useRef(false)

  const lat = origin?.lat
  const lon = origin?.lon
  useEffect(() => {
    if (started.current || !online || lat === undefined || lon === undefined) return
    started.current = true
    attemptDay.current = today()
    busy.current = true
    setStatus('scanning')
    setError(null)
    void (async () => {
      try {
        const next = await scanBestAreas({ lat, lon }, allSpecies, { onProgress: setProgress })
        storage.set<Stored>(STORAGE_KEYS.areaReport, { day: today(), report: next })
        setReport(next)
        setStatus('ready')
        if (next.zones[0]) {
          setPreparing(true)
          await prepareZone(next.zones[0].point, setProgress).catch(() => undefined)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'errore sconosciuto')
        setStatus('failed')
      } finally {
        setProgress(null)
        setPreparing(false)
        busy.current = false
      }
    })()
  }, [online, lat, lon, allSpecies, generation])

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible' || busy.current || !started.current) return
      if (attemptDay.current === today()) return
      started.current = false
      setReport(null)
      setStatus('idle')
      setGeneration((g) => g + 1)
    }
    // Un solo timer fino alla prossima mezzanotte; se la pagina era in background lo recupera il ritorno in primo piano.
    let timer: number
    const arm = () => {
      timer = window.setTimeout(() => {
        check()
        arm()
      }, msToMidnight())
    }
    arm()
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return { status, report, progress, preparing, error, generation, hasOrigin: lat !== undefined, online }
}
