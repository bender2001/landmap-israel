import { useQuery } from '@tanstack/react-query'
import { getNewListings } from '../api/market.js'

/**
 * Fetches IDs of plots created in the last 7 days.
 * Used to show "חדש!" badges on plot cards (like Yad2's new listing indicator).
 */
export function useNewListings() {
  const { data } = useQuery({
    queryKey: ['new-listings'],
    queryFn: getNewListings,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
  })

  const newIds = new Set(data?.plotIds || [])

  return {
    isNew: (plotId) => newIds.has(plotId),
    count: data?.count || 0,
  }
}
