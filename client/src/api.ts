const BASE = '/api'

// ── ETag cache for conditional GET requests ──────────────────────────
// Stores { etag, data } per URL so subsequent GETs can send If-None-Match.
// On 304 Not Modified, the cached data is returned instantly without re-parsing.
// This can reduce bandwidth by 60-90% when data hasn't changed.
const etagCache = new Map<string, { etag: string; data: unknown }>()
const ETAG_CACHE_MAX = 100

function pruneEtagCache() {
  if (etagCache.size > ETAG_CACHE_MAX) {
    // Remove oldest half of entries (FIFO)
    const keys = [...etagCache.keys()]
    for (let i = 0; i < keys.length / 2; i++) etagCache.delete(keys[i])
  }
}

/** User-friendly Hebrew error messages for common HTTP status codes */
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'בקשה לא תקינה — נסו שוב',
  401: 'נדרשת התחברות מחדש',
  403: 'אין הרשאה לפעולה זו',
  404: 'המשאב המבוקש לא נמצא',
  408: 'הבקשה ארכה יותר מדי זמן — נסו שוב',
  429: 'יותר מדי בקשות — נסו שוב בעוד כמה שניות',
  500: 'שגיאת שרת — הצוות שלנו מטפל',
  502: 'שגיאת תקשורת עם השרת',
  503: 'השרת אינו זמין כרגע — נסו שוב מאוחר יותר',
  504: 'תם הזמן לתגובת השרת — נסו שוב',
}

/**
 * Smart retry with exponential backoff.
 * Retries on network errors and 5xx status codes (server transient failures).
 * Never retries 4xx (client errors — bad request, auth, not found).
 * Uses jittered exponential backoff to avoid thundering herd.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { maxRetries = 2, baseDelay = 500, timeoutMs = 15000 }: { maxRetries?: number; baseDelay?: number; timeoutMs?: number } = {}
): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: ac.signal })
      clearTimeout(timer)
      // Don't retry client errors (4xx) — they won't succeed on retry
      if (res.ok || (res.status >= 400 && res.status < 500)) return res
      // Server error (5xx) — retry with backoff
      if (attempt < maxRetries) {
        const jitter = Math.random() * 200
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt) + jitter))
        continue
      }
      return res // final attempt — return as-is
    } catch (err) {
      clearTimeout(timer)
      lastError = err as Error
      if (attempt < maxRetries && !ac.signal.aborted) {
        // Network error — retry
        const jitter = Math.random() * 200
        await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, attempt) + jitter))
        continue
      }
      if (attempt < maxRetries && (err as Error).name === 'AbortError') {
        // Timeout — retry with slightly longer timeout
        timeoutMs = Math.min(timeoutMs * 1.5, 30000)
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('הבקשה נכשלה לאחר מספר ניסיונות — בדקו את חיבור האינטרנט')
}

async function req(path: string, opts: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<unknown> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) }
  if (token) headers.Authorization = `Bearer ${token}`
  const { timeoutMs, retries, ...fetchOpts } = opts
  const isGet = !opts.method || opts.method === 'GET'
  const fullUrl = `${BASE}${path}`

  // Attach If-None-Match for GET requests when we have a cached ETag
  if (isGet) {
    const cached = etagCache.get(fullUrl)
    if (cached?.etag) headers['If-None-Match'] = cached.etag
  }

  const r = await fetchWithRetry(
    fullUrl,
    { ...fetchOpts, headers },
    { timeoutMs: timeoutMs ?? 15000, maxRetries: retries ?? (isGet ? 2 : 0) }
  )

  // 304 Not Modified — return cached data without parsing response body
  if (r.status === 304 && isGet) {
    const cached = etagCache.get(fullUrl)
    if (cached?.data) return cached.data
  }

  if (!r.ok) {
    const b = await r.json().catch(() => ({})) as Record<string, unknown>
    const serverMsg = b.error as string | undefined
    const hebrewMsg = HTTP_ERROR_MESSAGES[r.status]
    const message = serverMsg || hebrewMsg || `שגיאה ${r.status}`
    throw Object.assign(new Error(message), { status: r.status, serverError: serverMsg, hebrewMessage: hebrewMsg })
  }

  const data = await r.json()

  // Cache the ETag + data for future conditional requests
  if (isGet) {
    const etag = r.headers.get('etag')
    if (etag) {
      pruneEtagCache()
      etagCache.set(fullUrl, { etag, data })
    }
  }

  return data
}
const api = { get: (p: string) => req(p), post: (p: string, d: unknown) => req(p, { method: 'POST', body: JSON.stringify(d) }), patch: (p: string, d: unknown) => req(p, { method: 'PATCH', body: JSON.stringify(d) }), delete: (p: string) => req(p, { method: 'DELETE' }) }

// Plots
export const getPlots = (f: Record<string, string | number | undefined> = {}) => { const ps = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => { if (v && v !== 'all') ps.set(k, String(v)) }); const q = ps.toString(); return api.get(`/plots${q ? `?${q}` : ''}`) }
export const getPlot = (id: string) => api.get(`/plots/${id}`)
export const getSimilarPlots = (id: string, limit = 4) => api.get(`/plots/${id}/similar?limit=${limit}`)
export const getPlotsBatch = (ids: string[]) => ids.length ? api.get(`/plots/batch?ids=${ids.join(',')}`) : Promise.resolve([])
export const trackView = (id: string) => api.post(`/plots/${id}/view`, {}).catch(() => {})
export const getFeaturedPlots = (limit = 3) => api.get(`/plots/featured?limit=${limit}`)
export const getPlotStats = () => api.get('/plots/stats')
export const getPopularPlots = (limit = 6, days = 30) => api.get(`/plots/popular?limit=${limit}&days=${days}`)
export const getTrendingSearches = (limit = 5) => api.get(`/plots/trending-searches?limit=${limit}`)
export const getRecommendations = (favoriteIds: string[], limit = 6) =>
  favoriteIds.length > 0 ? api.get(`/plots/recommendations?favorites=${favoriteIds.join(',')}&limit=${limit}`) : Promise.resolve([])
// Leads
export const createLead = (d: { plot_id?: string; name: string; phone: string; email: string; message?: string }) => api.post('/leads', d)
export const getLeads = (f?: Record<string, string>) => { const ps = new URLSearchParams(f); return api.get(`/leads?${ps}`) }
export const updateLeadStatus = (id: string, status: string) => api.patch(`/leads/${id}`, { status })
// Market
export const getMarketOverview = () => api.get('/market/overview')
// POIs
export const getPois = () => api.get('/pois')
// Auth
export const login = (email: string, password: string) => api.post('/auth/login', { email, password })
export const register = (email: string, password: string, name: string, role: string) => api.post('/auth/register', { email, password, name, role })
export const getMe = () => api.get('/auth/me')
// Admin
export const adminGetStats = () => api.get('/admin/stats')
export const adminGetUsers = () => api.get('/admin/users')
export const adminUpdateUser = (id: string, d: unknown) => api.patch(`/admin/users/${id}`, d)
export const adminDeletePlot = (id: string) => api.delete(`/admin/plots/${id}`)
