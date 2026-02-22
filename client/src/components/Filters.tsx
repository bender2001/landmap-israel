import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Search, SlidersHorizontal, X, Sparkles, MapPin, Bookmark, BookmarkCheck, Trash2 } from 'lucide-react'
import { t, mobile } from '../theme'
import { Select, RangeInput } from './UI'
import { p, fmt } from '../utils'
import { useSavedSearches, useFocusTrap } from '../hooks'
import type { Filters, Plot } from '../types'

const EMPTY: Filters = { city: '', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: '', minRoi: '', zoning: '', search: '', belowAvg: '' }

const BASE_CITIES = [
  'חדרה', 'נתניה', 'קיסריה', 'הרצליה', 'כפר סבא', 'רעננה', 'הוד השרון', 'תל אביב',
  'חיפה', 'באר שבע', 'ראשון לציון', 'אשדוד', 'ירושלים',
]

const ZONING: { value: string; label: string; icon?: string }[] = [
  { value: 'AGRICULTURAL', label: 'חקלאית', icon: '\u{1F33E}' },
  { value: 'MASTER_PLAN_DEPOSIT', label: 'הפקדת מתאר', icon: '\u{1F4CB}' },
  { value: 'MASTER_PLAN_APPROVED', label: 'מתאר מאושרת', icon: '\u2705' },
  { value: 'DETAILED_PLAN_PREP', label: 'הכנת מפורטת', icon: '\u{1F4D0}' },
  { value: 'DETAILED_PLAN_APPROVED', label: 'מפורטת מאושרת', icon: '\u2705' },
  { value: 'BUILDING_PERMIT', label: 'היתר בנייה', icon: '\u{1F3E0}' },
]

const QUICK_FILTERS = [
  { key: 'hot', label: '\u{1F525} עסקאות חמות', apply: (f: Filters) => ({ ...f, ripeness: 'high' }) },
  { key: 'cheap', label: '\u{1F48E} מחיר נמוך', apply: (f: Filters) => ({ ...f, priceMax: '500000' }) },
  { key: 'bargain', label: '📉 מתחת לממוצע', apply: (f: Filters) => ({ ...f, belowAvg: 'true' }) },
  { key: 'score', label: '\u2B50 ציון גבוה', apply: (f: Filters) => ({ ...f, minRoi: '15' }) },
  { key: 'build', label: '\u{1F3D7}\uFE0F בנייה קרובה', apply: (f: Filters) => ({ ...f, zoning: 'BUILDING_PERMIT' }) },
]

const PLACEHOLDERS = ['חיפוש לפי עיר, גוש, חלקה...', 'נתניה, גוש 8244...', 'מצא את ההשקעה הבאה שלך...']

/* ── Animations ── */
const slideDown = keyframes`from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}`
const slideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const chipIn = keyframes`from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}`
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`

/* ── Styled ── */
const Wrap = styled.div`position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:${t.z.filter};
  display:flex;flex-direction:column;align-items:center;gap:8px;width:min(580px,calc(100vw - 32px));
  ${mobile}{top:8px;left:8px;right:8px;transform:none;width:auto;}
`
const Bar = styled.div`
  display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.xl};box-shadow:${t.sh.lg};direction:rtl;
  transition:all ${t.tr};&:focus-within{border-color:${t.goldBorder};box-shadow:${t.sh.glow};}
`
const SIcon = styled(Search)`color:${t.textDim};flex-shrink:0;transition:color ${t.tr};`
const Input = styled.input`
  flex:1;background:none;border:none;outline:none;font-size:14px;font-family:${t.font};
  color:${t.text};padding:6px 4px;direction:rtl;
  &::placeholder{color:${t.textDim};transition:opacity 0.4s;}
`
const FilterBtn = styled.button<{ $active: boolean }>`
  position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;
  border-radius:${t.r.md};border:1px solid ${p => p.$active ? t.gold : t.border};
  background:${p => p.$active ? t.goldDim : 'transparent'};color:${p => p.$active ? t.gold : t.textSec};
  cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};transform:scale(1.05);}
`
const CountBadge = styled.span`
  position:absolute;top:-5px;left:-5px;width:19px;height:19px;border-radius:${t.r.full};
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};font-size:10px;font-weight:800;
  display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(212,168,75,0.4);
`

/* ── Quick Filters ── */
const QuickRow = styled.div`
  display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:0 4px;direction:rtl;
  ${mobile}{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;
    &::-webkit-scrollbar{display:none;}}
`
const QuickChip = styled.button<{ $active: boolean }>`
  display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border:1px solid ${p => p.$active ? t.gold : t.glassBorder};
  border-radius:${t.r.full};font-size:12px;font-weight:600;font-family:${t.font};cursor:pointer;
  background:${p => p.$active ? t.goldDim : t.glass};color:${p => p.$active ? t.gold : t.textSec};
  backdrop-filter:blur(12px);transition:all ${t.tr};animation:${chipIn} 0.2s ease-out;white-space:nowrap;flex-shrink:0;
  &:hover{border-color:${t.gold};color:${t.gold};transform:translateY(-1px);box-shadow:${t.sh.sm};}
`

/* ── Backdrop & Drawer ── */
const Backdrop = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.filter - 1};background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
  opacity:${p => p.$open ? 1 : 0};pointer-events:${p => p.$open ? 'auto' : 'none'};transition:all 0.3s;
`
const Drawer = styled.div<{ $open: boolean }>`
  width:100%;background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.lg};box-shadow:${t.sh.xl};overflow:hidden;direction:rtl;
  animation:${slideDown} 0.3s cubic-bezier(0.32,0.72,0,1);display:${p => p.$open ? 'block' : 'none'};
  ${mobile}{position:fixed;bottom:0;left:0;right:0;border-radius:${t.r.xl} ${t.r.xl} 0 0;
    max-height:75vh;overflow-y:auto;animation:${slideUp} 0.35s cubic-bezier(0.32,0.72,0,1);z-index:${t.z.filter};}
`
const DrawerHead = styled.div`display:flex;align-items:center;justify-content:space-between;padding:16px 20px;
  border-bottom:1px solid ${t.border};background:linear-gradient(180deg,rgba(212,168,75,0.04),transparent);`
const DrawerTitle = styled.h3`font-size:16px;font-weight:700;color:${t.text};margin:0;display:flex;align-items:center;gap:8px;`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:${t.r.sm};
  background:none;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
const Section = styled.div`padding:16px 20px;`
const SectionLabel = styled.div`font-size:12px;font-weight:700;color:${t.goldBright};margin-bottom:12px;
  display:flex;align-items:center;gap:6px;letter-spacing:0.5px;`
const Grid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:14px;${mobile}{grid-template-columns:1fr;}`
const Field = styled.div`display:flex;flex-direction:column;gap:5px;`
const FieldLabel = styled.label`font-size:11px;font-weight:600;color:${t.textDim};`
const Divider = styled.div`height:1px;background:${t.border};margin:0;`

/* ── Actions ── */
/* ── Price Quick Presets ── */
const PresetRow = styled.div`
  display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;
`
const PresetChip = styled.button<{ $active: boolean }>`
  display:inline-flex;align-items:center;gap:3px;padding:5px 12px;
  border:1px solid ${pr => pr.$active ? t.gold : t.border};
  border-radius:${t.r.full};font-size:11px;font-weight:600;font-family:${t.font};cursor:pointer;
  background:${pr => pr.$active ? t.goldDim : 'transparent'};
  color:${pr => pr.$active ? t.gold : t.textSec};
  transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};transform:translateY(-1px);}
`

const PRICE_PRESETS = [
  { label: 'עד ₪300K', min: 0, max: 300000 },
  { label: '₪300K–500K', min: 300000, max: 500000 },
  { label: '₪500K–1M', min: 500000, max: 1000000 },
  { label: '₪1M–2M', min: 1000000, max: 2000000 },
  { label: '₪2M+', min: 2000000, max: 0 },
] as const

const SIZE_PRESETS = [
  { label: 'עד 500 מ״ר', min: 0, max: 500 },
  { label: '500–1,000', min: 500, max: 1000 },
  { label: '1–2 דונם', min: 1000, max: 2000 },
  { label: '2–5 דונם', min: 2000, max: 5000 },
  { label: '5+ דונם', min: 5000, max: 0 },
] as const

const Actions = styled.div`display:flex;align-items:center;gap:10px;padding:14px 20px;border-top:1px solid ${t.border};
  background:linear-gradient(0deg,rgba(212,168,75,0.04),transparent);`
const ApplyBtn = styled.button`
  flex:1;padding:12px;background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.md};font-weight:700;font-size:14px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};background-size:200% 200%;
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-1px);animation:${shimmer} 2s linear infinite;}
  &:active{transform:translateY(0);}
`
const ClearBtn = styled.button`
  padding:12px 20px;background:none;border:1px solid ${t.border};border-radius:${t.r.md};
  color:${t.textSec};font-size:13px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`

/* ── Active Chips ── */
const ChipsRow = styled.div`display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:0 4px;direction:rtl;`
const Chip = styled.span`
  display:inline-flex;align-items:center;gap:5px;padding:5px 12px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  font-size:11px;font-weight:600;color:${t.gold};animation:${chipIn} 0.25s ease-out;cursor:pointer;
  backdrop-filter:blur(8px);transition:all ${t.tr};
  &:hover{background:${t.gold};color:${t.bg};transform:scale(1.05);}
`

/* ── Saved Searches ── */
const SavedRow = styled.div`
  display:flex;align-items:center;gap:6px;width:100%;padding:0 4px;direction:rtl;
  ${mobile}{overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none;-webkit-overflow-scrolling:touch;
    &::-webkit-scrollbar{display:none;}}
`
const SavedChip = styled.button<{ $active?: boolean }>`
  display:inline-flex;align-items:center;gap:4px;padding:5px 12px;
  border:1px solid ${pr => pr.$active ? t.gold : 'rgba(139,92,246,0.25)'};
  border-radius:${t.r.full};font-size:11px;font-weight:600;font-family:${t.font};cursor:pointer;
  background:${pr => pr.$active ? t.goldDim : 'rgba(139,92,246,0.06)'};
  color:${pr => pr.$active ? t.gold : '#A78BFA'};
  backdrop-filter:blur(8px);transition:all ${t.tr};white-space:nowrap;flex-shrink:0;
  &:hover{border-color:${t.gold};color:${t.gold};background:${t.goldDim};transform:translateY(-1px);}
`
const SavedChipDelete = styled.span`
  display:inline-flex;align-items:center;justify-content:center;
  width:14px;height:14px;border-radius:50%;cursor:pointer;opacity:0.6;
  transition:all ${t.tr};flex-shrink:0;
  &:hover{opacity:1;background:rgba(239,68,68,0.15);color:${t.err};}
`
const SaveBtn = styled.button`
  display:inline-flex;align-items:center;gap:4px;padding:5px 12px;
  border:1px dashed rgba(212,168,75,0.4);border-radius:${t.r.full};
  font-size:11px;font-weight:600;font-family:${t.font};cursor:pointer;
  background:transparent;color:${t.textDim};
  transition:all ${t.tr};white-space:nowrap;flex-shrink:0;
  &:hover{border-color:${t.gold};color:${t.gold};background:${t.goldDim};}
`

/* ── Search Suggestions ── */
const SuggestWrap = styled.div`
  position:absolute;top:calc(100% + 6px);left:0;right:0;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.md};
  box-shadow:${t.sh.lg};overflow:hidden;max-height:320px;overflow-y:auto;
  direction:rtl;z-index:${t.z.filter + 2};animation:${fadeIn} 0.15s ease-out;
`
const SuggestGroup = styled.div`
  padding:6px 14px 4px;font-size:10px;font-weight:700;color:${t.textDim};
  letter-spacing:0.3px;display:flex;align-items:center;gap:5px;
  border-bottom:1px solid ${t.border};
`
const SuggestItem = styled.button<{$focused?:boolean}>`
  display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;
  background:${pr=>pr.$focused?t.goldDim:'transparent'};border:none;
  color:${pr=>pr.$focused?t.gold:t.text};font-size:13px;font-family:${t.font};cursor:pointer;
  text-align:right;direction:rtl;transition:background 0.12s,color 0.12s;
  &:hover{background:${t.hover};color:${t.gold};}
`
const SuggestIconWrap = styled.span<{$c?:string}>`
  width:30px;height:30px;border-radius:${t.r.sm};flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  background:${pr=>pr.$c?`${pr.$c}12`:t.goldDim};border:1px solid ${pr=>pr.$c?`${pr.$c}30`:t.goldBorder};
  color:${pr=>pr.$c||t.gold};
`
const SuggestLabel = styled.span`flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;`
const SuggestMeta = styled.span`font-size:11px;color:${t.textDim};white-space:nowrap;`

/* ── Component ── */
interface Props { filters: Filters; onChange: (f: Filters) => void; resultCount?: number; plots?: Plot[]; onSelectPlot?: (id: string) => void }

export default function FiltersBar({ filters, onChange, resultCount, plots, onSelectPlot }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(filters)
  const { searches: savedSearches, save: saveSearch, remove: removeSavedSearch } = useSavedSearches()
  const drawerTrapRef = useFocusTrap(open)

  // Build city options with plot counts from actual data
  const CITIES = useMemo(() => {
    const counts: Record<string, number> = {}
    if (plots?.length) {
      for (const pl of plots) {
        if (pl.city) counts[pl.city] = (counts[pl.city] || 0) + 1
      }
    }
    // Merge base cities with any new ones found in data
    const allCities = new Set([...BASE_CITIES, ...Object.keys(counts)])
    return [...allCities].map(c => ({
      value: c,
      label: counts[c] ? `${c} (${counts[c]})` : c,
    }))
  }, [plots])
  const [phIdx, setPhIdx] = useState(0)
  const [activeQuick, setActiveQuick] = useState<Set<string>>(new Set())
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestIdx, setSuggestIdx] = useState(-1)
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cycle animated placeholder
  useEffect(() => { const id = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 3000); return () => clearInterval(id) }, [])

  // ESC to close filter drawer
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); e.stopPropagation() }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open])

  const activeCount = useMemo(() =>
    Object.entries(filters).filter(([k, v]) => k !== 'search' && v && v !== 'all').length, [filters])

  const chips = useMemo(() => {
    const c: { key: string; label: string }[] = []
    if (filters.city) c.push({ key: 'city', label: filters.city })
    if (filters.zoning) c.push({ key: 'zoning', label: ZONING.find(z => z.value === filters.zoning)?.label || filters.zoning })
    if (filters.priceMin) c.push({ key: 'priceMin', label: `\u20AA${Number(filters.priceMin).toLocaleString()}+` })
    if (filters.priceMax) c.push({ key: 'priceMax', label: `\u05E2\u05D3 \u20AA${Number(filters.priceMax).toLocaleString()}` })
    if (filters.sizeMin) c.push({ key: 'sizeMin', label: `${filters.sizeMin}+ \u05DE\u05F4\u05E8` })
    if (filters.sizeMax) c.push({ key: 'sizeMax', label: `\u05E2\u05D3 ${filters.sizeMax} \u05DE\u05F4\u05E8` })
    if (filters.minRoi) c.push({ key: 'minRoi', label: `תשואה ${filters.minRoi}%+` })
    if (filters.ripeness === 'high') c.push({ key: 'ripeness', label: '⭐ ציון גבוה' })
    else if (filters.ripeness === 'medium') c.push({ key: 'ripeness', label: 'ציון בינוני' })
    else if (filters.ripeness === 'low') c.push({ key: 'ripeness', label: 'ציון נמוך' })
    return c
  }, [filters])

  // ── Search Suggestions ──
  const suggestions = useMemo(() => {
    const q = filters.search?.trim().toLowerCase()
    if (!q || q.length < 1 || !plots?.length) return { cities: [] as { label: string; count: number }[], matchedPlots: [] as { id: string; label: string; sublabel: string }[] }

    const cities: { label: string; count: number }[] = []
    const matchedPlots: { id: string; label: string; sublabel: string }[] = []
    const seenCities = new Set<string>()

    for (const pl of plots) {
      if (pl.city?.toLowerCase().includes(q) && !seenCities.has(pl.city)) {
        seenCities.add(pl.city)
        cities.push({ label: pl.city, count: plots.filter(pp => pp.city === pl.city).length })
      }
      const d = p(pl)
      if (pl.number?.includes(q) || String(d.block).includes(q)) {
        matchedPlots.push({
          id: pl.id,
          label: `גוש ${d.block} · חלקה ${pl.number}`,
          sublabel: `${pl.city} · ${fmt.compact(d.price)}`,
        })
      }
    }

    return { cities: cities.slice(0, 4), matchedPlots: matchedPlots.slice(0, 5) }
  }, [filters.search, plots])

  const allSuggestions = useMemo(() => [
    ...suggestions.cities.map(c => ({ type: 'city' as const, ...c })),
    ...suggestions.matchedPlots.map(pl => ({ type: 'plot' as const, ...pl })),
  ], [suggestions])

  const hasSuggestions = allSuggestions.length > 0 && (filters.search?.trim().length ?? 0) > 0

  const selectSuggestion = useCallback((idx: number) => {
    const item = allSuggestions[idx]
    if (!item) return
    if (item.type === 'city') {
      onChange({ ...filters, city: item.label, search: '' })
    } else if (item.type === 'plot' && 'id' in item) {
      onSelectPlot?.(item.id)
      onChange({ ...filters, search: '' })
    }
    setShowSuggestions(false)
    setSuggestIdx(-1)
  }, [allSuggestions, onChange, filters, onSelectPlot])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!hasSuggestions || !showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSuggestIdx(i => Math.min(i + 1, allSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSuggestIdx(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && suggestIdx >= 0) {
      e.preventDefault()
      selectSuggestion(suggestIdx)
    }
  }, [hasSuggestions, showSuggestions, suggestIdx, allSuggestions.length, selectSuggestion])

  // Reset suggestion index when search changes
  useEffect(() => { setSuggestIdx(-1) }, [filters.search])

  const set = useCallback((key: keyof Filters, val: string) => setDraft(d => ({ ...d, [key]: val })), [])
  const apply = () => { onChange(draft); setOpen(false) }
  const clear = () => { const c = { ...EMPTY, search: filters.search }; setDraft(c); onChange(c); setOpen(false); setActiveQuick(new Set()) }
  const removeChip = (key: string) => onChange({ ...filters, [key]: '' })

  const toggleQuick = (qf: typeof QUICK_FILTERS[0]) => {
    setActiveQuick(prev => {
      const next = new Set(prev)
      if (next.has(qf.key)) { next.delete(qf.key); onChange(EMPTY) }
      else { next.add(qf.key); onChange(qf.apply(filters)) }
      return next
    })
  }

  const fmtPrice = (v: number) => v >= 1000000 ? `\u20AA${(v / 1000000).toFixed(1)}M` : `\u20AA${(v / 1000).toFixed(0)}K`

  return (
    <>
      <Backdrop $open={open} onClick={() => setOpen(false)} />
      <Wrap>
        <Bar style={{ position: 'relative' }}>
          <SIcon size={18} />
          <Input id="landmap-search-input" placeholder={PLACEHOLDERS[phIdx]} value={filters.search}
            onChange={e => { onChange({ ...filters, search: e.target.value }); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => { suggestTimeoutRef.current = setTimeout(() => setShowSuggestions(false), 150) }}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={showSuggestions && hasSuggestions}
            aria-autocomplete="list"
            aria-label="חיפוש חלקות"
          />
          {resultCount != null && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
              padding: '3px 10px', borderRadius: t.r.full, flexShrink: 0,
              background: resultCount > 0 ? t.goldDim : 'rgba(239,68,68,0.08)',
              color: resultCount > 0 ? t.gold : t.err,
              border: `1px solid ${resultCount > 0 ? t.goldBorder : 'rgba(239,68,68,0.2)'}`,
              transition: `all ${t.tr}`,
            }}>
              {resultCount > 0 ? `${resultCount} חלקות` : 'אין תוצאות'}
            </span>
          )}
          {filters.search && (
            <button
              onClick={() => { onChange({ ...filters, search: '' }); setShowSuggestions(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: t.r.sm, border: `1px solid ${t.border}`,
                background: 'transparent', color: t.textDim, cursor: 'pointer', flexShrink: 0,
                transition: `all ${t.tr}`,
              }}
              aria-label="נקה חיפוש"
              onMouseOver={e => { (e.target as HTMLElement).style.color = t.gold; (e.target as HTMLElement).style.borderColor = t.goldBorder }}
              onMouseOut={e => { (e.target as HTMLElement).style.color = t.textDim; (e.target as HTMLElement).style.borderColor = t.border }}
            >
              <X size={14} />
            </button>
          )}
          <FilterBtn $active={activeCount > 0} onClick={() => { setDraft(filters); setOpen(o => !o) }} aria-label="סננים">
            <SlidersHorizontal size={18} />
            {activeCount > 0 && <CountBadge>{activeCount}</CountBadge>}
          </FilterBtn>

          {/* Search autocomplete dropdown */}
          {showSuggestions && hasSuggestions && (
            <SuggestWrap role="listbox" onMouseDown={() => { if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current) }}>
              {suggestions.cities.length > 0 && (
                <>
                  <SuggestGroup>📍 ערים</SuggestGroup>
                  {suggestions.cities.map((c, i) => (
                    <SuggestItem key={c.label} $focused={suggestIdx === i}
                      role="option" aria-selected={suggestIdx === i}
                      onMouseDown={() => selectSuggestion(i)}>
                      <SuggestIconWrap $c="#3B82F6"><MapPin size={14} /></SuggestIconWrap>
                      <SuggestLabel>{c.label}</SuggestLabel>
                      <SuggestMeta>{c.count} חלקות</SuggestMeta>
                    </SuggestItem>
                  ))}
                </>
              )}
              {suggestions.matchedPlots.length > 0 && (
                <>
                  <SuggestGroup>📋 חלקות</SuggestGroup>
                  {suggestions.matchedPlots.map((pl, i) => {
                    const idx = suggestions.cities.length + i
                    return (
                      <SuggestItem key={pl.id} $focused={suggestIdx === idx}
                        role="option" aria-selected={suggestIdx === idx}
                        onMouseDown={() => selectSuggestion(idx)}>
                        <SuggestIconWrap><span style={{ fontSize: 13 }}>📋</span></SuggestIconWrap>
                        <SuggestLabel>{pl.label}</SuggestLabel>
                        <SuggestMeta>{pl.sublabel}</SuggestMeta>
                      </SuggestItem>
                    )
                  })}
                </>
              )}
            </SuggestWrap>
          )}
        </Bar>

        {/* Quick Filters */}
        <QuickRow>
          {QUICK_FILTERS.map(qf => (
            <QuickChip key={qf.key} $active={activeQuick.has(qf.key)} onClick={() => toggleQuick(qf)}>
              {qf.label}
            </QuickChip>
          ))}
        </QuickRow>

        {chips.length > 0 && (
          <ChipsRow>
            {chips.map(c => <Chip key={c.key} onClick={() => removeChip(c.key)}>{c.label}<X size={10} /></Chip>)}
          </ChipsRow>
        )}

        {/* Saved Searches */}
        {(savedSearches.length > 0 || activeCount > 0) && (
          <SavedRow>
            {activeCount > 0 && (
              <SaveBtn onClick={() => {
                const parts: string[] = []
                if (filters.city && filters.city !== 'all') parts.push(filters.city)
                if (filters.zoning) parts.push(ZONING.find(z => z.value === filters.zoning)?.label || '')
                if (filters.priceMax) parts.push(`עד ${fmtPrice(Number(filters.priceMax))}`)
                const name = parts.length > 0 ? parts.join(' · ') : `חיפוש ${savedSearches.length + 1}`
                saveSearch(name, filters as unknown as Record<string, string>)
              }}>
                <Bookmark size={11} /> שמור חיפוש
              </SaveBtn>
            )}
            {savedSearches.map(s => (
              <SavedChip key={s.id} onClick={() => onChange(s.filters as unknown as Filters)}>
                <BookmarkCheck size={11} />
                {s.name}
                <SavedChipDelete onClick={(e) => { e.stopPropagation(); removeSavedSearch(s.id) }}>
                  <X size={8} />
                </SavedChipDelete>
              </SavedChip>
            ))}
          </SavedRow>
        )}

        <Drawer $open={open} ref={drawerTrapRef} role="dialog" aria-modal="true" aria-label="סינון מתקדם">
          <DrawerHead>
            <DrawerTitle><Sparkles size={16} color={t.gold} />סינון מתקדם</DrawerTitle>
            <CloseBtn onClick={() => setOpen(false)}><X size={16} /></CloseBtn>
          </DrawerHead>

          <Section>
            <SectionLabel>📍 מיקום וייעוד</SectionLabel>
            <Grid>
              <Field>
                <FieldLabel>עיר</FieldLabel>
                <Select options={CITIES} value={draft.city === 'all' ? '' : draft.city}
                  onChange={v => set('city', v)} placeholder="כל הערים" searchable />
              </Field>
              <Field>
                <FieldLabel>שלב תכנוני</FieldLabel>
                <Select options={ZONING} value={draft.zoning}
                  onChange={v => set('zoning', v)} placeholder="כל השלבים" />
              </Field>
            </Grid>
          </Section>

          <Divider />

          <Section>
            <SectionLabel>💰 טווח מחירים</SectionLabel>
            <RangeInput min={0} max={2000000}
              valueMin={Number(draft.priceMin) || 0} valueMax={Number(draft.priceMax) || 2000000}
              onChange={(lo: number, hi: number) => setDraft(d => ({ ...d, priceMin: lo ? String(lo) : '', priceMax: hi < 2000000 ? String(hi) : '' }))}
              formatValue={fmtPrice} />
            <PresetRow>
              {PRICE_PRESETS.map(preset => {
                const isActive = (Number(draft.priceMin) || 0) === preset.min && (preset.max === 0 ? !draft.priceMax : (Number(draft.priceMax) || 0) === preset.max)
                return (
                  <PresetChip key={preset.label} $active={isActive} onClick={() => {
                    setDraft(d => ({
                      ...d,
                      priceMin: preset.min ? String(preset.min) : '',
                      priceMax: preset.max ? String(preset.max) : '',
                    }))
                  }}>
                    {preset.label}
                  </PresetChip>
                )
              })}
            </PresetRow>
          </Section>

          <Divider />

          <Section>
            <SectionLabel>📐 שטח (מ״ר)</SectionLabel>
            <RangeInput min={0} max={5000}
              valueMin={Number(draft.sizeMin) || 0} valueMax={Number(draft.sizeMax) || 5000}
              onChange={(lo: number, hi: number) => setDraft(d => ({ ...d, sizeMin: lo ? String(lo) : '', sizeMax: hi < 5000 ? String(hi) : '' }))}
              formatValue={(v: number) => `${v.toLocaleString()} מ״ר`} />
            <PresetRow>
              {SIZE_PRESETS.map(preset => {
                const isActive = (Number(draft.sizeMin) || 0) === preset.min && (preset.max === 0 ? !draft.sizeMax : (Number(draft.sizeMax) || 0) === preset.max)
                return (
                  <PresetChip key={preset.label} $active={isActive} onClick={() => {
                    setDraft(d => ({
                      ...d,
                      sizeMin: preset.min ? String(preset.min) : '',
                      sizeMax: preset.max ? String(preset.max) : '',
                    }))
                  }}>
                    {preset.label}
                  </PresetChip>
                )
              })}
            </PresetRow>
          </Section>

          <Divider />

          <Section>
            <SectionLabel>📈 השקעה</SectionLabel>
            <Grid>
              <Field>
                <FieldLabel>תשואה מינימלית (%ROI)</FieldLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={Number(draft.minRoi) || 0}
                    onChange={e => set('minRoi', Number(e.target.value) > 0 ? e.target.value : '')}
                    style={{
                      flex: 1, height: 6, WebkitAppearance: 'none', appearance: 'none',
                      borderRadius: 3, outline: 'none', cursor: 'pointer',
                      background: `linear-gradient(90deg, ${t.gold} 0%, ${t.gold} ${Number(draft.minRoi) || 0}%, ${t.surfaceLight} ${Number(draft.minRoi) || 0}%, ${t.surfaceLight} 100%)`,
                    }}
                  />
                  <span style={{ fontSize: 14, fontWeight: 800, color: Number(draft.minRoi) > 0 ? t.gold : t.textDim, minWidth: 44, textAlign: 'center' }}>
                    {Number(draft.minRoi) > 0 ? `${draft.minRoi}%` : 'הכל'}
                  </span>
                </div>
                <PresetRow>
                  {[
                    { label: 'הכל', value: '' },
                    { label: '10%+', value: '10' },
                    { label: '25%+', value: '25' },
                    { label: '50%+', value: '50' },
                    { label: '100%+', value: '100' },
                  ].map(preset => (
                    <PresetChip key={preset.label} $active={draft.minRoi === preset.value}
                      onClick={() => set('minRoi', preset.value)}>
                      {preset.label}
                    </PresetChip>
                  ))}
                </PresetRow>
              </Field>
              <Field>
                <FieldLabel>ציון השקעה</FieldLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { value: '', label: 'כל הציונים', icon: '📊', color: t.textSec },
                    { value: 'high', label: 'גבוה (7-10)', icon: '⭐', color: '#10B981' },
                    { value: 'medium', label: 'בינוני (4-6)', icon: '📈', color: '#F59E0B' },
                    { value: 'low', label: 'נמוך (1-3)', icon: '📉', color: '#EF4444' },
                  ].map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                      background: draft.ripeness === opt.value ? `${opt.color}12` : t.surfaceLight,
                      border: `1px solid ${draft.ripeness === opt.value ? `${opt.color}40` : t.border}`,
                      borderRadius: t.r.md, cursor: 'pointer', transition: `all ${t.tr}`,
                      fontSize: 13, fontWeight: draft.ripeness === opt.value ? 700 : 500,
                      color: draft.ripeness === opt.value ? opt.color : t.textSec,
                    }}>
                      <input
                        type="radio" name="ripeness" value={opt.value}
                        checked={draft.ripeness === opt.value}
                        onChange={() => set('ripeness', opt.value)}
                        style={{ display: 'none' }}
                      />
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </Grid>
          </Section>

          <Actions>
            <ApplyBtn onClick={apply}>
              {resultCount != null ? `החל סינון (${resultCount} חלקות)` : 'החל סינון'}
            </ApplyBtn>
            <ClearBtn onClick={clear}>נקה הכל</ClearBtn>
          </Actions>
        </Drawer>
      </Wrap>
    </>
  )
}
