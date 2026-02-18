import { useQuery } from '@tanstack/react-query'
import { getMarketOverview } from '../api/market.js'

/**
 * Fetches pre-aggregated market overview data from the server.
 * Returns per-city averages, price ranges, zoning distribution — no need to load all plots.
 * Used by the Areas page instead of useAllPlots({}) to cut payload by ~90%.
 */
export function useMarketOverview() {
  return useQuery({
    queryKey: ['market-overview'],
    queryFn: getMarketOverview,
    staleTime: 5 * 60_000,   // 5 min — data changes infrequently
    gcTime: 15 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  })
}
