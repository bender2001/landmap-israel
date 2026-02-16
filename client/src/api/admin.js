import { api } from './client.js'

// ─── Plots ───
export const adminPlots = {
  list: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', params.page)
    if (params.limit) qs.set('limit', params.limit)
    if (params.search) qs.set('search', params.search)
    if (params.sort_by) qs.set('sort_by', params.sort_by)
    if (params.sort_dir) qs.set('sort_dir', params.sort_dir)
    const str = qs.toString()
    return api.get(`/admin/plots${str ? `?${str}` : ''}`)
  },
  get: (id) => api.get(`/admin/plots/${id}`),
  create: (data) => api.post('/admin/plots', data),
  update: (id, data) => api.patch(`/admin/plots/${id}`, data),
  delete: (id) => api.delete(`/admin/plots/${id}`),
  togglePublish: (id, published) => api.patch(`/admin/plots/${id}/publish`, { is_published: published }),
  bulkDelete: (ids) => api.post('/admin/plots/bulk-delete', { ids }),
  bulkPublish: (ids, published) => api.post('/admin/plots/bulk-publish', { ids, is_published: published }),
}

// ─── Leads ───
export const adminLeads = {
  list: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.page) qs.set('page', params.page)
    if (params.limit) qs.set('limit', params.limit)
    if (params.search) qs.set('search', params.search)
    if (params.sort_by) qs.set('sort_by', params.sort_by)
    if (params.sort_dir) qs.set('sort_dir', params.sort_dir)
    const str = qs.toString()
    return api.get(`/admin/leads${str ? `?${str}` : ''}`)
  },
  get: (id) => api.get(`/admin/leads/${id}`),
  updateStatus: (id, status, notes) => api.patch(`/admin/leads/${id}/status`, { status, notes }),
  export: () => api.get('/admin/leads/export'),
  bulkUpdateStatus: (ids, status) => api.post('/admin/leads/bulk-status', { ids, status }),
}

// ─── Dashboard ───
export const adminDashboard = {
  stats: () => api.get('/admin/dashboard'),
}

// ─── Documents ───
export const adminDocuments = {
  upload: (plotId, file, name) => {
    const fd = new FormData()
    fd.append('file', file)
    if (name) fd.append('name', name)
    return api.upload(`/admin/documents/${plotId}`, fd)
  },
  delete: (id) => api.delete(`/admin/documents/${id}`),
}

// ─── Images ───
export const adminImages = {
  upload: (plotId, file, alt, sortOrder) => {
    const fd = new FormData()
    fd.append('image', file)
    if (alt) fd.append('alt', alt)
    if (sortOrder != null) fd.append('sort_order', sortOrder)
    return api.upload(`/admin/images/${plotId}`, fd)
  },
  delete: (id) => api.delete(`/admin/images/${id}`),
}

// ─── POIs ───
export const adminPois = {
  list: () => api.get('/admin/pois'),
  get: (id) => api.get(`/admin/pois/${id}`),
  create: (data) => api.post('/admin/pois', data),
  update: (id, data) => api.patch(`/admin/pois/${id}`, data),
  delete: (id) => api.delete(`/admin/pois/${id}`),
}

// ─── Activity Log ───
export const adminActivity = {
  list: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.entity_type) qs.set('entity_type', params.entity_type)
    if (params.page) qs.set('page', params.page)
    if (params.limit) qs.set('limit', params.limit)
    const str = qs.toString()
    return api.get(`/admin/activity${str ? `?${str}` : ''}`)
  },
}

// ─── Settings ───
export const adminSettings = {
  get: () => api.get('/admin/settings'),
  update: (data) => api.patch('/admin/settings', data),
}
