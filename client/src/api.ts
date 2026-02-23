const BASE = '/api'

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
  throw lastError || new Error('Request failed after retries')
}

async function req(path: string, opts: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<unknown> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) }
  if (token) headers.Authorization = `Bearer ${token}`
  const { timeoutMs, retries, ...fetchOpts } = opts
  const isGet = !opts.method || opts.method === 'GET'
  const r = await fetchWithRetry(
    `${BASE}${path}`,
    { ...fetchOpts, headers },
    { timeoutMs: timeoutMs ?? 15000, maxRetries: retries ?? (isGet ? 2 : 0) }
  )
  if (!r.ok) {
    const b = await r.json().catch(() => ({})) as Record<string, unknown>
    throw Object.assign(new Error((b.error as string) || `Error ${r.status}`), { status: r.status })
  }
  return r.json()
}
const api = { get: (p: string) => req(p), post: (p: string, d: unknown) => req(p, { method: 'POST', body: JSON.stringify(d) }), patch: (p: string, d: unknown) => req(p, { method: 'PATCH', body: JSON.stringify(d) }), delete: (p: string) => req(p, { method: 'DELETE' }) }

// Plots
export const getPlots = (f: Record<string, string | number | undefined> = {}) => { const ps = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => { if (v && v !== 'all') ps.set(k, String(v)) }); const q = ps.toString(); return api.get(`/plots${q ? `?${q}` : ''}`) }
export const getPlot = (id: string) => api.get(`/plots/${id}`)
export const getSimilarPlots = (id: string, limit = 4) => api.get(`/plots/${id}/similar?limit=${limit}`)
export const getPlotsBatch = (ids: string[]) => ids.length ? api.get(`/plots/batch?ids=${ids.join(',')}`) : Promise.resolve([])
export const trackView = (id: string) => api.post(`/plots/${id}/view`, {}).catch(() => {})
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
