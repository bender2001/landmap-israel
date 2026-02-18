import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, MapPin, TrendingUp, Clock, ArrowLeft } from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatDunam } from '../utils/formatters'

/**
 * Search autocomplete dropdown — shows matching plots as user types.
 * Similar to Madlan's address-based search but for plots.
 */
export default function SearchAutocomplete({ value, onChange, plots = [], onSelectPlot, placeholder }) {
  const [isFocused, setIsFocused] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Filter plots based on search query
  const suggestions = (() => {
    if (!value || value.length < 1) return []
    const q = value.toLowerCase()
    return plots
      .filter((p) => {
        const bn = (p.block_number ?? p.blockNumber ?? '').toString()
        const num = (p.number ?? '').toString()
        const city = (p.city ?? '').toLowerCase()
        const desc = (p.description ?? '').toLowerCase()
        return bn.includes(q) || num.includes(q) || city.includes(q) || desc.includes(q)
      })
      .slice(0, 6) // max 6 suggestions
  })()

  const showDropdown = isFocused && value && value.length >= 1

  // Recent searches (stored in localStorage)
  const recentSearches = (() => {
    if (showDropdown && suggestions.length > 0) return [] // don't show when we have results
    try { return JSON.parse(localStorage.getItem('landmap_recent_searches') || '[]').slice(0, 3) } catch { return [] }
  })()

  const saveRecentSearch = useCallback((query) => {
    try {
      const recent = JSON.parse(localStorage.getItem('landmap_recent_searches') || '[]')
      const updated = [query, ...recent.filter(q => q !== query)].slice(0, 5)
      localStorage.setItem('landmap_recent_searches', JSON.stringify(updated))
    } catch {}
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset highlight when suggestions change
  useEffect(() => {
    setHighlightIndex(-1)
  }, [value])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex]
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const handleKeyDown = useCallback((e) => {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault()
      const plot = suggestions[highlightIndex]
      if (plot) {
        saveRecentSearch(value)
        onSelectPlot(plot)
        setIsFocused(false)
        inputRef.current?.blur()
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }, [showDropdown, highlightIndex, suggestions, onSelectPlot])

  const handleSelect = useCallback((plot) => {
    if (value) saveRecentSearch(value)
    onSelectPlot(plot)
    setIsFocused(false)
  }, [onSelectPlot, value, saveRecentSearch])

  // Highlight matching text
  const highlightMatch = (text, query) => {
    if (!query || !text) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-gold font-semibold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div className="search-autocomplete-wrap" ref={wrapRef}>
      <div className={`filter-search-input-wrap ${showDropdown ? 'search-has-dropdown' : ''}`}>
        <Search className="filter-search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || 'חיפוש גוש, חלקה, עיר...'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="filter-search-input"
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        {value && (
          <button
            className="filter-search-clear"
            onClick={() => { onChange(''); inputRef.current?.focus() }}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div className="search-autocomplete-dropdown" role="listbox" ref={listRef}>
          {suggestions.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <div className="text-lg mb-1">🔍</div>
              <div className="text-xs text-slate-400 font-medium">לא נמצאו תוצאות עבור &quot;{value}&quot;</div>
              <div className="text-[10px] text-slate-500 mt-1">נסה לחפש לפי מספר גוש, חלקה או שם עיר</div>
            </div>
          ) : (
          <>
          <div className="search-autocomplete-header">
            <Search className="w-3 h-3 text-slate-500" />
            <span>{suggestions.length} תוצאות</span>
          </div>
          {suggestions.map((plot, i) => {
            const color = statusColors[plot.status]
            const price = plot.total_price ?? plot.totalPrice
            const projValue = plot.projected_value ?? plot.projectedValue
            const roi = price ? Math.round((projValue - price) / price * 100) : 0
            const blockNum = (plot.block_number ?? plot.blockNumber ?? '').toString()
            const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
            const readiness = plot.readiness_estimate ?? plot.readinessEstimate
            const isHighlighted = i === highlightIndex

            return (
              <button
                key={plot.id}
                className={`search-autocomplete-item ${isHighlighted ? 'is-highlighted' : ''}`}
                onClick={() => handleSelect(plot)}
                onMouseEnter={() => setHighlightIndex(i)}
                role="option"
                aria-selected={isHighlighted}
              >
                <div className="search-autocomplete-item-color" style={{ background: color }} />
                <div className="search-autocomplete-item-body">
                  <div className="search-autocomplete-item-title">
                    <span>גוש {highlightMatch(blockNum, value)} | חלקה {highlightMatch((plot.number ?? '').toString(), value)}</span>
                    <span className="search-autocomplete-item-status" style={{ color }}>
                      {statusLabels[plot.status]}
                    </span>
                  </div>
                  <div className="search-autocomplete-item-meta">
                    <span className="search-autocomplete-item-city">
                      <MapPin className="w-2.5 h-2.5" />
                      {highlightMatch(plot.city || '', value)}
                    </span>
                    <span className="search-autocomplete-item-price">{formatPriceShort(price)}</span>
                    <span className="search-autocomplete-item-roi">
                      <TrendingUp className="w-2.5 h-2.5" />
                      +{roi}%
                    </span>
                    {readiness && (
                      <span className="search-autocomplete-item-time">
                        <Clock className="w-2.5 h-2.5" />
                        {readiness}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500 search-autocomplete-item-arrow" />
              </button>
            )
          })}
          <div className="search-autocomplete-hint">
            <kbd>↑</kbd><kbd>↓</kbd> ניווט · <kbd>Enter</kbd> בחירה · <kbd>Esc</kbd> סגירה
          </div>
          </>
          )}
        </div>
      )}
    </div>
  )
}
