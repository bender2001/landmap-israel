import { api } from './client.js'

export function getMarketOverview() {
  return api.get('/market/overview')
}

export function getMarketCompare(cities) {
  return api.get(`/market/compare?cities=${encodeURIComponent(cities.join(','))}`)
}

export function getMarketTrends() {
  return api.get('/market/trends')
}

export function getNewListings() {
  return api.get('/market/new-listings')
}

export function getPlotPriceHistory(plotId, days = 365) {
  return api.get(`/market/price-history/${plotId}?days=${days}`)
}

export function getCityPriceHistory(city, days = 365) {
  return api.get(`/market/city-history/${encodeURIComponent(city)}?days=${days}`)
}
