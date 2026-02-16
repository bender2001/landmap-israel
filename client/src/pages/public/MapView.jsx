import { useState, useMemo, useCallback } from 'react'
import { useAllPlots } from '../../hooks/usePlots.js'
import { usePois } from '../../hooks/usePois.js'
import MapArea from '../../components/MapArea.jsx'
import FilterBar from '../../components/FilterBar.jsx'
import SidebarDetails from '../../components/SidebarDetails.jsx'
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
}

export default function MapView() {
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const [statusFilter, setStatusFilter] = useState([])
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)

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
    <div className="relative h-screen w-screen overflow-hidden bg-navy">
      <MapArea
        plots={plots}
        pois={pois}
        selectedPlot={selectedPlot}
        onSelectPlot={handleSelectPlot}
        statusFilter={statusFilter}
        onToggleStatus={handleToggleStatus}
      />

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        plotCount={plots.length}
        statusFilter={statusFilter}
        onToggleStatus={handleToggleStatus}
      />

      <SidebarDetails
        plot={selectedPlot}
        onClose={handleCloseSidebar}
        onOpenLeadModal={() => setIsLeadModalOpen(true)}
      />

      <AIChat
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(prev => !prev)}
        selectedPlot={selectedPlot}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        plot={selectedPlot}
      />
    </div>
  )
}
