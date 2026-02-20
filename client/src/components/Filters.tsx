import React, { useState, useCallback, useMemo } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { t, mobile } from '../theme'
import type { Filters } from '../types'

const EMPTY: Filters = { city: '', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: '', minRoi: '', zoning: '', search: '' }
const CITIES = ['תל אביב', 'חיפה', 'באר שבע', 'נתניה', 'ראשון לציון', 'אשדוד', 'ירושלים', 'הרצליה']
const ZONING = [
  { value: 'AGRICULTURAL', label: 'חקלאית' }, { value: 'MASTER_PLAN_DEPOSIT', label: 'הפקדת מתאר' },
  { value: 'MASTER_PLAN_APPROVED', label: 'מתאר מאושרת' }, { value: 'DETAILED_PLAN_APPROVED', label: 'מפורטת מאושרת' },
]

/* ── Animations ── */
const slideDown = keyframes`from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}`
const slideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const chipIn = keyframes`from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}`

/* ── Styled ── */
const Wrap = styled.div`position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:${t.z.filter};
  display:flex;flex-direction:column;align-items:center;gap:8px;width:min(560px,calc(100vw - 32px));
  ${mobile}{top:auto;bottom:0;left:0;right:0;transform:none;width:100%;}
`
const Bar = styled.div`
  display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;
  background:${t.glass};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid ${t.border};border-radius:${t.r.xl};box-shadow:${t.sh.lg};direction:rtl;
  transition:all ${t.tr};&:focus-within{border-color:${t.goldBorder};box-shadow:${t.sh.glow};}
`
const SearchIcon = styled(Search)`color:${t.textDim};flex-shrink:0;`
const Input = styled.input`
  flex:1;background:none;border:none;outline:none;font-size:14px;font-family:${t.font};
  color:${t.text};padding:6px 4px;direction:rtl;
  &::placeholder{color:${t.textDim};}
`
const FilterBtn = styled.button<{ $active: boolean }>`
  position:relative;display:flex;align-items:center;justify-content:center;width:38px;height:38px;
  border-radius:${t.r.md};border:1px solid ${p => p.$active ? t.gold : t.border};
  background:${p => p.$active ? t.goldDim : 'transparent'};color:${p => p.$active ? t.gold : t.textSec};
  cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const CountBadge = styled.span`
  position:absolute;top:-4px;left:-4px;width:18px;height:18px;border-radius:${t.r.full};
  background:${t.gold};color:${t.bg};font-size:10px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
`

/* ── Drawer ── */
const Backdrop = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.filter - 1};background:rgba(0,0,0,0.4);
  opacity:${p => p.$open ? 1 : 0};pointer-events:${p => p.$open ? 'auto' : 'none'};transition:opacity 0.25s;
`
const Drawer = styled.div<{ $open: boolean }>`
  width:100%;background:${t.surface};border:1px solid ${t.border};border-radius:${t.r.lg};
  box-shadow:${t.sh.xl};overflow:hidden;direction:rtl;
  animation:${slideDown} 0.3s ease-out;display:${p => p.$open ? 'block' : 'none'};
  ${mobile}{
    position:fixed;bottom:0;left:0;right:0;border-radius:${t.r.xl} ${t.r.xl} 0 0;
    max-height:70vh;overflow-y:auto;animation:${slideUp} 0.35s cubic-bezier(0.32,0.72,0,1);
    z-index:${t.z.filter};
  }
`
const DrawerHead = styled.div`display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid ${t.border};`
const DrawerTitle = styled.h3`font-size:15px;font-weight:700;color:${t.text};margin:0;`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:${t.r.sm};
  background:none;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};}
`
const Grid = styled.div`display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:16px;${mobile}{grid-template-columns:1fr;}`
const Field = styled.div`display:flex;flex-direction:column;gap:4px;`
const FieldLabel = styled.label`font-size:11px;font-weight:600;color:${t.textDim};text-transform:uppercase;`
const FieldInput = styled.input`
  padding:9px 12px;background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.sm};
  color:${t.text};font-size:13px;font-family:${t.font};outline:none;direction:rtl;transition:border ${t.tr};
  &:focus{border-color:${t.gold};}
  &::placeholder{color:${t.textDim};}
`
const FieldSelect = styled.select`
  padding:9px 12px;background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.sm};
  color:${t.text};font-size:13px;font-family:${t.font};outline:none;direction:rtl;cursor:pointer;
  appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394A3B8' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:12px center;transition:border ${t.tr};
  &:focus{border-color:${t.gold};}
`
const Actions = styled.div`display:flex;align-items:center;gap:10px;padding:12px 16px;border-top:1px solid ${t.border};`
const ApplyBtn = styled.button`
  flex:1;padding:10px;background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.md};font-weight:700;font-size:14px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};&:hover{box-shadow:${t.sh.glow};transform:translateY(-1px);}
`
const ClearBtn = styled.button`
  padding:10px 18px;background:none;border:1px solid ${t.border};border-radius:${t.r.md};
  color:${t.textSec};font-size:13px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`

/* ── Chips ── */
const ChipsRow = styled.div`display:flex;flex-wrap:wrap;gap:6px;width:100%;padding:0 4px;`
const Chip = styled.span`
  display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  background:${t.goldDim};border:1px solid ${t.goldBorder};border-radius:${t.r.full};
  font-size:11px;font-weight:600;color:${t.gold};animation:${chipIn} 0.25s ease-out;cursor:pointer;
  transition:all ${t.tr};&:hover{background:${t.gold};color:${t.bg};}
`

/* ── Component ── */
interface Props { filters: Filters; onChange: (f: Filters) => void }

export default function FiltersBar({ filters, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(filters)

  const activeCount = useMemo(() =>
    Object.entries(filters).filter(([k, v]) => k !== 'search' && v).length, [filters])

  const chips = useMemo(() => {
    const c: { key: string; label: string }[] = []
    if (filters.city) c.push({ key: 'city', label: filters.city })
    if (filters.zoning) c.push({ key: 'zoning', label: ZONING.find(z => z.value === filters.zoning)?.label || filters.zoning })
    if (filters.priceMin) c.push({ key: 'priceMin', label: `מ-₪${Number(filters.priceMin).toLocaleString()}` })
    if (filters.priceMax) c.push({ key: 'priceMax', label: `עד ₪${Number(filters.priceMax).toLocaleString()}` })
    if (filters.sizeMin) c.push({ key: 'sizeMin', label: `מ-${filters.sizeMin} מ״ר` })
    if (filters.sizeMax) c.push({ key: 'sizeMax', label: `עד ${filters.sizeMax} מ״ר` })
    return c
  }, [filters])

  const set = useCallback((key: keyof Filters, val: string) => setDraft(d => ({ ...d, [key]: val })), [])
  const apply = () => { onChange(draft); setOpen(false) }
  const clear = () => { const c = { ...EMPTY, search: filters.search }; setDraft(c); onChange(c); setOpen(false) }
  const removeChip = (key: string) => onChange({ ...filters, [key]: '' })

  return (
    <>
      <Backdrop $open={open} onClick={() => setOpen(false)} />
      <Wrap>
        <Bar>
          <SearchIcon size={18} />
          <Input placeholder="חיפוש חלקה, עיר, גוש..." value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })} />
          <FilterBtn $active={activeCount > 0} onClick={() => { setDraft(filters); setOpen(o => !o) }} aria-label="סננים">
            <SlidersHorizontal size={18} />
            {activeCount > 0 && <CountBadge>{activeCount}</CountBadge>}
          </FilterBtn>
        </Bar>

        {chips.length > 0 && (
          <ChipsRow>
            {chips.map(c => <Chip key={c.key} onClick={() => removeChip(c.key)}>{c.label}<X size={10} /></Chip>)}
          </ChipsRow>
        )}

        <Drawer $open={open}>
          <DrawerHead>
            <DrawerTitle>סינון חלקות</DrawerTitle>
            <CloseBtn onClick={() => setOpen(false)}><X size={16} /></CloseBtn>
          </DrawerHead>
          <Grid>
            <Field>
              <FieldLabel>עיר</FieldLabel>
              <FieldSelect value={draft.city} onChange={e => set('city', e.target.value)}>
                <option value="">הכל</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </FieldSelect>
            </Field>
            <Field>
              <FieldLabel>ייעוד</FieldLabel>
              <FieldSelect value={draft.zoning} onChange={e => set('zoning', e.target.value)}>
                <option value="">הכל</option>
                {ZONING.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
              </FieldSelect>
            </Field>
            <Field>
              <FieldLabel>מחיר מינימום</FieldLabel>
              <FieldInput type="number" placeholder="₪" value={draft.priceMin} onChange={e => set('priceMin', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>מחיר מקסימום</FieldLabel>
              <FieldInput type="number" placeholder="₪" value={draft.priceMax} onChange={e => set('priceMax', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>שטח מינימום</FieldLabel>
              <FieldInput type="number" placeholder="מ״ר" value={draft.sizeMin} onChange={e => set('sizeMin', e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>שטח מקסימום</FieldLabel>
              <FieldInput type="number" placeholder="מ״ר" value={draft.sizeMax} onChange={e => set('sizeMax', e.target.value)} />
            </Field>
          </Grid>
          <Actions>
            <ApplyBtn onClick={apply}>החל סינון</ApplyBtn>
            <ClearBtn onClick={clear}>נקה</ClearBtn>
          </Actions>
        </Drawer>
      </Wrap>
    </>
  )
}
