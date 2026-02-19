import { api } from './client'
import type { Plot } from '../types'

export interface AdminListParams {
  page?: number
  limit?: number
  search?: string
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface AdminLeadListParams extends AdminListParams {
  status?: string
}

export interface AdminActivityParams {
  entity_type?: string
  page?: number
  limit?: number
}

export interface AdminPlotData extends Partial<Plot> {
  [key: string]: unknown
}

export interface AdminLeadStatusUpdate {
  status: string
  notes?: string
}

export interface AdminSettingsData {
  [key: string]: unknown
}

export interface AdminPoiData {
  name: string
  type: string
  lat: number
  lng: number
  [key: string]: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export const adminPlots = {
  list: (params: AdminListParams = {}): Promise<PaginatedResponse<Plot>> => {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.search) qs.set('search', params.search)
    if (params.sort_by) qs.set('sort_by', params.sort_by)
    if (params.sort_dir) qs.set('sort_dir', params.sort_dir)
    const str = qs.toString()
    return api.get(`/admin/plots${str ? `?${str}` : ''}`) as Promise<PaginatedResponse<Plot>>
  },
  get: (id: string): Promise<Plot> => api.get(`/admin/plots/${id}`) as Promise<Plot>,
  create: (data: AdminPlotData): Promise<Plot> => api.post('/admin/plots', data) as Promise<Plot>,
  update: (id: string, data: AdminPlotData): Promise<Plot> => api.patch(`/admin/plots/${id}`, data) as Promise<Plot>,
  delete: (id: string): Promise<void> => api.delete(`/admin/plots/${id}`) as Promise<void>,
  togglePublish: (id: string, published: boolean): Promise<Plot> =>
    api.patch(`/admin/plots/${id}/publish`, { is_published: published }) as Promise<Plot>,
  bulkDelete: (ids: string[]): Promise<void> => api.post('/admin/plots/bulk-delete', { ids }) as Promise<void>,
  bulkPublish: (ids: string[], published: boolean): Promise<void> =>
    api.post('/admin/plots/bulk-publish', { ids, is_published: published }) as Promise<void>,
}

export const adminLeads = {
  list: (params: AdminLeadListParams = {}): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.search) qs.set('search', params.search)
    if (params.sort_by) qs.set('sort_by', params.sort_by)
    if (params.sort_dir) qs.set('sort_dir', params.sort_dir)
    const str = qs.toString()
    return api.get(`/admin/leads${str ? `?${str}` : ''}`) as Promise<PaginatedResponse<Record<string, unknown>>>
  },
  get: (id: string): Promise<Record<string, unknown>> => api.get(`/admin/leads/${id}`) as Promise<Record<string, unknown>>,
  updateStatus: (id: string, status: string, notes?: string): Promise<Record<string, unknown>> =>
    api.patch(`/admin/leads/${id}/status`, { status, notes }) as Promise<Record<string, unknown>>,
  export: (): Promise<string> => api.get('/admin/leads/export') as Promise<string>,
  bulkUpdateStatus: (ids: string[], status: string): Promise<void> =>
    api.post('/admin/leads/bulk-status', { ids, status }) as Promise<void>,
}

export const adminDashboard = {
  stats: (): Promise<Record<string, unknown>> => api.get('/admin/dashboard') as Promise<Record<string, unknown>>,
}

export const adminDocuments = {
  upload: (plotId: string, file: File, name?: string): Promise<Record<string, unknown>> => {
    const fd = new FormData()
    fd.append('file', file)
    if (name) fd.append('name', name)
    return api.upload(`/admin/documents/${plotId}`, fd) as Promise<Record<string, unknown>>
  },
  delete: (id: string): Promise<void> => api.delete(`/admin/documents/${id}`) as Promise<void>,
}

export const adminImages = {
  upload: (plotId: string, file: File, alt?: string, sortOrder?: number): Promise<Record<string, unknown>> => {
    const fd = new FormData()
    fd.append('image', file)
    if (alt) fd.append('alt', alt)
    if (sortOrder != null) fd.append('sort_order', String(sortOrder))
    return api.upload(`/admin/images/${plotId}`, fd) as Promise<Record<string, unknown>>
  },
  delete: (id: string): Promise<void> => api.delete(`/admin/images/${id}`) as Promise<void>,
}

export const adminPois = {
  list: (): Promise<AdminPoiData[]> => api.get('/admin/pois') as Promise<AdminPoiData[]>,
  get: (id: string): Promise<AdminPoiData> => api.get(`/admin/pois/${id}`) as Promise<AdminPoiData>,
  create: (data: AdminPoiData): Promise<AdminPoiData> => api.post('/admin/pois', data) as Promise<AdminPoiData>,
  update: (id: string, data: Partial<AdminPoiData>): Promise<AdminPoiData> =>
    api.patch(`/admin/pois/${id}`, data) as Promise<AdminPoiData>,
  delete: (id: string): Promise<void> => api.delete(`/admin/pois/${id}`) as Promise<void>,
}

export const adminActivity = {
  list: (params: AdminActivityParams = {}): Promise<PaginatedResponse<Record<string, unknown>>> => {
    const qs = new URLSearchParams()
    if (params.entity_type) qs.set('entity_type', params.entity_type)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    const str = qs.toString()
    return api.get(`/admin/activity${str ? `?${str}` : ''}`) as Promise<PaginatedResponse<Record<string, unknown>>>
  },
}

export const adminSettings = {
  get: (): Promise<AdminSettingsData> => api.get('/admin/settings') as Promise<AdminSettingsData>,
  update: (data: AdminSettingsData): Promise<AdminSettingsData> =>
    api.patch('/admin/settings', data) as Promise<AdminSettingsData>,
}
