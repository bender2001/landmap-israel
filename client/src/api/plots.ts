import { api } from './client'
import type { Plot } from '../types'

export interface PlotFilters {
  city?: string
  status?: string
  zoning_stage?: string
  min_price?: number
  max_price?: number
  min_size?: number
  max_size?: number
  [key: string]: string | number | undefined
}

export interface NearbyPoi {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  distance_km: number
}

export function getPlots(filters: PlotFilters = {}): Promise<Plot[]> {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== 'all') params.set(k, String(v))
  })
  const qs = params.toString()
  return api.get(`/plots${qs ? `?${qs}` : ''}`) as Promise<Plot[]>
}

export function getPlot(id: string): Promise<Plot> {
  return api.get(`/plots/${id}`) as Promise<Plot>
}

export function getNearbyPlots(id: string, limit = 5): Promise<Plot[]> {
  return api.get(`/plots/${id}/nearby?limit=${limit}`) as Promise<Plot[]>
}

export function getSimilarPlots(id: string, limit = 4): Promise<Plot[]> {
  return api.get(`/plots/${id}/similar?limit=${limit}`) as Promise<Plot[]>
}

export function trackPlotView(id: string): Promise<void> {
  return api.post(`/plots/${id}/view`, {}).catch(() => {}) as Promise<void>
}

export function getPopularPlots(limit = 6): Promise<Plot[]> {
  return api.get(`/plots/popular?limit=${limit}`) as Promise<Plot[]>
}

export function getFeaturedPlots(limit = 3): Promise<Plot[]> {
  return api.get(`/plots/featured?limit=${limit}`) as Promise<Plot[]>
}

export function getPlotsBatch(ids: string[]): Promise<Plot[]> {
  if (!ids || ids.length === 0) return Promise.resolve([])
  return api.get(`/plots/batch?ids=${ids.join(',')}`) as Promise<Plot[]>
}

export function getNearbyPois(plotId: string, maxKm = 3): Promise<NearbyPoi[]> {
  return api.get(`/plots/${plotId}/nearby-pois?maxKm=${maxKm}`) as Promise<NearbyPoi[]>
}

export function getTrendingSearches(limit = 5): Promise<string[]> {
  return api.get(`/plots/trending-searches?limit=${limit}`) as Promise<string[]>
}

export function getRecommendations(favoriteIds: string[], limit = 6): Promise<Plot[]> {
  if (!favoriteIds || favoriteIds.length === 0) return Promise.resolve([])
  return api.get(`/plots/recommendations?favorites=${favoriteIds.join(',')}&limit=${limit}`) as Promise<Plot[]>
}
