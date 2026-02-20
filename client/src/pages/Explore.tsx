import { useState, useMemo, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { Map as MapIcon, Heart, Calculator, Layers } from 'lucide-react'
import { t, mobile } from '../theme'
import { useAllPlots, useFavorites, useDebounce } from '../hooks'
import MapArea from '../components/Map'
import FilterBar from '../components/Filters'
import { ErrorBoundary, Spinner } from '../components/UI'
import { p, roi, fmt } from '../utils'
import { pois } from '../data'
import type { Plot, Filters } from '../types'

const Sidebar = lazy(() => import('../components/Sidebar'))
const LeadModal = lazy(() => import('../components/LeadModal'))
const Chat = lazy(() => import('../components/Chat'))

const DEFAULTS: Filters = { city: '', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: '', minRoi: '', zoning: '', search: '' }

/* ── styled ── */
const Wrap = styled.div`position:relative;width:100vw;height:100vh;height:100dvh;overflow:hidden;background:${t.bg};`
const Stats = styled.div`
  position:absolute;bottom:0;left:0;right:0;z-index:${t.z.filter};
  display:flex;align-items:center;justify-content:center;gap:24px;padding:8px 16px;
  background:${t.glass};backdrop-filter:blur(12px);border-top:1px solid ${t.border};
  font-size:12px;color:${t.textSec};direction:rtl;
  ${mobile}{bottom:56px;gap:12px;font-size:11px;}
`
const Stat = styled.span`display:flex;align-items:center;gap:4px;`
const Val = styled.span`color:${t.goldBright};font-weight:700;`
const Demo = styled.span`padding:2px 8px;border-radius:${t.r.full};background:${t.goldDim};color:${t.gold};font-size:10px;font-weight:600;`
const MobileNav = styled.nav`
  display:none;position:fixed;bottom:0;left:0;right:0;z-index:${t.z.nav};
  background:${t.surface};border-top:1px solid ${t.border};
  ${mobile}{display:flex;justify-content:space-around;align-items:center;height:56px;}
`
const NavBtn = styled.button<{$active?:boolean}>`
  display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;
  color:${pr=>pr.$active?t.gold:t.textDim};font-size:10px;font-family:${t.font};cursor:pointer;
  padding:4px 12px;transition:color ${t.tr};
`
const Loader = styled.div`position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:2;`

export default function Explore() {
  const [filters, setFilters] = useState<Filters>(DEFAULTS)
  const [selected, setSelected] = useState<Plot | null>(null)
  const [leadPlot, setLeadPlot] = useState<Plot | null>(null)
  const [tab, setTab] = useState<'map'|'fav'|'calc'|'areas'>('map')
  const { isFav, toggle, ids: favIds } = useFavorites()

  const apiFilters = useMemo(() => {
    const f: Record<string, string> = {}
    if (filters.city && filters.city !== 'all') f.city = filters.city
    if (filters.priceMin) f.priceMin = filters.priceMin
    if (filters.priceMax) f.priceMax = filters.priceMax
    if (filters.zoning) f.zoning = filters.zoning
    return f
  }, [filters.city, filters.priceMin, filters.priceMax, filters.zoning])

  const { data: plots = [], isLoading } = useAllPlots(apiFilters)
  const dSearch = useDebounce(filters.search, 300)

  const filtered = useMemo(() => {
    let list = plots
    const sMin = Number(filters.sizeMin), sMax = Number(filters.sizeMax)
    if (sMin > 0) list = list.filter(pl => p(pl).size >= sMin)
    if (sMax > 0) list = list.filter(pl => p(pl).size <= sMax)
    if (dSearch) {
      const q = dSearch.toLowerCase()
      list = list.filter(pl => pl.city?.toLowerCase().includes(q) || pl.number?.includes(q) || String(p(pl).block).includes(q))
    }
    return list
  }, [plots, filters.sizeMin, filters.sizeMax, dSearch])

  const avg = filtered.length ? filtered.reduce((s, pl) => s + p(pl).price, 0) / filtered.length : 0

  return (
    <Wrap className="dark">
      <ErrorBoundary>
        {isLoading && <Loader><Spinner size={36} /></Loader>}
        <MapArea
          plots={filtered} pois={pois} selected={selected} darkMode
          onSelect={setSelected} onLead={setLeadPlot}
          favorites={{ isFav, toggle }}
        />
        <FilterBar filters={filters} onChange={setFilters} resultCount={filtered.length} />

        <Suspense fallback={null}>
          {selected && <Sidebar plot={selected} open={!!selected} onClose={() => setSelected(null)} onLead={() => setLeadPlot(selected)} />}
        </Suspense>
        <Suspense fallback={null}>
          <LeadModal plot={leadPlot} open={!!leadPlot} onClose={() => setLeadPlot(null)} />
        </Suspense>
        <Suspense fallback={null}><Chat plotId={selected?.id ?? null} /></Suspense>

        <Stats>
          <Stat><Val>{filtered.length}</Val> חלקות</Stat>
          <Stat>ממוצע <Val>{fmt.compact(avg)}</Val></Stat>
          <Demo>DEMO</Demo>
        </Stats>

        <MobileNav>
          <NavBtn $active={tab==='map'} onClick={()=>setTab('map')}><MapIcon size={20}/>מפה</NavBtn>
          <NavBtn $active={tab==='fav'} onClick={()=>setTab('fav')}><Heart size={20}/>מועדפים</NavBtn>
          <NavBtn $active={tab==='calc'} onClick={()=>setTab('calc')}><Calculator size={20}/>מחשבון</NavBtn>
          <NavBtn $active={tab==='areas'} onClick={()=>setTab('areas')}><Layers size={20}/>אזורים</NavBtn>
        </MobileNav>
      </ErrorBoundary>
    </Wrap>
  )
}
