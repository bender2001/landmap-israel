// ── PlotContext ──────────────────────────────────────────────
// Central context for plot data, selection, favorites & compare.
// Eliminates prop drilling in MapView and sub-components.
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useFavorites } from '../hooks/useUserData'
import { useLocalStorage } from '../hooks/useInfra'
import { showToast } from '../components/ui/ToastContainer'
import type { Plot } from '../types'

/* ── Filter shape ──────────────────────────────────────────── */

export type PlotFilters = {
  city: string
  priceMin: string
  priceMax: string
  sizeMin: string
  sizeMax: string
  ripeness: string
  minRoi: string
  zoning: string
  maxDays: string
  maxMonthly: string
  search: string
}

export const initialFilters: PlotFilters = {
  city: 'all',
  priceMin: '',
  priceMax: '',
  sizeMin: '',
  sizeMax: '',
  ripeness: 'all',
  minRoi: 'all',
  zoning: 'all',
  maxDays: '',
  maxMonthly: '',
  search: '',
}

/* ── Context value ─────────────────────────────────────────── */

interface PlotContextValue {
  // Data
  plots: Plot[]
  selectedPlot: Plot | null

  // Filters
  filters: PlotFilters
  setFilters: (filters: PlotFilters) => void
  setFilter: <K extends keyof PlotFilters>(key: K, value: PlotFilters[K]) => void
  clearFilters: () => void

  // Selection
  setSelectedPlot: (plot: Plot | null) => void

  // Favorites
  favorites: string[]
  toggleFavorite: (plotId: string) => void
  isFavorite: (plotId: string) => boolean

  // Compare
  compareIds: string[]
  toggleCompare: (plotId: string) => void
  removeFromCompare: (plotId: string) => void
  clearCompare: () => void
}

const PlotContext = createContext<PlotContextValue | null>(null)

/* ── Provider ──────────────────────────────────────────────── */

interface PlotProviderProps {
  plots: Plot[]
  children: ReactNode
}

export function PlotProvider({ plots, children }: PlotProviderProps) {
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null)
  const [filters, setFiltersState] = useState<PlotFilters>(initialFilters)

  // Favorites (via useSyncExternalStore under the hood)
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites()

  // Compare (via localStorage)
  const [compareIds, setCompareIds] = useLocalStorage<string[]>('landmap_compare', [])

  /* ── Filter actions ─────────────────────────────────────── */

  const setFilter = useCallback(<K extends keyof PlotFilters>(key: K, value: PlotFilters[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(initialFilters)
  }, [])

  const setFilters = useCallback((next: PlotFilters) => {
    setFiltersState(next)
  }, [])

  /* ── Compare actions ────────────────────────────────────── */

  const toggleCompare = useCallback((plotId: string) => {
    setCompareIds((prev: string[]) => {
      const wasInCompare = prev.includes(plotId)
      if (wasInCompare) {
        showToast('\uD83D\uDCCA \u05D4\u05D5\u05E1\u05E8 \u05DE\u05D4\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4', 'info', { duration: 2000 })
        return prev.filter((id: string) => id !== plotId)
      }
      if (prev.length >= 3) {
        showToast('\u26A0\uFE0F \u05E0\u05D9\u05EA\u05DF \u05DC\u05D4\u05E9\u05D5\u05D5\u05EA \u05E2\u05D3 3 \u05D7\u05DC\u05E7\u05D5\u05EA', 'warning', { duration: 3000 })
        return prev
      }
      showToast('\uD83D\uDCCA \u05E0\u05D5\u05E1\u05E3 \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u2014 \u05D1\u05D7\u05E8 \u05D7\u05DC\u05E7\u05D5\u05EA \u05E0\u05D5\u05E1\u05E4\u05D5\u05EA', 'success', { duration: 2000 })
      return [...prev, plotId]
    })
  }, [setCompareIds])

  const removeFromCompare = useCallback((plotId: string) => {
    setCompareIds((prev: string[]) => prev.filter((id: string) => id !== plotId))
  }, [setCompareIds])

  const clearCompare = useCallback(() => {
    setCompareIds([])
  }, [setCompareIds])

  /* ── Memoised value ─────────────────────────────────────── */

  const value = useMemo<PlotContextValue>(() => ({
    plots,
    selectedPlot,
    filters,
    setFilters,
    setFilter,
    clearFilters,
    setSelectedPlot,
    favorites,
    toggleFavorite,
    isFavorite,
    compareIds,
    toggleCompare,
    removeFromCompare,
    clearCompare,
  }), [
    plots,
    selectedPlot,
    filters,
    setFilters,
    setFilter,
    clearFilters,
    favorites,
    toggleFavorite,
    isFavorite,
    compareIds,
    toggleCompare,
    removeFromCompare,
    clearCompare,
  ])

  return (
    <PlotContext.Provider value={value}>
      {children}
    </PlotContext.Provider>
  )
}

/* ── Hook ──────────────────────────────────────────────────── */

export function usePlotContext(): PlotContextValue {
  const ctx = useContext(PlotContext)
  if (!ctx) {
    throw new Error('usePlotContext must be used within a <PlotProvider>')
  }
  return ctx
}
