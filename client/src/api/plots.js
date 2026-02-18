import { api } from './client.js'

export function getPlots(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v && v !== 'all') params.set(k, v)
  })
  const qs = params.toString()
  return api.get(`/plots${qs ? `?${qs}` : ''}`)
}

export function getPlot(id) {
  return api.get(`/plots/${id}`)
}

export function getNearbyPlots(id, limit = 5) {
  return api.get(`/plots/${id}/nearby?limit=${limit}`)
}

/**
 * Track a plot view (fire-and-forget).
 * Server increments a views counter for popularity indicators.
 */
export function trackPlotView(id) {
  return api.post(`/plots/${id}/view`, {}).catch(() => {})
}

/**
 * Fetch most-viewed plots (social proof, like Yad2's "הכי נצפים").
 * Cached server-side for 5 minutes.
 */
export function getPopularPlots(limit = 6) {
  return api.get(`/plots/popular?limit=${limit}`)
}

/**
 * Fetch featured investment opportunities (server-scored).
 */
export function getFeaturedPlots(limit = 3) {
  return api.get(`/plots/featured?limit=${limit}`)
}
