const BASE = '/api'

const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const MAX_RETRIES = 3
const BASE_DELAY_MS = 500
const DEFAULT_TIMEOUT_MS = 15_000

interface EtagEntry<T = unknown> {
  etag: string
  data: T
  timestamp: number
}

interface ApiError extends Error {
  status?: number
  details?: unknown
  requestId?: string | null
  errorCode?: string | null
  code?: string
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number
}

interface StaleArray<T> extends Array<T> {
  _stale?: boolean
  _staleReason?: string
  _staleStatus?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const inflightRequests = new Map<string, AbortController>()

const ETAG_CACHE_MAX = 100
const etagCache = new Map<string, EtagEntry>()

function getEtagEntry(path: string): EtagEntry | null {
  const entry = etagCache.get(path)
  if (!entry) return null
  if (Date.now() - entry.timestamp > 10 * 60 * 1000) {
    etagCache.delete(path)
    return null
  }
  return entry
}

function setEtagEntry(path: string, etag: string, data: unknown): void {
  if (etagCache.size >= ETAG_CACHE_MAX && !etagCache.has(path)) {
    const oldest = etagCache.keys().next().value
    if (oldest) etagCache.delete(oldest)
  }
  etagCache.set(path, { etag, data, timestamp: Date.now() })
}

function withTimeout(ms: number, parentController: AbortController): { signal: AbortSignal; clear: () => void } {
  const timeoutId = setTimeout(() => parentController.abort(new DOMException('Request timeout', 'TimeoutError')), ms)
  return {
    signal: parentController.signal,
    clear: () => clearTimeout(timeoutId),
  }
}

async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) }
  if (token) headers.Authorization = `Bearer ${token}`

  const isGet = !options.method || options.method === 'GET'
  if (isGet && inflightRequests.has(path)) {
    inflightRequests.get(path)!.abort()
    inflightRequests.delete(path)
  }

  const cachedEtag = isGet ? getEtagEntry(path) : null
  if (cachedEtag) {
    headers['If-None-Match'] = cachedEtag.etag
  }

  const controller = new AbortController()
  if (isGet) inflightRequests.set(path, controller)

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const { signal, clear: clearTimeout_ } = withTimeout(timeoutMs, controller)

  let lastError: ApiError | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, { ...options, headers, signal })

      if (res.status === 304 && cachedEtag) {
        clearTimeout_()
        return cachedEtag.data
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>
        const error: ApiError = new Error((body.error as string) || `Request failed (${res.status})`)
        error.status = res.status
        error.details = body.details
        error.requestId = (body.requestId as string) || res.headers.get('x-request-id') || null
        error.errorCode = (body.errorCode as string) || null

        if (res.status >= 500 && cachedEtag) {
          clearTimeout_()
          const staleData = cachedEtag.data as StaleArray<unknown>
          if (Array.isArray(staleData)) {
            staleData._stale = true
            staleData._staleReason = 'server_error'
            staleData._staleStatus = res.status
          }
          return staleData
        }

        if (RETRY_STATUS_CODES.has(res.status) && (!options.method || options.method === 'GET') && attempt < MAX_RETRIES) {
          let delay: number
          if (res.status === 429) {
            const retryAfterSec = parseInt(res.headers.get('retry-after') ?? '', 10)
              || (body.retryAfter as number)
              || 60
            delay = Math.min(retryAfterSec * 1000, 120_000)
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

      const responseEtag = isGet ? res.headers.get('etag') : null

      if (res.headers.get('content-type')?.includes('text/csv')) {
        return res.text()
      }

      const data: unknown = await res.json()

      if (responseEtag && isGet) {
        setEtagEntry(path, responseEtag, data)
      }

      return data
    } catch (err) {
      const error = err as ApiError
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        clearTimeout_()
        if (error.message === 'Request timeout') {
          const timeoutErr: ApiError = new Error(`הבקשה נכשלה — השרת לא הגיב תוך ${Math.round(timeoutMs / 1000)} שניות`)
          timeoutErr.status = 408
          timeoutErr.code = 'REQUEST_TIMEOUT'
          throw timeoutErr
        }
        throw error
      }

      if (err instanceof TypeError && isGet && attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 200
        await sleep(delay)
        lastError = error
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
  get: (path: string): Promise<unknown> => request(path).finally(() => inflightRequests.delete(path)),
  post: (path: string, data: unknown): Promise<unknown> => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path: string, data: unknown): Promise<unknown> => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string): Promise<unknown> => request(path, { method: 'DELETE' }),
  upload: async (path: string, formData: FormData): Promise<unknown> => {
    const token = localStorage.getItem('auth_token')
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(new DOMException('Upload timeout', 'TimeoutError')), 60_000)
    try {
      const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: formData, signal: controller.signal })
      clearTimeout(timeoutId)
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>
        throw new Error((body.error as string) || 'Upload failed')
      }
      return res.json()
    } catch (err) {
      clearTimeout(timeoutId)
      const error = err as Error
      if (error.message === 'Upload timeout') {
        throw new Error('העלאה נכשלה — הקובץ לא הועלה תוך דקה')
      }
      throw err
    }
  },
}
