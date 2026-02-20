import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { SlidersHorizontal, X, ChevronDown, Check, MapPin, Banknote, Ruler, Clock, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Link2, Download, Zap, Layers, Navigation, Wallet } from 'lucide-react'
import { statusColors, statusLabels } from '../../utils/constants'
import { SearchAutocomplete } from './SearchAutocomplete'
import SavedSearches from '../SavedSearches'
import { useHapticFeedback } from '../../hooks/useInfra'
import { showToast } from '../ui/ToastContainer'
import { media } from '../../styles/theme'

// ─── Types ───────────────────────────────────────────────────────────────

interface AnimatedCountProps {
  value: number
}

interface SelectOption {
  label: string
  value: string
  min?: string
  max?: string
  icon?: React.ComponentType<any>
}

interface SelectPillProps {
  icon: React.ComponentType<any>
  label: string
  value: string
  displayValue: string | null | undefined
  options: SelectOption[]
  onChange: (value: string) => void
  isActive: boolean | string | undefined
}

interface QuickPresetsProps {
  filters: any
  statusFilter: string[]
  onFilterChange: (key: string, value: string) => void
  onToggleStatus: (status: string) => void
  onClearFilters: () => void
}

export interface FilterBarProps {
  filters: any
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  plotCount: number
  statusFilter: string[]
  onToggleStatus: (status: string) => void
  sortBy?: string
  onSortChange?: (value: string) => void
  allPlots?: any[]
  onSelectPlot?: (plot: any) => void
  savedSearches?: any
  onSaveSearch?: () => void
  onLoadSearch?: (search: any) => void
  onRemoveSearch?: (id: string) => void
}

// ─── Styled Components ───────────────────────────────────────────────────

const FilterBarContainer = styled.div`
  direction: rtl;
`

const SrOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`

const DesktopMarketStats = styled.div`
  display: none;
  ${media.md} {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    padding: 0 4px;
    font-size: 10px;
    color: ${({ theme }) => theme.colors.textTertiary};
  }
`

const MarketStatItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`

const MarketStatValue = styled.span<{ $color?: string }>`
  font-weight: 500;
  color: ${({ $color, theme }) => $color || theme.colors.textSecondary};
`

const MarketStatDivider = styled.span`
  width: 1px;
  height: 12px;
  background: ${({ theme }) => theme.colors.border};
`

const HotDealText = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.orange[500]};
  font-weight: 500;
`

const TimeText = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
`

const MobileMarketStats = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 6px;
  padding: 0 4px;
  font-size: 9px;
  color: ${({ theme }) => theme.colors.textTertiary};

  ${media.md} {
    display: none;
  }
`

const MobileDivider = styled.span`
  width: 1px;
  height: 10px;
  background: ${({ theme }) => theme.colors.border};
`

const MobileHotDealText = styled.span`
  color: ${({ theme }) => theme.colors.orange[500]};
`

const PresetsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  direction: rtl;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
`

const PresetsIcon = styled(Zap)`
  width: 12px;
  height: 12px;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.6;
  flex-shrink: 0;
`

const PresetButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  transition: all ${({ theme }) => theme.transitions.fast};
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid;

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.primaryLight};
          color: ${theme.colors.primary};
          border-color: ${theme.colors.primary}33;
          box-shadow: ${theme.shadows.sm};
        `
      : css`
          background: ${theme.colors.bgSecondary};
          color: ${theme.colors.textSecondary};
          border-color: ${theme.colors.border};
          &:hover {
            background: ${theme.colors.bgTertiary};
            color: ${theme.colors.text};
            border-color: ${theme.colors.slate[300]};
          }
        `}
`

const MobileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  ${media.md} { display: none; }
`

const MobileToggle = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bgSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  &:hover {
    background: ${({ theme }) => theme.colors.bgTertiary};
    color: ${({ theme }) => theme.colors.text};
  }
  svg { width: 16px; height: 16px; }
`

const MobileBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.white};
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
`

const MobileSearchWrap = styled.div`
  flex: 1;
`

const DesktopSearchRow = styled.div`
  display: none;
  margin-bottom: 8px;
  ${media.md} { display: block; }
`

const FilterPanel = styled.div<{ $expanded: boolean }>`
  ${media.md} { display: block; }

  ${({ $expanded }) =>
    !$expanded &&
    css`
      ${media.tablet} { display: none; }
      @media (max-width: 767px) { display: none; }
    `}

  ${({ $expanded }) =>
    $expanded &&
    css`
      display: block;
    `}
`

const PillsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`

const SelectPillWrap = styled.div`
  position: relative;
`

const PillTrigger = styled.button<{ $active: boolean; $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid;
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $active, $open, theme }) =>
    $active || $open
      ? css`
          background: ${theme.colors.primaryLight};
          color: ${theme.colors.primary};
          border-color: ${theme.colors.primary}40;
        `
      : css`
          background: ${theme.colors.bg};
          color: ${theme.colors.textSecondary};
          border-color: ${theme.colors.border};
          &:hover {
            border-color: ${theme.colors.slate[300]};
            color: ${theme.colors.text};
          }
        `}
`

const PillIcon = styled.span`
  display: flex;
  align-items: center;
  svg { width: 14px; height: 14px; }
`

const PillLabel = styled.span`
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PillChevron = styled.span<{ $open: boolean }>`
  display: flex;
  align-items: center;
  transition: transform ${({ theme }) => theme.transitions.fast};
  transform: ${({ $open }) => ($open ? 'rotate(180deg)' : 'rotate(0deg)')};
  svg { width: 12px; height: 12px; }
`

const PillDropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  min-width: 200px;
  max-height: 280px;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.popup};
  padding: 4px;
`

const PillDropdownHeader = styled.div`
  padding: 8px 12px 4px;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textTertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const PillOption = styled.button<{ $selected: boolean; $highlighted: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 13px;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.fast};
  text-align: right;
  background: transparent;
  color: ${({ theme }) => theme.colors.text};

  ${({ $selected, theme }) =>
    $selected &&
    css`
      color: ${theme.colors.primary};
      font-weight: 600;
    `}

  ${({ $highlighted, theme }) =>
    $highlighted &&
    css`
      background: ${theme.colors.primaryLight};
    `}

  &:hover {
    background: ${({ theme }) => theme.colors.bgSecondary};
  }
`

const PillOptionText = styled.span`
  flex: 1;
`

const PillOptionCheck = styled(Check)`
  width: 14px;
  height: 14px;
  color: ${({ theme }) => theme.colors.primary};
`

const FilterSeparator = styled.div`
  width: 1px;
  height: 24px;
  background: ${({ theme }) => theme.colors.border};
  margin: 0 4px;
  flex-shrink: 0;
`

const StatusChip = styled.button<{ $active: boolean; $chipColor: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  ${({ $active, $chipColor, theme }) =>
    $active
      ? css`
          background: ${$chipColor}15;
          color: ${$chipColor};
          border-color: ${$chipColor}30;
        `
      : css`
          background: ${theme.colors.bgSecondary};
          color: ${theme.colors.textSecondary};
          border-color: ${theme.colors.border};
          &:hover {
            border-color: ${theme.colors.slate[300]};
            color: ${theme.colors.text};
          }
        `}
`

const StatusDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const RipenessChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;
  svg { width: 12px; height: 12px; }

  ${({ $active, theme }) =>
    $active
      ? css`
          background: ${theme.colors.primaryLight};
          color: ${theme.colors.primary};
          border-color: ${theme.colors.primary}33;
        `
      : css`
          background: ${theme.colors.bgSecondary};
          color: ${theme.colors.textSecondary};
          border-color: ${theme.colors.border};
          &:hover {
            border-color: ${theme.colors.slate[300]};
            color: ${theme.colors.text};
          }
        `}
`

const ActiveChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
`

const ActiveChip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 11px;
  font-weight: 500;
  background: ${({ theme }) => theme.colors.primaryLight};
  color: ${({ theme }) => theme.colors.primary};
  border: 1px solid ${({ theme }) => theme.colors.primary}25;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;
  &:hover {
    background: ${({ theme }) => theme.colors.primary}20;
    border-color: ${({ theme }) => theme.colors.primary}40;
  }
  svg { width: 12px; height: 12px; }
`

const ActiveChipClose = styled(X)`
  width: 12px;
  height: 12px;
  opacity: 0.6;
  transition: opacity ${({ theme }) => theme.transitions.fast};
  &:hover { opacity: 1; }
`

const ActiveStatusDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const ActionsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.borderLight};
`

const ActionButton = styled.button<{ $copied?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;
  background: ${({ $copied, theme }) =>
    $copied ? `${theme.colors.emerald[50]}` : theme.colors.bgSecondary};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ $copied, theme }) =>
    $copied ? `${theme.colors.emerald[400]}50` : theme.colors.border};
  &:hover {
    background: ${({ theme }) => theme.colors.bgTertiary};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.slate[300]};
  }
  svg { width: 12px; height: 12px; }
`

const ActionLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.full};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;
  background: ${({ theme }) => theme.colors.bgSecondary};
  color: ${({ theme }) => theme.colors.textSecondary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  text-decoration: none;
  &:hover {
    background: ${({ theme }) => theme.colors.bgTertiary};
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.slate[300]};
    text-decoration: none;
  }
  svg { width: 12px; height: 12px; }
`

const FilterCount = styled.div<{ $hasFilters: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: auto;
  font-size: 12px;
  font-weight: ${({ $hasFilters }) => ($hasFilters ? 600 : 400)};
  color: ${({ $hasFilters, theme }) =>
    $hasFilters ? theme.colors.primary : theme.colors.textSecondary};
  svg { width: 12px; height: 12px; }
`

const FilterCountSubtext = styled.span`
  color: ${({ theme }) => theme.colors.textTertiary};
  font-weight: 400;
`

const TabularNums = styled.span`
  font-variant-numeric: tabular-nums;
`

const GreenCheckIcon = styled(Check)`
  width: 12px;
  height: 12px;
  color: ${({ theme }) => theme.colors.emerald[500]};
`

// ─── Static data ─────────────────────────────────────────────────────────

const KNOWN_CITIES = ['\u05D7\u05D3\u05E8\u05D4', '\u05E0\u05EA\u05E0\u05D9\u05D4', '\u05E7\u05D9\u05E1\u05E8\u05D9\u05D4']

const priceRangeOptions: SelectOption[] = [
  { label: '\u05DB\u05DC \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD', value: 'all', min: '', max: '' },
  { label: '\u05E2\u05D3 \u20AA200K', value: '0-200', min: '', max: '200000' },
  { label: '\u20AA200K \u2013 \u20AA400K', value: '200-400', min: '200000', max: '400000' },
  { label: '\u20AA400K \u2013 \u20AA600K', value: '400-600', min: '400000', max: '600000' },
  { label: '\u20AA600K \u2013 \u20AA800K', value: '600-800', min: '600000', max: '800000' },
  { label: '\u20AA800K \u2013 \u20AA1M', value: '800-1000', min: '800000', max: '1000000' },
  { label: '\u20AA1M+', value: '1000+', min: '1000000', max: '' },
]

const sizeRangeOptions: SelectOption[] = [
  { label: '\u05DB\u05DC \u05D4\u05D2\u05D3\u05DC\u05D9\u05DD', value: 'all', min: '', max: '' },
  { label: '\u05E2\u05D3 1 \u05D3\u05D5\u05E0\u05DD', value: '0-1', min: '', max: '1' },
  { label: '1\u20132 \u05D3\u05D5\u05E0\u05DD', value: '1-2', min: '1', max: '2' },
  { label: '2\u20133 \u05D3\u05D5\u05E0\u05DD', value: '2-3', min: '2', max: '3' },
  { label: '3\u20135 \u05D3\u05D5\u05E0\u05DD', value: '3-5', min: '3', max: '5' },
  { label: '5+ \u05D3\u05D5\u05E0\u05DD', value: '5+', min: '5', max: '' },
]

const ripenessOptions = [
  { label: '1-3 \u05E9\u05E0\u05D9\u05DD', value: '1-3' },
  { label: '3-5 \u05E9\u05E0\u05D9\u05DD', value: '3-5' },
  { label: '5+ \u05E9\u05E0\u05D9\u05DD', value: '5+' },
]

const roiOptions = [
  { label: '\u05DB\u05DC \u05D4\u05EA\u05E9\u05D5\u05D0\u05D5\u05EA', value: 'all' },
  { label: '50%+', value: '50' },
  { label: '100%+', value: '100' },
  { label: '150%+', value: '150' },
  { label: '200%+', value: '200' },
]

const monthlyPaymentOptions = [
  { label: '\u05DB\u05DC \u05D4\u05EA\u05E9\u05DC\u05D5\u05DE\u05D9\u05DD', value: '' },
  { label: '\u05E2\u05D3 \u20AA1,500/\u05D7\u05D5\u05D3\u05E9', value: '1500' },
  { label: '\u05E2\u05D3 \u20AA2,500/\u05D7\u05D5\u05D3\u05E9', value: '2500' },
  { label: '\u05E2\u05D3 \u20AA4,000/\u05D7\u05D5\u05D3\u05E9', value: '4000' },
  { label: '\u05E2\u05D3 \u20AA6,000/\u05D7\u05D5\u05D3\u05E9', value: '6000' },
  { label: '\u05E2\u05D3 \u20AA8,000/\u05D7\u05D5\u05D3\u05E9', value: '8000' },
  { label: '\u05E2\u05D3 \u20AA12,000/\u05D7\u05D5\u05D3\u05E9', value: '12000' },
]

const zoningOptions = [
  { label: '\u05DB\u05DC \u05D4\u05E9\u05DC\u05D1\u05D9\u05DD', value: 'all' },
  { label: '\uD83C\uDF3E \u05D7\u05E7\u05DC\u05D0\u05D9\u05EA', value: 'AGRICULTURAL' },
  { label: '\uD83D\uDCCB \u05D4\u05E4\u05E7\u05D3\u05EA \u05DE\u05EA\u05D0\u05E8', value: 'MASTER_PLAN_DEPOSIT' },
  { label: '\u2705 \u05DE\u05EA\u05D0\u05E8 \u05DE\u05D0\u05D5\u05E9\u05E8', value: 'MASTER_PLAN_APPROVED' },
  { label: '\uD83D\uDCD0 \u05D4\u05DB\u05E0\u05EA \u05DE\u05E4\u05D5\u05E8\u05D8\u05EA', value: 'DETAILED_PLAN_PREP' },
  { label: '\uD83D\uDCCB \u05D4\u05E4\u05E7\u05D3\u05EA \u05DE\u05E4\u05D5\u05E8\u05D8\u05EA', value: 'DETAILED_PLAN_DEPOSIT' },
  { label: '\u2705 \u05DE\u05E4\u05D5\u05E8\u05D8\u05EA \u05DE\u05D0\u05D5\u05E9\u05E8\u05EA', value: 'DETAILED_PLAN_APPROVED' },
  { label: '\uD83C\uDFD7\uFE0F \u05DE\u05DB\u05E8\u05D6 \u05D9\u05D6\u05DE\u05D9\u05DD', value: 'DEVELOPER_TENDER' },
  { label: '\uD83C\uDFE0 \u05D4\u05D9\u05EA\u05E8 \u05D1\u05E0\u05D9\u05D9\u05D4', value: 'BUILDING_PERMIT' },
]

const sortOptions = [
  { label: '\u2728 \u05DE\u05D5\u05DE\u05DC\u05E6\u05D5\u05EA', value: 'default', icon: ArrowUpDown },
  { label: '\uD83D\uDD25 \u05E2\u05E1\u05E7\u05D4 \u05D4\u05DB\u05D9 \u05D8\u05D5\u05D1\u05D4', value: 'deal-desc', icon: ArrowDown },
  { label: '\uD83D\uDD50 \u05D7\u05D3\u05E9\u05D5\u05EA \u05E8\u05D0\u05E9\u05D5\u05E0\u05D5\u05EA', value: 'newest-first', icon: ArrowDown },
  { label: '\u05D4\u05DB\u05D9 \u05E7\u05E8\u05D5\u05D1 \u05D0\u05DC\u05D9\u05D9 \uD83D\uDCCD', value: 'distance-asc', icon: Navigation },
  { label: '\u2764\uFE0F \u05DE\u05D5\u05E2\u05D3\u05E4\u05D9\u05DD \u05E8\u05D0\u05E9\u05D5\u05E0\u05D9\u05DD', value: 'favorites-first', icon: ArrowDown },
  { label: '\uD83D\uDCCA \u05E9\u05DC\u05DE\u05D5\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD', value: 'completeness-desc', icon: ArrowDown },
  { label: '\u05DE\u05D7\u05D9\u05E8: \u05E0\u05DE\u05D5\u05DA \u05DC\u05D2\u05D1\u05D5\u05D4', value: 'price-asc', icon: ArrowUp },
  { label: '\u05DE\u05D7\u05D9\u05E8: \u05D2\u05D1\u05D5\u05D4 \u05DC\u05E0\u05DE\u05D5\u05DA', value: 'price-desc', icon: ArrowDown },
  { label: '\u05DE\u05D7\u05D9\u05E8/\u05DE\u05F4\u05E8: \u05E0\u05DE\u05D5\u05DA \u05DC\u05D2\u05D1\u05D5\u05D4', value: 'ppsqm-asc', icon: ArrowUp },
  { label: '\u05DE\u05D7\u05D9\u05E8/\u05DE\u05F4\u05E8: \u05D2\u05D1\u05D5\u05D4 \u05DC\u05E0\u05DE\u05D5\u05DA', value: 'ppsqm-desc', icon: ArrowDown },
  { label: '\u05E9\u05D8\u05D7: \u05E7\u05D8\u05DF \u05DC\u05D2\u05D3\u05D5\u05DC', value: 'size-asc', icon: ArrowUp },
  { label: '\u05E9\u05D8\u05D7: \u05D2\u05D3\u05D5\u05DC \u05DC\u05E7\u05D8\u05DF', value: 'size-desc', icon: ArrowDown },
  { label: '\u05EA\u05E9\u05D5\u05D0\u05D4: \u05D2\u05D1\u05D5\u05D4\u05D4 \u05DC\u05E0\u05DE\u05D5\u05DB\u05D4', value: 'roi-desc', icon: ArrowDown },
  { label: '\u05EA\u05E9\u05D5\u05D0\u05D4: \u05E0\u05DE\u05D5\u05DB\u05D4 \u05DC\u05D2\u05D1\u05D5\u05D4\u05D4', value: 'roi-asc', icon: ArrowUp },
  { label: '\uD83D\uDCB0 \u05EA\u05E9\u05D5\u05D0\u05D4 \u05E0\u05D8\u05D5 (\u05D0\u05D7\u05E8\u05D9 \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA)', value: 'net-roi-desc', icon: ArrowDown },
  { label: '\u05E6\u05D9\u05D5\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4: \u05D2\u05D1\u05D5\u05D4 \u05DC\u05E0\u05DE\u05D5\u05DA', value: 'score-desc', icon: ArrowDown },
  { label: 'CAGR: \u05D2\u05D1\u05D5\u05D4 \u05DC\u05E0\u05DE\u05D5\u05DA', value: 'cagr-desc', icon: ArrowDown },
  { label: '\u05E2\u05D5\u05D3\u05DB\u05DF \u05DC\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4', value: 'updated-desc', icon: ArrowDown },
  { label: '\u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9: \u05E0\u05DE\u05D5\u05DA \u05DC\u05D2\u05D1\u05D5\u05D4', value: 'monthly-asc', icon: ArrowUp },
]

const statusEntries = Object.entries(statusColors)

const quickPresetDefs = [
  { id: 'available', label: '\u05D6\u05DE\u05D9\u05E0\u05D5\u05EA \u05D1\u05DC\u05D1\u05D3', emoji: '\uD83D\uDFE2', apply: (onFilterChange: any, onToggleStatus: any, statusFilter: string[]) => { if (!statusFilter.includes('AVAILABLE')) onToggleStatus('AVAILABLE') }, isActive: (_filters: any, statusFilter: string[]) => statusFilter.includes('AVAILABLE') && statusFilter.length === 1 },
  { id: 'high-roi', label: '\u05EA\u05E9\u05D5\u05D0\u05D4 100%+', emoji: '\uD83D\uDD25', apply: (onFilterChange: any) => { onFilterChange('minRoi', '100') }, isActive: (filters: any) => filters.minRoi === '100' },
  { id: 'budget', label: '\u05E2\u05D3 \u20AA400K', emoji: '\uD83D\uDCB0', apply: (onFilterChange: any) => { onFilterChange('priceMin', ''); onFilterChange('priceMax', '400000') }, isActive: (filters: any) => filters.priceMax === '400000' && !filters.priceMin },
  { id: 'premium', label: '\u20AA1M+', emoji: '\uD83D\uDC8E', apply: (onFilterChange: any) => { onFilterChange('priceMin', '1000000'); onFilterChange('priceMax', '') }, isActive: (filters: any) => filters.priceMin === '1000000' && !filters.priceMax },
  { id: 'large', label: '3+ \u05D3\u05D5\u05E0\u05DD', emoji: '\uD83D\uDCD0', apply: (onFilterChange: any) => { onFilterChange('sizeMin', '3'); onFilterChange('sizeMax', '') }, isActive: (filters: any) => filters.sizeMin === '3' && !filters.sizeMax },
  { id: 'new-listings', label: '\u05D7\u05D3\u05E9\u05D5\u05EA \u05D4\u05E9\u05D1\u05D5\u05E2', emoji: '\uD83C\uDD95', apply: (onFilterChange: any) => { onFilterChange('maxDays', '7') }, isActive: (filters: any) => filters.maxDays === '7' },
  { id: 'quick-flip', label: '\u05DE\u05D4\u05D9\u05E8 (1-3 \u05E9\u05E0\u05D9\u05DD)', emoji: '\u26A1', apply: (onFilterChange: any) => { onFilterChange('ripeness', '1-3') }, isActive: (filters: any) => filters.ripeness === '1-3' },
  { id: 'top-grade', label: '\u05D3\u05D9\u05E8\u05D5\u05D2 A+', emoji: '\uD83C\uDFC6', apply: (onFilterChange: any) => { onFilterChange('minRoi', '200') }, isActive: (filters: any) => filters.minRoi === '200' },
  { id: 'affordable', label: '\u05E2\u05D3 \u20AA4K/\u05D7\u05D5\u05D3\u05E9', emoji: '\uD83C\uDFE6', apply: (onFilterChange: any) => { onFilterChange('maxMonthly', '4000') }, isActive: (filters: any) => filters.maxMonthly === '4000' },
  { id: 'net-roi', label: '\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E0\u05D8\u05D5 \u05D4\u05DB\u05D9 \u05D2\u05D1\u05D5\u05D4\u05D4', emoji: '\uD83D\uDCB0', apply: (onFilterChange: any, onToggleStatus: any, statusFilter: string[]) => { onFilterChange('minRoi', '50'); if (!statusFilter.includes('AVAILABLE')) onToggleStatus('AVAILABLE') }, isActive: (filters: any, statusFilter: string[]) => filters.minRoi === '50' && statusFilter.includes('AVAILABLE') },
]

// ─── Sub-components ──────────────────────────────────────────────────────

function AnimatedCount({ value }: AnimatedCountProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const animRef = useRef<number | null>(null)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prevValue.current === value) return
    const from = prevValue.current
    const to = value
    prevValue.current = value

    const startTime = performance.now()
    const duration = 300

    if (animRef.current) cancelAnimationFrame(animRef.current)

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplayValue(current)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [value])

  return <TabularNums>{displayValue}</TabularNums>
}

function QuickPresets({ filters, statusFilter, onFilterChange, onToggleStatus, onClearFilters }: QuickPresetsProps) {
  const haptic = useHapticFeedback()
  return (
    <PresetsRow dir="rtl">
      <PresetsIcon />
      {quickPresetDefs.map(preset => {
        const active = preset.isActive(filters, statusFilter)
        return (
          <PresetButton
            key={preset.id}
            $active={active}
            onClick={() => {
              haptic.light()
              if (active) {
                onClearFilters()
              } else {
                onClearFilters()
                preset.apply(onFilterChange, onToggleStatus, statusFilter)
              }
            }}
          >
            <span>{preset.emoji}</span>
            <span>{preset.label}</span>
          </PresetButton>
        )
      })}
    </PresetsRow>
  )
}

function SelectPill({ icon: Icon, label, value, displayValue, options, onChange, isActive }: SelectPillProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [highlightIdx, setHighlightIdx] = useState<number>(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex(o => o.value === value)
      setHighlightIdx(idx >= 0 ? idx : 0)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx + 1] as HTMLElement
      if (item?.scrollIntoView) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIdx, isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        setIsOpen(true)
        return
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx(prev => (prev < options.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx(prev => (prev > 0 ? prev - 1 : options.length - 1))
        break
      case 'Home':
        e.preventDefault()
        setHighlightIdx(0)
        break
      case 'End':
        e.preventDefault()
        setHighlightIdx(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (highlightIdx >= 0 && highlightIdx < options.length) {
          onChange(options[highlightIdx].value)
          setIsOpen(false)
        }
        break
      case 'Escape':
      case 'Tab':
        setIsOpen(false)
        break
      default:
        if (e.key.length === 1) {
          const char = e.key.toLowerCase()
          const startIdx = (highlightIdx + 1) % options.length
          for (let i = 0; i < options.length; i++) {
            const idx = (startIdx + i) % options.length
            if (options[idx].label.toLowerCase().startsWith(char)) {
              setHighlightIdx(idx)
              break
            }
          }
        }
    }
  }, [isOpen, highlightIdx, options, onChange])

  const pillId = useRef(`pill-${label.replace(/\s+/g, '-')}`).current

  return (
    <SelectPillWrap ref={ref}>
      <PillTrigger
        $active={!!isActive}
        $open={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${pillId}-list` : undefined}
        aria-label={`${label}: ${displayValue || options.find(o => o.value === value)?.label || ''}`}
      >
        <PillIcon><Icon /></PillIcon>
        <PillLabel>{displayValue || label}</PillLabel>
        <PillChevron $open={isOpen}><ChevronDown /></PillChevron>
      </PillTrigger>
      {isOpen && (
        <PillDropdown role="listbox" id={`${pillId}-list`} aria-label={label} ref={listRef}>
          <PillDropdownHeader>{label}</PillDropdownHeader>
          {options.map((opt, i) => (
            <PillOption
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              $selected={value === opt.value}
              $highlighted={i === highlightIdx}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              onMouseEnter={() => setHighlightIdx(i)}
            >
              <PillOptionText>{opt.label}</PillOptionText>
              {value === opt.value && <PillOptionCheck />}
            </PillOption>
          ))}
        </PillDropdown>
      )}
    </SelectPillWrap>
  )
}

// ─── Main FilterBar component ────────────────────────────────────────────

export default function FilterBar({
  filters,
  onFilterChange,
  onClearFilters,
  plotCount,
  statusFilter,
  onToggleStatus,
  sortBy = 'default',
  onSortChange,
  allPlots = [],
  onSelectPlot,
  savedSearches,
  onSaveSearch,
  onLoadSearch,
  onRemoveSearch,
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const haptic = useHapticFeedback()

  const handleCopySearch = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      haptic.success()
      setLinkCopied(true)
      showToast('\uD83D\uDD17 \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D5\u05E2\u05EA\u05E7 \u2014 \u05E9\u05EA\u05E3 \u05D0\u05D5\u05EA\u05D5 \u05E2\u05DD \u05DE\u05E9\u05E7\u05D9\u05E2\u05D9\u05DD \u05D0\u05D7\u05E8\u05D9\u05DD', 'success')
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {
      showToast('\u05DC\u05D0 \u05D4\u05E6\u05DC\u05D7\u05E0\u05D5 \u05DC\u05D4\u05E2\u05EA\u05D9\u05E7 \u05D0\u05EA \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8', 'error')
    })
  }

  const cityOptions = useMemo(() => {
    const fallback = [{ label: '\u05DB\u05DC \u05D4\u05E2\u05E8\u05D9\u05DD', value: 'all' }, ...KNOWN_CITIES.map(c => ({ label: c, value: c }))]
    if (!allPlots || allPlots.length === 0) return fallback
    const counts: Record<string, number> = {}
    allPlots.forEach(p => { const city = p.city || 'unknown'; counts[city] = (counts[city] || 0) + 1 })
    const options = [{ label: `\u05DB\u05DC \u05D4\u05E2\u05E8\u05D9\u05DD (${allPlots.length})`, value: 'all' }]
    for (const city of KNOWN_CITIES) { options.push({ label: `${city} (${counts[city] || 0})`, value: city }) }
    const newCities = Object.keys(counts).filter(c => !KNOWN_CITIES.includes(c) && c !== 'unknown').sort((a, b) => counts[b] - counts[a])
    for (const city of newCities) { options.push({ label: `${city} (${counts[city]})`, value: city }) }
    return options
  }, [allPlots])

  const priceOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return priceRangeOptions
    return priceRangeOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `\u05DB\u05DC \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD (${allPlots.length})` }
      const minVal = opt.min ? Number(opt.min) : 0
      const maxVal = opt.max ? Number(opt.max) : Infinity
      const count = allPlots.filter(p => { const price = p.total_price ?? p.totalPrice ?? 0; return price >= minVal && price <= maxVal }).length
      return { ...opt, label: `${opt.label} (${count})` }
    })
  }, [allPlots])

  const sizeOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return sizeRangeOptions
    return sizeRangeOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `\u05DB\u05DC \u05D4\u05D2\u05D3\u05DC\u05D9\u05DD (${allPlots.length})` }
      const minVal = opt.min ? Number(opt.min) * 1000 : 0
      const maxVal = opt.max ? Number(opt.max) * 1000 : Infinity
      const count = allPlots.filter(p => { const size = p.size_sqm ?? p.sizeSqM ?? 0; return size >= minVal && size <= maxVal }).length
      return { ...opt, label: `${opt.label} (${count})` }
    })
  }, [allPlots])

  const roiOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return roiOptions
    return roiOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `\u05DB\u05DC \u05D4\u05EA\u05E9\u05D5\u05D0\u05D5\u05EA (${allPlots.length})` }
      const minRoi = parseInt(opt.value, 10)
      const count = allPlots.filter(p => { const price = p.total_price ?? p.totalPrice ?? 0; const proj = p.projected_value ?? p.projectedValue ?? 0; if (price <= 0) return false; return ((proj - price) / price) * 100 >= minRoi }).length
      return { ...opt, label: `${opt.label} (${count})` }
    })
  }, [allPlots])

  const zoningOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return zoningOptions
    const zoneCounts: Record<string, number> = {}
    allPlots.forEach(p => { const z = p.zoning_stage ?? p.zoningStage ?? 'UNKNOWN'; zoneCounts[z] = (zoneCounts[z] || 0) + 1 })
    return zoningOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `\u05DB\u05DC \u05D4\u05E9\u05DC\u05D1\u05D9\u05DD (${allPlots.length})` }
      return { ...opt, label: `${opt.label} (${zoneCounts[opt.value] || 0})` }
    })
  }, [allPlots])

  const priceRangeValue = priceRangeOptions.find((o) => o.min === filters.priceMin && o.max === filters.priceMax)?.value || 'all'
  const sizeRangeValue = sizeRangeOptions.find((o) => o.min === filters.sizeMin && o.max === filters.sizeMax)?.value || 'all'

  const handlePriceRange = (val: string) => {
    const opt = priceRangeOptions.find((o) => o.value === val)
    if (opt) { onFilterChange('priceMin', opt.min!); onFilterChange('priceMax', opt.max!) }
  }

  const handleSizeRange = (val: string) => {
    const opt = sizeRangeOptions.find((o) => o.value === val)
    if (opt) { onFilterChange('sizeMin', opt.min!); onFilterChange('sizeMax', opt.max!) }
  }

  const activeCount =
    (filters.city !== 'all' ? 1 : 0) +
    (priceRangeValue !== 'all' ? 1 : 0) +
    (sizeRangeValue !== 'all' ? 1 : 0) +
    (filters.ripeness !== 'all' ? 1 : 0) +
    (filters.minRoi && filters.minRoi !== 'all' ? 1 : 0) +
    (filters.zoning && filters.zoning !== 'all' ? 1 : 0) +
    (filters.maxDays ? 1 : 0) +
    (filters.maxMonthly ? 1 : 0) +
    (filters.search ? 1 : 0) +
    statusFilter.length

  const cityDisplay = filters.city !== 'all' ? filters.city : null
  const priceDisplay = priceRangeValue !== 'all' ? priceRangeOptions.find((o) => o.value === priceRangeValue)?.label : null
  const sizeDisplay = sizeRangeValue !== 'all' ? sizeRangeOptions.find((o) => o.value === sizeRangeValue)?.label : null

  const marketStats = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return null
    const available = allPlots.filter(p => p.status === 'AVAILABLE')
    const totalSize = allPlots.reduce((s, p) => s + (p.size_sqm ?? p.sizeSqM ?? 0), 0)
    const avgPricePerDunam = allPlots.length > 0
      ? Math.round(allPlots.reduce((s, p) => {
          const price = p.total_price ?? p.totalPrice ?? 0
          const size = p.size_sqm ?? p.sizeSqM ?? 1
          return s + (price / size * 1000)
        }, 0) / allPlots.length)
      : 0

    let roiSum = 0, roiCount = 0
    let psmSum = 0, psmCount = 0
    for (const p of allPlots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0 && proj > 0) { roiSum += ((proj - price) / price) * 100; roiCount++ }
      if (price > 0 && size > 0) { psmSum += price / size; psmCount++ }
    }
    const avgRoi = roiCount > 0 ? Math.round(roiSum / roiCount) : 0
    const avgPsm = psmCount > 0 ? psmSum / psmCount : 0

    let hotDeals = 0
    if (avgPsm > 0) {
      for (const p of allPlots) {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 0
        if (price > 0 && size > 0 && price / size < avgPsm * 0.85) hotDeals++
      }
    }

    return { available: available.length, totalDunam: (totalSize / 1000).toFixed(1), avgPricePerDunam, avgRoi, hotDeals }
  }, [allPlots])

  return (
    <FilterBarContainer dir="rtl">
      <SrOnly role="status" aria-live="polite" aria-atomic="true">
        {activeCount > 0
          ? `\u05DE\u05E6\u05D9\u05D2 ${plotCount} \u05D7\u05DC\u05E7\u05D5\u05EA \u05E2\u05DD ${activeCount} \u05E1\u05D9\u05E0\u05D5\u05E0\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD`
          : `\u05DE\u05E6\u05D9\u05D2 ${plotCount} \u05D7\u05DC\u05E7\u05D5\u05EA`
        }
      </SrOnly>

      {marketStats && !isExpanded && (
        <DesktopMarketStats>
          <MarketStatItem>{'\uD83D\uDFE2'} <MarketStatValue>{marketStats.available}</MarketStatValue> {'\u05D6\u05DE\u05D9\u05E0\u05D5\u05EA'}</MarketStatItem>
          <MarketStatDivider />
          <MarketStatItem>{'\uD83D\uDCB0'} {'\u05DE\u05DE\u05D5\u05E6\u05E2'} <MarketStatValue $color="#C8942A">{'\u20AA'}{marketStats.avgPricePerDunam.toLocaleString()}</MarketStatValue>{'/\u05D3\u05D5\u05E0\u05DD'}</MarketStatItem>
          <MarketStatDivider />
          <MarketStatItem>{'\uD83D\uDCC8'} ROI {'\u05DE\u05DE\u05D5\u05E6\u05E2'} <MarketStatValue $color={marketStats.avgRoi >= 100 ? '#10B981' : undefined}>+{marketStats.avgRoi}%</MarketStatValue></MarketStatItem>
          {marketStats.hotDeals > 0 && (<><MarketStatDivider /><HotDealText>{'\uD83D\uDD25'} {marketStats.hotDeals} {'\u05E2\u05E1\u05E7\u05D0\u05D5\u05EA \u05D7\u05DE\u05D5\u05EA'}</HotDealText></>)}
          <MarketStatDivider />
          <MarketStatItem>{'\uD83D\uDCD0'} {marketStats.totalDunam} {'\u05D3\u05D5\u05E0\u05DD'}</MarketStatItem>
          <MarketStatDivider />
          <TimeText>{'\uD83D\uDD50'} {(() => { const now = new Date(); return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` })()}</TimeText>
        </DesktopMarketStats>
      )}

      {marketStats && !isExpanded && (
        <MobileMarketStats>
          <span>{'\uD83D\uDFE2'} {marketStats.available} {'\u05D6\u05DE\u05D9\u05E0\u05D5\u05EA'}</span>
          <MobileDivider />
          <span>{'\uD83D\uDCC8'} +{marketStats.avgRoi}% ROI</span>
          {marketStats.hotDeals > 0 && (<><MobileDivider /><MobileHotDealText>{'\uD83D\uDD25'} {marketStats.hotDeals}</MobileHotDealText></>)}
          <MobileDivider />
          <span>{plotCount} {'\u05D7\u05DC\u05E7\u05D5\u05EA'}</span>
        </MobileMarketStats>
      )}

      <QuickPresets filters={filters} statusFilter={statusFilter} onFilterChange={onFilterChange} onToggleStatus={onToggleStatus} onClearFilters={onClearFilters} />

      <MobileRow>
        <MobileToggle onClick={() => setIsExpanded((prev) => !prev)}>
          <SlidersHorizontal />
          {activeCount > 0 && <MobileBadge>{activeCount}</MobileBadge>}
        </MobileToggle>
        <MobileSearchWrap>
          <SearchAutocomplete value={filters.search || ''} onChange={(val: string) => onFilterChange('search', val)} plots={allPlots} onSelectPlot={onSelectPlot || (() => {})} placeholder={'\u05D7\u05D9\u05E4\u05D5\u05E9 \u05D2\u05D5\u05E9, \u05D7\u05DC\u05E7\u05D4...'} />
        </MobileSearchWrap>
      </MobileRow>

      <DesktopSearchRow>
        <SearchAutocomplete value={filters.search || ''} onChange={(val: string) => onFilterChange('search', val)} plots={allPlots} onSelectPlot={onSelectPlot || (() => {})} placeholder={'\u05D7\u05D9\u05E4\u05D5\u05E9 \u05D2\u05D5\u05E9, \u05D7\u05DC\u05E7\u05D4, \u05E2\u05D9\u05E8...'} />
      </DesktopSearchRow>

      <FilterPanel $expanded={isExpanded}>
        <PillsRow>
          <SelectPill icon={MapPin} label={'\u05E2\u05D9\u05E8'} value={filters.city} displayValue={cityDisplay} options={cityOptions} onChange={(val) => onFilterChange('city', val)} isActive={filters.city !== 'all'} />
          <SelectPill icon={Banknote} label={'\u05DE\u05D7\u05D9\u05E8'} value={priceRangeValue} displayValue={priceDisplay} options={priceOptionsWithCounts} onChange={handlePriceRange} isActive={priceRangeValue !== 'all'} />
          <SelectPill icon={Ruler} label={'\u05E9\u05D8\u05D7'} value={sizeRangeValue} displayValue={sizeDisplay} options={sizeOptionsWithCounts} onChange={handleSizeRange} isActive={sizeRangeValue !== 'all'} />
          <SelectPill icon={Layers} label={'\u05E9\u05DC\u05D1 \u05EA\u05DB\u05E0\u05D5\u05E0\u05D9'} value={filters.zoning || 'all'} displayValue={filters.zoning && filters.zoning !== 'all' ? zoningOptionsWithCounts.find(o => o.value === filters.zoning)?.label?.replace(/^[^\s]+ /, '').replace(/ \(\d+\)$/, '') : null} options={zoningOptionsWithCounts} onChange={(val) => onFilterChange('zoning', val)} isActive={filters.zoning && filters.zoning !== 'all'} />
          <SelectPill icon={TrendingUp} label={'\u05EA\u05E9\u05D5\u05D0\u05D4'} value={filters.minRoi || 'all'} displayValue={filters.minRoi && filters.minRoi !== 'all' ? `${filters.minRoi}%+` : null} options={roiOptionsWithCounts} onChange={(val) => onFilterChange('minRoi', val)} isActive={filters.minRoi && filters.minRoi !== 'all'} />
          <SelectPill icon={Wallet} label={'\u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9'} value={filters.maxMonthly || ''} displayValue={filters.maxMonthly ? `\u05E2\u05D3 \u20AA${Number(filters.maxMonthly).toLocaleString()}/\u05D7\u05D5\u05D3\u05E9` : null} options={monthlyPaymentOptions} onChange={(val) => onFilterChange('maxMonthly', val)} isActive={!!filters.maxMonthly} />

          <FilterSeparator />
          {statusEntries.map(([status, color]) => (
            <StatusChip key={status} $active={statusFilter.includes(status)} $chipColor={color} onClick={() => onToggleStatus(status)}>
              <StatusDot $color={color} />
              <span>{statusLabels[status]}</span>
            </StatusChip>
          ))}

          <FilterSeparator />
          {ripenessOptions.map((opt) => (
            <RipenessChip key={opt.value} $active={filters.ripeness === opt.value} onClick={() => onFilterChange('ripeness', filters.ripeness === opt.value ? 'all' : opt.value)}>
              <Clock />
              {opt.label}
            </RipenessChip>
          ))}

          {onSortChange && (
            <>
              <FilterSeparator />
              <SelectPill icon={ArrowUpDown} label={'\u05DE\u05D9\u05D5\u05DF'} value={sortBy} displayValue={sortBy !== 'default' ? sortOptions.find(o => o.value === sortBy)?.label : null} options={sortOptions} onChange={onSortChange} isActive={sortBy !== 'default'} />
            </>
          )}

          {savedSearches && (
            <>
              <FilterSeparator />
              <SavedSearches searches={savedSearches} onSave={onSaveSearch} onLoad={onLoadSearch} onRemove={onRemoveSearch} currentFilters={filters} currentStatusFilter={statusFilter} currentSortBy={sortBy} activeCount={activeCount} />
            </>
          )}
        </PillsRow>

        {activeCount > 0 && (
          <ActiveChipsRow>
            {filters.city !== 'all' && (<ActiveChip onClick={() => onFilterChange('city', 'all')} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05E2\u05D9\u05E8: ${filters.city}`}><MapPin /><span>{filters.city}</span><ActiveChipClose /></ActiveChip>)}
            {priceRangeValue !== 'all' && (<ActiveChip onClick={() => { onFilterChange('priceMin', ''); onFilterChange('priceMax', '') }} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05DE\u05D7\u05D9\u05E8: ${priceDisplay}`}><Banknote /><span>{priceDisplay}</span><ActiveChipClose /></ActiveChip>)}
            {sizeRangeValue !== 'all' && (<ActiveChip onClick={() => { onFilterChange('sizeMin', ''); onFilterChange('sizeMax', '') }} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05E9\u05D8\u05D7: ${sizeDisplay}`}><Ruler /><span>{sizeDisplay}</span><ActiveChipClose /></ActiveChip>)}
            {filters.minRoi && filters.minRoi !== 'all' && (<ActiveChip onClick={() => onFilterChange('minRoi', 'all')} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05EA\u05E9\u05D5\u05D0\u05D4: ${filters.minRoi}%+`}><TrendingUp /><span>{filters.minRoi}%+</span><ActiveChipClose /></ActiveChip>)}
            {filters.zoning && filters.zoning !== 'all' && (<ActiveChip onClick={() => onFilterChange('zoning', 'all')} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05EA\u05DB\u05E0\u05D5\u05E0\u05D9: ${zoningOptions.find(o => o.value === filters.zoning)?.label}`}><Layers /><span>{zoningOptions.find(o => o.value === filters.zoning)?.label?.replace(/^[^\s]+ /, '')}</span><ActiveChipClose /></ActiveChip>)}
            {filters.ripeness !== 'all' && (<ActiveChip onClick={() => onFilterChange('ripeness', 'all')} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05D1\u05E9\u05DC\u05D5\u05EA: ${ripenessOptions.find(o => o.value === filters.ripeness)?.label}`}><Clock /><span>{ripenessOptions.find(o => o.value === filters.ripeness)?.label}</span><ActiveChipClose /></ActiveChip>)}
            {filters.maxDays && (<ActiveChip onClick={() => onFilterChange('maxDays', '')} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05D7\u05D3\u05E9\u05D5\u05EA: ${filters.maxDays} \u05D9\u05DE\u05D9\u05DD`}><Clock /><span>{'\uD83C\uDD95'} {filters.maxDays} {'\u05D9\u05DE\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD'}</span><ActiveChipClose /></ActiveChip>)}
            {filters.maxMonthly && (<ActiveChip onClick={() => onFilterChange('maxMonthly', '')} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9: \u05E2\u05D3 \u20AA${Number(filters.maxMonthly).toLocaleString()}`}><Wallet /><span>{'\u05E2\u05D3'} {'\u20AA'}{Number(filters.maxMonthly).toLocaleString()}/{'\u05D7\u05D5\u05D3\u05E9'}</span><ActiveChipClose /></ActiveChip>)}
            {statusFilter.map(status => (<ActiveChip key={status} onClick={() => onToggleStatus(status)} aria-label={`\u05D4\u05E1\u05E8 \u05E1\u05D9\u05E0\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1: ${statusLabels[status]}`}><ActiveStatusDot $color={statusColors[status]} /><span>{statusLabels[status]}</span><ActiveChipClose /></ActiveChip>))}
            {filters.search && (<ActiveChip onClick={() => onFilterChange('search', '')} aria-label={`\u05D4\u05E1\u05E8 \u05D7\u05D9\u05E4\u05D5\u05E9: ${filters.search}`}><Search /><span>"{filters.search}"</span><ActiveChipClose /></ActiveChip>)}
          </ActiveChipsRow>
        )}

        <ActionsRow>
          {activeCount > 0 && (<ActionButton onClick={() => { haptic.heavy(); onClearFilters() }}><X />{'\u05E0\u05E7\u05D4 \u05D4\u05DB\u05DC'} ({activeCount})</ActionButton>)}
          <ActionButton $copied={linkCopied} onClick={handleCopySearch}>
            {linkCopied ? <GreenCheckIcon /> : <Link2 />}
            {linkCopied ? '\u05D4\u05D5\u05E2\u05EA\u05E7!' : '\u05E9\u05EA\u05E3 \u05D7\u05D9\u05E4\u05D5\u05E9'}
          </ActionButton>
          <ActionLink
            href={`/api/export/csv?${new URLSearchParams(
              Object.fromEntries(Object.entries({
                city: filters.city !== 'all' ? filters.city : undefined,
                priceMin: filters.priceMin || undefined,
                priceMax: filters.priceMax || undefined,
                sizeMin: filters.sizeMin || undefined,
                sizeMax: filters.sizeMax || undefined,
                status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
              }).filter(([, v]) => v !== undefined) as [string, string][])
            ).toString()}`}
            download
            title={'\u05D9\u05D9\u05E6\u05D5\u05D0 \u05DC\u05D0\u05E7\u05E1\u05DC (CSV)'}
          >
            <Download />{'\u05D9\u05D9\u05E6\u05D5\u05D0'} CSV
          </ActionLink>
          <FilterCount $hasFilters={activeCount > 0}>
            <Eye />
            <AnimatedCount value={plotCount} /> {plotCount === 1 ? '\u05D7\u05DC\u05E7\u05D4' : '\u05D7\u05DC\u05E7\u05D5\u05EA'}
            {activeCount > 0 && allPlots.length !== plotCount && (
              <FilterCountSubtext> {'\u05DE\u05EA\u05D5\u05DA'} <AnimatedCount value={allPlots.length} /></FilterCountSubtext>
            )}
          </FilterCount>
        </ActionsRow>
      </FilterPanel>
    </FilterBarContainer>
  )
}
