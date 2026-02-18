// LandMap Israel — Service Worker v4
// Cache-first for static assets, Network-first with timeout for API,
// stale-while-revalidate for navigations, dedicated tile caching for maps.
const CACHE_NAME = 'landmap-v4'
const TILE_CACHE_NAME = 'landmap-tiles-v1'
const STATIC_ASSETS = ['/', '/manifest.json']
const API_TIMEOUT_MS = 4000
const TILE_CACHE_MAX_ENTRIES = 600 // ~60MB at ~100KB/tile avg — enough for full Israel coverage

// Tile server hostnames — match all major providers used by Leaflet layers
const TILE_HOSTS = [
  'tile.openstreetmap.org',     // OSM
  'basemaps.cartocdn.com',      // CartoDB Dark/Light
  'server.arcgisonline.com',    // Esri Satellite/Topo
  'mt0.google.com',             // Google Maps tiles (if used)
  'mt1.google.com',
  'tiles.stadiamaps.com',       // Stadia
  'tile.thunderforest.com',     // Thunderforest
]

function isTileRequest(url) {
  return TILE_HOSTS.some(host => url.hostname.endsWith(host))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== TILE_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Fetch with timeout helper
function fetchWithTimeout(request, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(request, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

/**
 * Trim the tile cache to TILE_CACHE_MAX_ENTRIES using FIFO eviction.
 * Map tiles are numerous but individually small (~100KB PNG). Without this cap,
 * heavy map usage (scrolling across Israel) could consume hundreds of MB.
 * Runs asynchronously — never blocks a fetch response.
 */
async function trimTileCache() {
  try {
    const cache = await caches.open(TILE_CACHE_NAME)
    const keys = await cache.keys()
    if (keys.length > TILE_CACHE_MAX_ENTRIES) {
      // Delete oldest entries (FIFO — first cached, first evicted)
      const excess = keys.length - TILE_CACHE_MAX_ENTRIES
      await Promise.all(keys.slice(0, excess).map(k => cache.delete(k)))
    }
  } catch {
    // Cache API errors are non-fatal — worst case we just re-fetch tiles
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return

  // ── Map tile requests: cache-first with background revalidation ──────
  // Map tiles are the #1 bandwidth cost in a Leaflet app (~100KB each, 50-200 per session).
  // Tile content at a given z/x/y rarely changes (OSM updates weekly, satellite monthly).
  // Cache-first strategy: serve cached tile instantly (0ms), fetch fresh copy in background.
  // This makes panning/zooming feel instant on repeat visits — matching native app UX.
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        // Always fetch in background to keep tiles fresh
        const networkPromise = fetch(request).then((response) => {
          if (response.ok) {
            cache.put(request, response.clone())
            // Trim cache periodically (non-blocking)
            trimTileCache()
          }
          return response
        }).catch(() => null)

        // Return cached immediately, or wait for network if no cache
        if (cached) return cached
        const networkResponse = await networkPromise
        return networkResponse || new Response('', { status: 504, statusText: 'Tile unavailable' })
      })
    )
    return
  }

  // Skip other cross-origin requests (fonts, CDN scripts, etc.)
  if (url.origin !== self.location.origin) return

  // API calls: network-first with timeout, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetchWithTimeout(request, API_TIMEOUT_MS)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response(
          JSON.stringify({ error: 'offline', message: 'אין חיבור לאינטרנט' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )))
    )
    return
  }

  // Navigation requests: network-first with cache fallback (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, 5000)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('/', clone))
          return response
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // Static assets: stale-while-revalidate for hashed assets, cache-first for others
  const isHashed = /\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname)
  if (isHashed) {
    // Hashed assets never change — cache forever
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }))
    )
    return
  }

  // Other static: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((response) => {
        if (response.ok && url.pathname.match(/\.(js|css|png|jpg|svg|woff2?|ico)$/)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})

// Listen for skip-waiting message from client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
