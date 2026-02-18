import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Search, X, MapPin, TrendingUp, Clock, ArrowLeft, Eye, History } from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatDunam } from '../utils/formatters'

/**
 * Search autocomplete dropdown — shows matching plots as user types.
 * On focus without query: shows recent searches + popular/recently viewed plots.
 * Similar to Madlan's address-based search but for plots.
 */
export default function SearchAutocomplete({ value, onChange, plots = [], onSelectPlot, placeholder }) {
  const [isFocused, setIsFocused] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Filter plots based on search query — memoized to avoid recomputing on every render.
  // Without useMemo this IIFE ran on every keystroke AND on unrelated state changes (focus, highlight).
  const suggestions = useMemo(() => {
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
  }, [value, plots])

  const hasQuery = value && value.length >= 1

  // Recent searches (stored in localStorage)
  const recentSearches = useMemo(() => {
    if (!isFocused || hasQuery) return []
    try { return JSON.parse(localStorage.getItem('landmap_recent_searches') || '[]').slice(0, 3) } catch { return [] }
  }, [isFocused, hasQuery])

  // Recently viewed plots (for empty-query focus state)
  const recentlyViewedPlots = useMemo(() => {
    if (!isFocused || hasQuery || plots.length === 0) return []
    try {
      const ids = JSON.parse(localStorage.getItem('landmap_recently_viewed') || '[]').slice(0, 4)
      if (ids.length === 0) return []
      return ids.map(id => plots.find(p => p.id === id)).filter(Boolean)
    } catch { return [] }
  }, [isFocused, hasQuery, plots])

  // Popular plots (highest views, for empty-query focus state)
  const popularPlots = useMemo(() => {
    if (!isFocused || hasQuery || plots.length === 0) return []
    // If we already show recently viewed, limit popular to fill remaining
    const remaining = 4 - recentlyViewedPlots.length
    if (remaining <= 0) return []
    const recentIds = new Set(recentlyViewedPlots.map(p => p.id))
    return [...plots]
      .filter(p => !recentIds.has(p.id) && (p.views ?? 0) > 0)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, remaining)
  }, [isFocused, hasQuery, plots, recentlyViewedPlots])

  // Should we show the focus menu (recent searches + recently viewed + popular)?
  const showFocusMenu = isFocused && !hasQuery && (recentSearches.length > 0 || recentlyViewedPlots.length > 0 || popularPlots.length > 0)

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
    if (!isFocused) return

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
  }, [isFocused, highlightIndex, suggestions, onSelectPlot])

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
      <div className={`filter-search-input-wrap ${(isFocused && hasQuery) || showFocusMenu ? 'search-has-dropdown' : ''}`}>
        <Search className="filter-search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || 'חיפוש גוש, חלקה, עיר... (Ctrl+K)'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="filter-search-input"
          autoComplete="off"
          role="combobox"
          aria-expanded={(isFocused && hasQuery) || showFocusMenu}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={isFocused ? 'search-autocomplete-listbox' : undefined}
          aria-activedescendant={highlightIndex >= 0 && hasQuery && suggestions[highlightIndex] ? `search-option-${suggestions[highlightIndex].id}` : undefined}
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

      {/* Focus menu — recent searches + recently viewed + popular (shown when focused without query) */}
      {showFocusMenu && (
        <div className="search-autocomplete-dropdown" role="listbox" ref={listRef}>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <>
              <div className="search-autocomplete-header">
                <History className="w-3 h-3 text-slate-500" />
                <span>חיפושים אחרונים</span>
              </div>
              {recentSearches.map((query, i) => (
                <button
                  key={`search-${i}`}
                  className="search-autocomplete-item"
                  onClick={() => { onChange(query); setIsFocused(true) }}
                  role="option"
                  aria-selected={false}
                >
                  <Search className="w-3 h-3 text-slate-500 flex-shrink-0 mx-1" />
                  <span className="text-xs text-slate-300 flex-1 text-right truncate">{query}</span>
                  <ArrowLeft className="w-3 h-3 text-slate-600 search-autocomplete-item-arrow" />
                </button>
              ))}
            </>
          )}
          {/* Recently viewed plots */}
          {recentlyViewedPlots.length > 0 && (
            <>
              <div className="search-autocomplete-header">
                <Eye className="w-3 h-3 text-slate-500" />
                <span>נצפו לאחרונה</span>
              </div>
              {recentlyViewedPlots.map(plot => {
                const color = statusColors[plot.status]
                const price = plot.total_price ?? plot.totalPrice
                const blockNum = (plot.block_number ?? plot.blockNumber ?? '').toString()
                return (
                  <button
                    key={`rv-${plot.id}`}
                    className="search-autocomplete-item"
                    onClick={() => { onSelectPlot(plot); setIsFocused(false) }}
                    role="option"
                    aria-selected={false}
                  >
                    <div className="search-autocomplete-item-color" style={{ background: color }} />
                    <div className="search-autocomplete-item-body">
                      <div className="search-autocomplete-item-title">
                        <span>גוש {blockNum} | חלקה {plot.number}</span>
                      </div>
                      <div className="search-autocomplete-item-meta">
                        <span className="search-autocomplete-item-city">
                          <MapPin className="w-2.5 h-2.5" />
                          {plot.city}
                        </span>
                        <span className="search-autocomplete-item-price">{formatPriceShort(price)}</span>
                      </div>
                    </div>
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500 search-autocomplete-item-arrow" />
                  </button>
                )
              })}
            </>
          )}
          {/* Popular plots */}
          {popularPlots.length > 0 && (
            <>
              <div className="search-autocomplete-header">
                <TrendingUp className="w-3 h-3 text-slate-500" />
                <span>פופולריים</span>
              </div>
              {popularPlots.map(plot => {
                const color = statusColors[plot.status]
                const price = plot.total_price ?? plot.totalPrice
                const blockNum = (plot.block_number ?? plot.blockNumber ?? '').toString()
                return (
                  <button
                    key={`pop-${plot.id}`}
                    className="search-autocomplete-item"
                    onClick={() => { onSelectPlot(plot); setIsFocused(false) }}
                    role="option"
                    aria-selected={false}
                  >
                    <div className="search-autocomplete-item-color" style={{ background: color }} />
                    <div className="search-autocomplete-item-body">
                      <div className="search-autocomplete-item-title">
                        <span>גוש {blockNum} | חלקה {plot.number}</span>
                        <span className="text-[8px] text-indigo-400/70">👁 {plot.views}</span>
                      </div>
                      <div className="search-autocomplete-item-meta">
                        <span className="search-autocomplete-item-city">
                          <MapPin className="w-2.5 h-2.5" />
                          {plot.city}
                        </span>
                        <span className="search-autocomplete-item-price">{formatPriceShort(price)}</span>
                      </div>
                    </div>
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-500 search-autocomplete-item-arrow" />
                  </button>
                )
              })}
            </>
          )}
          <div className="search-autocomplete-hint">
            <span>הקלד לחיפוש גוש, חלקה או עיר</span>
          </div>
        </div>
      )}

      {/* Autocomplete dropdown */}
      {hasQuery && isFocused && (
        <div className="search-autocomplete-dropdown" role="listbox" id="search-autocomplete-listbox" aria-label="תוצאות חיפוש" ref={listRef}>
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
                id={`search-option-${plot.id}`}
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
