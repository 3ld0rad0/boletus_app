/// <reference types="vite/client" />

/** Versione di package.json, iniettata da Vite. */
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_THUNDERFOREST_API_KEY?: string
  readonly VITE_TILE_URL?: string
  readonly VITE_TILE_ATTRIBUTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
