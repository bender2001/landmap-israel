import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, X, ChevronDown, Check, MapPin, Banknote, Ruler, Clock, Eye } from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'

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
      {/* ── Mobile toggle ── */}
      <button
        className="filter-mobile-toggle md:hidden"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>סינון</span>
        {activeCount > 0 && (
          <span className="filter-mobile-badge">{activeCount}</span>
        )}
      </button>

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
