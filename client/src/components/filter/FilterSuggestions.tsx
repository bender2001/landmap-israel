import styled, { keyframes } from 'styled-components'
import { statusLabels } from '../../utils/constants'
import { theme as staticTheme, media } from '../../styles/theme'

// ─── Types ───────────────────────────────────────────────────────────────

export type FS_Filters = {
  city: string
  priceMin?: string | number
  priceMax?: string | number
  sizeMin?: string | number
  sizeMax?: string | number
  ripeness?: string
  minRoi?: string | number
  zoning?: string
  maxDays?: string | number
  maxMonthly?: string | number
  search?: string
}

export type FS_FilterKey = keyof FS_Filters

type FS_Suggestion = {
  label: string
  action: () => void
  icon: string
}

export type FilterSuggestionsProps = {
  filteredCount: number
  totalCount: number
  filters: FS_Filters
  statusFilter: string[]
  onFilterChange: (key: FS_FilterKey, value: string | number) => void
  onToggleStatus: (status: string) => void
  onClearFilters: () => void
}

// ─── Styled Components ───────────────────────────────────────────────────

const FS_bounceIn = keyframes`
  0% {
    transform: translate(-50%, 8px) scale(0.98);
    opacity: 0;
  }
  60% {
    transform: translate(-50%, -2px) scale(1.01);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, 0) scale(1);
  }
`

const FS_Wrapper = styled.div`
  position: fixed;
  left: 50%;
  bottom: 18rem;
  transform: translateX(-50%);
  z-index: 35;
  animation: ${FS_bounceIn} 0.5s ease;

  ${media.sm} {
    bottom: 19rem;
  }
`

const FS_Panel = styled.div`
  background: rgba(10, 22, 40, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: ${staticTheme.radii.xl};
  padding: 0.75rem 1rem;
  box-shadow: ${staticTheme.shadows.elevated};
  max-width: 24rem;
`

const FS_Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
`

const FS_HeaderText = styled.span`
  font-size: 11px;
  color: ${staticTheme.colors.gold};
  font-weight: 600;
`

const FS_SuggestionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`

const FS_SuggestionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  font-size: 10px;
  font-weight: 600;
  color: ${staticTheme.colors.slate[300]};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${staticTheme.radii.md};
  transition: ${staticTheme.transitions.normal};

  &:hover,
  &:focus-visible {
    background: rgba(200, 148, 42, 0.1);
    border-color: rgba(200, 148, 42, 0.2);
    color: ${staticTheme.colors.gold};
  }
`

const FS_ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.6rem;
  font-size: 10px;
  font-weight: 700;
  color: ${staticTheme.colors.gold};
  background: rgba(200, 148, 42, 0.1);
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: ${staticTheme.radii.md};
  transition: ${staticTheme.transitions.normal};

  &:hover,
  &:focus-visible {
    background: rgba(200, 148, 42, 0.15);
  }
`

// ─── Component ───────────────────────────────────────────────────────────

export function FilterSuggestions({
  filteredCount,
  totalCount,
  filters,
  statusFilter,
  onFilterChange,
  onToggleStatus,
  onClearFilters,
}: FilterSuggestionsProps) {
  const activeCount =
    (filters.city !== 'all' ? 1 : 0) +
    (filters.priceMin || filters.priceMax ? 1 : 0) +
    (filters.sizeMin || filters.sizeMax ? 1 : 0) +
    (filters.ripeness && filters.ripeness !== 'all' ? 1 : 0) +
    (filters.minRoi && filters.minRoi !== 'all' ? 1 : 0) +
    (filters.zoning && filters.zoning !== 'all' ? 1 : 0) +
    (filters.maxDays ? 1 : 0) +
    (filters.maxMonthly ? 1 : 0) +
    (filters.search ? 1 : 0) +
    statusFilter.length

  if (filteredCount >= 4 || activeCount === 0 || totalCount === 0) return null

  const suggestions: FS_Suggestion[] = []
  if (filters.city !== 'all') {
    suggestions.push({
      label: `\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF "${filters.city}"`,
      action: () => onFilterChange('city', 'all'),
      icon: '\uD83C\uDFD9\uFE0F',
    })
  }
  if (filters.priceMin || filters.priceMax) {
    suggestions.push({
      label: '\u05D4\u05E8\u05D7\u05D1 \u05D8\u05D5\u05D5\u05D7 \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD',
      action: () => {
        onFilterChange('priceMin', '')
        onFilterChange('priceMax', '')
      },
      icon: '\uD83D\uDCB0',
    })
  }
  if (filters.sizeMin || filters.sizeMax) {
    suggestions.push({
      label: '\u05D4\u05E8\u05D7\u05D1 \u05D8\u05D5\u05D5\u05D7 \u05E9\u05D8\u05D7',
      action: () => {
        onFilterChange('sizeMin', '')
        onFilterChange('sizeMax', '')
      },
      icon: '\uD83D\uDCD0',
    })
  }
  if (filters.minRoi && filters.minRoi !== 'all') {
    suggestions.push({
      label: '\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05EA\u05E9\u05D5\u05D0\u05D4',
      action: () => onFilterChange('minRoi', 'all'),
      icon: '\uD83D\uDCC8',
    })
  }
  if (filters.zoning && filters.zoning !== 'all') {
    suggestions.push({
      label: '\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05EA\u05DB\u05E0\u05D5\u05E0\u05D9',
      action: () => onFilterChange('zoning', 'all'),
      icon: '\uD83D\uDDFA\uFE0F',
    })
  }
  if (filters.ripeness && filters.ripeness !== 'all') {
    suggestions.push({
      label: '\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05D1\u05E9\u05DC\u05D5\u05EA',
      action: () => onFilterChange('ripeness', 'all'),
      icon: '\u23F1\uFE0F',
    })
  }
  if (filters.maxDays) {
    suggestions.push({
      label: '\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05D7\u05D3\u05E9\u05D5\u05EA',
      action: () => onFilterChange('maxDays', ''),
      icon: '\uD83C\uDD95',
    })
  }
  if (filters.maxMonthly) {
    suggestions.push({
      label: '\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9',
      action: () => onFilterChange('maxMonthly', ''),
      icon: '\uD83C\uDFE6',
    })
  }
  statusFilter.forEach((status) => {
    const label = status === 'AVAILABLE' ? '\u05D6\u05DE\u05D9\u05DF' : status === 'SOLD' ? '\u05E0\u05DE\u05DB\u05E8' : status
    suggestions.push({
      label: `\u05D4\u05E1\u05E8 \u05E1\u05D8\u05D8\u05D5\u05E1 "${label}"`,
      action: () => onToggleStatus(status),
      icon: '\uD83C\uDFF7\uFE0F',
    })
  })

  if (suggestions.length === 0) return null

  return (
    <FS_Wrapper dir="rtl">
      <FS_Panel>
        <FS_Header>
          <span>{'\uD83D\uDCA1'}</span>
          <FS_HeaderText>
            {filteredCount === 0 ? '\u05D0\u05D9\u05DF \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA' : `\u05E8\u05E7 ${filteredCount} \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA`} {'\u2014 \u05E0\u05E1\u05D4 \u05DC\u05D4\u05E8\u05D7\u05D9\u05D1:'}
          </FS_HeaderText>
        </FS_Header>
        <FS_SuggestionRow>
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <FS_SuggestionButton key={`${suggestion.label}-${index}`} type="button" onClick={suggestion.action}>
              <span>{suggestion.icon}</span>
              <span>{suggestion.label}</span>
            </FS_SuggestionButton>
          ))}
          {activeCount > 1 && (
            <FS_ClearButton type="button" onClick={onClearFilters}>
              {'\uD83D\uDD04 \u05E0\u05E7\u05D4 \u05D4\u05DB\u05DC'}
            </FS_ClearButton>
          )}
        </FS_SuggestionRow>
      </FS_Panel>
    </FS_Wrapper>
  )
}
