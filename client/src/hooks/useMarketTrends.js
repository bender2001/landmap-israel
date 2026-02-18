import { useQuery } from '@tanstack/react-query'
import { getMarketTrends } from '../api/market.js'

/**
 * Fetches 12-month market trend data per city.
 * Used for price trend sparklines and area comparison charts.
 */
export function useMarketTrends() {
  return useQuery({
    queryKey: ['market-trends'],
    queryFn: getMarketTrends,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  })
}
