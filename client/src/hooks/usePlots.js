import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { getPlots, getPlot } from '../api/plots.js'
import { plots as mockPlots } from '../data/mockData.js'

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
  }
}

async function fetchPlotsWithFallback(filters) {
  try {
    const data = await getPlots(filters)
    if (data && data.length > 0) return data
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
  return useQuery({
    queryKey: ['plots', filters],
    queryFn: () => fetchPlotsWithFallback(filters),
    staleTime: 30_000,
    retry: 1,
  })
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
