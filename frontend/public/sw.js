// Service worker: l'app si apre senza rete e le tessere di mappa già viste (o prescaricate) restano disponibili.
// Il modello di host delle tessere arriva dalla query (`?tiles=*.tile.example.org`).

const SHELL_CACHE = 'boletus-shell-v1'
const TILE_CACHE = 'boletus-tiles-v1'
const MAX_TILES = 1500
const STATIC_PATHS = ['/favicon.svg', '/manifest.webmanifest']

const tilePattern = new URL(self.location.href).searchParams.get('tiles') ?? ''
const escapeRegExp = (s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
const tileHost = tilePattern
  ? new RegExp('^' + tilePattern.split('*').map(escapeRegExp).join('[^.]+') + '$')
  : null

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (tileHost && tileHost.test(url.hostname)) {
    event.respondWith(tileResponse(event))
  } else if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') event.respondWith(navigationResponse(event))
    else if (url.pathname.startsWith('/assets/') || STATIC_PATHS.includes(url.pathname)) {
      event.respondWith(cacheFirst(event, SHELL_CACHE))
    }
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

async function cacheFirst(event, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(event.request.url)
  if (hit) return hit
  const res = await fetch(event.request)
  if (res.ok) event.waitUntil(cache.put(event.request.url, res.clone()))
  return res
}

async function tileResponse(event) {
  const url = event.request.url
  const cache = await caches.open(TILE_CACHE)
  const hit = await cache.match(url)
  if (hit) return hit
  try {
    // Richiesta CORS: la risposta non è opaca, quindi si può salvare senza gonfiare la quota.
    const res = await fetch(url, { mode: 'cors' })
    if (res.ok) event.waitUntil(cache.put(url, res.clone()).then(() => trimTiles(cache)))
    return res
  } catch {
    // Il server non ammette CORS (o manca la rete): si usa la richiesta originale, senza salvare.
    return fetch(event.request)
  }
}

async function trimTiles(cache) {
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_TILES)).map((k) => cache.delete(k)))
}
