import { useState, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { t, media } from '../theme'
import type { Filters } from '../types'

const Bar = styled.div`
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  z-index: ${t.z.filter}; width: min(880px, calc(100vw - 32px));
  background: ${t.colors.glass};
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border: 1px solid ${t.colors.glassBorder};
  border-radius: ${t.radius.xl};
  box-shadow: ${t.shadow.lg};
  padding: 8px 12px;
  display: flex; align-items: center; gap: 8px;
  transition: border-color ${t.transition};
  &:focus-within { border-color: ${t.colors.goldBorder}; }
`

const SearchInput = styled.input`
  flex: 1; min-width: 0;
  background: none; border: none; outline: none;
  font-family: ${t.font}; font-size: 13px; color: ${t.colors.text};
  &::placeholder { color: ${t.colors.textDim}; }
`

const FilterBtn = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: ${t.radius.sm};
  border: 1px solid ${({ $active }) => $active ? t.colors.goldBorder : t.colors.border};
  background: ${({ $active }) => $active ? t.colors.goldDim : 'transparent'};
  color: ${({ $active }) => $active ? t.colors.goldBright : t.colors.textSec};
  font-size: 12px; font-weight: 500; cursor: pointer; font-family: ${t.font};
  white-space: nowrap; transition: all ${t.transition};
  &:hover { background: ${t.colors.surfaceHover}; border-color: ${t.colors.goldBorder}; }
`

const Drawer = styled.div<{ $open: boolean }>`
  position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
  z-index: ${t.z.filter}; width: min(600px, calc(100vw - 32px));
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.lg}; box-shadow: ${t.shadow.xl};
  padding: 20px; display: ${({ $open }) => $open ? 'block' : 'none'};

  ${media.mobile} {
    position: fixed; top: auto; bottom: 0; left: 0; right: 0;
    transform: none; width: 100%;
    border-radius: ${t.radius.xl} ${t.radius.xl} 0 0;
    max-height: 70vh; overflow-y: auto;
  }
`

const FilterGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  ${media.mobile} { grid-template-columns: 1fr; }
`

const FieldWrap = styled.div`
  display: flex; flex-direction: column; gap: 4px;
`
const FieldLabel = styled.label`font-size: 11px; font-weight: 600; color: ${t.colors.textDim};`
const FieldSelect = styled.select`
  padding: 8px 10px; border-radius: ${t.radius.sm};
  border: 1px solid ${t.colors.border}; background: ${t.colors.surfaceHover};
  color: ${t.colors.text}; font-size: 13px; font-family: ${t.font};
  outline: none; cursor: pointer;
  &:focus { border-color: ${t.colors.gold}; }
`
const FieldInput = styled.input`
  padding: 8px 10px; border-radius: ${t.radius.sm};
  border: 1px solid ${t.colors.border}; background: ${t.colors.surfaceHover};
  color: ${t.colors.text}; font-size: 13px; font-family: ${t.font}; outline: none;
  &:focus { border-color: ${t.colors.gold}; }
  &::placeholder { color: ${t.colors.textDim}; }
`

const ChipsRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px;
`
const Chip = styled.button`
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: ${t.radius.full};
  border: 1px solid ${t.colors.goldBorder}; background: ${t.colors.goldDim};
  color: ${t.colors.goldBright}; font-size: 11px; font-weight: 600;
  cursor: pointer; font-family: ${t.font}; transition: all ${t.transition};
  &:hover { background: ${t.colors.gold}25; }
`

const Actions = styled.div`
  display: flex; justify-content: space-between; align-items: center; margin-top: 16px;
`
const ClearBtn = styled.button`
  background: none; border: none; color: ${t.colors.textDim}; font-size: 12px;
  cursor: pointer; font-family: ${t.font}; &:hover { color: ${t.colors.text}; }
`
const ApplyBtn = styled.button`
  padding: 8px 20px; border: none; border-radius: ${t.radius.sm};
  background: linear-gradient(135deg, ${t.colors.gold}, ${t.colors.goldBright});
  color: ${t.colors.bg}; font-weight: 700; font-size: 13px;
  cursor: pointer; font-family: ${t.font}; transition: all ${t.transition};
  &:hover { box-shadow: ${t.shadow.glow}; }
`

const cities = ['all', 'חדרה', 'נתניה', 'קיסריה']

interface FilterBarProps {
  filters: Filters
  onChange: (f: Filters) => void
  plotCount: number
}

export default function FilterBar({ filters, onChange, plotCount }: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [draft, setDraft] = useState(filters)

  const hasActiveFilters = filters.city !== 'all' || filters.priceMin || filters.priceMax ||
    filters.sizeMin || filters.sizeMax || filters.zoning !== 'all' || filters.search

  const activeCount = [
    filters.city !== 'all', filters.priceMin, filters.priceMax,
    filters.sizeMin, filters.sizeMax, filters.zoning !== 'all',
  ].filter(Boolean).length

  const apply = useCallback(() => { onChange(draft); setDrawerOpen(false) }, [draft, onChange])
  const clear = useCallback(() => {
    const empty: Filters = { city: 'all', priceMin: '', priceMax: '', sizeMin: '', sizeMax: '', ripeness: 'all', minRoi: 'all', zoning: 'all', search: '' }
    setDraft(empty); onChange(empty); setDrawerOpen(false)
  }, [onChange])

  const removeFilter = (key: keyof Filters) => {
    const updated = { ...filters, [key]: key === 'city' || key === 'zoning' || key === 'ripeness' || key === 'minRoi' ? 'all' : '' }
    onChange(updated); setDraft(updated)
  }

  return (
    <>
      <Bar>
        <Search size={16} color={t.colors.textDim} style={{ flexShrink: 0 }} />
        <SearchInput
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder={`חיפוש ב-${plotCount} חלקות...`}
        />
        {filters.search && (
          <button onClick={() => onChange({ ...filters, search: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={14} color={t.colors.textDim} />
          </button>
        )}
        <FilterBtn $active={!!hasActiveFilters} onClick={() => { setDraft(filters); setDrawerOpen(!drawerOpen) }}>
          <SlidersHorizontal size={13} />
          סינון
          {activeCount > 0 && <span style={{ background: t.colors.gold, color: t.colors.bg, borderRadius: '50%', width: 16, height: 16, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeCount}</span>}
        </FilterBtn>
      </Bar>

      {hasActiveFilters && (
        <ChipsRow style={{ position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)', zIndex: t.z.filter - 1 }}>
          {filters.city !== 'all' && <Chip onClick={() => removeFilter('city')}>{filters.city} <X size={10} /></Chip>}
          {filters.priceMin && <Chip onClick={() => removeFilter('priceMin')}>מ-₪{Number(filters.priceMin).toLocaleString()} <X size={10} /></Chip>}
          {filters.priceMax && <Chip onClick={() => removeFilter('priceMax')}>עד ₪{Number(filters.priceMax).toLocaleString()} <X size={10} /></Chip>}
          {filters.zoning !== 'all' && <Chip onClick={() => removeFilter('zoning')}>תכנון <X size={10} /></Chip>}
        </ChipsRow>
      )}

      <Drawer $open={drawerOpen}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: t.colors.text }}>סינון מתקדם</h3>
          <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={18} color={t.colors.textDim} />
          </button>
        </div>

        <FilterGrid>
          <FieldWrap>
            <FieldLabel>עיר</FieldLabel>
            <FieldSelect value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })}>
              <option value="all">כל הערים</option>
              {cities.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
            </FieldSelect>
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>שלב תכנוני</FieldLabel>
            <FieldSelect value={draft.zoning} onChange={e => setDraft({ ...draft, zoning: e.target.value })}>
              <option value="all">הכל</option>
              <option value="AGRICULTURAL">חקלאית</option>
              <option value="MASTER_PLAN_APPROVED">מתאר מאושר</option>
              <option value="DETAILED_PLAN_PREP">הכנת מפורטת</option>
              <option value="DETAILED_PLAN_APPROVED">מפורטת מאושרת</option>
            </FieldSelect>
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>מחיר מינימלי</FieldLabel>
            <FieldInput type="number" placeholder="₪" value={draft.priceMin} onChange={e => setDraft({ ...draft, priceMin: e.target.value })} />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>מחיר מקסימלי</FieldLabel>
            <FieldInput type="number" placeholder="₪" value={draft.priceMax} onChange={e => setDraft({ ...draft, priceMax: e.target.value })} />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>שטח מינימלי (מ"ר)</FieldLabel>
            <FieldInput type="number" placeholder="מ״ר" value={draft.sizeMin} onChange={e => setDraft({ ...draft, sizeMin: e.target.value })} />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>שטח מקסימלי (מ"ר)</FieldLabel>
            <FieldInput type="number" placeholder="מ״ר" value={draft.sizeMax} onChange={e => setDraft({ ...draft, sizeMax: e.target.value })} />
          </FieldWrap>
        </FilterGrid>

        <Actions>
          <ClearBtn onClick={clear}>נקה הכל</ClearBtn>
          <ApplyBtn onClick={apply}>החל סינון</ApplyBtn>
        </Actions>
      </Drawer>

      {drawerOpen && <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: t.z.filter - 1 }} />}
    </>
  )
}
