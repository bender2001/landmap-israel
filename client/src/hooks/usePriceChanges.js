import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Fetch server-side price changes — plots where price moved since last snapshot.
 * Unlike the localStorage-based usePriceTracker, this works cross-device and
 * persists across browser clears. Uses the price_snapshots table for comparison.
 *
 * @param {Object} options
 * @param {number} options.days - Compare to snapshot from N days ago (default 7)
 * @param {number} options.minPct - Minimum % change to include (default 3)
 * @returns {{ data: Map<plotId, {direction, pctChange, diff, oldPrice, currentPrice}>, isLoading }}
 */
export function usePriceChanges({ days = 7, minPct = 3 } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: ['price-changes', days, minPct],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/market/price-changes?days=${days}&minPct=${minPct}`)
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 10 * 60 * 1000, // 10 min — matches server cache
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Build a Map for O(1) lookup by plotId
  const changeMap = new Map()
  if (data && Array.isArray(data)) {
    for (const change of data) {
      changeMap.set(change.plotId, {
        direction: change.direction,
        pctChange: change.pctChange,
        diff: change.diff,
        oldPrice: change.oldPrice,
        currentPrice: change.currentPrice,
      })
    }
  }

  return { data: changeMap, isLoading, raw: data || [] }
}
