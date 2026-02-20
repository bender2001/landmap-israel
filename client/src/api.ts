const BASE = '/api'

async function request(path: string, options: RequestInit & { timeoutMs?: number } = {}): Promise<unknown> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) }
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000)

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, headers, signal: controller.signal })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>
      throw Object.assign(new Error((body.error as string) || `Request failed (${res.status})`), { status: res.status })
    }
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

const api = {
  get: (path: string) => request(path),
  post: (path: string, data: unknown) => request(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: (path: string, data: unknown) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string) => request(path, { method: 'DELETE' }),
}

// ── Plots ──
export const getPlots = (filters: Record<string, string | number | undefined> = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all') params.set(k, String(v)) })
  const qs = params.toString()
  return api.get(`/plots${qs ? `?${qs}` : ''}`)
}
export const getPlot = (id: string) => api.get(`/plots/${id}`)
export const getNearbyPlots = (id: string, limit = 4) => api.get(`/plots/${id}/nearby?limit=${limit}`)
export const getSimilarPlots = (id: string, limit = 4) => api.get(`/plots/${id}/similar?limit=${limit}`)
export const trackView = (id: string) => api.post(`/plots/${id}/view`, {}).catch(() => {})
export const getPopularPlots = (limit = 6) => api.get(`/plots/popular?limit=${limit}`)
export const getPlotsBatch = (ids: string[]) => ids.length ? api.get(`/plots/batch?ids=${ids.join(',')}`) : Promise.resolve([])

// ── Leads ──
export const createLead = (data: { plot_id: string; name: string; phone: string; email?: string; message?: string }) =>
  api.post('/leads', data)
export const getLeads = (filters?: Record<string, string>) => {
  const params = new URLSearchParams(filters)
  return api.get(`/leads?${params}`)
}
export const getLead = (id: string) => api.get(`/leads/${id}`)
export const updateLeadStatus = (id: string, status: string) => api.patch(`/leads/${id}`, { status })

// ── Market ──
export const getMarketOverview = () => api.get('/market/overview')
export const getAreaAverages = (city: string) => api.get(`/market/area-averages?city=${encodeURIComponent(city)}`)

// ── POIs ──
export const getPois = () => api.get('/pois')

// ── Auth ──
export const login = (email: string, password: string) => api.post('/auth/login', { email, password })
export const getMe = () => api.get('/auth/me')

// ── Admin ──
export const adminGetPlots = () => api.get('/admin/plots')
export const adminCreatePlot = (data: unknown) => api.post('/admin/plots', data)
export const adminUpdatePlot = (id: string, data: unknown) => api.patch(`/admin/plots/${id}`, data)
export const adminDeletePlot = (id: string) => api.delete(`/admin/plots/${id}`)
export const adminGetLeads = () => api.get('/admin/leads')
export const adminGetStats = () => api.get('/admin/stats')
