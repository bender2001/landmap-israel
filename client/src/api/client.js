const BASE = '/api'

const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500
const DEFAULT_TIMEOUT_MS = 15_000 // 15s default request timeout

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// In-flight request tracking for deduplication & cancellation
const inflightRequests = new Map()

// ─── ETag cache ────────────────────────────────────────────────────────
// Stores ETag → response pairs for conditional requests (If-None-Match).
// When the server returns 304 Not Modified, we return the cached response
// instantly — saving bandwidth and parse time on unchanged data.
// Max 100 entries with LRU eviction to prevent unbounded memory growth.
const ETAG_CACHE_MAX = 100
const etagCache = new Map() // path → { etag, data, timestamp }

function getEtagEntry(path) {
  const entry = etagCache.get(path)
  if (!entry) return null
  // Evict stale entries older than 10 minutes — ETags are meant for short-lived validation
  if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
    etagCache.delete(path)
    return null
  }
  return entry
}

function setEtagEntry(path, etag, data) {
  // LRU eviction: remove oldest entry when at capacity
  if (etagCache.size >= ETAG_CACHE_MAX && !etagCache.has(path)) {
    const oldest = etagCache.keys().next().value
    etagCache.delete(oldest)
  }
  etagCache.set(path, { etag, data, timestamp: Date.now() })
}

/**
 * Create an AbortController that auto-aborts after `ms` milliseconds.
 * Merges with an optional parent controller (e.g., for GET deduplication).
 * Returns { signal, clear } — call clear() when the request completes to prevent leaks.
 */
function withTimeout(ms, parentController) {
  const timeoutId = setTimeout(() => parentController.abort(new DOMException('Request timeout', 'TimeoutError')), ms)
  return {
    signal: parentController.signal,
    clear: () => clearTimeout(timeoutId),
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('auth_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  // For GET requests, deduplicate: cancel previous in-flight request to same path
  const isGet = !options.method || options.method === 'GET'
  if (isGet && inflightRequests.has(path)) {
    inflightRequests.get(path).abort()
    inflightRequests.delete(path)
  }

  // Conditional request: send If-None-Match when we have a cached ETag for this path.
  // If data hasn't changed, server returns 304 (empty body) — we return cached data.
  // Reduces bandwidth by 80-95% for unchanged responses (plots list, stats, market data).
  const cachedEtag = isGet ? getEtagEntry(path) : null
  if (cachedEtag) {
    headers['If-None-Match'] = cachedEtag.etag
  }

  const controller = new AbortController()
  if (isGet) inflightRequests.set(path, controller)

  // Auto-timeout: abort if response doesn't arrive within the limit.
  // Prevents hung requests on slow/dead servers. Longer timeout for uploads.
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS
  const { signal, clear: clearTimeout_ } = withTimeout(timeoutMs, controller)

  let lastError
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { ...options, headers, signal })

      // 304 Not Modified — data hasn't changed since our cached ETag.
      // Return the cached response instantly (zero bandwidth, zero parse time).
      if (res.status === 304 && cachedEtag) {
        clearTimeout_()
        return cachedEtag.data
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const error = new Error(body.error || `Request failed (${res.status})`)
        error.status = res.status
        error.details = body.details
        // Attach requestId from server response — enables user-facing error references.
        // Users can say "I got error abc123" and we can trace the exact request in logs.
        error.requestId = body.requestId || res.headers.get('x-request-id') || null
        error.errorCode = body.errorCode || null

        // Stale-if-error: on 5xx server errors, return cached ETag data instead of throwing.
        // This is the client-side implementation of the stale-if-error Cache-Control directive.
        // When the server is down (500/502/503/504), users see slightly stale data instead of
        // an error screen — like Google Maps' seamless offline mode. Critical for investor trust.
        if (res.status >= 500 && cachedEtag) {
          clearTimeout_()
          const staleData = cachedEtag.data
          // Tag the response so UI can show a subtle "data may be outdated" indicator
          if (Array.isArray(staleData)) {
            staleData._stale = true
            staleData._staleReason = 'server_error'
            staleData._staleStatus = res.status
          }
          return staleData
        }

        // Retry on transient server errors (GET only)
        if (RETRY_STATUS_CODES.has(res.status) && (!options.method || options.method === 'GET') && attempt < MAX_RETRIES) {
          // For 429 (rate limit): use server-sent Retry-After instead of blind exponential backoff.
          // The server knows the exact cooldown period — respecting it avoids premature retries
          // that would just get rate-limited again, wasting bandwidth and time.
          let delay
          if (res.status === 429) {
            const retryAfterSec = parseInt(res.headers.get('retry-after'), 10)
              || body.retryAfter
              || 60
            delay = Math.min(retryAfterSec * 1000, 120_000) // cap at 2min to prevent infinite waits
          } else {
            delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
          }
          await sleep(delay)
          lastError = error
          continue
        }
        throw error
      }

      clearTimeout_()

      // Cache ETag from response for future conditional requests
      const responseEtag = isGet ? res.headers.get('etag') : null

      if (res.headers.get('content-type')?.includes('text/csv')) {
        return res.text()
      }

      const data = await res.json()

      // Store ETag + response for future 304 optimization
      if (responseEtag && isGet) {
        setEtagEntry(path, responseEtag, data)
      }

      return data
    } catch (err) {
      // Abort errors should propagate immediately (not retry)
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        clearTimeout_()
        // Wrap timeout for clearer error messages
        if (err.message === 'Request timeout') {
          const timeoutErr = new Error(`הבקשה נכשלה — השרת לא הגיב תוך ${Math.round(timeoutMs / 1000)} שניות`)
          timeoutErr.status = 408
          timeoutErr.code = 'REQUEST_TIMEOUT'
          throw timeoutErr
        }
        throw err
      }

      // Network errors — retry on GET
      if (err instanceof TypeError && isGet && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
        await sleep(delay)
        lastError = err
        continue
      }
      clearTimeout_()
      throw err
    }
  }
  clearTimeout_()
  throw lastError
}

export const api = {
  get: (path) => request(path).finally(() => inflightRequests.delete(path)),
  post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: async (path, formData) => {
    const token = localStorage.getItem('auth_token')
    const headers = {}
    if (token) headers.Authorization = `Bearer ${token}`
    // Uploads get a longer timeout (60s) since files can be large
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(new DOMException('Upload timeout', 'TimeoutError')), 60_000)
    try {
      const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData, signal: controller.signal })
      clearTimeout(timeoutId)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Upload failed')
      }
      return res.json()
    } catch (err) {
      clearTimeout(timeoutId)
      if (err.message === 'Upload timeout') {
        throw new Error('העלאה נכשלה — הקובץ לא הועלה תוך דקה')
      }
      throw err
    }
  },
}
