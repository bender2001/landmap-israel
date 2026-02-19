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
 * Fetch plots with similar investment characteristics (zoning, price, size, ROI).
 * Unlike nearby (geography), this finds similar *opportunities*.
 */
export function getSimilarPlots(id, limit = 4) {
  return api.get(`/plots/${id}/similar?limit=${limit}`)
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

/**
 * Fetch multiple plots by IDs in a single request.
 * Used by the Compare page to avoid loading the entire dataset (~90% payload reduction).
 * @param {string[]} ids - Array of plot UUIDs (max 10)
 */
export function getPlotsBatch(ids) {
  if (!ids || ids.length === 0) return Promise.resolve([])
  return api.get(`/plots/batch?ids=${ids.join(',')}`)
}

/**
 * Fetch nearby points of interest for a plot (schools, transit, hospitals, parks).
 * Powers the "What's Nearby" section in the sidebar — like Madlan's proximity indicators.
 * @param {string} plotId - Plot UUID
 * @param {number} maxKm - Max radius in km (default 3)
 */
export function getNearbyPois(plotId, maxKm = 3) {
  return api.get(`/plots/${plotId}/nearby-pois?maxKm=${maxKm}`)
}

/**
 * Fetch trending search queries — powers "Popular Searches" in SearchAutocomplete.
 * Returns search terms that other users have searched for frequently.
 * Like Google's trending searches or Madlan's "חיפושים פופולריים".
 */
export function getTrendingSearches(limit = 5) {
  return api.get(`/plots/trending-searches?limit=${limit}`)
}

/**
 * Fetch personalized plot recommendations based on the user's favorite plots.
 * Analyzes favorites to build a preference profile (price, size, city, zoning, ROI)
 * and returns non-favorited plots that match. Like Netflix's recommendation engine.
 * @param {string[]} favoriteIds - Array of favorite plot UUIDs
 * @param {number} limit - Max results (default 6)
 */
export function getRecommendations(favoriteIds, limit = 6) {
  if (!favoriteIds || favoriteIds.length === 0) return Promise.resolve([])
  return api.get(`/plots/recommendations?favorites=${favoriteIds.join(',')}&limit=${limit}`)
}
