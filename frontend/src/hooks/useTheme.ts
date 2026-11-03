import { useEffect, useState } from 'react'
import { storage, STORAGE_KEYS } from '../services/storage'

export type Theme = 'light' | 'dark'

const initialTheme = (): Theme =>
  storage.get<Theme>(STORAGE_KEYS.theme) ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () =>
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      storage.set(STORAGE_KEYS.theme, next)
      return next
    })

  return { theme, toggle }
}
