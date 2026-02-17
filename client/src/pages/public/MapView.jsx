import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllPlots } from '../../hooks/usePlots.js'
import { usePois } from '../../hooks/usePois.js'
import { useFavorites } from '../../hooks/useFavorites.js'
import MapArea from '../../components/MapArea.jsx'
import FilterBar from '../../components/FilterBar.jsx'
import SidebarDetails from '../../components/SidebarDetails.jsx'
import PlotCardStrip from '../../components/PlotCardStrip.jsx'
import AIChat from '../../components/AIChat.jsx'
import LeadModal from '../../components/LeadModal.jsx'
import Spinner from '../../components/ui/Spinner.jsx'

const initialFilters = {
  city: 'all',
  priceMin: '',
  priceMax: '',
  sizeMin: '',
  sizeMax: '',
  ripeness: 'all',
  search: '',
}

export default function MapView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)

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
      search: p.q || '',
    }
  })
  const [statusFilter, setStatusFilter] = useState(() => {
    const s = searchParams.get('status')
    return s ? s.split(',') : []
  })
  const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || 'default')
  const favorites = useFavorites()

  // Sync filters to URL for shareable links
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.city !== 'all') params.set('city', filters.city)
    if (filters.priceMin) params.set('priceMin', filters.priceMin)
    if (filters.priceMax) params.set('priceMax', filters.priceMax)
    if (filters.sizeMin) params.set('sizeMin', filters.sizeMin)
    if (filters.sizeMax) params.set('sizeMax', filters.sizeMax)
    if (filters.ripeness !== 'all') params.set('ripeness', filters.ripeness)
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

  // Client-side search filter
  const searchedPlots = useMemo(() => {
    if (!filters.search) return plots
    const q = filters.search.toLowerCase()
    return plots.filter((p) => {
      const bn = (p.block_number ?? p.blockNumber ?? '').toString()
      const num = (p.number ?? '').toString()
      const city = (p.city ?? '').toLowerCase()
      const desc = (p.description ?? '').toLowerCase()
      return bn.includes(q) || num.includes(q) || city.includes(q) || desc.includes(q)
    })
  }, [plots, filters.search])

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

  // Keyboard shortcuts: ESC to close, ← → to navigate plots
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (isLeadModalOpen) setIsLeadModalOpen(false)
        else if (isChatOpen) setIsChatOpen(false)
        else if (selectedPlot) handleCloseSidebar()
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
  }, [isLeadModalOpen, isChatOpen, selectedPlot, filteredPlots])

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

  const handleToggleStatus = useCallback((status) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    )
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
      />

      <SidebarDetails
        plot={selectedPlot}
        onClose={handleCloseSidebar}
        onOpenLeadModal={() => setIsLeadModalOpen(true)}
        favorites={favorites}
      />

      <AIChat
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(prev => !prev)}
        selectedPlot={selectedPlot}
      />

      <PlotCardStrip
        plots={filteredPlots}
        selectedPlot={selectedPlot}
        onSelectPlot={handleSelectPlot}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        plot={selectedPlot}
      />
    </div>
  )
}
