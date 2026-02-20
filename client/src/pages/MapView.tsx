import { useState, useMemo, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { t, media } from '../theme'
import { useAllPlots, useFavorites, useDebounce } from '../hooks'
import { ErrorBoundary, Spinner } from '../components/UI'
import MapArea from '../components/Map'
import FilterBar from '../components/Filters'
import { p, roi } from '../utils'
import { pois } from '../data'
import type { Plot, Filters } from '../types'

const Sidebar = lazy(() => import('../components/Sidebar'))
const LeadModal = lazy(() => import('../components/LeadModal'))
const Chat = lazy(() => import('../components/Chat'))

const emptyFilters: Filters = {
  city: 'all', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '',
  ripeness: 'all', minRoi: 'all', zoning: 'all', search: '',
}

const Root = styled.div`
  position: relative; height: 100dvh; width: 100vw;
  overflow: hidden; background: ${t.colors.bg};
`
const MapWrap = styled.div`position: absolute; inset: 0; z-index: ${t.z.map};`

const StatsBar = styled.div`
  position: fixed; bottom: 12px; right: 12px; z-index: ${t.z.filter};
  display: flex; gap: 6px;
  ${media.mobile} { bottom: 68px; right: 8px; }
`
const StatChip = styled.div`
  display: flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: ${t.radius.full};
  background: ${t.colors.glass};
  backdrop-filter: blur(12px);
  border: 1px solid ${t.colors.glassBorder};
  font-size: 11px; color: ${t.colors.textSec}; font-weight: 500;
  font-variant-numeric: tabular-nums;
`

const MobileNav = styled.nav`
  display: none;
  ${media.mobile} {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0;
    z-index: ${t.z.filter}; height: 56px;
    background: ${t.colors.surface}; border-top: 1px solid ${t.colors.border};
    align-items: center; justify-content: space-around;
    padding: 0 8px;
  }
`
const NavItem = styled.button<{ $active?: boolean }>`
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 4px 12px; border: none; background: none; cursor: pointer;
  color: ${({ $active }) => $active ? t.colors.gold : t.colors.textDim};
  font-size: 10px; font-family: ${t.font};
`

export default function MapView() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [selected, setSelected] = useState<Plot | null>(null)
  const [leadPlot, setLeadPlot] = useState<Plot | null>(null)
  const favorites = useFavorites()

  const debouncedSearch = useDebounce(filters.search, 300)

  const apiFilters = useMemo(() => {
    const f: Record<string, string | number | undefined> = {}
    if (filters.city !== 'all') f.city = filters.city
    if (filters.priceMin) f.min_price = Number(filters.priceMin)
    if (filters.priceMax) f.max_price = Number(filters.priceMax)
    if (filters.zoning !== 'all') f.zoning_stage = filters.zoning
    return f
  }, [filters.city, filters.priceMin, filters.priceMax, filters.zoning])

  const { data: plots = [], isLoading, isMock } = useAllPlots(apiFilters)

  const filteredPlots = useMemo(() => {
    let result = plots as Plot[]
    if (filters.sizeMin) result = result.filter(pl => (pl.size_sqm ?? pl.sizeSqM ?? 0) >= Number(filters.sizeMin))
    if (filters.sizeMax) result = result.filter(pl => (pl.size_sqm ?? pl.sizeSqM ?? 0) <= Number(filters.sizeMax))
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      result = result.filter(pl =>
        pl.city?.toLowerCase().includes(q) ||
        pl.description?.toLowerCase().includes(q) ||
        String(pl.block_number ?? pl.blockNumber ?? '').includes(q) ||
        String(pl.number ?? '').includes(q)
      )
    }
    return result
  }, [plots, filters.sizeMin, filters.sizeMax, debouncedSearch])

  const avgPrice = useMemo(() => {
    if (!filteredPlots.length) return 0
    return Math.round(filteredPlots.reduce((s, pl) => s + (pl.total_price ?? pl.totalPrice ?? 0), 0) / filteredPlots.length)
  }, [filteredPlots])

  const handleSelect = useCallback((plot: Plot) => setSelected(plot), [])
  const handleLead = useCallback((plot: Plot) => setLeadPlot(plot), [])

  return (
    <Root>
      <MapWrap>
        <ErrorBoundary fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: t.colors.textSec }}>שגיאה בטעינת המפה</div>}>
          <MapArea
            plots={filteredPlots}
            pois={pois}
            selected={selected}
            onSelect={handleSelect}
            onLead={handleLead}
            favorites={favorites}
          />
        </ErrorBoundary>
      </MapWrap>

      <FilterBar filters={filters} onChange={setFilters} plotCount={filteredPlots.length} />

      <StatsBar>
        <StatChip>{filteredPlots.length} חלקות</StatChip>
        {avgPrice > 0 && <StatChip>ממוצע {(avgPrice / 1000).toFixed(0)}K ₪</StatChip>}
        {isMock && <StatChip style={{ borderColor: `${t.colors.warning}40`, color: t.colors.warning }}>נתוני דמו</StatChip>}
      </StatsBar>

      <Suspense fallback={null}>
        <Sidebar
          plot={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onLead={() => { if (selected) setLeadPlot(selected) }}
          onNavigate={id => navigate(`/plot/${id}`)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <LeadModal open={!!leadPlot} onClose={() => setLeadPlot(null)} plot={leadPlot} />
      </Suspense>

      <Suspense fallback={null}>
        <Chat plotId={selected?.id || null} />
      </Suspense>

      <MobileNav>
        <NavItem $active>🗺️ מפה</NavItem>
        <NavItem onClick={() => navigate('/favorites')}>❤️ מועדפים</NavItem>
        <NavItem onClick={() => navigate('/calculator')}>🧮 מחשבון</NavItem>
        <NavItem onClick={() => navigate('/areas')}>📊 אזורים</NavItem>
      </MobileNav>
    </Root>
  )
}
