import { useMemo, memo } from 'react'
import styled, { keyframes } from 'styled-components'
import { X, Filter } from 'lucide-react'
import { statusLabels, zoningLabels } from '../../utils/constants'
import { theme as staticTheme, media } from '../../styles/theme'

// ─── Types ───────────────────────────────────────────────────────────────

export type AFC_Filters = {
  city?: string
  priceMin?: string | number
  priceMax?: string | number
  sizeMin?: string | number
  sizeMax?: string | number
  minRoi?: string | number
  zoning?: string
  ripeness?: string
  maxDays?: string | number
  maxMonthly?: string | number
  search?: string
}

export type AFC_FilterKey = keyof AFC_Filters

type AFC_Chip = {
  id: string
  label: string
  icon: string
  onRemove: () => void
  isSort?: boolean
}

export type ActiveFilterChipsProps = {
  filters: AFC_Filters
  statusFilter: string[]
  sortBy?: string
  boundsFilter?: boolean
  onFilterChange: (key: AFC_FilterKey, value: string | number) => void
  onToggleStatus: (status: string) => void
  onSortChange: (value: string) => void
  onClearBounds: () => void
  onClearFilters: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────

const AFC_sortLabels: Record<string, string> = {
  'deal-desc': '\u05E2\u05E1\u05E7\u05D4 \u05D8\u05D5\u05D1\u05D4',
  'distance-asc': '\u05E7\u05E8\u05D5\u05D1 \u05D0\u05DC\u05D9\u05D9',
  'price-asc': '\u05DE\u05D7\u05D9\u05E8 \u2191',
  'price-desc': '\u05DE\u05D7\u05D9\u05E8 \u2193',
  'ppsqm-asc': '\u05DE\u05D7\u05D9\u05E8/\u05DE\u05F4\u05E8 \u2191',
  'ppsqm-desc': '\u05DE\u05D7\u05D9\u05E8/\u05DE\u05F4\u05E8 \u2193',
  'size-asc': '\u05E9\u05D8\u05D7 \u2191',
  'size-desc': '\u05E9\u05D8\u05D7 \u2193',
  'roi-desc': '\u05EA\u05E9\u05D5\u05D0\u05D4 \u2193',
  'roi-asc': '\u05EA\u05E9\u05D5\u05D0\u05D4 \u2191',
  'score-desc': '\u05E6\u05D9\u05D5\u05DF \u2193',
  'cagr-desc': 'CAGR \u2193',
  'updated-desc': '\u05E2\u05D5\u05D3\u05DB\u05DF',
  'newest-first': '\u05D7\u05D3\u05E9\u05D5\u05EA',
  'monthly-asc': '\u05D7\u05D5\u05D3\u05E9\u05D9 \u2191',
}

// ─── Styled Components ───────────────────────────────────────────────────

const AFC_fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const AFC_Wrapper = styled.div`
  position: fixed;
  top: 6.5rem;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 40;
  animation: ${AFC_fadeIn} 0.25s ease;

  ${media.sm} {
    top: 7rem;
    right: 1rem;
    left: auto;
  }
`

const AFC_ChipRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  overflow-x: auto;
  padding-bottom: 2px;
  max-width: 100%;

  ${media.sm} {
    max-width: 600px;
  }

  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`

const AFC_ChipIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.25rem;
  flex-shrink: 0;
  font-size: 9px;
  color: rgba(200, 148, 42, 0.6);
  font-weight: 600;

  svg {
    width: 12px;
    height: 12px;
  }
`

const AFC_ChipButton = styled.button<{ $variant: 'filter' | 'sort' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: ${staticTheme.radii.md};
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid;
  transition: ${staticTheme.transitions.fast};
  ${({ $variant }) =>
    $variant === 'sort'
      ? `
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.2);
    color: #c4b5fd;
    &:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: rgba(139, 92, 246, 0.3);
    }
  `
      : `
    background: rgba(200, 148, 42, 0.1);
    border-color: rgba(200, 148, 42, 0.2);
    color: ${staticTheme.colors.gold};
    &:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
  `}

  svg {
    width: 10px;
    height: 10px;
    opacity: 0.6;
    transition: ${staticTheme.transitions.fast};
  }

  &:hover svg,
  &:focus-visible svg {
    opacity: 1;
  }
`

const AFC_ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: ${staticTheme.radii.md};
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  transition: ${staticTheme.transitions.fast};

  &:hover,
  &:focus-visible {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.3);
  }
`

// ─── Component ───────────────────────────────────────────────────────────

export const ActiveFilterChips = memo(function ActiveFilterChips({
  filters,
  statusFilter,
  sortBy,
  boundsFilter,
  onFilterChange,
  onToggleStatus,
  onSortChange,
  onClearBounds,
  onClearFilters,
}: ActiveFilterChipsProps) {
  const chips = useMemo<AFC_Chip[]>(() => {
    const result: AFC_Chip[] = []

    if (filters.city && filters.city !== 'all') {
      result.push({
        id: 'city',
        label: filters.city,
        icon: '\uD83C\uDFD9\uFE0F',
        onRemove: () => onFilterChange('city', 'all'),
      })
    }

    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin ? `\u20AA${(+filters.priceMin / 1000).toFixed(0)}K` : ''
      const max = filters.priceMax ? `\u20AA${(+filters.priceMax / 1000).toFixed(0)}K` : ''
      const label = min && max ? `${min}\u2013${max}` : min ? `${min}+` : `\u05E2\u05D3 ${max}`
      result.push({
        id: 'price',
        label,
        icon: '\uD83D\uDCB0',
        onRemove: () => {
          onFilterChange('priceMin', '')
          onFilterChange('priceMax', '')
        },
      })
    }

    if (filters.sizeMin || filters.sizeMax) {
      const min = filters.sizeMin ? `${filters.sizeMin} \u05D3\u05D5\u05E0\u05DD` : ''
      const max = filters.sizeMax ? `${filters.sizeMax} \u05D3\u05D5\u05E0\u05DD` : ''
      const label = min && max ? `${min}\u2013${max}` : min ? `${min}+` : `\u05E2\u05D3 ${max}`
      result.push({
        id: 'size',
        label,
        icon: '\uD83D\uDCD0',
        onRemove: () => {
          onFilterChange('sizeMin', '')
          onFilterChange('sizeMax', '')
        },
      })
    }

    if (filters.minRoi && filters.minRoi !== 'all') {
      result.push({
        id: 'roi',
        label: `\u05EA\u05E9\u05D5\u05D0\u05D4 ${filters.minRoi}%+`,
        icon: '\uD83D\uDCC8',
        onRemove: () => onFilterChange('minRoi', 'all'),
      })
    }

    if (filters.zoning && filters.zoning !== 'all') {
      const zoningLabel = zoningLabels[filters.zoning] || filters.zoning
      result.push({
        id: 'zoning',
        label: zoningLabel,
        icon: '\uD83D\uDDFA\uFE0F',
        onRemove: () => onFilterChange('zoning', 'all'),
      })
    }

    if (filters.ripeness && filters.ripeness !== 'all') {
      result.push({
        id: 'ripeness',
        label: `${filters.ripeness} \u05E9\u05E0\u05D9\u05DD`,
        icon: '\u23F1\uFE0F',
        onRemove: () => onFilterChange('ripeness', 'all'),
      })
    }

    if (filters.maxDays) {
      result.push({
        id: 'maxDays',
        label: `\u05D7\u05D3\u05E9\u05D5\u05EA ${filters.maxDays} \u05D9\u05DE\u05D9\u05DD`,
        icon: '\uD83C\uDD95',
        onRemove: () => onFilterChange('maxDays', ''),
      })
    }

    if (filters.maxMonthly) {
      result.push({
        id: 'monthly',
        label: `\u05E2\u05D3 \u20AA${(+filters.maxMonthly).toLocaleString()}/\u05D7\u05D5\u05D3\u05E9`,
        icon: '\uD83C\uDFE6',
        onRemove: () => onFilterChange('maxMonthly', ''),
      })
    }

    if (filters.search) {
      result.push({
        id: 'search',
        label: `"${filters.search}"`,
        icon: '\uD83D\uDD0D',
        onRemove: () => onFilterChange('search', ''),
      })
    }

    for (const status of statusFilter) {
      const label = statusLabels[status] || status
      result.push({
        id: `status-${status}`,
        label,
        icon: '\uD83C\uDFF7\uFE0F',
        onRemove: () => onToggleStatus(status),
      })
    }

    if (boundsFilter) {
      result.push({
        id: 'bounds',
        label: '\u05D0\u05D6\u05D5\u05E8 \u05E0\u05D1\u05D7\u05E8',
        icon: '\uD83D\uDCCD',
        onRemove: onClearBounds,
      })
    }

    if (sortBy && sortBy !== 'default') {
      result.push({
        id: 'sort',
        label: AFC_sortLabels[sortBy] || sortBy,
        icon: '\u2195\uFE0F',
        onRemove: () => onSortChange('default'),
        isSort: true,
      })
    }

    return result
  }, [filters, statusFilter, sortBy, boundsFilter, onFilterChange, onToggleStatus, onSortChange, onClearBounds])

  if (chips.length === 0) return null

  return (
    <AFC_Wrapper dir="rtl">
      <AFC_ChipRow>
        <AFC_ChipIndicator>
          <Filter aria-hidden />
          <span>{chips.length}</span>
        </AFC_ChipIndicator>
        {chips.map((chip) => (
          <AFC_ChipButton
            key={chip.id}
            type="button"
            onClick={chip.onRemove}
            title={`\u05D4\u05E1\u05E8: ${chip.label}`}
            $variant={chip.isSort ? 'sort' : 'filter'}
          >
            <span>{chip.icon}</span>
            <span>{chip.label}</span>
            <X aria-hidden />
          </AFC_ChipButton>
        ))}
        {chips.length >= 2 && (
          <AFC_ClearButton type="button" onClick={onClearFilters}>
            {'\uD83D\uDD04 \u05E0\u05E7\u05D4 \u05D4\u05DB\u05DC'}
          </AFC_ClearButton>
        )}
      </AFC_ChipRow>
    </AFC_Wrapper>
  )
})
