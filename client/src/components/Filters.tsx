import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Search, SlidersHorizontal, X, Sparkles } from 'lucide-react'
import { t, mobile } from '../theme'
import { Select, RangeInput } from './UI'
import type { Filters } from '../types'

const EMPTY: Filters = { city: '', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: '', minRoi: '', zoning: '', search: '' }

const CITIES: { value: string; label: string }[] = [
  'חדרה', 'נתניה', 'קיסריה', 'הרצליה', 'כפר סבא', 'רעננה', 'הוד השרון', 'תל אביב',
  'חיפה', 'באר שבע', 'ראשון לציון', 'אשדוד', 'ירושלים',
].map(c => ({ value: c, label: c }))

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
const QuickRow = styled.div`display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:0 4px;direction:rtl;`
const QuickChip = styled.button<{ $active: boolean }>`
  display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border:1px solid ${p => p.$active ? t.gold : t.glassBorder};
  border-radius:${t.r.full};font-size:12px;font-weight:600;font-family:${t.font};cursor:pointer;
  background:${p => p.$active ? t.goldDim : t.glass};color:${p => p.$active ? t.gold : t.textSec};
  backdrop-filter:blur(12px);transition:all ${t.tr};animation:${chipIn} 0.2s ease-out;
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

/* ── Component ── */
interface Props { filters: Filters; onChange: (f: Filters) => void; resultCount?: number }

export default function FiltersBar({ filters, onChange, resultCount }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(filters)
  const [phIdx, setPhIdx] = useState(0)
  const [activeQuick, setActiveQuick] = useState<Set<string>>(new Set())

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
    Object.entries(filters).filter(([k, v]) => k !== 'search' && k !== 'ripeness' && k !== 'minRoi' && v && v !== 'all').length, [filters])

  const chips = useMemo(() => {
    const c: { key: string; label: string }[] = []
    if (filters.city) c.push({ key: 'city', label: filters.city })
    if (filters.zoning) c.push({ key: 'zoning', label: ZONING.find(z => z.value === filters.zoning)?.label || filters.zoning })
    if (filters.priceMin) c.push({ key: 'priceMin', label: `\u20AA${Number(filters.priceMin).toLocaleString()}+` })
    if (filters.priceMax) c.push({ key: 'priceMax', label: `\u05E2\u05D3 \u20AA${Number(filters.priceMax).toLocaleString()}` })
    if (filters.sizeMin) c.push({ key: 'sizeMin', label: `${filters.sizeMin}+ \u05DE\u05F4\u05E8` })
    if (filters.sizeMax) c.push({ key: 'sizeMax', label: `\u05E2\u05D3 ${filters.sizeMax} \u05DE\u05F4\u05E8` })
    return c
  }, [filters])

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
        <Bar>
          <SIcon size={18} />
          <Input placeholder={PLACEHOLDERS[phIdx]} value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })} />
          <FilterBtn $active={activeCount > 0} onClick={() => { setDraft(filters); setOpen(o => !o) }} aria-label="סננים">
            <SlidersHorizontal size={18} />
            {activeCount > 0 && <CountBadge>{activeCount}</CountBadge>}
          </FilterBtn>
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

        <Drawer $open={open}>
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
          </Section>

          <Divider />

          <Section>
            <SectionLabel>📐 שטח (מ״ר)</SectionLabel>
            <RangeInput min={0} max={5000}
              valueMin={Number(draft.sizeMin) || 0} valueMax={Number(draft.sizeMax) || 5000}
              onChange={(lo: number, hi: number) => setDraft(d => ({ ...d, sizeMin: lo ? String(lo) : '', sizeMax: hi < 5000 ? String(hi) : '' }))}
              formatValue={(v: number) => `${v.toLocaleString()} מ״ר`} />
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
