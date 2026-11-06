interface ConnectionInfo {
  saveData?: boolean
  effectiveType?: string
}

/** Risparmio dati attivo o rete 2G: non conviene scaricare nulla che non serva subito. */
export function isConstrainedConnection(
  nav: { connection?: ConnectionInfo } = navigator as { connection?: ConnectionInfo },
): boolean {
  const c = nav.connection
  return !!c && (c.saveData === true || c.effectiveType === '2g' || c.effectiveType === 'slow-2g')
}

/** Origine del server dei tasselli (con il primo sottodominio), per aprire la connessione in anticipo. */
export function tileOrigin(template: string): string | null {
  try {
    return new URL(template.replace('{s}', 'a').replace(/\{[xyz]\}/g, '0')).origin
  } catch {
    return null
  }
}

export function preconnect(origin: string) {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = origin
  link.crossOrigin = ''
  document.head.appendChild(link)
}
