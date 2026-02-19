import { useMemo, memo } from 'react'
import { X, Filter } from 'lucide-react'
import { statusLabels, zoningLabels } from '../utils/constants'

/**
 * ActiveFilterChips — removable filter badges showing all currently active filters.
 * Standard UX pattern used by Madlan, Airbnb, Zillow, and Rightmove.
 *
 * When ANY filter is active, renders a horizontal scrollable bar of chips:
 *   [חדרה ✕] [₪200K-₪400K ✕] [תשואה 100%+ ✕] [נקה הכל]
 *
 * Each chip can be individually removed (resets that specific filter).
 * "נקה הכל" button clears all filters at once.
 *
 * This solves a real usability problem: with 10+ filter options, users often
 * forget which filters are active, leading to "why am I seeing so few results?"
 * confusion. The chips provide instant visibility and one-click removal.
 *
 * Positioned below the filter bar, above the map — always visible when active.
 * Hidden when no filters are active (zero visual overhead in default state).
 */
const ActiveFilterChips = memo(function ActiveFilterChips({
  filters,
  statusFilter,
  sortBy,
  boundsFilter,
  onFilterChange,
  onToggleStatus,
  onSortChange,
  onClearBounds,
  onClearFilters,
}) {
  const chips = useMemo(() => {
    const result = []

    // City filter
    if (filters.city && filters.city !== 'all') {
      result.push({
        id: 'city',
        label: filters.city,
        icon: '🏙️',
        onRemove: () => onFilterChange('city', 'all'),
      })
    }

    // Price range
    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin ? `₪${(+filters.priceMin / 1000).toFixed(0)}K` : ''
      const max = filters.priceMax ? `₪${(+filters.priceMax / 1000).toFixed(0)}K` : ''
      const label = min && max ? `${min}–${max}` : min ? `${min}+` : `עד ${max}`
      result.push({
        id: 'price',
        label,
        icon: '💰',
        onRemove: () => { onFilterChange('priceMin', ''); onFilterChange('priceMax', '') },
      })
    }

    // Size range
    if (filters.sizeMin || filters.sizeMax) {
      const min = filters.sizeMin ? `${filters.sizeMin} דונם` : ''
      const max = filters.sizeMax ? `${filters.sizeMax} דונם` : ''
      const label = min && max ? `${min}–${max}` : min ? `${min}+` : `עד ${max}`
      result.push({
        id: 'size',
        label,
        icon: '📐',
        onRemove: () => { onFilterChange('sizeMin', ''); onFilterChange('sizeMax', '') },
      })
    }

    // ROI minimum
    if (filters.minRoi && filters.minRoi !== 'all') {
      result.push({
        id: 'roi',
        label: `תשואה ${filters.minRoi}%+`,
        icon: '📈',
        onRemove: () => onFilterChange('minRoi', 'all'),
      })
    }

    // Zoning stage
    if (filters.zoning && filters.zoning !== 'all') {
      const zoningLabel = zoningLabels[filters.zoning] || filters.zoning
      result.push({
        id: 'zoning',
        label: zoningLabel,
        icon: '🗺️',
        onRemove: () => onFilterChange('zoning', 'all'),
      })
    }

    // Ripeness (timeline)
    if (filters.ripeness && filters.ripeness !== 'all') {
      result.push({
        id: 'ripeness',
        label: `${filters.ripeness} שנים`,
        icon: '⏱️',
        onRemove: () => onFilterChange('ripeness', 'all'),
      })
    }

    // Freshness (new listings)
    if (filters.maxDays) {
      result.push({
        id: 'maxDays',
        label: `חדשות ${filters.maxDays} ימים`,
        icon: '🆕',
        onRemove: () => onFilterChange('maxDays', ''),
      })
    }

    // Max monthly payment
    if (filters.maxMonthly) {
      result.push({
        id: 'monthly',
        label: `עד ₪${(+filters.maxMonthly).toLocaleString()}/חודש`,
        icon: '🏦',
        onRemove: () => onFilterChange('maxMonthly', ''),
      })
    }

    // Search query
    if (filters.search) {
      result.push({
        id: 'search',
        label: `"${filters.search}"`,
        icon: '🔍',
        onRemove: () => onFilterChange('search', ''),
      })
    }

    // Status filters
    for (const status of statusFilter) {
      const label = statusLabels[status] || status
      result.push({
        id: `status-${status}`,
        label,
        icon: '🏷️',
        onRemove: () => onToggleStatus(status),
      })
    }

    // Bounds filter (search this area)
    if (boundsFilter) {
      result.push({
        id: 'bounds',
        label: 'אזור נבחר',
        icon: '📍',
        onRemove: onClearBounds,
      })
    }

    // Non-default sort (informational chip — shows active sort)
    if (sortBy && sortBy !== 'default') {
      const sortLabels = {
        'deal-desc': 'עסקה טובה',
        'distance-asc': 'קרוב אליי',
        'price-asc': 'מחיר ↑',
        'price-desc': 'מחיר ↓',
        'ppsqm-asc': 'מחיר/מ״ר ↑',
        'ppsqm-desc': 'מחיר/מ״ר ↓',
        'size-asc': 'שטח ↑',
        'size-desc': 'שטח ↓',
        'roi-desc': 'תשואה ↓',
        'roi-asc': 'תשואה ↑',
        'score-desc': 'ציון ↓',
        'cagr-desc': 'CAGR ↓',
        'updated-desc': 'עודכן',
        'newest-first': 'חדשות',
        'monthly-asc': 'חודשי ↑',
      }
      result.push({
        id: 'sort',
        label: sortLabels[sortBy] || sortBy,
        icon: '↕️',
        onRemove: () => onSortChange('default'),
        isSort: true,
      })
    }

    return result
  }, [filters, statusFilter, sortBy, boundsFilter, onFilterChange, onToggleStatus, onSortChange, onClearBounds])

  // Don't render if no filters are active
  if (chips.length === 0) return null

  return (
    <div
      className="fixed top-[6.5rem] sm:top-[7rem] right-3 left-3 sm:right-4 sm:left-auto z-[40] animate-fade-in"
      dir="rtl"
    >
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:max-w-[600px]">
        {/* Filter icon indicator */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
          <Filter className="w-3 h-3 text-gold/60" />
          <span className="text-[9px] text-gold/50 font-medium">{chips.length}</span>
        </div>

        {/* Filter chips */}
        {chips.map(chip => (
          <button
            key={chip.id}
            onClick={chip.onRemove}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all group
              ${chip.isSort
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/30'
                : 'bg-gold/10 border border-gold/20 text-gold hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
              }`}
            title={`הסר: ${chip.label}`}
          >
            <span className="text-[9px]">{chip.icon}</span>
            <span>{chip.label}</span>
            <X className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}

        {/* Clear all button — only show when 2+ filters are active */}
        {chips.length >= 2 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all flex-shrink-0"
          >
            🔄 נקה הכל
          </button>
        )}
      </div>
    </div>
  )
})

export default ActiveFilterChips
