/**
 * Sceglie a caso un elemento non ancora visto; quando sono stati visti tutti ricomincia,
 * evitando di ripetere subito l'ultimo mostrato (l'ultimo di `seen`).
 */
export function pickUnseen<T>(
  items: T[],
  keyOf: (item: T) => string,
  seen: string[],
  random: () => number = Math.random,
): T {
  let pool = items.filter((i) => !seen.includes(keyOf(i)))
  if (!pool.length) {
    const last = seen[seen.length - 1]
    pool = items.length > 1 ? items.filter((i) => keyOf(i) !== last) : items
  }
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}

/** Aggiorna l'elenco dei visti: se li ha visti tutti, riparte da capo con solo `key`. */
export function markSeen<T>(items: T[], keyOf: (item: T) => string, seen: string[], key: string): string[] {
  if (items.every((i) => seen.includes(keyOf(i)))) return [key]
  return seen.includes(key) ? seen : [...seen, key]
}
