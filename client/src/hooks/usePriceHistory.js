import { useQuery } from '@tanstack/react-query'
import { getPlotPriceHistory, getCityPriceHistory } from '../api/market.js'

/**
 * Fetch price history for a specific plot.
 * Returns daily price snapshots from the price_snapshots table.
 *
 * Reusable across PriceTrendChart, PlotDetail, Compare page, etc.
 * Previously inlined in PriceTrendChart — extracted for DRY.
 *
 * @param {string} plotId - Plot UUID
 * @param {{ days?: number, enabled?: boolean }} options
 * @returns React Query result with price history array
 */
export function usePlotPriceHistory(plotId, { days = 365, enabled = true } = {}) {
  return useQuery({
    queryKey: ['plotPriceHistory', plotId, days],
    queryFn: () => getPlotPriceHistory(plotId, days),
    enabled: enabled && !!plotId,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
    // Don't block rendering — price history is supplementary
    placeholderData: [],
  })
}

/**
 * Fetch aggregated price history for a city.
 * Returns daily average price/sqm — powers area trend charts.
 *
 * Useful for:
 * - AreaCity page (city-level trends)
 * - Compare page (overlay city trends with plot prices)
 * - MarketStatsWidget (citywide trend indicator)
 *
 * @param {string} city - City name (Hebrew)
 * @param {{ days?: number, enabled?: boolean }} options
 * @returns React Query result with city price history array
 */
export function useCityPriceHistory(city, { days = 365, enabled = true } = {}) {
  return useQuery({
    queryKey: ['cityPriceHistory', city, days],
    queryFn: () => getCityPriceHistory(city, days),
    enabled: enabled && !!city,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
    placeholderData: [],
  })
}

/**
 * Compute price trend metrics from history data.
 * Helper that derives useful stats from raw snapshots.
 *
 * @param {Array} history - Array of { total_price, price_per_sqm, snapshot_date }
 * @returns {{ changePct: number, direction: 'up'|'down'|'flat', volatility: number, dataPoints: number } | null}
 */
export function computePriceTrend(history) {
  if (!history || history.length < 2) return null

  const prices = history.map(h => h.price_per_sqm ?? h.avgPriceSqm ?? 0).filter(p => p > 0)
  if (prices.length < 2) return null

  const first = prices[0]
  const last = prices[prices.length - 1]
  const changePct = Math.round(((last - first) / first) * 100 * 10) / 10
  const direction = changePct > 1 ? 'up' : changePct < -1 ? 'down' : 'flat'

  // Volatility — standard deviation of % changes between consecutive points
  const changes = []
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
