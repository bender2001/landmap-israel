import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { SlidersHorizontal, X, ChevronDown, Check, MapPin, Banknote, Ruler, Clock, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Link2, Download, Zap } from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'
import SearchAutocomplete from './SearchAutocomplete'
import SavedSearches from './SavedSearches'

const baseCityOptions = [
  { label: 'כל הערים', value: 'all' },
  { label: 'חדרה', value: 'חדרה' },
  { label: 'נתניה', value: 'נתניה' },
  { label: 'קיסריה', value: 'קיסריה' },
]

const priceRangeOptions = [
  { label: 'כל המחירים', value: 'all', min: '', max: '' },
  { label: 'עד ₪200K', value: '0-200', min: '', max: '200000' },
  { label: '₪200K – ₪400K', value: '200-400', min: '200000', max: '400000' },
  { label: '₪400K – ₪600K', value: '400-600', min: '400000', max: '600000' },
  { label: '₪600K – ₪800K', value: '600-800', min: '600000', max: '800000' },
  { label: '₪800K – ₪1M', value: '800-1000', min: '800000', max: '1000000' },
  { label: '₪1M+', value: '1000+', min: '1000000', max: '' },
]

const sizeRangeOptions = [
  { label: 'כל הגדלים', value: 'all', min: '', max: '' },
  { label: 'עד 1 דונם', value: '0-1', min: '', max: '1' },
  { label: '1–2 דונם', value: '1-2', min: '1', max: '2' },
  { label: '2–3 דונם', value: '2-3', min: '2', max: '3' },
  { label: '3–5 דונם', value: '3-5', min: '3', max: '5' },
  { label: '5+ דונם', value: '5+', min: '5', max: '' },
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
  { label: 'מחיר/מ״ר: נמוך לגבוה', value: 'ppsqm-asc', icon: ArrowUp },
  { label: 'מחיר/מ״ר: גבוה לנמוך', value: 'ppsqm-desc', icon: ArrowDown },
  { label: 'שטח: קטן לגדול', value: 'size-asc', icon: ArrowUp },
  { label: 'שטח: גדול לקטן', value: 'size-desc', icon: ArrowDown },
  { label: 'תשואה: גבוהה לנמוכה', value: 'roi-desc', icon: ArrowDown },
  { label: 'תשואה: נמוכה לגבוהה', value: 'roi-asc', icon: ArrowUp },
  { label: 'ציון השקעה: גבוה לנמוך', value: 'score-desc', icon: ArrowDown },
  { label: 'CAGR: גבוה לנמוך', value: 'cagr-desc', icon: ArrowDown },
]

const statusEntries = Object.entries(statusColors)

/**
 * Quick filter presets — one-click buttons for common investor searches.
 * Inspired by Madlan/Yad2 quick filter bars that let users instantly narrow results.
 */
const quickPresetDefs = [
  {
    id: 'available',
    label: 'זמינות בלבד',
    emoji: '🟢',
    apply: (onFilterChange, onToggleStatus, statusFilter) => {
      if (!statusFilter.includes('AVAILABLE')) onToggleStatus('AVAILABLE')
    },
    isActive: (filters, statusFilter) => statusFilter.includes('AVAILABLE') && statusFilter.length === 1,
  },
  {
    id: 'high-roi',
    label: 'תשואה 100%+',
    emoji: '🔥',
    apply: (onFilterChange) => {
      onFilterChange('minRoi', '100')
    },
    isActive: (filters) => filters.minRoi === '100',
  },
  {
    id: 'budget',
    label: 'עד ₪400K',
    emoji: '💰',
    apply: (onFilterChange) => {
      onFilterChange('priceMin', '')
      onFilterChange('priceMax', '400000')
    },
    isActive: (filters) => filters.priceMax === '400000' && !filters.priceMin,
  },
  {
    id: 'large',
    label: '3+ דונם',
    emoji: '📐',
    apply: (onFilterChange) => {
      onFilterChange('sizeMin', '3')
      onFilterChange('sizeMax', '')
    },
    isActive: (filters) => filters.sizeMin === '3' && !filters.sizeMax,
  },
  {
    id: 'quick-flip',
    label: 'מהיר (1-3 שנים)',
    emoji: '⚡',
    apply: (onFilterChange) => {
      onFilterChange('ripeness', '1-3')
    },
    isActive: (filters) => filters.ripeness === '1-3',
  },
]

function QuickPresets({ filters, statusFilter, onFilterChange, onToggleStatus, onClearFilters }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-none pb-0.5" dir="rtl">
      <Zap className="w-3 h-3 text-gold/60 flex-shrink-0" />
      {quickPresetDefs.map(preset => {
        const active = preset.isActive(filters, statusFilter)
        return (
          <button
            key={preset.id}
            onClick={() => {
              if (active) {
                // Deactivate: clear all filters
                onClearFilters()
              } else {
                // Clear first, then apply preset
                onClearFilters()
                preset.apply(onFilterChange, onToggleStatus, statusFilter)
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
              active
                ? 'bg-gold/15 text-gold border-gold/25 shadow-sm shadow-gold/10'
                : 'bg-white/[0.03] text-slate-500 border-white/5 hover:bg-white/[0.06] hover:text-slate-300 hover:border-white/10'
            }`}
          >
            <span>{preset.emoji}</span>
            <span>{preset.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SelectPill({ icon: Icon, label, value, displayValue, options, onChange, isActive }) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const ref = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset highlight to current value when opening
  useEffect(() => {
    if (isOpen) {
      const idx = options.findIndex(o => o.value === value)
      setHighlightIdx(idx >= 0 ? idx : 0)
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx + 1] // +1 for header
      if (item?.scrollIntoView) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIdx, isOpen])

  // Keyboard navigation: Arrow keys, Home/End, Enter, Escape, type-ahead
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      // Open on ArrowDown/ArrowUp/Enter/Space when closed
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
        // Type-ahead: jump to first option starting with pressed character
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
    <div className="filter-select-pill" ref={ref}>
      <button
        className={`filter-pill-trigger ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${pillId}-list` : undefined}
        aria-label={`${label}: ${displayValue || options.find(o => o.value === value)?.label || ''}`}
      >
        <Icon className="filter-pill-icon" />
        <span className="filter-pill-label">{displayValue || label}</span>
        <ChevronDown className={`filter-pill-chevron ${isOpen ? 'rotated' : ''}`} />
      </button>
      {isOpen && (
        <div className="filter-pill-dropdown" role="listbox" id={`${pillId}-list`} aria-label={label} ref={listRef}>
          <div className="filter-pill-dropdown-header">{label}</div>
          {options.map((opt, i) => (
            <button
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              className={`filter-pill-option ${value === opt.value ? 'selected' : ''} ${i === highlightIdx ? 'is-highlighted' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              onMouseEnter={() => setHighlightIdx(i)}
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
  savedSearches,
  onSaveSearch,
  onLoadSearch,
  onRemoveSearch,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopySearch = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {})
  }

  // Dynamic city options with plot counts (like Madlan shows listing counts per area)
  const cityOptions = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return baseCityOptions
    const counts = {}
    allPlots.forEach(p => {
      const city = p.city || 'unknown'
      counts[city] = (counts[city] || 0) + 1
    })
    return baseCityOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `כל הערים (${allPlots.length})` }
      const count = counts[opt.value] || 0
      return { ...opt, label: `${opt.value} (${count})` }
    })
  }, [allPlots])

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

  // Market snapshot stats
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
    return { available: available.length, totalDunam: (totalSize / 1000).toFixed(1), avgPricePerDunam }
  }, [allPlots])

  return (
    <div className="filter-bar-container" dir="rtl">
      {/* Accessibility: announce filter results to screen readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {activeCount > 0
          ? `מציג ${plotCount} חלקות עם ${activeCount} סינונים פעילים`
          : `מציג ${plotCount} חלקות`
        }
      </div>
      {/* Market snapshot — like Madlan's data-driven header */}
      {marketStats && !isExpanded && (
        <div className="hidden md:flex items-center gap-4 mb-2 px-1 text-[10px] text-slate-500">
          <span>🟢 {marketStats.available} זמינות</span>
          <span className="w-px h-3 bg-white/10" />
          <span>📐 {marketStats.totalDunam} דונם סה״כ</span>
          <span className="w-px h-3 bg-white/10" />
          <span>💰 ממוצע ₪{marketStats.avgPricePerDunam.toLocaleString()}/דונם</span>
          <span className="w-px h-3 bg-white/10" />
          <span>🕐 עודכן היום</span>
        </div>
      )}

      {/* Quick filter presets — one-click common searches (like Madlan's quick filters) */}
      <QuickPresets
        filters={filters}
        statusFilter={statusFilter}
        onFilterChange={onFilterChange}
        onToggleStatus={onToggleStatus}
        onClearFilters={onClearFilters}
      />

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

          {/* Saved Searches — like Madlan's שמור חיפוש */}
          {savedSearches && (
            <>
              <div className="filter-separator" />
              <SavedSearches
                searches={savedSearches}
                onSave={onSaveSearch}
                onLoad={onLoadSearch}
                onRemove={onRemoveSearch}
                currentFilters={filters}
                currentStatusFilter={statusFilter}
                currentSortBy={sortBy}
                activeCount={activeCount}
              />
            </>
          )}
        </div>

        {/* Active filter chips — removable tags like Madlan/Yad2 */}
        {activeCount > 0 && (
          <div className="filter-active-chips-row">
            {filters.city !== 'all' && (
              <button
                className="filter-active-chip"
                onClick={() => onFilterChange('city', 'all')}
                aria-label={`הסר סינון עיר: ${filters.city}`}
              >
                <MapPin className="w-3 h-3" />
                <span>{filters.city}</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            )}
            {priceRangeValue !== 'all' && (
              <button
                className="filter-active-chip"
                onClick={() => { onFilterChange('priceMin', ''); onFilterChange('priceMax', '') }}
                aria-label={`הסר סינון מחיר: ${priceDisplay}`}
              >
                <Banknote className="w-3 h-3" />
                <span>{priceDisplay}</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            )}
            {sizeRangeValue !== 'all' && (
              <button
                className="filter-active-chip"
                onClick={() => { onFilterChange('sizeMin', ''); onFilterChange('sizeMax', '') }}
                aria-label={`הסר סינון שטח: ${sizeDisplay}`}
              >
                <Ruler className="w-3 h-3" />
                <span>{sizeDisplay}</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            )}
            {filters.minRoi && filters.minRoi !== 'all' && (
              <button
                className="filter-active-chip"
                onClick={() => onFilterChange('minRoi', 'all')}
                aria-label={`הסר סינון תשואה: ${filters.minRoi}%+`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>{filters.minRoi}%+</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            )}
            {filters.ripeness !== 'all' && (
              <button
                className="filter-active-chip"
                onClick={() => onFilterChange('ripeness', 'all')}
                aria-label={`הסר סינון בשלות: ${ripenessOptions.find(o => o.value === filters.ripeness)?.label}`}
              >
                <Clock className="w-3 h-3" />
                <span>{ripenessOptions.find(o => o.value === filters.ripeness)?.label}</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            )}
            {statusFilter.map(status => (
              <button
                key={status}
                className="filter-active-chip"
                onClick={() => onToggleStatus(status)}
                aria-label={`הסר סינון סטטוס: ${statusLabels[status]}`}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusColors[status] }} />
                <span>{statusLabels[status]}</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            ))}
            {filters.search && (
              <button
                className="filter-active-chip"
                onClick={() => onFilterChange('search', '')}
                aria-label={`הסר חיפוש: ${filters.search}`}
              >
                <Search className="w-3 h-3" />
                <span>"{filters.search}"</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            )}
          </div>
        )}

        {/* Bottom row: Clear + count */}
        {activeCount > 0 && (
          <div className="filter-actions-row">
            <button className="filter-clear-btn" onClick={onClearFilters}>
              <X className="w-3 h-3" />
              נקה הכל
            </button>
            <button
              className="filter-clear-btn"
              onClick={handleCopySearch}
              style={{ background: linkCopied ? 'rgba(34,197,94,0.15)' : undefined, borderColor: linkCopied ? 'rgba(34,197,94,0.3)' : undefined }}
            >
              {linkCopied ? <Check className="w-3 h-3 text-green-400" /> : <Link2 className="w-3 h-3" />}
              {linkCopied ? 'הועתק!' : 'שתף חיפוש'}
            </button>
            <a
              href={`/api/export/csv?${new URLSearchParams(
                Object.fromEntries(Object.entries({
                  city: filters.city !== 'all' ? filters.city : undefined,
                  priceMin: filters.priceMin || undefined,
                  priceMax: filters.priceMax || undefined,
                  sizeMin: filters.sizeMin || undefined,
                  sizeMax: filters.sizeMax || undefined,
                  status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
                }).filter(([, v]) => v !== undefined))
              ).toString()}`}
              download
              className="filter-clear-btn"
              title="ייצוא לאקסל (CSV)"
            >
              <Download className="w-3 h-3" />
              ייצוא CSV
            </a>
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
