import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllPlots } from '../../hooks/usePlots.js'
import { usePois } from '../../hooks/usePois.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import MapArea from '../../components/MapArea.jsx'
import FilterBar from '../../components/FilterBar.jsx'
import SidebarDetails from '../../components/SidebarDetails.jsx'
import PlotCardStrip from '../../components/PlotCardStrip.jsx'
import AIChat from '../../components/AIChat.jsx'
import LeadModal from '../../components/LeadModal.jsx'
import CompareBar from '../../components/CompareBar.jsx'
import Spinner from '../../components/ui/Spinner.jsx'
import KeyboardShortcuts from '../../components/KeyboardShortcuts.jsx'
import RecentlyViewed from '../../components/RecentlyViewed.jsx'
import ConnectionStatus from '../../components/ui/ConnectionStatus.jsx'
import { useMetaTags } from '../../hooks/useMetaTags.js'
import { formatCurrency, calcInvestmentScore } from '../../utils/formatters.js'
import { useSavedSearches } from '../../hooks/useSavedSearches.js'
import { Phone } from 'lucide-react'

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
    return f
  }, [filters, statusFilter])

  const { data: plots = [], isLoading } = useAllPlots(apiFilters)
  const { data: pois = [] } = usePois()

  // Debounce search for performance
  const debouncedSearch = useDebounce(filters.search, 250)

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

  // Client-side search filter
  const searchedPlots = useMemo(() => {
    if (!debouncedSearch) return roiFilteredPlots
    const q = debouncedSearch.toLowerCase()
    return roiFilteredPlots.filter((p) => {
      const bn = (p.block_number ?? p.blockNumber ?? '').toString()
      const num = (p.number ?? '').toString()
      const city = (p.city ?? '').toLowerCase()
      const desc = (p.description ?? '').toLowerCase()
      return bn.includes(q) || num.includes(q) || city.includes(q) || desc.includes(q)
    })
  }, [roiFilteredPlots, debouncedSearch])

  // Sort
  const filteredPlots = useMemo(() => {
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
    }
    return sorted
  }, [searchedPlots, sortBy])

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
  }, [])

  const handleCloseSidebar = useCallback(() => {
    setSelectedPlot(null)
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

  // Dynamic OG meta tags for social sharing
  useMetaTags(
    selectedPlot
      ? {
          title: `גוש ${selectedPlot.block_number ?? selectedPlot.blockNumber} חלקה ${selectedPlot.number} | LandMap Israel`,
          description: `${selectedPlot.city} · ${formatCurrency(selectedPlot.total_price ?? selectedPlot.totalPrice)} · ${((selectedPlot.size_sqm ?? selectedPlot.sizeSqM) / 1000).toFixed(1)} דונם`,
          url: window.location.href,
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

  return (
    <div className={`relative h-screen w-screen overflow-hidden bg-navy ${selectedPlot ? 'sidebar-open' : ''}`}>
      {/* Skip navigation for accessibility */}
      <a
        href="#map-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-[100] focus:bg-gold focus:text-navy focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold"
      >
        דלג לתוכן המפה
      </a>
      <ConnectionStatus />
      <MapArea
        plots={filteredPlots}
        pois={pois}
        selectedPlot={selectedPlot}
        onSelectPlot={handleSelectPlot}
        statusFilter={statusFilter}
        onToggleStatus={handleToggleStatus}
        favorites={favorites}
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

      <SidebarDetails
        plot={selectedPlot}
        onClose={handleCloseSidebar}
        onOpenLeadModal={() => setIsLeadModalOpen(true)}
        favorites={favorites}
        compareIds={compareIds}
        onToggleCompare={toggleCompare}
        allPlots={filteredPlots}
        onSelectPlot={handleSelectPlot}
      />

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

      {/* Floating contact CTA — always visible, like competitors */}
      {selectedPlot && (
        <button
          onClick={() => setIsLeadModalOpen(true)}
          className="fixed bottom-36 sm:bottom-6 left-4 z-[30] flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gold via-gold-bright to-gold text-navy font-extrabold text-sm rounded-2xl shadow-lg shadow-gold/30 hover:shadow-xl hover:scale-105 transition-all animate-bounce-in"
          aria-label="צור קשר לגבי חלקה זו"
        >
          <Phone className="w-4 h-4" />
          <span className="hidden sm:inline">צור קשר</span>
        </button>
      )}
    </div>
  )
}
