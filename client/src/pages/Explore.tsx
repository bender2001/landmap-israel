import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Map as MapIcon, Heart, Calculator, Layers, ArrowUpDown, GitCompareArrows, X, Trash2 } from 'lucide-react'
import { t, mobile } from '../theme'
import { useAllPlots, useFavorites, useCompare, useDebounce } from '../hooks'
import MapArea from '../components/Map'
import FilterBar from '../components/Filters'
import { ErrorBoundary, Spinner } from '../components/UI'
import { p, roi, fmt, sortPlots, SORT_OPTIONS, pricePerSqm } from '../utils'
import type { SortKey } from '../utils'
import { pois } from '../data'
import type { Plot, Filters } from '../types'

const Sidebar = lazy(() => import('../components/Sidebar'))
const LeadModal = lazy(() => import('../components/LeadModal'))
const Chat = lazy(() => import('../components/Chat'))
const PlotListPanel = lazy(() => import('../components/PlotListPanel'))

const DEFAULTS: Filters = { city: '', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: '', minRoi: '', zoning: '', search: '' }

/* ── animations ── */
const slideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const chipPop = keyframes`from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}`

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

/* ── Sort ── */
const SortWrap = styled.div`
  position:absolute;top:16px;right:16px;z-index:${t.z.filter};direction:rtl;
  ${mobile}{top:8px;right:8px;}
`
const SortBtn = styled.button<{$active?:boolean}>`
  display:inline-flex;align-items:center;gap:6px;padding:8px 14px;
  background:${pr=>pr.$active?t.goldDim:t.glass};backdrop-filter:blur(16px);
  border:1px solid ${pr=>pr.$active?t.goldBorder:t.glassBorder};border-radius:${t.r.full};
  color:${pr=>pr.$active?t.gold:t.textSec};font-size:12px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};box-shadow:${t.sh.sm};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const SortDrop = styled.div`
  position:absolute;top:calc(100% + 6px);right:0;min-width:140px;
  background:${t.glass};backdrop-filter:blur(24px);border:1px solid ${t.glassBorder};
  border-radius:${t.r.md};box-shadow:${t.sh.lg};overflow:hidden;
`
const SortOption = styled.button<{$active?:boolean}>`
  display:block;width:100%;padding:8px 14px;text-align:right;
  background:${pr=>pr.$active?t.goldDim:'transparent'};border:none;
  color:${pr=>pr.$active?t.gold:t.textSec};font-size:12px;font-weight:${pr=>pr.$active?700:500};
  font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.gold};}
`

/* ── Compare Bar (floating bottom tray) ── */
const CompareBar = styled.div`
  position:absolute;bottom:42px;left:50%;transform:translateX(-50%);z-index:${t.z.filter};
  display:flex;align-items:center;gap:12px;padding:10px 18px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.xl};box-shadow:${t.sh.lg};
  animation:${slideUp} 0.3s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{bottom:96px;left:8px;right:8px;transform:none;padding:8px 14px;gap:8px;}
`
const CompareChip = styled.div`
  display:flex;align-items:center;gap:6px;padding:4px 12px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  font-size:12px;font-weight:600;color:${t.gold};animation:${chipPop} 0.2s ease-out;
  white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;
`
const CompareChipX = styled.button`
  display:flex;align-items:center;justify-content:center;background:none;border:none;
  color:${t.goldBright};cursor:pointer;padding:0;flex-shrink:0;
  &:hover{color:${t.text};}
`
const CompareAction = styled.button`
  display:inline-flex;align-items:center;gap:6px;padding:8px 18px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.full};font-weight:700;font-size:13px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};white-space:nowrap;
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-1px);}
`
const CompareClear = styled.button`
  display:flex;align-items:center;justify-content:center;width:32px;height:32px;
  background:transparent;border:1px solid ${t.border};border-radius:${t.r.sm};
  color:${t.textSec};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.err};color:${t.err};background:rgba(239,68,68,0.08);}
`

// ── URL ↔ Filters sync helpers ──
const FILTER_PARAMS: (keyof Filters)[] = ['city', 'priceMin', 'priceMax', 'sizeMin', 'sizeMax', 'ripeness', 'minRoi', 'zoning', 'search']

function filtersFromParams(sp: URLSearchParams): Filters {
  const f = { ...DEFAULTS }
  for (const key of FILTER_PARAMS) {
    const v = sp.get(key)
    if (v) f[key] = v
  }
  return f
}

function filtersToParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams()
  for (const key of FILTER_PARAMS) {
    if (f[key] && f[key] !== DEFAULTS[key]) sp.set(key, f[key])
  }
  return sp
}

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFiltersRaw] = useState<Filters>(() => filtersFromParams(searchParams))
  const [selected, setSelected] = useState<Plot | null>(null)
  const [leadPlot, setLeadPlot] = useState<Plot | null>(null)
  const [tab, setTab] = useState<'map'|'fav'|'calc'|'areas'>('map')
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    const s = searchParams.get('sort')
    return (s && SORT_OPTIONS.some(o => o.key === s) ? s : 'recommended') as SortKey
  })
  const [sortOpen, setSortOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const { isFav, toggle, ids: favIds } = useFavorites()
  const { ids: compareIds, toggle: toggleCompare, clear: clearCompare, has: isCompared } = useCompare()
  const navigate = useNavigate()
  const sortRef = useRef<HTMLDivElement>(null)

  // Sync filters → URL params (debounced to avoid spam)
  const setFilters = useCallback((f: Filters) => {
    setFiltersRaw(f)
    const sp = filtersToParams(f)
    if (sortKey !== 'recommended') sp.set('sort', sortKey)
    setSearchParams(sp, { replace: true })
  }, [sortKey, setSearchParams])

  // Sync sort → URL params
  const setSortWithUrl = useCallback((key: SortKey) => {
    setSortKey(key)
    const sp = filtersToParams(filters)
    if (key !== 'recommended') sp.set('sort', key)
    setSearchParams(sp, { replace: true })
  }, [filters, setSearchParams])

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

  const sorted = useMemo(() => sortPlots(filtered, sortKey), [filtered, sortKey])

  const avg = filtered.length ? filtered.reduce((s, pl) => s + p(pl).price, 0) / filtered.length : 0
  const avgPps = filtered.length ? Math.round(filtered.reduce((s, pl) => s + pricePerSqm(pl), 0) / filtered.length) : 0

  // Close sort dropdown on click outside
  useEffect(() => {
    if (!sortOpen) return
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sortOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sortOpen) setSortOpen(false)
        else if (selected) setSelected(null)
        else if (listOpen) setListOpen(false)
      }
      // 'L' key to toggle list panel
      if (e.key === 'l' || e.key === 'L') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        setListOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, sortOpen, listOpen])

  return (
    <Wrap className="dark">
      <ErrorBoundary>
        {isLoading && <Loader><Spinner size={36} /></Loader>}
        <MapArea
          plots={sorted} pois={pois} selected={selected} darkMode
          onSelect={setSelected} onLead={setLeadPlot}
          favorites={{ isFav, toggle }}
          compare={{ has: isCompared, toggle: toggleCompare }}
        />
        <FilterBar filters={filters} onChange={setFilters} resultCount={filtered.length} />

        {/* Sort dropdown */}
        <SortWrap ref={sortRef}>
          <SortBtn onClick={() => setSortOpen(o => !o)} $active={sortKey !== 'recommended'}>
            <ArrowUpDown size={14} />
            {SORT_OPTIONS.find(o => o.key === sortKey)?.label || 'מיון'}
          </SortBtn>
          {sortOpen && (
            <SortDrop>
              {SORT_OPTIONS.map(o => (
                <SortOption key={o.key} $active={o.key === sortKey} onClick={() => { setSortWithUrl(o.key); setSortOpen(false) }}>
                  {o.label}
                </SortOption>
              ))}
            </SortDrop>
          )}
        </SortWrap>

        <Suspense fallback={null}>
          <PlotListPanel
            plots={sorted}
            selected={selected}
            onSelect={(pl) => { setSelected(pl); setListOpen(false) }}
            open={listOpen}
            onToggle={() => setListOpen(o => !o)}
          />
        </Suspense>
        <Suspense fallback={null}>
          {selected && <Sidebar plot={selected} open={!!selected} onClose={() => setSelected(null)} onLead={() => setLeadPlot(selected)} plots={sorted} onNavigate={setSelected} isCompared={isCompared(selected.id)} onToggleCompare={toggleCompare} />}
        </Suspense>
        <Suspense fallback={null}>
          <LeadModal plot={leadPlot} open={!!leadPlot} onClose={() => setLeadPlot(null)} />
        </Suspense>
        <Suspense fallback={null}><Chat plotId={selected?.id ?? null} /></Suspense>

        {/* Floating Compare Bar */}
        {compareIds.length > 0 && (
          <CompareBar>
            <GitCompareArrows size={16} color={t.gold} />
            <span style={{ fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: 'nowrap' }}>השוואה ({compareIds.length})</span>
            {sorted.filter(pl => compareIds.includes(pl.id)).slice(0, 3).map(pl => (
              <CompareChip key={pl.id}>
                {pl.city} · {pl.number}
                <CompareChipX onClick={() => toggleCompare(pl.id)}><X size={10} /></CompareChipX>
              </CompareChip>
            ))}
            {compareIds.length >= 2 && (
              <CompareAction onClick={() => navigate('/compare')}>
                <GitCompareArrows size={14} /> השווה
              </CompareAction>
            )}
            <CompareClear onClick={clearCompare} aria-label="נקה השוואה"><Trash2 size={14} /></CompareClear>
          </CompareBar>
        )}

        <Stats>
          <Stat><Val>{filtered.length}</Val> חלקות</Stat>
          <Stat>ממוצע <Val>{fmt.compact(avg)}</Val></Stat>
          {avgPps > 0 && <Stat>₪/מ״ר <Val>{fmt.num(avgPps)}</Val></Stat>}
          {favIds.length > 0 && <Stat><Heart size={12} color={t.gold} /><Val>{favIds.length}</Val> מועדפים</Stat>}
          {compareIds.length > 0 && <Stat><GitCompareArrows size={12} color={t.gold} /><Val>{compareIds.length}</Val> להשוואה</Stat>}
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
