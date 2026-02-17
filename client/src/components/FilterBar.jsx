import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, X, ChevronDown, Check, MapPin, Banknote, Ruler, Clock, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'
import SearchAutocomplete from './SearchAutocomplete'

const cityOptions = [
  { label: 'כל הערים', value: 'all' },
  { label: 'חדרה', value: 'חדרה' },
  { label: 'נתניה', value: 'נתניה' },
  { label: 'קיסריה', value: 'קיסריה' },
]

const priceRangeOptions = [
  { label: 'כל המחירים', value: 'all', min: '', max: '' },
  { label: 'עד ₪300K', value: '0-300', min: '', max: '300000' },
  { label: '₪300K – ₪500K', value: '300-500', min: '300000', max: '500000' },
  { label: '₪500K+', value: '500+', min: '500000', max: '' },
]

const sizeRangeOptions = [
  { label: 'כל הגדלים', value: 'all', min: '', max: '' },
  { label: 'עד 2 דונם', value: '0-2', min: '', max: '2' },
  { label: '2–3 דונם', value: '2-3', min: '2', max: '3' },
  { label: '3+ דונם', value: '3+', min: '3', max: '' },
]

const ripenessOptions = [
  { label: '1-3 שנים', value: '1-3' },
  { label: '3-5 שנים', value: '3-5' },
  { label: '5+ שנים', value: '5+' },
]

const roiOptions = [
  { label: 'כל התשואות', value: 'all' },
  { label: '50%+', value: '50' },
  { label: '100%+', value: '100' },
  { label: '150%+', value: '150' },
  { label: '200%+', value: '200' },
]

const sortOptions = [
  { label: 'ברירת מחדל', value: 'default', icon: ArrowUpDown },
  { label: 'מחיר: נמוך לגבוה', value: 'price-asc', icon: ArrowUp },
  { label: 'מחיר: גבוה לנמוך', value: 'price-desc', icon: ArrowDown },
  { label: 'שטח: קטן לגדול', value: 'size-asc', icon: ArrowUp },
  { label: 'שטח: גדול לקטן', value: 'size-desc', icon: ArrowDown },
  { label: 'תשואה: גבוהה לנמוכה', value: 'roi-desc', icon: ArrowDown },
  { label: 'תשואה: נמוכה לגבוהה', value: 'roi-asc', icon: ArrowUp },
]

const statusEntries = Object.entries(statusColors)

function SelectPill({ icon: Icon, label, value, displayValue, options, onChange, isActive }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="filter-select-pill" ref={ref}>
      <button
        className={`filter-pill-trigger ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Icon className="filter-pill-icon" />
        <span className="filter-pill-label">{displayValue || label}</span>
        <ChevronDown className={`filter-pill-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>
      {isOpen && (
        <div className="filter-pill-dropdown">
          <div className="filter-pill-dropdown-header">{label}</div>
          {options.map((opt) => (
            <button
              key={opt.value}
              className={`filter-pill-option ${value === opt.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
            >
              <span className="filter-pill-option-text">{opt.label}</span>
              {value === opt.value && <Check className="filter-pill-option-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Derive price range value
  const priceRangeValue =
    priceRangeOptions.find(
      (o) => o.min === filters.priceMin && o.max === filters.priceMax
    )?.value || 'all'

  // Derive size range value
  const sizeRangeValue =
    sizeRangeOptions.find(
      (o) => o.min === filters.sizeMin && o.max === filters.sizeMax
    )?.value || 'all'

  const handlePriceRange = (val) => {
    const opt = priceRangeOptions.find((o) => o.value === val)
    if (opt) {
      onFilterChange('priceMin', opt.min)
      onFilterChange('priceMax', opt.max)
    }
  }

  const handleSizeRange = (val) => {
    const opt = sizeRangeOptions.find((o) => o.value === val)
    if (opt) {
      onFilterChange('sizeMin', opt.min)
      onFilterChange('sizeMax', opt.max)
    }
  }

  const activeCount =
    (filters.city !== 'all' ? 1 : 0) +
    (priceRangeValue !== 'all' ? 1 : 0) +
    (sizeRangeValue !== 'all' ? 1 : 0) +
    (filters.ripeness !== 'all' ? 1 : 0) +
    (filters.minRoi && filters.minRoi !== 'all' ? 1 : 0) +
    (filters.search ? 1 : 0) +
    statusFilter.length

  const cityDisplay = filters.city !== 'all' ? filters.city : null
  const priceDisplay = priceRangeValue !== 'all'
    ? priceRangeOptions.find((o) => o.value === priceRangeValue)?.label
    : null
  const sizeDisplay = sizeRangeValue !== 'all'
    ? sizeRangeOptions.find((o) => o.value === sizeRangeValue)?.label
    : null

  return (
    <div className="filter-bar-container" dir="rtl">
      {/* ── Mobile: compact row with toggle + search side by side ── */}
      <div className="flex items-center gap-2 md:hidden mb-2">
        <button
          className="filter-mobile-toggle flex-shrink-0"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeCount > 0 && (
            <span className="filter-mobile-badge">{activeCount}</span>
          )}
        </button>
        <div className="flex-1">
          <SearchAutocomplete
            value={filters.search || ''}
            onChange={(val) => onFilterChange('search', val)}
            plots={allPlots}
            onSelectPlot={onSelectPlot || (() => {})}
            placeholder="חיפוש גוש, חלקה..."
          />
        </div>
      </div>

      {/* ── Desktop: search bar full width ── */}
      <div className="filter-search-row hidden md:block">
        <SearchAutocomplete
          value={filters.search || ''}
          onChange={(val) => onFilterChange('search', val)}
          plots={allPlots}
          onSelectPlot={onSelectPlot || (() => {})}
          placeholder="חיפוש גוש, חלקה, עיר..."
        />
      </div>

      {/* ── Desktop + expanded mobile ── */}
      <div className={`filter-bar-panel ${isExpanded ? 'is-expanded' : ''}`}>
        {/* Row 1: Select pills */}
        <div className="filter-pills-row">
          <SelectPill
            icon={MapPin}
            label="עיר"
            value={filters.city}
            displayValue={cityDisplay}
            options={cityOptions}
            onChange={(val) => onFilterChange('city', val)}
            isActive={filters.city !== 'all'}
          />

          <SelectPill
            icon={Banknote}
            label="מחיר"
            value={priceRangeValue}
            displayValue={priceDisplay}
            options={priceRangeOptions}
            onChange={handlePriceRange}
            isActive={priceRangeValue !== 'all'}
          />

          <SelectPill
            icon={Ruler}
            label="שטח"
            value={sizeRangeValue}
            displayValue={sizeDisplay}
            options={sizeRangeOptions}
            onChange={handleSizeRange}
            isActive={sizeRangeValue !== 'all'}
          />

          <SelectPill
            icon={TrendingUp}
            label="תשואה"
            value={filters.minRoi || 'all'}
            displayValue={filters.minRoi && filters.minRoi !== 'all' ? `${filters.minRoi}%+` : null}
            options={roiOptions}
            onChange={(val) => onFilterChange('minRoi', val)}
            isActive={filters.minRoi && filters.minRoi !== 'all'}
          />

          {/* Thin separator */}
          <div className="filter-separator" />

          {/* Status chips */}
          {statusEntries.map(([status, color]) => {
            const isActive = statusFilter.includes(status)
            return (
              <button
                key={status}
                className={`filter-status-chip ${isActive ? 'is-active' : ''}`}
                style={{ '--chip-color': color }}
                onClick={() => onToggleStatus(status)}
              >
                <span className="filter-status-dot" style={{ background: color }} />
                <span>{statusLabels[status]}</span>
              </button>
            )
          })}

          {/* Thin separator */}
          <div className="filter-separator" />

          {/* Ripeness */}
          {ripenessOptions.map((opt) => (
            <button
              key={opt.value}
              className={`filter-ripeness-chip ${filters.ripeness === opt.value ? 'is-active' : ''}`}
              onClick={() =>
                onFilterChange('ripeness', filters.ripeness === opt.value ? 'all' : opt.value)
              }
            >
              <Clock className="w-3 h-3" />
              {opt.label}
            </button>
          ))}

          {/* Sort */}
          {onSortChange && (
            <>
              <div className="filter-separator" />
              <SelectPill
                icon={ArrowUpDown}
                label="מיון"
                value={sortBy}
                displayValue={sortBy !== 'default' ? sortOptions.find(o => o.value === sortBy)?.label : null}
                options={sortOptions}
                onChange={onSortChange}
                isActive={sortBy !== 'default'}
              />
            </>
          )}
        </div>

        {/* Bottom row: Clear + count */}
        {activeCount > 0 && (
          <div className="filter-actions-row">
            <button className="filter-clear-btn" onClick={onClearFilters}>
              <X className="w-3 h-3" />
              נקה הכל
            </button>
            <div className="filter-count">
              <Eye className="w-3 h-3" />
              {plotCount} חלקות
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
