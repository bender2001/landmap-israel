import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { SlidersHorizontal, X, ChevronDown, Check, MapPin, Banknote, Ruler, Clock, Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, Link2, Download, Zap, Layers, Navigation, Wallet } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels } from '../utils/constants'
import SearchAutocomplete from './SearchAutocomplete'
import SavedSearches from './SavedSearches'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { showToast } from './ui/ToastContainer'

/**
 * AnimatedCount — smooth counting animation when the number changes.
 * Like Madlan's result count that rolls up/down when filters change.
 * Uses requestAnimationFrame for 60fps interpolation over ~300ms.
 */
function AnimatedCount({ value, className = '' }) {
  const [displayValue, setDisplayValue] = useState(value)
  const animRef = useRef(null)
  const prevValue = useRef(value)

  useEffect(() => {
    if (prevValue.current === value) return
    const from = prevValue.current
    const to = value
    prevValue.current = value

    const startTime = performance.now()
    const duration = 300 // ms

    if (animRef.current) cancelAnimationFrame(animRef.current)

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic for smooth deceleration
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

  return <span className={`tabular-nums ${className}`}>{displayValue}</span>
}

// Known cities for stable ordering; any new cities found in data are appended dynamically
const KNOWN_CITIES = ['חדרה', 'נתניה', 'קיסריה']

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

/**
 * Monthly payment (affordability) filter — like Madlan's "תשלום חודשי" filter.
 * Based on default mortgage terms: 50% LTV, 6% rate, 15-year term.
 * Shows max monthly payment the investor needs to plan for.
 */
const monthlyPaymentOptions = [
  { label: 'כל התשלומים', value: '' },
  { label: 'עד ₪1,500/חודש', value: '1500' },
  { label: 'עד ₪2,500/חודש', value: '2500' },
  { label: 'עד ₪4,000/חודש', value: '4000' },
  { label: 'עד ₪6,000/חודש', value: '6000' },
  { label: 'עד ₪8,000/חודש', value: '8000' },
  { label: 'עד ₪12,000/חודש', value: '12000' },
]

const zoningOptions = [
  { label: 'כל השלבים', value: 'all' },
  { label: '🌾 חקלאית', value: 'AGRICULTURAL' },
  { label: '📋 הפקדת מתאר', value: 'MASTER_PLAN_DEPOSIT' },
  { label: '✅ מתאר מאושר', value: 'MASTER_PLAN_APPROVED' },
  { label: '📐 הכנת מפורטת', value: 'DETAILED_PLAN_PREP' },
  { label: '📋 הפקדת מפורטת', value: 'DETAILED_PLAN_DEPOSIT' },
  { label: '✅ מפורטת מאושרת', value: 'DETAILED_PLAN_APPROVED' },
  { label: '🏗️ מכרז יזמים', value: 'DEVELOPER_TENDER' },
  { label: '🏠 היתר בנייה', value: 'BUILDING_PERMIT' },
]

const sortOptions = [
  { label: '✨ מומלצות', value: 'default', icon: ArrowUpDown },
  { label: '🔥 עסקה הכי טובה', value: 'deal-desc', icon: ArrowDown },
  { label: '🕐 חדשות ראשונות', value: 'newest-first', icon: ArrowDown },
  { label: 'הכי קרוב אליי 📍', value: 'distance-asc', icon: Navigation },
  { label: 'מחיר: נמוך לגבוה', value: 'price-asc', icon: ArrowUp },
  { label: 'מחיר: גבוה לנמוך', value: 'price-desc', icon: ArrowDown },
  { label: 'מחיר/מ״ר: נמוך לגבוה', value: 'ppsqm-asc', icon: ArrowUp },
  { label: 'מחיר/מ״ר: גבוה לנמוך', value: 'ppsqm-desc', icon: ArrowDown },
  { label: 'שטח: קטן לגדול', value: 'size-asc', icon: ArrowUp },
  { label: 'שטח: גדול לקטן', value: 'size-desc', icon: ArrowDown },
  { label: 'תשואה: גבוהה לנמוכה', value: 'roi-desc', icon: ArrowDown },
  { label: 'תשואה: נמוכה לגבוהה', value: 'roi-asc', icon: ArrowUp },
  { label: '💰 תשואה נטו (אחרי עלויות)', value: 'net-roi-desc', icon: ArrowDown },
  { label: 'ציון השקעה: גבוה לנמוך', value: 'score-desc', icon: ArrowDown },
  { label: 'CAGR: גבוה לנמוך', value: 'cagr-desc', icon: ArrowDown },
  { label: 'עודכן לאחרונה', value: 'updated-desc', icon: ArrowDown },
  { label: 'תשלום חודשי: נמוך לגבוה', value: 'monthly-asc', icon: ArrowUp },
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
    id: 'premium',
    label: '₪1M+',
    emoji: '💎',
    apply: (onFilterChange) => {
      onFilterChange('priceMin', '1000000')
      onFilterChange('priceMax', '')
    },
    isActive: (filters) => filters.priceMin === '1000000' && !filters.priceMax,
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
    id: 'new-listings',
    label: 'חדשות השבוע',
    emoji: '🆕',
    apply: (onFilterChange) => {
      onFilterChange('maxDays', '7')
    },
    isActive: (filters) => filters.maxDays === '7',
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
  {
    id: 'top-grade',
    label: 'דירוג A+',
    emoji: '🏆',
    apply: (onFilterChange) => {
      onFilterChange('minRoi', '200')
    },
    isActive: (filters) => filters.minRoi === '200',
  },
  {
    id: 'affordable',
    label: 'עד ₪4K/חודש',
    emoji: '🏦',
    apply: (onFilterChange) => {
      onFilterChange('maxMonthly', '4000')
    },
    isActive: (filters) => filters.maxMonthly === '4000',
  },
  {
    id: 'net-roi',
    label: 'תשואה נטו הכי גבוהה',
    emoji: '💰',
    apply: (onFilterChange, onToggleStatus, statusFilter, onSortChange) => {
      // This preset relies on the sort — triggers sort to net-roi-desc via the parent's sortBy
      // Since presets can't directly change sort, we apply ROI ≥50% + available status
      onFilterChange('minRoi', '50')
      if (!statusFilter.includes('AVAILABLE')) onToggleStatus('AVAILABLE')
    },
    isActive: (filters, statusFilter) => filters.minRoi === '50' && statusFilter.includes('AVAILABLE'),
  },
]

function QuickPresets({ filters, statusFilter, onFilterChange, onToggleStatus, onClearFilters }) {
  const haptic = useHapticFeedback()
  return (
    <div className="flex items-center gap-1.5 mb-2 overflow-x-auto scrollbar-none pb-0.5" dir="rtl">
      <Zap className="w-3 h-3 text-gold/60 flex-shrink-0" />
      {quickPresetDefs.map(preset => {
        const active = preset.isActive(filters, statusFilter)
        return (
          <button
            key={preset.id}
            onClick={() => {
              haptic.light()
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
  const haptic = useHapticFeedback()

  const handleCopySearch = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      haptic.success()
      setLinkCopied(true)
      showToast('🔗 הקישור הועתק — שתף אותו עם משקיעים אחרים', 'success')
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {
      showToast('לא הצלחנו להעתיק את הקישור', 'error')
    })
  }

  // Dynamic city options with plot counts — auto-discovers new cities from data (like Madlan)
  // Known cities keep stable ordering; any city in the data not in KNOWN_CITIES is appended
  const cityOptions = useMemo(() => {
    const fallback = [
      { label: 'כל הערים', value: 'all' },
      ...KNOWN_CITIES.map(c => ({ label: c, value: c })),
    ]
    if (!allPlots || allPlots.length === 0) return fallback

    const counts = {}
    allPlots.forEach(p => {
      const city = p.city || 'unknown'
      counts[city] = (counts[city] || 0) + 1
    })

    // Start with "all" option
    const options = [{ label: `כל הערים (${allPlots.length})`, value: 'all' }]
    // Add known cities first (stable ordering)
    for (const city of KNOWN_CITIES) {
      const count = counts[city] || 0
      options.push({ label: `${city} (${count})`, value: city })
    }
    // Append any new cities discovered in data, sorted by count descending
    const newCities = Object.keys(counts)
      .filter(c => !KNOWN_CITIES.includes(c) && c !== 'unknown')
      .sort((a, b) => counts[b] - counts[a])
    for (const city of newCities) {
      options.push({ label: `${city} (${counts[city]})`, value: city })
    }
    return options
  }, [allPlots])

  // Dynamic price range options with counts — shows how many plots match each range (like Madlan)
  const priceOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return priceRangeOptions
    return priceRangeOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `כל המחירים (${allPlots.length})` }
      const minVal = opt.min ? Number(opt.min) : 0
      const maxVal = opt.max ? Number(opt.max) : Infinity
      const count = allPlots.filter(p => {
        const price = p.total_price ?? p.totalPrice ?? 0
        return price >= minVal && price <= maxVal
      }).length
      return { ...opt, label: `${opt.label} (${count})` }
    })
  }, [allPlots])

  // Dynamic size range options with counts
  const sizeOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return sizeRangeOptions
    return sizeRangeOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `כל הגדלים (${allPlots.length})` }
      const minVal = opt.min ? Number(opt.min) * 1000 : 0 // convert dunam to sqm
      const maxVal = opt.max ? Number(opt.max) * 1000 : Infinity
      const count = allPlots.filter(p => {
        const size = p.size_sqm ?? p.sizeSqM ?? 0
        return size >= minVal && size <= maxVal
      }).length
      return { ...opt, label: `${opt.label} (${count})` }
    })
  }, [allPlots])

  // Dynamic ROI options with counts
  const roiOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return roiOptions
    return roiOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `כל התשואות (${allPlots.length})` }
      const minRoi = parseInt(opt.value, 10)
      const count = allPlots.filter(p => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        if (price <= 0) return false
        return ((proj - price) / price) * 100 >= minRoi
      }).length
      return { ...opt, label: `${opt.label} (${count})` }
    })
  }, [allPlots])

  // Dynamic zoning options with counts
  const zoningOptionsWithCounts = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return zoningOptions
    const zoneCounts = {}
    allPlots.forEach(p => {
      const z = p.zoning_stage ?? p.zoningStage ?? 'UNKNOWN'
      zoneCounts[z] = (zoneCounts[z] || 0) + 1
    })
    return zoningOptions.map(opt => {
      if (opt.value === 'all') return { ...opt, label: `כל השלבים (${allPlots.length})` }
      const count = zoneCounts[opt.value] || 0
      return { ...opt, label: `${opt.label} (${count})` }
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
    (filters.zoning && filters.zoning !== 'all' ? 1 : 0) +
    (filters.maxDays ? 1 : 0) +
    (filters.maxMonthly ? 1 : 0) +
    (filters.search ? 1 : 0) +
    statusFilter.length

  const cityDisplay = filters.city !== 'all' ? filters.city : null
  const priceDisplay = priceRangeValue !== 'all'
    ? priceRangeOptions.find((o) => o.value === priceRangeValue)?.label
    : null
  const sizeDisplay = sizeRangeValue !== 'all'
    ? sizeRangeOptions.find((o) => o.value === sizeRangeValue)?.label
    : null

  // Market snapshot stats — enhanced with ROI and hot deals for investor-centric context.
  // Madlan shows avg price; we go further with ROI, hot deals, and total portfolio value.
  const marketStats = useMemo(() => {
    if (!allPlots || allPlots.length === 0) return null
    const available = allPlots.filter(p => p.status === 'AVAILABLE')
    const totalSize = allPlots.reduce((s, p) => s + (p.size_sqm ?? p.sizeSqM ?? 0), 0)
    const totalValue = allPlots.reduce((s, p) => s + (p.total_price ?? p.totalPrice ?? 0), 0)

    // Avg price per dunam (market benchmark)
    const avgPricePerDunam = allPlots.length > 0
      ? Math.round(allPlots.reduce((s, p) => {
          const price = p.total_price ?? p.totalPrice ?? 0
          const size = p.size_sqm ?? p.sizeSqM ?? 1
          return s + (price / size * 1000)
        }, 0) / allPlots.length)
      : 0

    // Avg ROI across all plots — key investor metric
    let roiSum = 0, roiCount = 0
    // Avg price/sqm for hot deal detection (>15% below avg = hot deal)
    let psmSum = 0, psmCount = 0
    for (const p of allPlots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0 && proj > 0) {
        roiSum += ((proj - price) / price) * 100
        roiCount++
      }
      if (price > 0 && size > 0) {
        psmSum += price / size
        psmCount++
      }
    }
    const avgRoi = roiCount > 0 ? Math.round(roiSum / roiCount) : 0
    const avgPsm = psmCount > 0 ? psmSum / psmCount : 0

    // Hot deals: plots >15% below avg price/sqm — like Madlan's "הזדמנויות"
    let hotDeals = 0
    if (avgPsm > 0) {
      for (const p of allPlots) {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 0
        if (price > 0 && size > 0) {
          const psm = price / size
          if (psm < avgPsm * 0.85) hotDeals++
        }
      }
    }

    return { available: available.length, totalDunam: (totalSize / 1000).toFixed(1), avgPricePerDunam, avgRoi, hotDeals, totalValue }
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
      {/* Market snapshot — Bloomberg-style data header with investor-centric metrics.
          Shows always (not just when filters active) for constant market awareness.
          Enhanced beyond Madlan: includes avg ROI, hot deals count, and total portfolio value. */}
      {marketStats && !isExpanded && (
        <div className="hidden md:flex items-center gap-3 mb-2 px-1 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">🟢 <span className="text-slate-400 font-medium">{marketStats.available}</span> זמינות</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="flex items-center gap-1">💰 ממוצע <span className="text-gold/80 font-medium">₪{marketStats.avgPricePerDunam.toLocaleString()}</span>/דונם</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="flex items-center gap-1">📈 ROI ממוצע <span className={`font-medium ${marketStats.avgRoi >= 100 ? 'text-emerald-400/80' : 'text-slate-400'}`}>+{marketStats.avgRoi}%</span></span>
          {marketStats.hotDeals > 0 && (
            <>
              <span className="w-px h-3 bg-white/10" />
              <span className="flex items-center gap-1 text-orange-400/80 font-medium">🔥 {marketStats.hotDeals} עסקאות חמות</span>
            </>
          )}
          <span className="w-px h-3 bg-white/10" />
          <span className="flex items-center gap-1">📐 {marketStats.totalDunam} דונם</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-slate-600">🕐 {(() => {
            const now = new Date()
            const hour = now.getHours()
            const min = now.getMinutes()
            return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
          })()}</span>
        </div>
      )}

      {/* Mobile market stats — condensed version for small screens.
          Shows 3 key metrics: available count, avg ROI, and hot deals (if any).
          Desktop gets the full version above; mobile needs brevity. */}
      {marketStats && !isExpanded && (
        <div className="flex md:hidden items-center justify-center gap-3 mb-1.5 px-1 text-[9px] text-slate-500">
          <span>🟢 {marketStats.available} זמינות</span>
          <span className="w-px h-2.5 bg-white/10" />
          <span>📈 +{marketStats.avgRoi}% ROI</span>
          {marketStats.hotDeals > 0 && (
            <>
              <span className="w-px h-2.5 bg-white/10" />
              <span className="text-orange-400/80">🔥 {marketStats.hotDeals}</span>
            </>
          )}
          <span className="w-px h-2.5 bg-white/10" />
          <span>{plotCount} חלקות</span>
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
            options={priceOptionsWithCounts}
            onChange={handlePriceRange}
            isActive={priceRangeValue !== 'all'}
          />

          <SelectPill
            icon={Ruler}
            label="שטח"
            value={sizeRangeValue}
            displayValue={sizeDisplay}
            options={sizeOptionsWithCounts}
            onChange={handleSizeRange}
            isActive={sizeRangeValue !== 'all'}
          />

          <SelectPill
            icon={Layers}
            label="שלב תכנוני"
            value={filters.zoning || 'all'}
            displayValue={filters.zoning && filters.zoning !== 'all' ? zoningOptionsWithCounts.find(o => o.value === filters.zoning)?.label?.replace(/^[^\s]+ /, '').replace(/ \(\d+\)$/, '') : null}
            options={zoningOptionsWithCounts}
            onChange={(val) => onFilterChange('zoning', val)}
            isActive={filters.zoning && filters.zoning !== 'all'}
          />

          <SelectPill
            icon={TrendingUp}
            label="תשואה"
            value={filters.minRoi || 'all'}
            displayValue={filters.minRoi && filters.minRoi !== 'all' ? `${filters.minRoi}%+` : null}
            options={roiOptionsWithCounts}
            onChange={(val) => onFilterChange('minRoi', val)}
            isActive={filters.minRoi && filters.minRoi !== 'all'}
          />

          <SelectPill
            icon={Wallet}
            label="תשלום חודשי"
            value={filters.maxMonthly || ''}
            displayValue={filters.maxMonthly ? `עד ₪${Number(filters.maxMonthly).toLocaleString()}/חודש` : null}
            options={monthlyPaymentOptions}
            onChange={(val) => onFilterChange('maxMonthly', val)}
            isActive={!!filters.maxMonthly}
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
            {filters.zoning && filters.zoning !== 'all' && (
              <button
                className="filter-active-chip"
                onClick={() => onFilterChange('zoning', 'all')}
                aria-label={`הסר סינון תכנוני: ${zoningOptions.find(o => o.value === filters.zoning)?.label}`}
              >
                <Layers className="w-3 h-3" />
                <span>{zoningOptions.find(o => o.value === filters.zoning)?.label?.replace(/^[^\s]+ /, '')}</span>
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
            {filters.maxDays && (
              <button
                className="filter-active-chip"
                onClick={() => onFilterChange('maxDays', '')}
                aria-label={`הסר סינון חדשות: ${filters.maxDays} ימים`}
              >
                <Clock className="w-3 h-3" />
                <span>🆕 {filters.maxDays} ימים אחרונים</span>
                <X className="w-3 h-3 opacity-60 hover:opacity-100" />
              </button>
            )}
            {filters.maxMonthly && (
              <button
                className="filter-active-chip"
                onClick={() => onFilterChange('maxMonthly', '')}
                aria-label={`הסר סינון תשלום חודשי: עד ₪${Number(filters.maxMonthly).toLocaleString()}`}
              >
                <Wallet className="w-3 h-3" />
                <span>עד ₪{Number(filters.maxMonthly).toLocaleString()}/חודש</span>
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

        {/* Bottom row: Always visible — count + actions.
            Previously hidden when no filters active; now always shows for constant context.
            Clear button only renders when filters are active. */}
        <div className="filter-actions-row">
          {activeCount > 0 && (
            <button className="filter-clear-btn" onClick={() => { haptic.heavy(); onClearFilters() }}>
              <X className="w-3 h-3" />
              נקה הכל ({activeCount})
            </button>
          )}
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
          <div className="filter-count" style={activeCount > 0 ? { color: '#C8942A', fontWeight: 600 } : undefined}>
            <Eye className="w-3 h-3" />
            <AnimatedCount value={plotCount} /> {plotCount === 1 ? 'חלקה' : 'חלקות'}
            {activeCount > 0 && allPlots.length !== plotCount && (
              <span className="text-slate-600 font-normal"> מתוך <AnimatedCount value={allPlots.length} /></span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
