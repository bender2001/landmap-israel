import { useState, useMemo, useCallback, useEffect, useRef, Suspense, useDeferredValue, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllPlots } from '../../hooks/usePlots.js'
import { usePois } from '../../hooks/usePois.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import MapArea from '../../components/MapArea.jsx'
import MapErrorBoundary from '../../components/ui/MapErrorBoundary.jsx'
import FilterBar from '../../components/FilterBar.jsx'
import PlotCardStrip from '../../components/PlotCardStrip.jsx'
import CompareBar from '../../components/CompareBar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import WidgetErrorBoundary from '../../components/ui/WidgetErrorBoundary.jsx'
import ConnectionStatus from '../../components/ui/ConnectionStatus.jsx'
import { useMetaTags } from '../../hooks/useMetaTags.js'
import { useStructuredData } from '../../hooks/useStructuredData.js'
import { formatCurrency, formatPriceShort, calcInvestmentScore, calcCAGR, calcMonthlyPayment, haversineKm, plotCenter } from '../../utils/formatters.js'
import { useViewTracker } from '../../hooks/useViewTracker.js'
import { usePriceTracker } from '../../hooks/usePriceTracker.js'
import { useSavedSearches } from '../../hooks/useSavedSearches.js'
import { Phone } from 'lucide-react'
import { whatsappLink, CONTACT, plotOgImageUrl, trackContactConversion } from '../../utils/config.js'
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates.js'
import IdleRender from '../../components/ui/IdleRender.jsx'
import OfflineBanner from '../../components/ui/OfflineBanner.jsx'
import { useRefreshOnReturn } from '../../hooks/usePageVisibility.js'
import { useLocalStorage } from '../../hooks/useLocalStorage.js'
import { usePriceChanges } from '../../hooks/usePriceChanges.js'
import { useVisibilityInterval } from '../../hooks/useVisibilityInterval.js'

// Lazy-load non-critical widgets — they're not needed for first paint.
// This reduces the MapView initial JS from ~126KB to ~95KB, cutting Time to Interactive.
const SidebarDetails = lazy(() => import('../../components/SidebarDetails.jsx'))
const AIChat = lazy(() => import('../../components/AIChat.jsx'))
const LeadModal = lazy(() => import('../../components/LeadModal.jsx'))
const KeyboardShortcuts = lazy(() => import('../../components/KeyboardShortcuts.jsx'))
const RecentlyViewed = lazy(() => import('../../components/RecentlyViewed.jsx'))
const FirstVisitHints = lazy(() => import('../../components/FirstVisitHints.jsx'))
const AlertSubscription = lazy(() => import('../../components/AlertSubscription.jsx'))
const FeaturedDeals = lazy(() => import('../../components/FeaturedDeals.jsx'))
const MarketTicker = lazy(() => import('../../components/MarketTicker.jsx'))
const PriceMovers = lazy(() => import('../../components/PriceMovers.jsx'))
const MobilePlotActionBar = lazy(() => import('../../components/ui/MobilePlotActionBar.jsx'))
const MarketPulse = lazy(() => import('../../components/MarketPulse.jsx'))
const MarketVelocity = lazy(() => import('../../components/MarketVelocity.jsx'))
const WelcomeBack = lazy(() => import('../../components/WelcomeBack.jsx'))

// Preload PlotDetail chunk — imported but not rendered here.
// When a user selects a plot (opens sidebar), we trigger this import to preload
// the PlotDetail route's JS chunk in the background. This way, clicking "View Full Page"
// in the sidebar navigates instantly — no loading spinner for the full page.
const plotDetailPreload = () => import('../../pages/public/PlotDetail.jsx')

function DataFreshnessIndicator({ updatedAt, onRefresh }) {
  const [, setTick] = useState(0)

  // Re-render every 30s to update relative time — pauses when tab is hidden.
  // Standard setInterval wastes CPU ticking in background tabs; useVisibilityInterval
  // stops and restarts automatically, catching up when the user returns.
  useVisibilityInterval(() => setTick(t => t + 1), 30_000)

  const ago = Math.round((Date.now() - updatedAt) / 1000)
  const label = ago < 60 ? 'עכשיו' : ago < 3600 ? `לפני ${Math.floor(ago / 60)} דק׳` : `לפני ${Math.floor(ago / 3600)} שע׳`
  const isStale = ago > 300 // >5 min

  return (
    <button
      onClick={onRefresh}
      className={`fixed top-[4rem] left-4 sm:left-auto sm:top-auto sm:bottom-[5.5rem] sm:right-6 z-[20] flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] backdrop-blur-md border transition-all hover:scale-105 ${
        isStale
          ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
          : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-400'
      }`}
      title="לחץ לרענון הנתונים"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isStale ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`} />
      {label}
    </button>
  )
}

/**
 * Smart filter suggestions — when active filters produce very few results (<4),
 * this component suggests which specific filter to loosen. Like Madlan's
 * "הרחב חיפוש" nudge that keeps users engaged instead of hitting a dead end.
 */
function FilterSuggestions({ filteredCount, totalCount, filters, statusFilter, onFilterChange, onToggleStatus, onClearFilters }) {
  // Only show when results are very low AND filters are active
  const activeCount =
    (filters.city !== 'all' ? 1 : 0) +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.sizeMin || filters.sizeMax ? 1 : 0) +
    (filters.ripeness !== 'all' ? 1 : 0) +
    (filters.minRoi && filters.minRoi !== 'all' ? 1 : 0) +
    (filters.zoning && filters.zoning !== 'all' ? 1 : 0) +
    (filters.maxDays ? 1 : 0) +
    (filters.maxMonthly ? 1 : 0) +
    (filters.search ? 1 : 0) +
    statusFilter.length

  if (filteredCount >= 4 || activeCount === 0 || totalCount === 0) return null

  // Build suggestions: which filter, if removed, would give the most results
  const suggestions = []
  if (filters.city !== 'all') suggestions.push({ label: `הסר סינון "${filters.city}"`, action: () => onFilterChange('city', 'all'), icon: '🏙️' })
  if (filters.priceMin || filters.priceMax) suggestions.push({ label: 'הרחב טווח מחירים', action: () => { onFilterChange('priceMin', ''); onFilterChange('priceMax', '') }, icon: '💰' })
  if (filters.sizeMin || filters.sizeMax) suggestions.push({ label: 'הרחב טווח שטח', action: () => { onFilterChange('sizeMin', ''); onFilterChange('sizeMax', '') }, icon: '📐' })
  if (filters.minRoi && filters.minRoi !== 'all') suggestions.push({ label: 'הסר סינון תשואה', action: () => onFilterChange('minRoi', 'all'), icon: '📈' })
  if (filters.zoning && filters.zoning !== 'all') suggestions.push({ label: 'הסר סינון תכנוני', action: () => onFilterChange('zoning', 'all'), icon: '🗺️' })
  if (filters.ripeness !== 'all') suggestions.push({ label: 'הסר סינון בשלות', action: () => onFilterChange('ripeness', 'all'), icon: '⏱️' })
  if (filters.maxDays) suggestions.push({ label: 'הסר סינון חדשות', action: () => onFilterChange('maxDays', ''), icon: '🆕' })
  if (filters.maxMonthly) suggestions.push({ label: 'הסר סינון תשלום חודשי', action: () => onFilterChange('maxMonthly', ''), icon: '🏦' })
  statusFilter.forEach(s => suggestions.push({ label: `הסר סטטוס "${s === 'AVAILABLE' ? 'זמין' : s === 'SOLD' ? 'נמכר' : s}"`, action: () => onToggleStatus(s), icon: '🏷️' }))

  if (suggestions.length === 0) return null

  return (
    <div className="fixed bottom-[18rem] sm:bottom-[19rem] left-1/2 -translate-x-1/2 z-[35] animate-bounce-in" dir="rtl">
      <div className="bg-navy/90 backdrop-blur-md border border-gold/15 rounded-2xl px-4 py-3 shadow-xl max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">💡</span>
          <span className="text-[11px] text-gold font-medium">
            {filteredCount === 0 ? 'אין תוצאות' : `רק ${filteredCount} תוצאות`} — נסה להרחיב:
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={s.action}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-slate-300 bg-white/5 border border-white/10 rounded-lg hover:bg-gold/10 hover:border-gold/20 hover:text-gold transition-all"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
          {activeCount > 1 && (
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-gold bg-gold/10 border border-gold/20 rounded-lg hover:bg-gold/15 transition-all"
            >
              🔄 נקה הכל
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const initialFilters = {
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

export default function MapView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [boundsFilter, setBoundsFilter] = useState(null)
  // Auto-search on map move — stored in localStorage for persistence (like Madlan/Airbnb)
  const [autoSearchOnMove, setAutoSearchOnMove] = useLocalStorage('landmap_auto_search', false)

  // Keyboard navigation counter — shows "3 / 12" when navigating with ←→ arrows.
  // Gives spatial context during keyboard navigation (a11y + UX win).
  // Auto-hides after 2 seconds of inactivity, like volume overlays in media apps.
  const [navIndicator, setNavIndicator] = useState(null) // { index, total }
  const navIndicatorTimer = useRef(null)

  // Capture the initial ?plot= param before any effect can clear it
  const initialPlotRef = useRef(searchParams.get('plot'))

  // Hydrate filters from URL params for shareable links
  const [filters, setFilters] = useState(() => {
    const p = Object.fromEntries(searchParams.entries())
    return {
      city: p.city || 'all',
      priceMin: p.priceMin || '',
      priceMax: p.priceMax || '',
      sizeMin: p.sizeMin || '',
      sizeMax: p.sizeMax || '',
      ripeness: p.ripeness || 'all',
      minRoi: p.minRoi || 'all',
      zoning: p.zoning || 'all',
      maxDays: p.maxDays || '',
      maxMonthly: p.maxMonthly || '',
      search: p.q || '',
    }
  })
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = searchParams.get('status')
    return s ? s.split(',') : []
  })
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'default')
  const favorites = useFavorites()
  const { trackView, isPopular } = useViewTracker()
  const { recordPrices, getPriceChange } = usePriceTracker()
  const { searches: savedSearches, save: saveSearch, remove: removeSearch } = useSavedSearches()

  // User geolocation — used for "sort by distance" (like Madlan's proximity sort).
  // Requested lazily when user selects distance sort, persisted in state for the session.
  const [userLocation, setUserLocation] = useState(null)

  // Compare state (localStorage-backed via useLocalStorage, cross-tab sync)
  const [compareIds, setCompareIds] = useLocalStorage('landmap_compare', [])
  const toggleCompare = useCallback((plotId) => {
    setCompareIds((prev) =>
      prev.includes(plotId) ? prev.filter((id) => id !== plotId) : prev.length < 3 ? [...prev, plotId] : prev
    )
  }, [])
  const removeFromCompare = useCallback((plotId) => {
    setCompareIds((prev) => prev.filter((id) => id !== plotId))
  }, [])
  const clearCompare = useCallback(() => setCompareIds([]), [])

  // Sync filters to URL for shareable links
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.city !== 'all') params.set('city', filters.city)
    if (filters.priceMin) params.set('priceMin', filters.priceMin)
    if (filters.priceMax) params.set('priceMax', filters.priceMax)
    if (filters.sizeMin) params.set('sizeMin', filters.sizeMin)
    if (filters.sizeMax) params.set('sizeMax', filters.sizeMax)
    if (filters.ripeness !== 'all') params.set('ripeness', filters.ripeness)
    if (filters.minRoi && filters.minRoi !== 'all') params.set('minRoi', filters.minRoi)
    if (filters.zoning && filters.zoning !== 'all') params.set('zoning', filters.zoning)
    if (filters.maxDays) params.set('maxDays', filters.maxDays)
    if (filters.maxMonthly) params.set('maxMonthly', filters.maxMonthly)
    if (filters.search) params.set('q', filters.search)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (sortBy !== 'default') params.set('sort', sortBy)
    if (selectedPlot) params.set('plot', selectedPlot.id)
    else if (initialPlotRef.current) params.set('plot', initialPlotRef.current)
    setSearchParams(params, { replace: true })
  }, [filters, statusFilter, sortBy, selectedPlot?.id])

  // Debounce search for performance — must be declared before apiFilters which depends on it
  const debouncedSearch = useDebounce(filters.search, 250)

  // Build API filter params
  const apiFilters = useMemo(() => {
    const f = {}
    if (filters.city !== 'all') f.city = filters.city
    if (filters.priceMin) f.priceMin = filters.priceMin
    if (filters.priceMax) f.priceMax = filters.priceMax
    if (filters.sizeMin) f.sizeMin = filters.sizeMin
    if (filters.sizeMax) f.sizeMax = filters.sizeMax
    if (filters.ripeness !== 'all') f.ripeness = filters.ripeness
    if (filters.zoning && filters.zoning !== 'all') f.zoning = filters.zoning
    if (statusFilter.length > 0) f.status = statusFilter.join(',')
    // Pass search query to server for DB-level text search (faster than client-side)
    if (debouncedSearch) f.q = debouncedSearch
    // Pass sorts to server for better performance — includes server-computed sorts for
    // score, ROI, CAGR, price/sqm, and monthly payment. Server enriches plots with
    // pre-computed _pricePerSqm, _monthlyPayment, _daysOnMarket fields, enabling
    // these sorts without redundant client-side computation.
    if (['price-asc', 'price-desc', 'size-asc', 'size-desc', 'updated-desc', 'score-desc', 'roi-desc', 'roi-asc', 'cagr-desc', 'newest-first', 'ppsqm-asc', 'ppsqm-desc', 'monthly-asc', 'deal-desc'].includes(sortBy)) {
      f.sort = sortBy
    }
    return f
  }, [filters, statusFilter, sortBy, debouncedSearch])

  const { data: plots = [], isLoading, error: plotsError, refetch: refetchPlots, isPlaceholderData, dataUpdatedAt, isMockData, isStaleData } = useAllPlots(apiFilters)
  const { data: pois = [] } = usePois()

  // ─── API Connection Recovery Notification ──────────────────────────
  // When the server was down (user saw mock data) and the API recovers,
  // show a positive green notification. Like Google Docs' "Back online" toast.
  // Listens for the custom event dispatched by usePlots on mock→api transition.
  const [showApiRecovered, setShowApiRecovered] = useState(false)
  useEffect(() => {
    const handler = (e) => {
      setShowApiRecovered(true)
      const timer = setTimeout(() => setShowApiRecovered(false), 5000)
      return () => clearTimeout(timer)
    }
    window.addEventListener('landmap:connection-recovered', handler)
    return () => window.removeEventListener('landmap:connection-recovered', handler)
  }, [])

  // Auto-refresh data when user returns to tab after being away 2+ minutes.
  // Real estate listings change frequently — price updates, new plots, status changes.
  // This keeps the app feeling "live" like Madlan without constant polling.
  useRefreshOnReturn(refetchPlots, { staleDurationMs: 120_000 })

  // Record prices for change detection (like Yad2's "המחיר ירד!" badge)
  useEffect(() => {
    if (plots.length > 0) recordPrices(plots)
  }, [plots, recordPrices])

  // ── Consolidated client-side filter pipeline ────────────────────────
  // Previously this was 5 separate useMemo hooks chained sequentially:
  //   roiFilteredPlots → freshnessFilteredPlots → affordabilityFilteredPlots
  //   → boundsFilteredPlots → searchedPlots
  //
  // Problem: each useMemo creates an intermediate array, and React schedules
  // a separate comparison phase for each — 4 unnecessary allocations per render.
  // With 200+ plots, that's 800+ array slots created and immediately discarded.
  //
  // Consolidated into a single pass: one allocation, one filter loop, all predicates
  // evaluated per plot in sequence (short-circuits on first failure).
  const searchedPlots = useMemo(() => {
    // Pre-compute filter params once (avoid parseInt inside the loop)
    const hasRoiFilter = filters.minRoi && filters.minRoi !== 'all'
    const minRoi = hasRoiFilter ? parseInt(filters.minRoi, 10) : 0

    const hasMaxDays = !!filters.maxDays
    const maxDays = hasMaxDays ? parseInt(filters.maxDays, 10) : 0
    const freshnessCutoff = hasMaxDays && maxDays > 0 ? Date.now() - maxDays * 86400000 : 0

    const hasMaxMonthly = !!filters.maxMonthly
    const maxMonthly = hasMaxMonthly ? parseInt(filters.maxMonthly, 10) : 0

    const hasBounds = !!boundsFilter

    // Client-side search — only applies during the brief moment between typing and debounce.
    // Once debouncedSearch catches up, server already filtered via the API q param.
    const activeSearch = filters.search && filters.search !== debouncedSearch ? filters.search.toLowerCase() : ''
    const hasSearch = !!activeSearch

    // Fast path: no client-side filters active — return server results as-is
    if (!hasRoiFilter && !hasMaxDays && !hasMaxMonthly && !hasBounds && !hasSearch) {
      return plots
    }

    return plots.filter((p) => {
      const price = p.total_price ?? p.totalPrice ?? 0

      // ROI filter — minimum return threshold
      if (hasRoiFilter) {
        const proj = p.projected_value ?? p.projectedValue ?? 0
        if (price <= 0) return false
        const roi = ((proj - price) / price) * 100
        if (roi < minRoi) return false
      }

      // Freshness filter — "new listings" (last N days, like Yad2/Madlan "חדש באתר")
      if (hasMaxDays && maxDays > 0) {
        const created = p.created_at ?? p.createdAt
        if (!created) return false
        if (new Date(created).getTime() < freshnessCutoff) return false
      }

      // Affordability filter — max monthly payment (like Madlan's affordability filter)
      if (hasMaxMonthly && maxMonthly > 0) {
        if (price <= 0) return false
        const payment = calcMonthlyPayment(price)
        if (!payment || payment.monthly > maxMonthly) return false
      }

      // Bounds filter — "Search this area" (like Madlan's "חפש באזור זה")
      if (hasBounds) {
        if (!p.coordinates || !Array.isArray(p.coordinates) || p.coordinates.length < 3) return false
        const inBounds = p.coordinates.some(c =>
          Array.isArray(c) && c.length >= 2 &&
          c[0] >= boundsFilter.south && c[0] <= boundsFilter.north &&
          c[1] >= boundsFilter.west && c[1] <= boundsFilter.east
        )
        if (!inBounds) return false
      }

      // Instant search (pre-debounce) — secondary filter for responsive typing feel
      if (hasSearch) {
        const bn = (p.block_number ?? p.blockNumber ?? '').toString()
        const num = (p.number ?? '').toString()
        const city = (p.city ?? '').toLowerCase()
        const desc = (p.description ?? '').toLowerCase()
        if (!bn.includes(activeSearch) && !num.includes(activeSearch) && !city.includes(activeSearch) && !desc.includes(activeSearch)) return false
      }

      return true
    })
  }, [plots, filters.minRoi, filters.maxDays, filters.maxMonthly, filters.search, debouncedSearch, boundsFilter])

  // Request geolocation when "sort by distance" is selected — lazy permission request.
  // Like Madlan/Airbnb: only asks for location when the user actually needs it.
  useEffect(() => {
    if (sortBy !== 'distance-asc' || userLocation) return
    if (!navigator.geolocation) {
      setSortBy('default') // Fallback if geolocation unavailable
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setSortBy('default'), // Revert sort if user denies permission
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [sortBy, userLocation])

  // Sort — all comparators include a deterministic tie-breaker (plot.id) to prevent
  // visual jitter when two items share the same primary value. Without this, Array.sort's
  // instability causes cards to swap positions on every React re-render cycle.
  const sortedPlots = useMemo(() => {
    if (sortBy === 'default') return searchedPlots
    const sorted = [...searchedPlots]
    const getPrice = (p) => p.total_price ?? p.totalPrice ?? 0
    const getSize = (p) => p.size_sqm ?? p.sizeSqM ?? 0
    const getRoi = (p) => {
      const price = getPrice(p)
      const proj = p.projected_value ?? p.projectedValue ?? 0
      return price > 0 ? (proj - price) / price : 0
    }
    // Stable tie-breaker: when primary values are equal, sort by id for deterministic order.
    const tieBreak = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    switch (sortBy) {
      case 'distance-asc': {
        if (!userLocation) break
        sorted.sort((a, b) => {
          const ca = plotCenter(a.coordinates)
          const cb = plotCenter(b.coordinates)
          if (!ca && !cb) return tieBreak(a, b)
          if (!ca) return 1
          if (!cb) return -1
          const distA = haversineKm(userLocation.lat, userLocation.lng, ca.lat, ca.lng)
          const distB = haversineKm(userLocation.lat, userLocation.lng, cb.lat, cb.lng)
          return distA - distB || tieBreak(a, b)
        })
        break
      }
      case 'price-asc': sorted.sort((a, b) => getPrice(a) - getPrice(b) || tieBreak(a, b)); break
      case 'price-desc': sorted.sort((a, b) => getPrice(b) - getPrice(a) || tieBreak(a, b)); break
      case 'size-asc': sorted.sort((a, b) => getSize(a) - getSize(b) || tieBreak(a, b)); break
      case 'size-desc': sorted.sort((a, b) => getSize(b) - getSize(a) || tieBreak(a, b)); break
      case 'roi-desc': sorted.sort((a, b) => getRoi(b) - getRoi(a) || tieBreak(a, b)); break
      case 'roi-asc': sorted.sort((a, b) => getRoi(a) - getRoi(b) || tieBreak(a, b)); break
      case 'ppsqm-asc': sorted.sort((a, b) => {
        const aPpsqm = getSize(a) > 0 ? getPrice(a) / getSize(a) : Infinity
        const bPpsqm = getSize(b) > 0 ? getPrice(b) / getSize(b) : Infinity
        return aPpsqm - bPpsqm || tieBreak(a, b)
      }); break
      case 'ppsqm-desc': sorted.sort((a, b) => {
        const aPpsqm = getSize(a) > 0 ? getPrice(a) / getSize(a) : 0
        const bPpsqm = getSize(b) > 0 ? getPrice(b) / getSize(b) : 0
        return bPpsqm - aPpsqm || tieBreak(a, b)
      }); break
      case 'score-desc': sorted.sort((a, b) => calcInvestmentScore(b) - calcInvestmentScore(a) || tieBreak(a, b)); break
      case 'cagr-desc': sorted.sort((a, b) => {
        const getCagr = (p) => {
          const price = p.total_price ?? p.totalPrice ?? 0
          const proj = p.projected_value ?? p.projectedValue ?? 0
          const roiPct = price > 0 ? ((proj - price) / price) * 100 : 0
          const readiness = p.readiness_estimate ?? p.readinessEstimate ?? ''
          const data = calcCAGR(roiPct, readiness)
          return data ? data.cagr : 0
        }
        return getCagr(b) - getCagr(a) || tieBreak(a, b)
      }); break
      case 'updated-desc': sorted.sort((a, b) => {
        const getTs = (p) => new Date(p.updated_at ?? p.updatedAt ?? p.created_at ?? p.createdAt ?? 0).getTime()
        return getTs(b) - getTs(a) || tieBreak(a, b)
      }); break
      case 'newest-first': sorted.sort((a, b) => {
        const aTs = new Date(a.created_at ?? a.createdAt ?? 0).getTime()
        const bTs = new Date(b.created_at ?? b.createdAt ?? 0).getTime()
        return bTs - aTs || tieBreak(a, b)
      }); break
      case 'monthly-asc': sorted.sort((a, b) => {
        const getMonthly = (p) => {
          const price = p.total_price ?? p.totalPrice ?? 0
          if (price <= 0) return Infinity
          const payment = calcMonthlyPayment(price)
          return payment ? payment.monthly : Infinity
        }
        return getMonthly(a) - getMonthly(b) || tieBreak(a, b)
      }); break
      // "Best deal first" — ranks plots by how far below the area average price/sqm they are.
      // A plot 20% below average scores higher than one 5% below. Investors love this:
      // it surfaces underpriced opportunities that Madlan/Yad2 don't explicitly sort by.
      case 'deal-desc': {
        // Compute area average price/sqm as the baseline
        let totalPsm = 0, psmCount = 0
        for (const p of sorted) {
          const price = p.total_price ?? p.totalPrice ?? 0
          const size = p.size_sqm ?? p.sizeSqM ?? 0
          if (price > 0 && size > 0) { totalPsm += price / size; psmCount++ }
        }
        const avgPsm = psmCount > 0 ? totalPsm / psmCount : 0
        if (avgPsm > 0) {
          sorted.sort((a, b) => {
            const getPsm = (p) => {
              const price = p.total_price ?? p.totalPrice ?? 0
              const size = p.size_sqm ?? p.sizeSqM ?? 0
              return price > 0 && size > 0 ? price / size : Infinity
            }
            // Lower price/sqm relative to average = better deal (more negative = better)
            const aDeal = getPsm(a) - avgPsm
            const bDeal = getPsm(b) - avgPsm
            return aDeal - bDeal || tieBreak(a, b)
          })
        }
        break
      }
    }
    return sorted
  }, [searchedPlots, sortBy, userLocation])

  // Defer heavy plot list updates so filter inputs stay responsive
  const filteredPlots = useDeferredValue(sortedPlots)
  const isFilterStale = filteredPlots !== sortedPlots

  // URL sync: open plot from ?plot=id on load
  useEffect(() => {
    const plotId = searchParams.get('plot') || initialPlotRef.current
    if (plotId && filteredPlots.length > 0 && !selectedPlot) {
      const found = filteredPlots.find((p) => p.id === plotId)
      if (found) {
        setSelectedPlot(found)
        initialPlotRef.current = null   // consumed – stop preserving in URL sync
      }
    }
  }, [searchParams, filteredPlots])

  // Dynamic document title for SEO & UX
  useEffect(() => {
    const parts = ['LandMap Israel']
    if (filters.city !== 'all') parts.unshift(filters.city)
    if (selectedPlot) {
      const bn = selectedPlot.block_number ?? selectedPlot.blockNumber
      parts.unshift(`גוש ${bn} חלקה ${selectedPlot.number}`)
    }
    if (filteredPlots.length > 0 && !selectedPlot) {
      parts.splice(1, 0, `${filteredPlots.length} חלקות`)
    }
    document.title = parts.join(' | ')
    return () => { document.title = 'LandMap Israel - מפת קרקעות להשקעה' }
  }, [filters.city, selectedPlot?.id, filteredPlots.length])

  // Keyboard shortcuts: ESC to close, ← → to navigate plots, ? for help
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (isShortcutsOpen) setIsShortcutsOpen(false)
        else if (isLeadModalOpen) setIsLeadModalOpen(false)
        else if (isChatOpen) setIsChatOpen(false)
        else if (selectedPlot) handleCloseSidebar()
      }
      // Ctrl+K / Cmd+K for global search focus (like GitHub, Notion, Linear)
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        const searchInput = document.querySelector('.filter-search-input')
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
      }
      // ? key for shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setIsShortcutsOpen(prev => !prev)
      }
      // F key to toggle favorite on selected plot
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (selectedPlot && favorites) {
          e.preventDefault()
          favorites.toggle(selectedPlot.id)
        }
      }
      // C key to toggle compare on selected plot
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (selectedPlot) {
          e.preventDefault()
          toggleCompare(selectedPlot.id)
        }
      }
      // P key to print report for selected plot — triggers the print button inside the sidebar
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (selectedPlot) {
          e.preventDefault()
          // Find and click the print button inside the sidebar panel
          const printBtn = document.querySelector('.sidebar-panel [data-action="print-report"]')
          if (printBtn) printBtn.click()
        }
      }
      // Enter key to open selected plot in full-page detail (like Madlan's property page)
      if (e.key === 'Enter' && selectedPlot && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || tag === 'A') return
        e.preventDefault()
        window.open(`/plot/${selectedPlot.id}`, '_blank')
      }
      // / key to open AI chat (like Cmd+K search pattern)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        setIsChatOpen(true)
      }
      // Arrow keys to navigate between plots (only when no input is focused)
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && filteredPlots.length > 0) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        e.preventDefault()
        const currentIdx = selectedPlot
          ? filteredPlots.findIndex((p) => p.id === selectedPlot.id)
          : -1
        // RTL: ArrowRight = previous, ArrowLeft = next
        let nextIdx
        if (e.key === 'ArrowLeft') {
          nextIdx = currentIdx < filteredPlots.length - 1 ? currentIdx + 1 : 0
        } else {
          nextIdx = currentIdx > 0 ? currentIdx - 1 : filteredPlots.length - 1
        }
        setSelectedPlot(filteredPlots[nextIdx])

        // Show navigation counter overlay (e.g. "3 / 12")
        setNavIndicator({ index: nextIdx + 1, total: filteredPlots.length })
        if (navIndicatorTimer.current) clearTimeout(navIndicatorTimer.current)
        navIndicatorTimer.current = setTimeout(() => setNavIndicator(null), 2000)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isShortcutsOpen, isLeadModalOpen, isChatOpen, selectedPlot, filteredPlots])

  const handleSelectPlot = useCallback((plot) => {
    setSelectedPlot(plot)
    if (plot?.id) {
      trackView(plot.id)
      // Preload PlotDetail route chunk in the background — so clicking "View Full Page"
      // in the sidebar is instant. Only triggers the import once (browser caches the module).
      plotDetailPreload()
    }
  }, [trackView])

  const handleCloseSidebar = useCallback(() => {
    setSelectedPlot(null)
    // Return focus to map area for keyboard users
    const mapEl = document.getElementById('map-content')
    if (mapEl) mapEl.focus({ preventScroll: true })
  }, [])

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters(initialFilters)
    setStatusFilter([])
    setBoundsFilter(null)
  }, [])

  const handleSearchArea = useCallback((bounds) => {
    setBoundsFilter(bounds)
  }, [])

  const handleToggleAutoSearch = useCallback((enabled) => {
    setAutoSearchOnMove(enabled)
    // If turning off, clear the bounds filter so all plots show again
    if (!enabled) setBoundsFilter(null)
  }, [setAutoSearchOnMove])

  const handleClearBounds = useCallback(() => {
    setBoundsFilter(null)
  }, [])

  const handleLoadSearch = useCallback((search) => {
    setFilters(search.filters)
    setStatusFilter(search.statusFilter || [])
    setSortBy(search.sortBy || 'default')
  }, [])

  const handleToggleStatus = useCallback((status) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
  }, [])

  // Server-side price changes — persistent cross-device "Price dropped!" badges.
  // Unlike the localStorage-based usePriceTracker which is per-browser only,
  // this uses price_snapshots table for reliable, cross-device change detection.
  // Falls back to client-side tracker when server data is unavailable.
  const { data: serverPriceChanges } = usePriceChanges({ days: 14, minPct: 3 })
  const getMergedPriceChange = useCallback((plotId) => {
    // Prefer server-side change (persistent, cross-device)
    const serverChange = serverPriceChanges.get(plotId)
    if (serverChange) return serverChange
    // Fallback to client-side localStorage tracker
    return getPriceChange(plotId)
  }, [serverPriceChanges, getPriceChange])

  // Real-time updates via SSE — auto-refresh when admin changes plots
  const { isConnected: sseConnected } = useRealtimeUpdates()

  // JSON-LD structured data for SEO (like Madlan/Yad2)
  useStructuredData(selectedPlot, filteredPlots)

  // Dynamic OG meta tags for social sharing
  useMetaTags(
    selectedPlot
      ? {
          title: `גוש ${selectedPlot.block_number ?? selectedPlot.blockNumber} חלקה ${selectedPlot.number} | LandMap Israel`,
          description: `${selectedPlot.city} · ${formatCurrency(selectedPlot.total_price ?? selectedPlot.totalPrice)} · ${((selectedPlot.size_sqm ?? selectedPlot.sizeSqM) / 1000).toFixed(1)} דונם`,
          url: window.location.href,
          image: plotOgImageUrl(selectedPlot.id),
        }
      : {
          title: `LandMap Israel — ${filteredPlots.length} חלקות להשקעה`,
          description: 'מפת קרקעות להשקעה בישראל — חדרה, נתניה, קיסריה. מחירים, תשואות, ייעודי קרקע.',
        }
  )

  // Prevent body scroll in map mode
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }, [])

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-navy overflow-hidden relative" dir="rtl" role="main" aria-busy="true" aria-label="טוען מפת קרקעות">
        {/* Skeleton map area — mimics the real map with animated placeholder */}
        <div className="absolute inset-0 bg-gradient-to-b from-navy via-navy-light/20 to-navy">
          {/* Fake map grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
          {/* Animated scan line */}
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent animate-pulse" style={{ top: '40%' }} />
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/10 to-transparent animate-pulse" style={{ top: '60%', animationDelay: '0.5s' }} />
        </div>

        {/* Skeleton filter bar */}
        <div className="absolute top-0 right-0 left-0 z-10 p-3">
          <div className="bg-navy/80 backdrop-blur-md border border-white/5 rounded-2xl p-3">
            {/* Quick presets skeleton */}
            <div className="flex gap-2 mb-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-7 rounded-lg bg-white/[0.03] border border-white/5 animate-pulse" style={{ width: `${60 + i * 8}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
            {/* Search bar skeleton */}
            <div className="h-10 rounded-xl bg-white/[0.03] border border-white/5 animate-pulse" />
          </div>
        </div>

        {/* Skeleton card strip at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
          <div className="flex gap-3 overflow-hidden">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex-shrink-0 w-48 h-32 rounded-xl bg-navy-light/40 border border-white/5 p-3 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="h-3 w-3/4 rounded bg-slate-700/50 mb-2" />
                <div className="h-2.5 w-1/2 rounded bg-slate-700/30 mb-3" />
                <div className="h-4 w-full rounded bg-slate-700/20 mb-2" />
                <div className="flex justify-between">
                  <div className="h-3 w-14 rounded bg-gold/10" />
                  <div className="h-3 w-10 rounded bg-emerald-500/10" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-navy/60 backdrop-blur-sm rounded-2xl px-8 py-6 border border-white/5">
            <Spinner className="w-10 h-10 text-gold" />
            <span className="text-sm text-slate-400 font-medium">טוען נתוני קרקעות...</span>
            <div className="flex items-center gap-2 text-[10px] text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-pulse" />
              <span>מתחבר לשרת</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (plotsError && plots.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy" dir="rtl" role="alert">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-slate-200">שגיאה בטעינת הנתונים</h2>
          <p className="text-sm text-slate-400">לא הצלחנו לטעון את נתוני החלקות. בדוק את החיבור לאינטרנט ונסה שוב.</p>
          <button
            onClick={() => refetchPlots()}
            className="px-6 py-2.5 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
          >
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden bg-navy ${selectedPlot ? 'sidebar-open' : ''}`}
      aria-busy={isLoading || isPlaceholderData}
    >
      {/* Filter transition indicator */}
      {(isFilterStale || isPlaceholderData) && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
          <div className="h-full bg-gradient-to-r from-gold via-gold-bright to-gold animate-pulse rounded-full" />
        </div>
      )}
      {/* Mock/demo data warning — shows when API is down and we're using fallback data.
          Critical UX: users must know they're seeing demo data, not real listings.
          Like Google Maps' "offline mode" indicator — transparent about data freshness. */}
      {isMockData && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in" dir="rtl">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/15 backdrop-blur-md border border-amber-500/25 rounded-2xl shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium text-amber-300">
              מוצגים נתוני הדגמה — השרת אינו זמין כרגע
            </span>
            <button
              onClick={() => refetchPlots()}
              className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg hover:bg-amber-400/20 transition-colors flex-shrink-0"
            >
              נסה שוב
            </button>
          </div>
        </div>
      )}
      {/* API connection recovered — shows briefly when server comes back after being down.
          Distinct from OfflineBanner (network) — this handles API-level recovery (mock → live data).
          Like Google Docs' "Changes saved" or Notion's "Synced" indicator. */}
      {showApiRecovered && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in" dir="rtl">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-500/15 backdrop-blur-md border border-emerald-500/25 rounded-2xl shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs font-medium text-emerald-300">
              השרת חזר לפעולה — הנתונים מעודכנים ✓
            </span>
          </div>
        </div>
      )}
      {/* Stale data indicator — shows when server returned 5xx but cached ETag data was served.
          Like Google Maps' "Data may be outdated" subtle warning. Transparent about data freshness
          without showing a scary error screen that would drive investors away. */}
      {isStaleData && !isMockData && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-bounce-in" dir="rtl">
          <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-2xl shadow-lg">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-xs font-medium text-amber-300">
              הנתונים עשויים להיות לא מעודכנים — השרת אינו מגיב כרגע
            </span>
            <button
              onClick={() => refetchPlots()}
              className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg hover:bg-amber-400/20 transition-colors flex-shrink-0"
            >
              נסה שוב
            </button>
          </div>
        </div>
      )}
      {/* Bounds filter badge — shows when "Search this area" is active */}
      {boundsFilter && (
        <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[50]" dir="rtl">
          <div className="flex items-center gap-2 bg-gold/15 backdrop-blur-md border border-gold/25 rounded-full px-4 py-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs font-medium text-gold">תוצאות מוגבלות לאזור הנבחר</span>
            <button
              onClick={handleClearBounds}
              className="text-gold/80 hover:text-white text-sm font-bold transition-colors mr-1"
              title="הסר סינון אזורי"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Market Ticker — Bloomberg-style rotating market insights (desktop only).
          Wrapped in IdleRender to defer until browser is idle — not needed for first paint. */}
      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="MarketTicker" silent>
            <MarketTicker plots={filteredPlots} />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>
      {/* Market Pulse — floating market activity widget (like Bloomberg's market indicators).
          Shows market heat, availability, new listings, and hot deals. */}
      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="MarketPulse" silent>
            <MarketPulse plots={filteredPlots} />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>
      {/* Market Velocity — real-time market speed indicators for professional investors.
          Shows avg days on market, absorption rate, view velocity, listing momentum.
          Unique to LandMap — neither Madlan nor Yad2 surface these metrics. */}
      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="MarketVelocity" silent>
            <MarketVelocity plots={filteredPlots} />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>
      {/* Welcome back notification — shows new plots since last visit (engagement/FOMO).
          Like Airbnb's "New since your last search". Deferred for perf. */}
      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="WelcomeBack" silent>
            <WelcomeBack plots={filteredPlots} />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>
      {/* Skip navigation for accessibility */}
      <a
        href="#map-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-[100] focus:bg-gold focus:text-navy focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        דלג לתוכן המפה
      </a>
      {/* Screen reader announcement for plot selection — WCAG 4.1.3 Status Messages */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {selectedPlot ? (() => {
          const bn = selectedPlot.block_number ?? selectedPlot.blockNumber
          const price = selectedPlot.total_price ?? selectedPlot.totalPrice
          const proj = selectedPlot.projected_value ?? selectedPlot.projectedValue
          const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
          return `נבחרה חלקה: גוש ${bn} חלקה ${selectedPlot.number}, ${selectedPlot.city}. מחיר ${formatPriceShort(price)}, תשואה ${roi} אחוז.`
        })() : ''}
      </div>
      {/* Screen reader announcement for filter result count — WCAG 4.1.3 Status Messages.
          Uses aria-live="polite" so it doesn't interrupt active screen reader navigation.
          Announces the result count whenever filters change (like Madlan's "X תוצאות"). */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {!isLoading && filteredPlots.length > 0
          ? `נמצאו ${filteredPlots.length} חלקות`
          : !isLoading && filteredPlots.length === 0
            ? 'לא נמצאו חלקות מתאימות לסינון הנוכחי'
            : ''
        }
      </div>
      <ConnectionStatus sseConnected={sseConnected} />
      {/* Offline/reconnection banner — shows when user loses internet (like Google Maps offline mode).
          On reconnect, auto-refreshes plot data to ensure freshness. */}
      <OfflineBanner onReconnect={refetchPlots} />
      {/* Data freshness indicator — shows when data was last synced (like Madlan's real-time feel) */}
      {dataUpdatedAt > 0 && (
        <DataFreshnessIndicator updatedAt={dataUpdatedAt} onRefresh={refetchPlots} />
      )}
      {/* Secondary widgets: only essential ones to avoid overlapping clutter.
          Deferred via IdleRender — these are interactive add-ons, not core functionality. */}
      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="AlertSubscription" silent>
            <AlertSubscription filters={filters} statusFilter={statusFilter} />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>
      {/* Keyboard navigation counter — shows "3 / 12" when navigating between plots
          with ←→ arrow keys. Gives spatial awareness during keyboard navigation.
          Auto-hides after 2s. Like media player volume overlays — transient, non-blocking.
          Unique to LandMap — Madlan/Yad2 have no keyboard navigation support. */}
      {navIndicator && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none animate-fade-in" dir="rtl">
          <div className="flex items-center gap-3 px-5 py-3 bg-navy/90 backdrop-blur-lg border border-gold/20 rounded-2xl shadow-2xl shadow-black/40">
            <span className="text-2xl font-black text-gold tabular-nums">{navIndicator.index}</span>
            <span className="text-sm text-slate-500 font-medium">/</span>
            <span className="text-2xl font-black text-slate-400 tabular-nums">{navIndicator.total}</span>
            <div className="flex flex-col mr-3 gap-0.5">
              <span className="text-[10px] text-slate-500">חלקות</span>
              <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold/50 transition-all duration-300"
                  style={{ width: `${(navIndicator.index / navIndicator.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <MapErrorBoundary>
        <MapArea
          plots={filteredPlots}
          pois={pois}
          selectedPlot={selectedPlot}
          onSelectPlot={handleSelectPlot}
          statusFilter={statusFilter}
          onToggleStatus={handleToggleStatus}
          favorites={favorites}
          compareIds={compareIds}
          onToggleCompare={toggleCompare}
          onClearFilters={handleClearFilters}
          onFilterChange={handleFilterChange}
          onSearchArea={handleSearchArea}
          autoSearch={autoSearchOnMove}
          onToggleAutoSearch={handleToggleAutoSearch}
        />
      </MapErrorBoundary>

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        plotCount={filteredPlots.length}
        statusFilter={statusFilter}
        onToggleStatus={handleToggleStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
        allPlots={plots}
        onSelectPlot={handleSelectPlot}
        savedSearches={savedSearches}
        onSaveSearch={saveSearch}
        onLoadSearch={handleLoadSearch}
        onRemoveSearch={removeSearch}
      />

      {selectedPlot && (
        <Suspense fallback={
          <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] md:w-[480px] max-w-full z-[60] bg-navy border-l border-white/10 shadow-2xl" dir="rtl">
            <div className="p-6 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-6 w-48 rounded bg-slate-700/50" />
                <div className="h-8 w-8 rounded-lg bg-slate-700/30" />
              </div>
              <div className="h-4 w-32 rounded bg-slate-700/30" />
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-20 rounded-xl bg-slate-700/20" />
                ))}
              </div>
              <div className="h-32 rounded-xl bg-slate-700/15 mt-4" />
              <div className="h-24 rounded-xl bg-slate-700/15" />
            </div>
          </div>
        }>
          <SidebarDetails
            plot={selectedPlot}
            onClose={handleCloseSidebar}
            onOpenLeadModal={() => setIsLeadModalOpen(true)}
            favorites={favorites}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
            allPlots={filteredPlots}
            onSelectPlot={handleSelectPlot}
            priceChange={getMergedPriceChange(selectedPlot.id)}
          />
        </Suspense>
      )}

      {/* Mobile sticky CTA bar — prominent WhatsApp/Call/Share buttons at the bottom.
          Like Madlan/Yad2's mobile bottom action bar that dramatically improves conversion.
          Only visible when a plot is selected and hidden on desktop (sm:hidden). */}
      {selectedPlot && (
        <Suspense fallback={null}>
          <MobilePlotActionBar
            plot={selectedPlot}
            isFavorite={favorites?.isFavorite(selectedPlot.id)}
            onToggleFavorite={favorites?.toggle}
          />
        </Suspense>
      )}

      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="RecentlyViewed" silent>
            <RecentlyViewed
              plots={filteredPlots}
              selectedPlot={selectedPlot}
              onSelectPlot={handleSelectPlot}
            />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>

      <Suspense fallback={null}>
        <WidgetErrorBoundary name="AIChat" silent>
          <AIChat
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(prev => !prev)}
            selectedPlot={selectedPlot}
          />
        </WidgetErrorBoundary>
      </Suspense>

      {/* Smart filter suggestions — appears when results are too few */}
      <FilterSuggestions
        filteredCount={filteredPlots.length}
        totalCount={plots.length}
        filters={filters}
        statusFilter={statusFilter}
        onFilterChange={handleFilterChange}
        onToggleStatus={handleToggleStatus}
        onClearFilters={handleClearFilters}
      />

      {/* Empty state overlay — shows on the map when filters produce zero results.
          Like Google Maps' "No results in this area" — prevents confusion about blank map.
          The FilterSuggestions component shows actionable filter loosening tips;
          this overlay provides the visual context that the map isn't broken, just empty. */}
      {!isLoading && filteredPlots.length === 0 && plots.length > 0 && (
        <div className="fixed inset-0 z-[25] pointer-events-none flex items-center justify-center" dir="rtl">
          <div className="pointer-events-auto bg-navy/85 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-7 max-w-sm text-center shadow-2xl animate-fade-in">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-slate-200 mb-2">אין חלקות מתאימות</h3>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              הסינון הנוכחי לא מציג תוצאות.{' '}
              {boundsFilter ? 'נסה להרחיב את אזור החיפוש במפה או ' : ''}
              נסה לשנות את הפילטרים.
            </p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-2.5 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
            >
              🔄 נקה את כל הסינונים
            </button>
            <div className="text-[10px] text-slate-600 mt-3">
              {plots.length} חלקות זמינות ללא סינון
            </div>
          </div>
        </div>
      )}

      <CompareBar
        compareIds={compareIds}
        plots={filteredPlots}
        onRemove={removeFromCompare}
        onClear={clearCompare}
      />

      <PlotCardStrip
        plots={filteredPlots}
        selectedPlot={selectedPlot}
        onSelectPlot={handleSelectPlot}
        compareIds={compareIds}
        onToggleCompare={toggleCompare}
        isLoading={isLoading}
        onClearFilters={handleClearFilters}
        getPriceChange={getMergedPriceChange}
        favorites={favorites}
        userLocation={userLocation}
      />

      <Suspense fallback={null}>
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          plot={selectedPlot}
        />
      </Suspense>

      <Suspense fallback={null}>
        <KeyboardShortcuts
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />
      </Suspense>

      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="FirstVisitHints" silent>
            <FirstVisitHints />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>

      {/* Featured Deals widget — shows server-scored top investment opportunities (like Madlan's "הזדמנויות חמות").
          Deferred via IdleRender for faster initial paint — loads after map & filters are ready. */}
      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="FeaturedDeals" silent>
            <FeaturedDeals onSelectPlot={handleSelectPlot} selectedPlot={selectedPlot} />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>

      {/* Price Movers widget — shows plots with recent price changes (drops & rises).
          Like Yad2's "המחיר ירד!" but as a standalone discovery widget.
          Uses server-side price_snapshots for cross-device persistence.
          Deferred via IdleRender — supplementary feature, not critical for first paint. */}
      <IdleRender>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="PriceMovers" silent>
            <PriceMovers onSelectPlot={handleSelectPlot} plots={filteredPlots} />
          </WidgetErrorBoundary>
        </Suspense>
      </IdleRender>

      {/* Keyboard shortcut discovery hint — hidden on mobile, shows a subtle "?" badge.
          Clicking opens the KeyboardShortcuts modal. Increases discoverability of the
          rich shortcut system (?, F, C, P, /, Ctrl+K, ←→, Enter) without cluttering the UI.
          Like GitHub's / Notion's keyboard shortcut hints. */}
      <button
        onClick={() => setIsShortcutsOpen(true)}
        className="fixed bottom-[5.5rem] left-4 z-[25] hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-navy/80 backdrop-blur-md border border-white/10 rounded-xl text-[10px] text-slate-500 hover:text-gold hover:border-gold/20 transition-all group"
        title="קיצורי מקלדת — לחץ ? לרשימה מלאה"
        aria-label="הצג קיצורי מקלדת"
      >
        <span className="text-[11px] font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10 group-hover:border-gold/20 group-hover:text-gold transition-colors">?</span>
        <span className="group-hover:text-slate-300 transition-colors">קיצורים</span>
      </button>

      {/* Floating contact CTA — desktop: full buttons, mobile: single expandable FAB.
          All buttons fire conversion tracking events via trackContactConversion()
          for marketing ROI measurement — like Madlan's internal funnel metrics. */}
      {/* Desktop version */}
      <div className="fixed bottom-[16rem] left-4 z-[30] hidden sm:flex flex-col gap-2 animate-bounce-in">
        <a
          href={selectedPlot
            ? whatsappLink(`שלום, אני מעוניין בפרטים על גוש ${selectedPlot.block_number ?? selectedPlot.blockNumber} חלקה ${selectedPlot.number} ב${selectedPlot.city}`)
            : whatsappLink('שלום, אני מעוניין בקרקעות להשקעה')
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactConversion('whatsapp', selectedPlot?.id, { source: 'map_fab_desktop' })}
          className="w-12 h-12 flex items-center justify-center bg-[#25D366] rounded-2xl shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:scale-110 transition-all"
          aria-label="צור קשר ב-WhatsApp"
        >
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
        <a
          href={selectedPlot
            ? `https://t.me/LandMapIsraelBot?start=plot_${selectedPlot.id}`
            : 'https://t.me/LandMapIsraelBot'
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactConversion('telegram', selectedPlot?.id, { source: 'map_fab_desktop' })}
          className="w-12 h-12 flex items-center justify-center bg-[#229ED9] rounded-2xl shadow-lg shadow-[#229ED9]/30 hover:shadow-xl hover:scale-110 transition-all"
          aria-label="צור קשר בטלגרם"
        >
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </a>
        <button
          onClick={() => { trackContactConversion('phone', selectedPlot?.id, { source: 'map_fab_desktop' }); setIsLeadModalOpen(true) }}
          className="w-12 h-12 flex items-center justify-center bg-gradient-to-r from-gold via-gold-bright to-gold text-navy rounded-2xl shadow-lg shadow-gold/30 hover:shadow-xl hover:scale-110 transition-all"
          aria-label="צור קשר לפרטים"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>
      {/* Mobile version — single WhatsApp FAB, compact */}
      <div className="fixed bottom-[13rem] right-[4.5rem] z-[30] sm:hidden">
        <a
          href={selectedPlot
            ? whatsappLink(`שלום, אני מעוניין בפרטים על גוש ${selectedPlot.block_number ?? selectedPlot.blockNumber} חלקה ${selectedPlot.number} ב${selectedPlot.city}`)
            : whatsappLink('שלום, אני מעוניין בקרקעות להשקעה')
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackContactConversion('whatsapp', selectedPlot?.id, { source: 'map_fab_mobile' })}
          className="w-11 h-11 flex items-center justify-center bg-[#25D366] rounded-xl shadow-lg shadow-[#25D366]/30 transition-all"
          aria-label="צור קשר ב-WhatsApp"
        >
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>
    </div>
  )
}
