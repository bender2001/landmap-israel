// LandMap Israel — Service Worker v3
// Cache-first for static assets, Network-first with timeout for API, stale-while-revalidate for navigations
const CACHE_NAME = 'landmap-v3'
const STATIC_ASSETS = ['/', '/manifest.json']
const API_TIMEOUT_MS = 4000

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
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

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, and chrome-extension requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

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
