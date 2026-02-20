const BASE = '/api'
async function req(path: string, opts: RequestInit & { timeoutMs?: number } = {}): Promise<unknown> {
  const token = localStorage.getItem('auth_token')
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) }
  if (token) headers.Authorization = `Bearer ${token}`
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), opts.timeoutMs ?? 15000)
  try { const r = await fetch(`${BASE}${path}`, { ...opts, headers, signal: ac.signal }); if (!r.ok) { const b = await r.json().catch(() => ({})) as Record<string, unknown>; throw Object.assign(new Error((b.error as string) || `Error ${r.status}`), { status: r.status }) }; return r.json() } finally { clearTimeout(t) }
}
const api = { get: (p: string) => req(p), post: (p: string, d: unknown) => req(p, { method: 'POST', body: JSON.stringify(d) }), patch: (p: string, d: unknown) => req(p, { method: 'PATCH', body: JSON.stringify(d) }), delete: (p: string) => req(p, { method: 'DELETE' }) }

// Plots
export const getPlots = (f: Record<string, string | number | undefined> = {}) => { const ps = new URLSearchParams(); Object.entries(f).forEach(([k, v]) => { if (v && v !== 'all') ps.set(k, String(v)) }); const q = ps.toString(); return api.get(`/plots${q ? `?${q}` : ''}`) }
export const getPlot = (id: string) => api.get(`/plots/${id}`)
export const getSimilarPlots = (id: string, limit = 4) => api.get(`/plots/${id}/similar?limit=${limit}`)
export const getPlotsBatch = (ids: string[]) => ids.length ? api.get(`/plots/batch?ids=${ids.join(',')}`) : Promise.resolve([])
export const trackView = (id: string) => api.post(`/plots/${id}/view`, {}).catch(() => {})
// Leads
export const createLead = (d: { plot_id: string; name: string; phone: string; email?: string }) => api.post('/leads', d)
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
