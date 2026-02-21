import { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Map as MapIcon, Heart, Calculator, Layers, ArrowUpDown, GitCompareArrows, X, Trash2, SearchX, RotateCcw, TrendingUp, ChevronLeft, DollarSign, Ruler, ExternalLink } from 'lucide-react'
import { t, mobile } from '../theme'
import { useAllPlots, useFavorites, useCompare, useDebounce, useRecentlyViewed } from '../hooks'
import MapArea from '../components/Map'
import FilterBar from '../components/Filters'
import { ErrorBoundary, Spinner, useToast, Badge } from '../components/UI'
import { p, roi, fmt, sortPlots, SORT_OPTIONS, pricePerSqm, calcScore, getGrade, calcMonthly, statusColors, statusLabels } from '../utils'
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
  ${mobile}{bottom:56px;gap:10px;font-size:10px;padding:6px 12px;}
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

/* ── Empty State ── */
const emptyBounce = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}`
const EmptyWrap = styled.div`
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:${t.z.filter - 1};
  display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 40px;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.xl};box-shadow:${t.sh.xl};
  text-align:center;direction:rtl;max-width:380px;width:calc(100vw - 48px);
`
const EmptyIcon = styled.div`
  width:64px;height:64px;border-radius:${t.r.full};display:flex;align-items:center;justify-content:center;
  background:${t.goldDim};border:1px solid ${t.goldBorder};animation:${emptyBounce} 2.5s ease-in-out infinite;
`
const EmptyTitle = styled.h3`font-size:17px;font-weight:700;color:${t.text};margin:0;font-family:${t.font};`
const EmptyDesc = styled.p`font-size:13px;color:${t.textSec};margin:0;line-height:1.6;`
const EmptyResetBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;padding:10px 24px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.full};font-weight:700;font-size:14px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-2px);}
`

/* ── Mobile Tab Overlay ── */
const mobileSlide = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const MobileOverlay = styled.div<{$open:boolean}>`
  display:none;position:fixed;bottom:56px;left:0;right:0;top:0;z-index:${t.z.filter + 1};
  background:${t.bg};overflow-y:auto;direction:rtl;
  animation:${mobileSlide} 0.3s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{display:${pr=>pr.$open?'block':'none'};}
`
const MobileOverlayHeader = styled.div`
  position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;background:${t.surface};border-bottom:1px solid ${t.border};
`
const MobileOverlayTitle = styled.h3`font-size:17px;font-weight:700;color:${t.text};margin:0;display:flex;align-items:center;gap:8px;`
const MobileOverlayClose = styled.button`
  width:32px;height:32px;border-radius:${t.r.sm};border:1px solid ${t.border};
  background:transparent;color:${t.textSec};cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const MobileFavList = styled.div`display:flex;flex-direction:column;gap:1px;`
const MobileFavItem = styled.div`
  display:flex;align-items:center;gap:12px;padding:14px 20px;
  background:${t.surface};border-bottom:1px solid ${t.border};cursor:pointer;
  transition:background ${t.tr};&:hover{background:${t.hover};}
`
const MobileFavInfo = styled.div`flex:1;min-width:0;`
const MobileFavTitle = styled.div`font-size:14px;font-weight:700;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const MobileFavSub = styled.div`font-size:12px;color:${t.textSec};display:flex;align-items:center;gap:8px;margin-top:2px;`
const MobileFavPrice = styled.span`font-size:14px;font-weight:800;color:${t.gold};white-space:nowrap;`
const MobileFavRemove = styled.button`
  width:32px;height:32px;border-radius:${t.r.sm};border:1px solid ${t.border};
  background:transparent;color:${t.textDim};cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;
  transition:all ${t.tr};&:hover{border-color:${t.err};color:${t.err};background:rgba(239,68,68,0.08);}
`
const MobileEmptyState = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
  padding:60px 24px;text-align:center;
`
const MobileEmptyIcon = styled.div`
  width:64px;height:64px;border-radius:${t.r.full};display:flex;align-items:center;justify-content:center;
  background:${t.goldDim};border:1px solid ${t.goldBorder};
`
const MobileEmptyTitle = styled.div`font-size:16px;font-weight:700;color:${t.text};`
const MobileEmptyDesc = styled.div`font-size:13px;color:${t.textSec};line-height:1.6;`

/* ── Mobile Calculator ── */
const CalcCard = styled.div`
  margin:20px;padding:24px;background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};
`
const CalcTitle = styled.h4`font-size:15px;font-weight:700;color:${t.text};margin:0 0 16px;display:flex;align-items:center;gap:8px;`
const CalcSliderRow = styled.div`display:flex;flex-direction:column;gap:6px;margin-bottom:16px;`
const CalcSliderLabel = styled.div`display:flex;align-items:center;justify-content:space-between;font-size:12px;`
const CalcSliderName = styled.span`color:${t.textSec};font-weight:600;`
const CalcSliderVal = styled.span`color:${t.text};font-weight:700;font-size:13px;`
const CalcSlider = styled.input.attrs({ type: 'range' })`
  width:100%;height:6px;-webkit-appearance:none;appearance:none;outline:none;border-radius:3px;
  background:linear-gradient(90deg,${t.gold} 0%,${t.gold} var(--pct,50%),${t.surfaceLight} var(--pct,50%),${t.surfaceLight} 100%);
  &::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;
    background:linear-gradient(135deg,${t.gold},${t.goldBright});cursor:pointer;
    box-shadow:0 2px 8px rgba(212,168,75,0.35);border:2px solid ${t.bg};}
`
const CalcResult = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;margin-top:12px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.md};
`
const CalcResultItem = styled.div`text-align:center;`
const CalcResultVal = styled.div<{$gold?:boolean}>`font-size:18px;font-weight:800;color:${pr=>pr.$gold?t.gold:t.text};`
const CalcResultLabel = styled.div`font-size:10px;color:${t.textSec};margin-top:2px;`
const CalcInput = styled.input`
  width:100%;padding:12px 14px;background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};
  color:${t.text};font-size:16px;font-weight:700;font-family:${t.font};outline:none;direction:ltr;text-align:center;
  &:focus{border-color:${t.goldBorder};box-shadow:0 0 0 3px ${t.goldDim};}
  &::placeholder{color:${t.textDim};}
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
  const { isFav, toggle: rawToggleFav, ids: favIds } = useFavorites()
  const { ids: compareIds, toggle: rawToggleCompare, clear: clearCompare, has: isCompared } = useCompare()
  const { add: addRecentlyViewed } = useRecentlyViewed()
  const { toast } = useToast()
  const navigate = useNavigate()
  const sortRef = useRef<HTMLDivElement>(null)

  // Mobile calculator state
  const [calcPrice, setCalcPrice] = useState(500000)
  const [calcLtv, setCalcLtv] = useState(50)
  const [calcRate, setCalcRate] = useState(6)
  const [calcYears, setCalcYears] = useState(15)
  const calcMortgage = useMemo(() => calcMonthly(calcPrice, calcLtv / 100, calcRate / 100, calcYears), [calcPrice, calcLtv, calcRate, calcYears])

  // Wrap favorites/compare toggles with toast feedback
  const toggle = useCallback((id: string) => {
    const wasFav = isFav(id)
    rawToggleFav(id)
    toast(wasFav ? 'הוסר מהמועדפים' : '❤️ נוסף למועדפים', wasFav ? 'info' : 'success')
  }, [rawToggleFav, isFav, toast])

  const toggleCompare = useCallback((id: string) => {
    const wasCompared = isCompared(id)
    rawToggleCompare(id)
    toast(wasCompared ? 'הוסר מההשוואה' : '⚖️ נוסף להשוואה', wasCompared ? 'info' : 'success')
  }, [rawToggleCompare, isCompared, toast])

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

  const hasActiveFilters = useMemo(() =>
    Object.entries(filters).some(([, v]) => v && v !== 'all'), [filters])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULTS)
  }, [setFilters])

  // Track recently viewed plots
  const selectPlot = useCallback((pl: Plot | null) => {
    setSelected(pl)
    if (pl) addRecentlyViewed(pl.id)
  }, [addRecentlyViewed])

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
          onSelect={selectPlot} onLead={setLeadPlot}
          favorites={{ isFav, toggle }}
          compare={{ has: isCompared, toggle: toggleCompare }}
        />
        <FilterBar filters={filters} onChange={setFilters} resultCount={filtered.length} />

        {/* Empty state when no plots match filters */}
        {!isLoading && filtered.length === 0 && hasActiveFilters && (
          <EmptyWrap>
            <EmptyIcon><SearchX size={28} color={t.gold} /></EmptyIcon>
            <EmptyTitle>לא נמצאו חלקות</EmptyTitle>
            <EmptyDesc>לא נמצאו חלקות התואמות את הסינון שבחרת. נסו להרחיב את הקריטריונים או לאפס את הסינון.</EmptyDesc>
            <EmptyResetBtn onClick={resetFilters}><RotateCcw size={14} /> אפס סינון</EmptyResetBtn>
          </EmptyWrap>
        )}

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
            onSelect={(pl) => { selectPlot(pl); setListOpen(false) }}
            open={listOpen}
            onToggle={() => setListOpen(o => !o)}
          />
        </Suspense>
        <Suspense fallback={null}>
          {selected && <Sidebar plot={selected} open={!!selected} onClose={() => setSelected(null)} onLead={() => setLeadPlot(selected)} plots={sorted} onNavigate={selectPlot} isCompared={isCompared(selected.id)} onToggleCompare={toggleCompare} />}
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

        {/* Accessible live region for filter result count */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {filtered.length > 0 ? `נמצאו ${filtered.length} חלקות` : 'לא נמצאו חלקות התואמות את הסינון'}
        </div>

        <Stats>
          <Stat><Val>{filtered.length}</Val> חלקות</Stat>
          <Stat>ממוצע <Val>{fmt.compact(avg)}</Val></Stat>
          {avgPps > 0 && <Stat>₪/מ״ר <Val>{fmt.num(avgPps)}</Val></Stat>}
          {favIds.length > 0 && <Stat><Heart size={12} color={t.gold} /><Val>{favIds.length}</Val> מועדפים</Stat>}
          {compareIds.length > 0 && <Stat><GitCompareArrows size={12} color={t.gold} /><Val>{compareIds.length}</Val> להשוואה</Stat>}
          <Demo>DEMO</Demo>
        </Stats>

        {/* Mobile Favorites Overlay */}
        <MobileOverlay $open={tab === 'fav'}>
          <MobileOverlayHeader>
            <MobileOverlayTitle><Heart size={18} color={t.gold} /> מועדפים ({favIds.length})</MobileOverlayTitle>
            <MobileOverlayClose onClick={() => setTab('map')}><X size={16} /></MobileOverlayClose>
          </MobileOverlayHeader>
          {favIds.length === 0 ? (
            <MobileEmptyState>
              <MobileEmptyIcon><Heart size={28} color={t.gold} /></MobileEmptyIcon>
              <MobileEmptyTitle>אין מועדפים עדיין</MobileEmptyTitle>
              <MobileEmptyDesc>לחצו על ❤️ בחלקה כדי לשמור אותה כאן</MobileEmptyDesc>
            </MobileEmptyState>
          ) : (
            <MobileFavList>
              {sorted.filter(pl => favIds.includes(pl.id)).map(pl => {
                const d = p(pl), grade = getGrade(calcScore(pl))
                return (
                  <MobileFavItem key={pl.id} onClick={() => { selectPlot(pl); setTab('map') }}>
                    <MobileFavInfo>
                      <MobileFavTitle>גוש {d.block} · חלקה {pl.number}</MobileFavTitle>
                      <MobileFavSub>
                        <span>{pl.city}</span>
                        <span style={{ color: grade.color, fontWeight: 700 }}>{grade.grade}</span>
                        <span>{fmt.num(d.size)} מ״ר</span>
                      </MobileFavSub>
                    </MobileFavInfo>
                    <MobileFavPrice>{fmt.compact(d.price)}</MobileFavPrice>
                    <MobileFavRemove onClick={(e) => { e.stopPropagation(); toggle(pl.id) }}><X size={14} /></MobileFavRemove>
                  </MobileFavItem>
                )
              })}
            </MobileFavList>
          )}
        </MobileOverlay>

        {/* Mobile Calculator Overlay */}
        <MobileOverlay $open={tab === 'calc'}>
          <MobileOverlayHeader>
            <MobileOverlayTitle><Calculator size={18} color={t.gold} /> מחשבון מימון</MobileOverlayTitle>
            <MobileOverlayClose onClick={() => setTab('map')}><X size={16} /></MobileOverlayClose>
          </MobileOverlayHeader>
          <CalcCard>
            <CalcTitle><DollarSign size={16} color={t.gold} /> סכום הנכס</CalcTitle>
            <CalcInput type="number" value={calcPrice} placeholder="הכנס מחיר..." onChange={e => setCalcPrice(Math.max(0, Number(e.target.value)))} />
          </CalcCard>
          <CalcCard>
            <CalcTitle><Calculator size={16} color={t.gold} /> פרמטרים</CalcTitle>
            <CalcSliderRow>
              <CalcSliderLabel><CalcSliderName>אחוז מימון (LTV)</CalcSliderName><CalcSliderVal>{calcLtv}%</CalcSliderVal></CalcSliderLabel>
              <CalcSlider min={10} max={80} step={5} value={calcLtv}
                style={{ '--pct': `${((calcLtv - 10) / 70) * 100}%` } as React.CSSProperties}
                onChange={e => setCalcLtv(Number(e.target.value))} />
            </CalcSliderRow>
            <CalcSliderRow>
              <CalcSliderLabel><CalcSliderName>ריבית שנתית</CalcSliderName><CalcSliderVal>{calcRate}%</CalcSliderVal></CalcSliderLabel>
              <CalcSlider min={2} max={12} step={0.5} value={calcRate}
                style={{ '--pct': `${((calcRate - 2) / 10) * 100}%` } as React.CSSProperties}
                onChange={e => setCalcRate(Number(e.target.value))} />
            </CalcSliderRow>
            <CalcSliderRow>
              <CalcSliderLabel><CalcSliderName>תקופה</CalcSliderName><CalcSliderVal>{calcYears} שנים</CalcSliderVal></CalcSliderLabel>
              <CalcSlider min={5} max={30} step={1} value={calcYears}
                style={{ '--pct': `${((calcYears - 5) / 25) * 100}%` } as React.CSSProperties}
                onChange={e => setCalcYears(Number(e.target.value))} />
            </CalcSliderRow>
            {calcMortgage && (
              <CalcResult>
                <CalcResultItem><CalcResultVal $gold>{fmt.price(calcMortgage.monthly)}</CalcResultVal><CalcResultLabel>החזר חודשי</CalcResultLabel></CalcResultItem>
                <CalcResultItem><CalcResultVal>{fmt.price(calcMortgage.down)}</CalcResultVal><CalcResultLabel>הון עצמי</CalcResultLabel></CalcResultItem>
                <CalcResultItem><CalcResultVal>{fmt.price(calcMortgage.loan)}</CalcResultVal><CalcResultLabel>סכום הלוואה</CalcResultLabel></CalcResultItem>
                <CalcResultItem><CalcResultVal>{fmt.price(calcMortgage.monthly * calcYears * 12)}</CalcResultVal><CalcResultLabel>סה״כ החזר</CalcResultLabel></CalcResultItem>
              </CalcResult>
            )}
          </CalcCard>
          {selected && (
            <CalcCard>
              <CalcTitle>חלקה נבחרת</CalcTitle>
              <div style={{ fontSize: 14, color: t.textSec }}>
                {selected.city} · גוש {p(selected).block} · חלקה {selected.number}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: t.gold, marginTop: 8 }}>
                {fmt.price(p(selected).price)}
              </div>
              <button onClick={() => { setCalcPrice(p(selected).price); }} style={{
                marginTop: 12, padding: '8px 16px', background: t.goldDim, border: `1px solid ${t.goldBorder}`,
                borderRadius: t.r.md, color: t.gold, fontSize: 13, fontWeight: 600, fontFamily: t.font, cursor: 'pointer',
              }}>השתמש במחיר הזה</button>
            </CalcCard>
          )}
        </MobileOverlay>

        <MobileNav>
          <NavBtn $active={tab==='map'} onClick={()=>setTab('map')}><MapIcon size={20}/>מפה</NavBtn>
          <NavBtn $active={tab==='fav'} onClick={()=>setTab('fav')}><Heart size={20}/>מועדפים{favIds.length > 0 && <span style={{fontSize:9,color:t.gold,fontWeight:700}}>({favIds.length})</span>}</NavBtn>
          <NavBtn $active={tab==='calc'} onClick={()=>setTab('calc')}><Calculator size={20}/>מחשבון</NavBtn>
          <NavBtn $active={tab==='areas'} onClick={()=>{ setTab('map'); setListOpen(o => !o) }}><Layers size={20}/>רשימה</NavBtn>
        </MobileNav>
      </ErrorBoundary>
    </Wrap>
  )
}
