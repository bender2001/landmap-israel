import { useQuery } from '@tanstack/react-query'
import { API_BASE } from '../utils/config'

/**
 * useMarketMomentum — fetches week-over-week and month-over-month price momentum per city.
 * Enables Bloomberg-style market velocity indicators (accelerating / decelerating / steady).
 * This is a key differentiator vs Madlan/Yad2 — they show static prices, we show price *velocity*.
 *
 * Returns a Map<city, { wow, mom, velocity, trend, signal }> for easy lookup.
 */
export function useMarketMomentum() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['market', 'momentum'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/market/momentum`)
      if (!res.ok) throw new Error(`Momentum API error: ${res.status}`)
      return res.json()
    },
    staleTime: 60 * 60 * 1000, // 1 hour — momentum data changes slowly
    gcTime: 2 * 60 * 60 * 1000, // keep in cache 2 hours
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Convert to Map for O(1) city lookup
  const momentumMap = new Map()
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
