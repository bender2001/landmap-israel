// ─── useMarket.ts ─── Consolidated market data hooks
// Merges: useMarketOverview, useMarketTrends, useMarketMomentum, usePriceChanges, usePriceHistory, useAreaAverages

import { useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getMarketOverview, getMarketTrends, getPlotPriceHistory, getCityPriceHistory } from '../api/market'
import { API_BASE } from '../utils/config'

// ═══ useMarketOverview ═══

type MarketOverviewResult = Awaited<ReturnType<typeof getMarketOverview>>

export function useMarketOverview(): UseQueryResult<MarketOverviewResult, Error> {
  return useQuery({
    queryKey: ['market-overview'],
    queryFn: getMarketOverview,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  })
}

// ═══ useMarketTrends ═══

type MarketTrendsResult = Awaited<ReturnType<typeof getMarketTrends>>

export function useMarketTrends(): UseQueryResult<MarketTrendsResult, Error> {
  return useQuery({
    queryKey: ['market-trends'],
    queryFn: getMarketTrends,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  })
}

// ═══ useMarketMomentum ═══

type MomentumMetrics = Record<string, unknown>

type MarketMomentumResponse = {
  cities?: Record<string, MomentumMetrics>
  dataSource?: string
  snapshotDays?: number
}

type UseMarketMomentumResult = {
  momentum: Map<string, MomentumMetrics>
  dataSource: string
  snapshotDays: number
  isLoading: boolean
  error: unknown
}

export function useMarketMomentum(): UseMarketMomentumResult {
  const { data, isLoading, error } = useQuery<MarketMomentumResponse>({
    queryKey: ['market', 'momentum'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/momentum`)
      if (!res.ok) throw new Error(`Momentum API error: ${res.status}`)
      return res.json() as Promise<MarketMomentumResponse>
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const momentumMap = new Map<string, MomentumMetrics>()
  if (data?.cities) {
    for (const [city, metrics] of Object.entries(data.cities)) {
      momentumMap.set(city, metrics)
    }
  }

  return {
    momentum: momentumMap,
    dataSource: data?.dataSource || 'unknown',
    snapshotDays: data?.snapshotDays || 0,
    isLoading,
    error,
  }
}

// ═══ usePriceChanges ═══

const API_URL = import.meta.env.VITE_API_URL || ''

type PriceChange = {
  plotId: string
  direction: string
  pctChange: number
  diff: number
  oldPrice: number
  currentPrice: number
}

type UsePriceChangesOptions = {
  days?: number
  minPct?: number
}

type PriceChangeMap = Map<string, PriceChange>

type UsePriceChangesResult = {
  data: PriceChangeMap
  isLoading: boolean
  raw: PriceChange[]
}

export function usePriceChanges({ days = 7, minPct = 3 }: UsePriceChangesOptions = {}): UsePriceChangesResult {
  const { data, isLoading } = useQuery<PriceChange[]>({
    queryKey: ['price-changes', days, minPct],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/market/price-changes?days=${days}&minPct=${minPct}`)
      if (!res.ok) return []
      return res.json() as Promise<PriceChange[]>
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const changeMap: PriceChangeMap = new Map()
  if (data && Array.isArray(data)) {
    for (const change of data) {
      changeMap.set(change.plotId, {
        direction: change.direction,
        pctChange: change.pctChange,
        diff: change.diff,
        oldPrice: change.oldPrice,
        currentPrice: change.currentPrice,
        plotId: change.plotId,
      })
    }
  }

  return { data: changeMap, isLoading, raw: data || [] }
}

// ═══ usePriceHistory ═══

type PriceHistoryEntry = {
  total_price?: number
  price_per_sqm?: number
  avgPriceSqm?: number
  snapshot_date?: string
}

type TrendMetrics = {
  changePct: number
  direction: 'up' | 'down' | 'flat'
  volatility: number
  dataPoints: number
  firstPrice: number
  lastPrice: number
}

type PriceHistoryOptions = {
  days?: number
  enabled?: boolean
}

export function usePlotPriceHistory(
  plotId: string | null | undefined,
  { days = 365, enabled = true }: PriceHistoryOptions = {}
): UseQueryResult<PriceHistoryEntry[], Error> {
  return useQuery({
    queryKey: ['plotPriceHistory', plotId, days],
    queryFn: () => getPlotPriceHistory(String(plotId), days) as Promise<PriceHistoryEntry[]>,
    enabled: enabled && !!plotId,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    placeholderData: [],
  })
}

export function useCityPriceHistory(
  city: string | null | undefined,
  { days = 365, enabled = true }: PriceHistoryOptions = {}
): UseQueryResult<PriceHistoryEntry[], Error> {
  return useQuery({
    queryKey: ['cityPriceHistory', city, days],
    queryFn: () => getCityPriceHistory(String(city), days) as Promise<PriceHistoryEntry[]>,
    enabled: enabled && !!city,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    placeholderData: [],
  })
}

export function computePriceTrend(history: PriceHistoryEntry[] | null | undefined): TrendMetrics | null {
  if (!history || history.length < 2) return null

  const prices = history.map(h => h.price_per_sqm ?? h.avgPriceSqm ?? 0).filter(p => p > 0)
  if (prices.length < 2) return null

  const first = prices[0]
  const last = prices[prices.length - 1]
  const changePct = Math.round(((last - first) / first) * 100 * 10) / 10
  const direction: TrendMetrics['direction'] = changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'flat'

  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      changes.push(((prices[i] - prices[i - 1]) / prices[i - 1]) * 100)
    }
  }
  const avgChange = changes.length > 0 ? changes.reduce((s, v) => s + v, 0) / changes.length : 0
  const variance = changes.length > 1
    ? changes.reduce((s, v) => s + (v - avgChange) ** 2, 0) / (changes.length - 1)
    : 0
  const volatility = Math.round(Math.sqrt(variance) * 100) / 100

  return {
    changePct,
    direction,
    volatility,
    dataPoints: prices.length,
    firstPrice: Math.round(first),
    lastPrice: Math.round(last),
  }
}

// ═══ useAreaAverages ═══

type PlotLike = {
  city?: string
  total_price?: number
  totalPrice?: number
  size_sqm?: number
  sizeSqM?: number
  projected_value?: number
  projectedValue?: number
}

type AreaAverages = Record<string, number>
type AreaStats = Record<string, { avgPriceSqm: number; avgRoi: number; count: number; totalArea: number }>

export function useAreaAverages(plots?: PlotLike[]): AreaAverages {
  return useMemo(() => {
    if (!plots || plots.length === 0) return {}
    const byCity: Record<string, { total: number; count: number }> = {}
    plots.forEach((p) => {
      const city = p.city || 'unknown'
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 1
      if (size <= 0 || price <= 0) return
      if (!byCity[city]) byCity[city] = { total: 0, count: 0 }
      byCity[city].total += price / size
      byCity[city].count += 1
    })
    const result: AreaAverages = {}
    for (const [city, data] of Object.entries(byCity)) {
      result[city] = Math.round(data.total / data.count)
    }
    return result
  }, [plots])
}

export function useAreaStats(plots?: PlotLike[]): AreaStats {
  return useMemo(() => {
    if (!plots || plots.length === 0) return {}
    const byCity: Record<string, { totalPrice: number; totalProj: number; totalArea: number; count: number }> = {}
    plots.forEach((p) => {
      const city = p.city || 'unknown'
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      if (!byCity[city]) byCity[city] = { totalPrice: 0, totalProj: 0, totalArea: 0, count: 0 }
      byCity[city].totalPrice += price
      byCity[city].totalProj += proj
      byCity[city].totalArea += size
      byCity[city].count += 1
    })
    const result: AreaStats = {}
    for (const [city, d] of Object.entries(byCity)) {
      result[city] = {
        avgPriceSqm: d.totalArea > 0 ? Math.round(d.totalPrice / d.totalArea) : 0,
        avgRoi: d.totalPrice > 0 ? Math.round(((d.totalProj - d.totalPrice) / d.totalPrice) * 100) : 0,
        count: d.count,
        totalArea: d.totalArea,
      }
    }
    return result
  }, [plots])
}
