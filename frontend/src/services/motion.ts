import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { MAGNETIC_DECLINATION_DEG } from '../config'
import { normalizeDeg } from '../core/pdr'

export interface StepEvent {
  steps: number
  /** Direzione media di cammino rispetto al nord reale; `null` se la bussola non dà un valore. */
  headingDeg: number | null
  /** Rotazione oraria attorno alla verticale dall'evento precedente, dal giroscopio: non dipende da come è tenuto il telefono. */
  yawDeltaDeg: number
  timestamp: number
}

export interface MotionError {
  kind: 'permission-denied' | 'unavailable'
}

/** Passi e direzione dal dispositivo, per stimare il percorso quando manca il GPS. */
export interface MotionProvider {
  /** Avvia la lettura; restituisce la funzione per fermarla. Continua a schermo spento solo dove il provider lo supporta. */
  watch(onSteps: (e: StepEvent) => void, onError: (e: MotionError) => void): () => void
}

interface PdrMotionPlugin {
  start(): Promise<void>
  stop(): Promise<void>
  addListener(
    event: 'steps',
    listener: (e: { steps: number; heading: number | null; yawDelta?: number; trueNorth: boolean }) => void,
  ): Promise<PluginListenerHandle>
}

// Plugin locale (android/ e ios/): i plugin pubblici sospendono i sensori quando l'app va in secondo piano.
const PdrMotion = registerPlugin<PdrMotionPlugin>('PdrMotion')

const fromNativeError = (e: unknown): MotionError => ({
  kind: (e as { code?: string } | null)?.code === 'PERMISSION_DENIED' ? 'permission-denied' : 'unavailable',
})

export const nativeMotionProvider: MotionProvider = {
  watch(onSteps, onError) {
    let active = true
    let handle: PluginListenerHandle | null = null
    void (async () => {
      try {
        handle = await PdrMotion.addListener('steps', (e) => {
          if (!active) return
          const north = e.trueNorth ? 0 : MAGNETIC_DECLINATION_DEG
          onSteps({
            steps: e.steps,
            headingDeg: e.heading === null ? null : normalizeDeg(e.heading + north),
            yawDeltaDeg: e.yawDelta ?? 0,
            timestamp: Date.now(),
          })
        })
        if (!active) {
          void handle.remove()
          return
        }
        await PdrMotion.start()
      } catch (e) {
        if (active) onError(fromNativeError(e))
      }
    })()
    return () => {
      active = false
      void handle?.remove()
      void PdrMotion.stop().catch(() => {})
    }
  },
}

/** Sul web non ci sono sensori affidabili a schermo spento: il percorso resta solo GPS. */
export const noMotionProvider: MotionProvider = { watch: () => () => {} }

export const motionProvider: MotionProvider = Capacitor.isNativePlatform() ? nativeMotionProvider : noMotionProvider
