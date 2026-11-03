type FetchFn = typeof fetch

export interface RetryOptions {
  retries?: number
  baseDelayMs?: number
  maxDelayMs?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const isRetryable = (status: number) => status === 429 || status >= 500

function retryDelayMs(res: Response | null, attempt: number, baseMs: number, maxMs: number): number {
  const retryAfterSec = Number(res?.headers.get('Retry-After'))
  const delay = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : baseMs * 2 ** attempt
  return Math.min(delay, maxMs)
}

/** Ritenta su 429, 5xx ed errori di rete con attesa esponenziale (o `Retry-After`); restituisce l'ultima risposta. */
export async function fetchWithRetry(
  url: string,
  fetchFn: FetchFn = fetch,
  { retries = 3, baseDelayMs = 500, maxDelayMs = 10_000, sleep = defaultSleep }: RetryOptions = {},
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null
    try {
      res = await fetchFn(url)
    } catch (e) {
      if (attempt >= retries) throw e
    }
    if (res && (!isRetryable(res.status) || attempt >= retries)) return res
    await sleep(retryDelayMs(res, attempt, baseDelayMs, maxDelayMs))
  }
}
