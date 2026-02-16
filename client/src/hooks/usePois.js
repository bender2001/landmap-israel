import { useQuery } from '@tanstack/react-query'
import { getPois } from '../api/pois.js'

export function usePois() {
  return useQuery({
    queryKey: ['pois'],
    queryFn: getPois,
    staleTime: 5 * 60_000,
  })
}
