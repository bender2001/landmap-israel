import { api } from './client'

export interface MarketOverview {
  total_plots: number
  avg_price: number
  avg_size_sqm: number
  cities: string[]
  [key: string]: unknown
}

export interface MarketCompareData {
  city: string
  avg_price: number
  total_plots: number
  [key: string]: unknown
}

export interface MarketTrend {
  date: string
  avg_price: number
  volume: number
  [key: string]: unknown
}

export interface PriceHistoryEntry {
  date: string
  price: number
  [key: string]: unknown
}

export interface NewListing {
  id: string
  city: string
  total_price: number
  created_at: string
  [key: string]: unknown
}

export function getMarketOverview(): Promise<MarketOverview> {
  return api.get('/market/overview') as Promise<MarketOverview>
}

export function getMarketCompare(cities: string[]): Promise<MarketCompareData[]> {
  return api.get(`/market/compare?cities=${encodeURIComponent(cities.join(','))}`) as Promise<MarketCompareData[]>
}

export function getMarketTrends(): Promise<MarketTrend[]> {
  return api.get('/market/trends') as Promise<MarketTrend[]>
}

export function getNewListings(): Promise<NewListing[]> {
  return api.get('/market/new-listings') as Promise<NewListing[]>
}

export function getPlotPriceHistory(plotId: string, days = 365): Promise<PriceHistoryEntry[]> {
  return api.get(`/market/price-history/${plotId}?days=${days}`) as Promise<PriceHistoryEntry[]>
}

export function getCityPriceHistory(city: string, days = 365): Promise<PriceHistoryEntry[]> {
  return api.get(`/market/city-history/${encodeURIComponent(city)}?days=${days}`) as Promise<PriceHistoryEntry[]>
}
