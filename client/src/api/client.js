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

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const error = new Error(body.error || `Request failed (${res.status})`)
        error.status = res.status
        error.details = body.details

        // Retry on transient server errors (GET only)
        if (RETRY_STATUS_CODES.has(res.status) && (!options.method || options.method === 'GET') && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
          await sleep(delay)
          lastError = error
          continue
        }
        throw error
      }

      clearTimeout_()

      if (res.headers.get('content-type')?.includes('text/csv')) {
        return res.text()
      }

      return res.json()
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
