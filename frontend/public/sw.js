// Service worker (solo web): l'app si apre senza rete. I tasselli di mappa e le altre cache dati
// sono gestiti dal codice dell'app, non qui.

const SHELL_CACHE = 'boletus-shell-v2'
const STATIC_PATHS = ['/favicon.svg', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  // Si elimina solo il proprio, comprese le versioni precedenti: le cache dati dell'app non vanno toccate.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('boletus-') && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') event.respondWith(navigationResponse(event))
  else if (url.pathname.startsWith('/assets/') || STATIC_PATHS.includes(url.pathname)) {
    event.respondWith(cacheFirst(event))
  }
})

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE)
  const res = await fetch('/', { cache: 'reload' })
  await cache.put('/', res.clone())
  const html = await res.text()
  const assets = [...html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map((m) => m[1]).filter((p) => !p.startsWith('//'))
  await cache.addAll([...new Set([...assets, ...STATIC_PATHS])])
}

async function navigationResponse(event) {
  try {
    const res = await fetch(event.request)
    if (res.ok) {
      const copy = res.clone()
      event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.put('/', copy)))
    }
    return res
  } catch {
    return (await caches.match('/')) ?? Response.error()
  }
}

async function cacheFirst(event) {
  const cache = await caches.open(SHELL_CACHE)
  const hit = await cache.match(event.request.url)
  if (hit) return hit
  const res = await fetch(event.request)
  if (res.ok) event.waitUntil(cache.put(event.request.url, res.clone()))
  return res
}
