import { useQuery } from '@tanstack/react-query'
import { getPlots, getPlot } from '../api/plots.js'

export function useAllPlots(filters) {
  return useQuery({
    queryKey: ['plots', filters],
    queryFn: () => getPlots(filters),
    staleTime: 30_000,
  })
}

export function usePlot(id) {
  return useQuery({
    queryKey: ['plot', id],
    queryFn: () => getPlot(id),
    enabled: !!id,
  })
}
