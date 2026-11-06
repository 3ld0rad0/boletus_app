/** Archivio chiave/valore locale; sostituibile (es. @capacitor/preferences) su mobile. */
export interface KeyValueStore {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  remove(key: string): void
}

export const localStore: KeyValueStore = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? null : (JSON.parse(raw) as T)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage pieno o disabilitato (es. navigazione privata): si continua senza persistenza.
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignorato, vedi sopra
    }
  },
}

export const storage: KeyValueStore = localStore

export const STORAGE_KEYS = {
  startPoint: 'boletus.startPoint',
  disclaimerAccepted: 'boletus.disclaimerAccepted',
  recentPlaces: 'boletus.recentPlaces',
  track: 'boletus.track',
  lastView: 'boletus.lastView',
} as const
