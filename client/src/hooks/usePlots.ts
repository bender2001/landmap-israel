import { useQuery, useQueryClient, keepPreviousData, type UseQueryResult } from '@tanstack/react-query'
import { useCallback, useRef, useEffect } from 'react'
import {
  getPlots,
  getPlot,
  getNearbyPlots,
  getSimilarPlots,
  getPopularPlots,
  getFeaturedPlots,
  getPlotsBatch,
  getNearbyPois,
  getTrendingSearches,
  getRecommendations,
} from '../api/plots'
import { plots as mockPlots } from '../data/mockData'
import { useIsSlowConnection } from './useInfra'

type Plot = {
  id: string
  city?: string
  total_price?: number
  totalPrice?: number
  projected_value?: number
  projectedValue?: number
  size_sqm?: number
  sizeSqM?: number
  block_number?: string | number
  blockNumber?: string | number
  zoning_stage?: string
  zoningStage?: string
  readiness_estimate?: number
  readinessEstimate?: number
  distance_to_sea?: number
  distance_to_park?: number
  distance_to_hospital?: number
  density_units_per_dunam?: number
  area_context?: string
  nearby_development?: string
  tax_authority_value?: number
  standard_22?: string | boolean
  standard22?: string | boolean
  plot_images?: unknown[]
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  number?: string | number
  status?: string
  coordinates?: number[][][]
} & Record<string, unknown>

type PlotList = Plot[] & { _source?: 'api' | 'mock'; _stale?: boolean }

type PlotFilters = {
  city?: string
  priceMin?: string | number
  priceMax?: string | number
  status?: string
} & Record<string, unknown>

type UseAllPlotsResult = UseQueryResult<PlotList, Error> & {
  isPlaceholderData: boolean
  dataUpdatedAt: number
  isMockData: boolean
  isStaleData: boolean
}

type NearbyPois = { pois: unknown[]; categories: Record<string, unknown>; count: number }

function normalizeMock(plot: Plot): Plot {
  return {
    ...plot,
    total_price: plot.totalPrice ?? plot.total_price,
    projected_value: plot.projectedValue ?? plot.projected_value,
    size_sqm: plot.sizeSqM ?? plot.size_sqm,
    block_number: plot.blockNumber ?? plot.block_number,
    zoning_stage: plot.zoningStage ?? plot.zoning_stage,
    readiness_estimate: plot.readinessEstimate ?? plot.readiness_estimate,
    distance_to_sea: plot.distanceToSea ?? plot.distance_to_sea,
    distance_to_park: plot.distanceToPark ?? plot.distance_to_park,
    distance_to_hospital: plot.distanceToHospital ?? plot.distance_to_hospital,
    density_units_per_dunam: plot.densityUnitsPerDunam ?? plot.density_units_per_dunam,
    area_context: plot.areaContext ?? plot.area_context,
    nearby_development: plot.nearbyDevelopment ?? plot.nearby_development,
    tax_authority_value: plot.taxAuthorityValue ?? plot.tax_authority_value,
    standard_22: plot.standard22 ?? plot.standard_22,
    plot_images: plot.plot_images || [],
    created_at: plot.created_at ?? plot.createdAt,
    updated_at: plot.updated_at ?? plot.updatedAt,
  }
}

async function fetchPlotsWithFallback(filters: PlotFilters): Promise<PlotList> {
  try {
    const data = (await getPlots(filters)) as PlotList
    if (data && data.length > 0) {
      data._source = 'api'
      return data
    }
  } catch {}

  let result = (mockPlots as Plot[]).map(normalizeMock) as PlotList
  if (filters.city && filters.city !== 'all') {
    result = result.filter((p) => p.city === filters.city) as PlotList
  }
  if (filters.priceMin) {
    result = result.filter((p) => (p.total_price ?? p.totalPrice) >= Number(filters.priceMin)) as PlotList
  }
  if (filters.priceMax) {
    result = result.filter((p) => (p.total_price ?? p.totalPrice) <= Number(filters.priceMax)) as PlotList
  }
  if (filters.status) {
    const statuses = filters.status.split(',')
    result = result.filter((p) => statuses.includes(String(p.status))) as PlotList
  }
  result._source = 'mock'
  return result
}

async function fetchPlotWithFallback(id: string): Promise<Plot | null> {
  try {
    const data = (await getPlot(id)) as Plot | null
    if (data) return data
  } catch {}
  const found = (mockPlots as Plot[]).find((p) => p.id === id)
  return found ? normalizeMock(found) : null
}

export function useAllPlots(filters: PlotFilters): UseAllPlotsResult {
  const isSlow = useIsSlowConnection()

  const query = useQuery<PlotList, Error>({
    queryKey: ['plots', filters],
    queryFn: () => fetchPlotsWithFallback(filters),
    staleTime: isSlow ? 120_000 : 30_000,
    gcTime: 5 * 60_000,
    retry: isSlow ? 1 : 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    placeholderData: keepPreviousData,
    refetchInterval: isSlow ? 15 * 60_000 : 5 * 60_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: isSlow ? false : 'always',
  })

  const isMockData = query.data?._source === 'mock'
  const isStaleData = query.data?._stale === true

  const prevSourceRef = useRef<PlotList['_source'] | null>(null)
  const currentSource = query.data?._source
  if (prevSourceRef.current === 'mock' && currentSource === 'api') {
    window.dispatchEvent(new CustomEvent('landmap:connection-recovered', {
      detail: { plotCount: query.data?.length || 0, timestamp: Date.now() },
    }))
  }
  prevSourceRef.current = currentSource || null

  const staleRetryRef = useRef<{ count: number; timer: ReturnType<typeof setTimeout> | null }>({ count: 0, timer: null })
  useEffect(() => {
    const ref = staleRetryRef.current
    if (isStaleData && !isMockData) {
      if (ref.count < 5) {
        const delay = Math.min(15000 * Math.pow(2, ref.count), 120000)
        ref.timer = setTimeout(() => {
          ref.count++
          query.refetch()
        }, delay)
      }
    } else {
      ref.count = 0
    }
    return () => { if (ref.timer) clearTimeout(ref.timer) }
  }, [isStaleData, isMockData])

  return {
    ...query,
    isPlaceholderData: query.isPlaceholderData,
    dataUpdatedAt: query.dataUpdatedAt,
    isMockData,
    isStaleData,
  }
}

export function usePlot(id: string | null | undefined): UseQueryResult<Plot | null, Error> {
  return useQuery<Plot | null, Error>({
    queryKey: ['plot', id],
    queryFn: () => fetchPlotWithFallback(String(id)),
    enabled: !!id,
    retry: 1,
  })
}

export function useNearbyPlots(plotId: string | null | undefined): UseQueryResult<Plot[], Error> {
  return useQuery<Plot[], Error>({
    queryKey: ['nearbyPlots', plotId],
    queryFn: () => getNearbyPlots(String(plotId), 4) as Promise<Plot[]>,
    enabled: !!plotId,
    staleTime: 120_000,
    retry: 1,
  })
}

export function useSimilarPlots(plotId: string | null | undefined): UseQueryResult<Plot[], Error> {
  return useQuery<Plot[], Error>({
    queryKey: ['similarPlots', plotId],
    queryFn: () => getSimilarPlots(String(plotId), 4) as Promise<Plot[]>,
    enabled: !!plotId,
    staleTime: 120_000,
    gcTime: 5 * 60_000,
    retry: 1,
    placeholderData: [],
  })
}

export function usePopularPlots(limit = 6): UseQueryResult<Plot[], Error> {
  return useQuery<Plot[], Error>({
    queryKey: ['popularPlots', limit],
    queryFn: () => getPopularPlots(limit) as Promise<Plot[]>,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    placeholderData: [],
  })
}

export function useFeaturedPlots(limit = 3): UseQueryResult<Plot[], Error> {
  return useQuery<Plot[], Error>({
    queryKey: ['featuredPlots', limit],
    queryFn: () => getFeaturedPlots(limit) as Promise<Plot[]>,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    placeholderData: [],
  })
}

export function usePlotsBatch(ids: string[]): UseQueryResult<Plot[], Error> {
  const sortedIds = ids && ids.length > 0 ? [...ids].sort() : []
  const enabled = sortedIds.length > 0

  return useQuery<Plot[], Error>({
    queryKey: ['plotsBatch', sortedIds],
    queryFn: async () => {
      try {
        const data = (await getPlotsBatch(sortedIds)) as Plot[]
        if (data && data.length > 0) return data
      } catch {}
      const results = await Promise.allSettled(
        sortedIds.map((id) => fetchPlotWithFallback(id))
      )
      const fulfilled = results.filter((r): r is PromiseFulfilledResult<Plot | null> => r.status === 'fulfilled')
      return fulfilled
        .map((r) => r.value)
        .filter((value): value is Plot => Boolean(value))
    },
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  })
}

export function useNearbyPois(plotId: string | null | undefined): UseQueryResult<NearbyPois, Error> {
  return useQuery<NearbyPois, Error>({
    queryKey: ['nearbyPois', plotId],
    queryFn: () => getNearbyPois(String(plotId), 3) as Promise<NearbyPois>,
    enabled: !!plotId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    placeholderData: { pois: [], categories: {}, count: 0 },
  })
}

export function useTrendingSearches(): UseQueryResult<string[], Error> {
  return useQuery<string[], Error>({
    queryKey: ['trendingSearches'],
    queryFn: async () => {
      try {
        const data = await getTrendingSearches(5)
        return (data as { searches?: string[] })?.searches || []
      } catch {
        return []
      }
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: 15 * 60_000,
    refetchIntervalInBackground: false,
    placeholderData: [],
  })
}

export function usePrefetchPlot(): (id: string) => void {
  const queryClient = useQueryClient()
  return useCallback((id: string) => {
    if (!id) return
    queryClient.prefetchQuery({
      queryKey: ['plot', id],
      queryFn: () => fetchPlotWithFallback(id),
      staleTime: 60_000,
    })
  }, [queryClient])
}

export function useRecommendations(favoriteIds: string[], limit = 6): UseQueryResult<Plot[], Error> {
  const sortedIds = favoriteIds && favoriteIds.length >= 2 ? [...favoriteIds].sort() : []
  const enabled = sortedIds.length >= 2

  return useQuery<Plot[], Error>({
    queryKey: ['recommendations', sortedIds, limit],
    queryFn: async () => {
      try {
        const data = await getRecommendations(sortedIds, limit)
        return Array.isArray(data) ? (data as Plot[]) : []
      } catch {
        return []
      }
    },
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    placeholderData: [],
  })
}
