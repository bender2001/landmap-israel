import { useMemo } from 'react'

/**
 * Compute average price per sqm per city from a list of plots.
 * Used by MapArea (tooltip deal indicators) and PlotCardStrip (card deal badges).
 *
 * Previously duplicated in both components — extracted here for DRY.
 * Returns: { [city: string]: number } where value is avg price/sqm (₪/m²).
 *
 * @param {Array} plots - Array of plot objects with total_price/totalPrice and size_sqm/sizeSqM
 * @returns {Object} Map of city → average price per sqm
 */
export function useAreaAverages(plots) {
  return useMemo(() => {
    if (!plots || plots.length === 0) return {}
    const byCity = {}
    plots.forEach(p => {
      const city = p.city || 'unknown'
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 1
      if (size <= 0 || price <= 0) return
      if (!byCity[city]) byCity[city] = { total: 0, count: 0 }
      byCity[city].total += price / size
      byCity[city].count += 1
    })
    const result = {}
    for (const [city, data] of Object.entries(byCity)) {
      result[city] = Math.round(data.total / data.count)
    }
    return result
  }, [plots])
}

/**
 * Compute per-city aggregate stats for market intelligence widgets.
 * Returns richer data than useAreaAverages — includes ROI, count, and total area.
 *
 * @param {Array} plots - Array of plot objects
 * @returns {Object} Map of city → { avgPriceSqm, avgRoi, count, totalArea }
 */
export function useAreaStats(plots) {
  return useMemo(() => {
    if (!plots || plots.length === 0) return {}
    const byCity = {}
    plots.forEach(p => {
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
    const result = {}
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
