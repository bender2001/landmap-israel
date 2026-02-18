import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getPlots, getPlot, getNearbyPlots, getPopularPlots, getPlotsBatch } from '../api/plots.js'
import { plots as mockPlots } from '../data/mockData.js'
import { useIsSlowConnection } from './useNetworkStatus.js'

// Normalize mock data from camelCase to snake_case for consistency
function normalizeMock(plot) {
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

async function fetchPlotsWithFallback(filters) {
  try {
    const data = await getPlots(filters)
    if (data && data.length > 0) {
      // Tag response as live API data
      data._source = 'api'
      return data
    }
    // API returned empty — fall through to mock
  } catch {
    // API unavailable — use mock data
  }
  // Client-side filtering of mock data
  let result = mockPlots.map(normalizeMock)
  if (filters.city && filters.city !== 'all') {
    result = result.filter((p) => p.city === filters.city)
  }
  if (filters.priceMin) {
    result = result.filter((p) => (p.total_price ?? p.totalPrice) >= Number(filters.priceMin))
  }
  if (filters.priceMax) {
    result = result.filter((p) => (p.total_price ?? p.totalPrice) <= Number(filters.priceMax))
  }
  if (filters.status) {
    const statuses = filters.status.split(',')
    result = result.filter((p) => statuses.includes(p.status))
  }
  // Tag response as mock/demo data so UI can warn the user
  result._source = 'mock'
  return result
}

async function fetchPlotWithFallback(id) {
  try {
    const data = await getPlot(id)
    if (data) return data
  } catch {
    // fallback
  }
  const found = mockPlots.find((p) => p.id === id)
  return found ? normalizeMock(found) : null
}

export function useAllPlots(filters) {
  // Adapt polling frequency to network quality — save bandwidth on slow connections
  const isSlow = useIsSlowConnection()

  const query = useQuery({
    queryKey: ['plots', filters],
    queryFn: () => fetchPlotsWithFallback(filters),
    staleTime: isSlow ? 120_000 : 30_000,
    gcTime: 5 * 60_000,
    retry: isSlow ? 1 : 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    placeholderData: keepPreviousData,
    // Auto-refresh: 5min on fast, 15min on slow connections — conserve bandwidth on 3G
    refetchInterval: isSlow ? 15 * 60_000 : 5 * 60_000,
    refetchIntervalInBackground: false,
    // Refetch when window regains focus after being away
    refetchOnWindowFocus: isSlow ? false : 'always',
  })
  // Detect if data came from mock fallback (API was unreachable)
  const isMockData = query.data?._source === 'mock'

  return {
    ...query,
    isPlaceholderData: query.isPlaceholderData,
    dataUpdatedAt: query.dataUpdatedAt,
    isMockData,
  }
}

export function usePlot(id) {
  return useQuery({
    queryKey: ['plot', id],
    queryFn: () => fetchPlotWithFallback(id),
    enabled: !!id,
    retry: 1,
  })
}

/**
 * Fetch nearby plots based on geo-proximity (server-computed Haversine distance).
 */
export function useNearbyPlots(plotId) {
  return useQuery({
    queryKey: ['nearbyPlots', plotId],
    queryFn: () => getNearbyPlots(plotId, 4),
    enabled: !!plotId,
    staleTime: 120_000,
    retry: 1,
  })
}

/**
 * Fetch the most-viewed (popular) plots — social proof like Yad2's "הכי נצפים".
 * Server returns pre-sorted by view count with computed ROI.
 * Light query: stale for 5min, refetch every 10min.
 */
export function usePopularPlots(limit = 6) {
  return useQuery({
    queryKey: ['popularPlots', limit],
    queryFn: () => getPopularPlots(limit),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    // Don't block rendering — popular plots are supplementary
    placeholderData: [],
  })
}

/**
 * Fetch multiple plots by their IDs in a single request.
 * Used by the Compare page — eliminates the need to load the entire dataset
 * just to find 2-3 plots. Reduces API payload by ~90%.
 *
 * @param {string[]} ids - Array of plot UUIDs
 * @returns React Query result with plots array
 */
export function usePlotsBatch(ids) {
  // Sort IDs for stable cache key (order doesn't matter for the query)
  const sortedIds = ids && ids.length > 0 ? [...ids].sort() : []
  const enabled = sortedIds.length > 0

  return useQuery({
    queryKey: ['plotsBatch', sortedIds],
    queryFn: async () => {
      try {
        const data = await getPlotsBatch(sortedIds)
        if (data && data.length > 0) return data
      } catch {
        // Fallback: fetch individually if batch endpoint fails
      }
      // Fallback: parallel individual fetches
      const results = await Promise.allSettled(
        sortedIds.map(id => fetchPlotWithFallback(id))
      )
      return results
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
    },
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  })
}

/**
 * Prefetch a plot's full details into the query cache on hover.
 * This eliminates the loading delay when the user clicks a plot card.
 */
export function usePrefetchPlot() {
  const queryClient = useQueryClient()
  return useCallback((id) => {
    if (!id) return
    queryClient.prefetchQuery({
      queryKey: ['plot', id],
      queryFn: () => fetchPlotWithFallback(id),
      staleTime: 60_000,
    })
  }, [queryClient])
}
