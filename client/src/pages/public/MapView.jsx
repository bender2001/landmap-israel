import { useState, useMemo, useCallback, useEffect, useRef, Suspense, useDeferredValue } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllPlots } from '../../hooks/usePlots.js'
import { usePois } from '../../hooks/usePois.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import MapArea from '../../components/MapArea.jsx'
import FilterBar from '../../components/FilterBar.jsx'
import { lazy } from 'react'
const SidebarDetails = lazy(() => import('../../components/SidebarDetails.jsx'))
import PlotCardStrip from '../../components/PlotCardStrip.jsx'
import AIChat from '../../components/AIChat.jsx'
import LeadModal from '../../components/LeadModal.jsx'
import CompareBar from '../../components/CompareBar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import KeyboardShortcuts from '../../components/KeyboardShortcuts.jsx'
import RecentlyViewed from '../../components/RecentlyViewed.jsx'
import ConnectionStatus from '../../components/ui/ConnectionStatus.jsx'
import MarketStatsWidget from '../../components/MarketStatsWidget.jsx'
import DealAlerts from '../../components/DealAlerts.jsx'
import { useMetaTags } from '../../hooks/useMetaTags.js'
import { useStructuredData } from '../../hooks/useStructuredData.js'
import { formatCurrency, calcInvestmentScore, calcCAGR } from '../../utils/formatters.js'
import { useViewTracker } from '../../hooks/useViewTracker.js'
import { usePriceTracker } from '../../hooks/usePriceTracker.js'
import { useSavedSearches } from '../../hooks/useSavedSearches.js'
import { Phone } from 'lucide-react'
import { whatsappLink, CONTACT, plotOgImageUrl } from '../../utils/config.js'
import FirstVisitHints from '../../components/FirstVisitHints.jsx'
import MarketTicker from '../../components/MarketTicker.jsx'
import AlertSubscription from '../../components/AlertSubscription.jsx'
import DealSpotlight from '../../components/DealSpotlight.jsx'
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates.js'

function DataFreshnessIndicator({ updatedAt, onRefresh }) {
  const [, setTick] = useState(0)

  // Re-render every 30s to update relative time
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const ago = Math.round((Date.now() - updatedAt) / 1000)
  const label = ago < 60 ? 'עכשיו' : ago < 3600 ? `לפני ${Math.floor(ago / 60)} דק׳` : `לפני ${Math.floor(ago / 3600)} שע׳`
  const isStale = ago > 300 // >5 min

  return (
    <button
      onClick={onRefresh}
      className={`fixed top-[2.75rem] left-4 sm:left-auto sm:top-auto sm:bottom-[5.5rem] sm:right-6 z-[30] flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] backdrop-blur-md border transition-all hover:scale-105 ${
        isStale
          ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
          : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-400'
      }`}
      title="לחץ לרענון הנתונים"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isStale ? 'bg-orange-400 animate-pulse' : 'bg-emerald-400'}`} />
      {label}
    </button>
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
  search: '',
}

export default function MapView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)

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

  // Compare state (localStorage-backed, not URL to avoid conflict with filters)
  const [compareIds, setCompareIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('landmap_compare') || '[]') } catch { return [] }
  })
  useEffect(() => {
    localStorage.setItem('landmap_compare', JSON.stringify(compareIds))
  }, [compareIds])
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
    if (filters.search) params.set('q', filters.search)
    if (statusFilter.length > 0) params.set('status', statusFilter.join(','))
    if (sortBy !== 'default') params.set('sort', sortBy)
    if (selectedPlot) params.set('plot', selectedPlot.id)
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
    if (statusFilter.length > 0) f.status = statusFilter.join(',')
    // Pass search query to server for DB-level text search (faster than client-side)
    if (debouncedSearch) f.q = debouncedSearch
    // Pass simple sorts to server for better performance
    if (['price-asc', 'price-desc', 'size-asc', 'size-desc'].includes(sortBy)) {
      f.sort = sortBy
    }
    return f
  }, [filters, statusFilter, sortBy, debouncedSearch])

  const { data: plots = [], isLoading, error: plotsError, refetch: refetchPlots, isPlaceholderData, dataUpdatedAt, isMockData } = useAllPlots(apiFilters)
  const { data: pois = [] } = usePois()

  // Record prices for change detection (like Yad2's "המחיר ירד!" badge)
  useEffect(() => {
    if (plots.length > 0) recordPrices(plots)
  }, [plots, recordPrices])

  // Client-side ROI filter
  const roiFilteredPlots = useMemo(() => {
    if (!filters.minRoi || filters.minRoi === 'all') return plots
    const minRoi = parseInt(filters.minRoi, 10)
    return plots.filter((p) => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      if (price <= 0) return false
      const roi = ((proj - price) / price) * 100
      return roi >= minRoi
    })
  }, [plots, filters.minRoi])

  // Client-side search filter — acts as secondary filter for instant feedback
  // while server-side q param handles the primary DB-level search
  const searchedPlots = useMemo(() => {
    // When search is passed to API (debouncedSearch), server already filtered — skip client filter
    // Only apply client-side filter for the brief moment between typing and debounce
    const activeSearch = filters.search && filters.search !== debouncedSearch ? filters.search : ''
    if (!activeSearch) return roiFilteredPlots
    const q = activeSearch.toLowerCase()
    return roiFilteredPlots.filter((p) => {
      const bn = (p.block_number ?? p.blockNumber ?? '').toString()
      const num = (p.number ?? '').toString()
      const city = (p.city ?? '').toLowerCase()
      const desc = (p.description ?? '').toLowerCase()
      return bn.includes(q) || num.includes(q) || city.includes(q) || desc.includes(q)
    })
  }, [roiFilteredPlots, filters.search, debouncedSearch])

  // Sort
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
    switch (sortBy) {
      case 'price-asc': sorted.sort((a, b) => getPrice(a) - getPrice(b)); break
      case 'price-desc': sorted.sort((a, b) => getPrice(b) - getPrice(a)); break
      case 'size-asc': sorted.sort((a, b) => getSize(a) - getSize(b)); break
      case 'size-desc': sorted.sort((a, b) => getSize(b) - getSize(a)); break
      case 'roi-desc': sorted.sort((a, b) => getRoi(b) - getRoi(a)); break
      case 'roi-asc': sorted.sort((a, b) => getRoi(a) - getRoi(b)); break
      case 'ppsqm-asc': sorted.sort((a, b) => {
        const aPpsqm = getSize(a) > 0 ? getPrice(a) / getSize(a) : Infinity
        const bPpsqm = getSize(b) > 0 ? getPrice(b) / getSize(b) : Infinity
        return aPpsqm - bPpsqm
      }); break
      case 'ppsqm-desc': sorted.sort((a, b) => {
        const aPpsqm = getSize(a) > 0 ? getPrice(a) / getSize(a) : 0
        const bPpsqm = getSize(b) > 0 ? getPrice(b) / getSize(b) : 0
        return bPpsqm - aPpsqm
      }); break
      case 'score-desc': sorted.sort((a, b) => calcInvestmentScore(b) - calcInvestmentScore(a)); break
      case 'cagr-desc': sorted.sort((a, b) => {
        const getCagr = (p) => {
          const price = p.total_price ?? p.totalPrice ?? 0
          const proj = p.projected_value ?? p.projectedValue ?? 0
          const roiPct = price > 0 ? ((proj - price) / price) * 100 : 0
          const readiness = p.readiness_estimate ?? p.readinessEstimate ?? ''
          const data = calcCAGR(roiPct, readiness)
          return data ? data.cagr : 0
        }
        return getCagr(b) - getCagr(a)
      }); break
    }
    return sorted
  }, [searchedPlots, sortBy])

  // Defer heavy plot list updates so filter inputs stay responsive
  const filteredPlots = useDeferredValue(sortedPlots)
  const isFilterStale = filteredPlots !== sortedPlots

  // URL sync: open plot from ?plot=id on load
  useEffect(() => {
    const plotId = searchParams.get('plot')
    if (plotId && filteredPlots.length > 0 && !selectedPlot) {
      const found = filteredPlots.find((p) => p.id === plotId)
      if (found) setSelectedPlot(found)
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
      // P key to print report for selected plot
      if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey) {
        const tag = document.activeElement?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        // Handled by SidebarDetails internally — we just need the shortcut documented
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
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isShortcutsOpen, isLeadModalOpen, isChatOpen, selectedPlot, filteredPlots])

  const handleSelectPlot = useCallback((plot) => {
    setSelectedPlot(plot)
    if (plot?.id) trackView(plot.id)
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

  // Real-time updates via SSE — auto-refresh when admin changes plots
  useRealtimeUpdates()

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
      <div className="h-screen w-screen flex items-center justify-center bg-navy">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="w-12 h-12 text-gold" />
          <span className="text-sm text-slate-400">טוען נתונים...</span>
        </div>
      </div>
    )
  }

  if (plotsError && plots.length === 0) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-navy" dir="rtl">
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
    <div className={`relative h-screen w-screen overflow-hidden bg-navy ${selectedPlot ? 'sidebar-open' : ''}`}>
      {/* Filter transition indicator */}
      {(isFilterStale || isPlaceholderData) && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-0.5">
          <div className="h-full bg-gradient-to-r from-gold via-gold-bright to-gold animate-pulse rounded-full" />
        </div>
      )}
      {/* Mock data warning — shown when API is unreachable and fallback demo data is used */}
      {isMockData && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600/90 backdrop-blur-sm text-white text-center py-2 px-4 text-xs font-medium flex items-center justify-center gap-2" dir="rtl">
          <span>⚠️</span>
          <span>השרת אינו זמין — מוצגים נתוני הדגמה. הנתונים עשויים להיות לא מעודכנים.</span>
          <button
            onClick={() => refetchPlots()}
            className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 rounded-md text-[11px] font-bold transition-colors mr-2"
          >
            נסה שוב
          </button>
        </div>
      )}
      {/* Skip navigation for accessibility */}
      <a
        href="#map-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-[100] focus:bg-gold focus:text-navy focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        דלג לתוכן המפה
      </a>
      <ConnectionStatus />
      {/* Data freshness indicator — shows when data was last synced (like Madlan's real-time feel) */}
      {dataUpdatedAt > 0 && (
        <DataFreshnessIndicator updatedAt={dataUpdatedAt} onRefresh={refetchPlots} />
      )}
      <MarketTicker plots={filteredPlots} />
      <AlertSubscription filters={filters} statusFilter={statusFilter} />
      <MarketStatsWidget plots={filteredPlots} />
      <DealAlerts plots={filteredPlots} onSelectPlot={handleSelectPlot} />
      <DealSpotlight plots={filteredPlots} onSelectPlot={handleSelectPlot} />
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
      />

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
          <div className="sidebar-details-panel" dir="rtl">
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
            priceChange={getPriceChange(selectedPlot.id)}
          />
        </Suspense>
      )}

      <RecentlyViewed
        plots={filteredPlots}
        selectedPlot={selectedPlot}
        onSelectPlot={handleSelectPlot}
      />

      <AIChat
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(prev => !prev)}
        selectedPlot={selectedPlot}
      />

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
        getPriceChange={getPriceChange}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        plot={selectedPlot}
      />

      <KeyboardShortcuts
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <FirstVisitHints />

      {/* Floating contact CTA — always visible, like Madlan/Yad2 */}
      <div className="fixed bottom-44 sm:bottom-[9.5rem] left-4 z-[30] flex flex-col gap-2 animate-bounce-in">
        {/* WhatsApp quick contact */}
        <a
          href={selectedPlot
            ? whatsappLink(`שלום, אני מעוניין בפרטים על גוש ${selectedPlot.block_number ?? selectedPlot.blockNumber} חלקה ${selectedPlot.number} ב${selectedPlot.city}`)
            : whatsappLink('שלום, אני מעוניין בקרקעות להשקעה')
          }
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 flex items-center justify-center bg-[#25D366] rounded-2xl shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:scale-110 transition-all"
          aria-label="צור קשר ב-WhatsApp"
        >
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
        {/* Telegram quick contact */}
        <a
          href={selectedPlot
            ? `https://t.me/LandMapIsraelBot?start=plot_${selectedPlot.id}`
            : 'https://t.me/LandMapIsraelBot'
          }
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 flex items-center justify-center bg-[#229ED9] rounded-2xl shadow-lg shadow-[#229ED9]/30 hover:shadow-xl hover:scale-110 transition-all"
          aria-label="צור קשר בטלגרם"
        >
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </a>
        {/* Lead form button */}
        <button
          onClick={() => setIsLeadModalOpen(true)}
          className="w-14 h-14 flex items-center justify-center bg-gradient-to-r from-gold via-gold-bright to-gold text-navy rounded-2xl shadow-lg shadow-gold/30 hover:shadow-xl hover:scale-110 transition-all"
          aria-label="צור קשר לפרטים"
        >
          <Phone className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
