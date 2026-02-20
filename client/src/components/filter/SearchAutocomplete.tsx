import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import { X, MapPin, TrendingUp, Clock, Eye, Search, ArrowLeft, History, Flame } from 'lucide-react'
import { statusColors, statusLabels } from '../../utils/constants'
import { formatPriceShort } from '../../utils/format'
import { useTrendingSearches } from '../../hooks/usePlots'
import { theme as staticTheme } from '../../styles/theme'

// ─── Types ───────────────────────────────────────────────────────────────

export type SA_Plot = {
  id: number | string
  block_number?: number | string
  blockNumber?: number | string
  number?: number | string
  city?: string
  description?: string
  total_price?: number
  totalPrice?: number
  projected_value?: number
  projectedValue?: number
  views?: number
  status?: string
  size_sqm?: number
  sizeSqM?: number
  readiness_estimate?: string
  readinessEstimate?: string
}

export interface SearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  plots?: SA_Plot[]
  onSelectPlot: (plot: SA_Plot) => void
  placeholder?: string
}

// ─── Styled Components ───────────────────────────────────────────────────

const SA_Wrap = styled.div`
  position: relative;
  width: 100%;
`

const SA_InputWrap = styled.div<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${staticTheme.radii.full};
  background: rgba(8, 18, 35, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color ${staticTheme.transitions.fast}, box-shadow ${staticTheme.transitions.fast};

  ${({ $open }) =>
    $open
      ? `
    border-color: rgba(200, 148, 42, 0.3);
    box-shadow: ${staticTheme.shadows.goldGlow};
  `
      : `
    &:hover {
      border-color: rgba(200, 148, 42, 0.2);
    }
  `}
`

const SA_SearchIcon = styled(Search)`
  width: 14px;
  height: 14px;
  color: ${staticTheme.colors.slate[500]};
`

const SA_SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: ${staticTheme.colors.slate[200]};
  font-size: 12px;
  text-align: right;

  &::placeholder {
    color: ${staticTheme.colors.slate[500]};
  }
`

const SA_ClearButton = styled.button`
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${staticTheme.radii.full};
  background: rgba(255, 255, 255, 0.06);
  color: ${staticTheme.colors.slate[300]};
  transition: background ${staticTheme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`

const SA_Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  left: 0;
  background: ${staticTheme.glass.bg};
  backdrop-filter: ${staticTheme.glass.blur};
  border: ${staticTheme.glass.border};
  border-radius: ${staticTheme.radii.lg};
  box-shadow: ${staticTheme.shadows.popup};
  padding: 0.5rem;
  z-index: ${staticTheme.zIndex.filterBar};
`

const SA_Header = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.25rem 0.5rem;
  font-size: 10px;
  color: ${staticTheme.colors.slate[500]};
`

const SA_ItemButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem;
  border-radius: ${staticTheme.radii.md};
  text-align: right;
  transition: background ${staticTheme.transitions.fast}, border-color ${staticTheme.transitions.fast};
  border: 1px solid transparent;

  ${({ $active }) =>
    $active
      ? `
    background: rgba(200, 148, 42, 0.12);
    border-color: rgba(200, 148, 42, 0.2);
  `
      : `
    &:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
  `}
`

const SA_ItemColor = styled.span`
  width: 4px;
  height: 26px;
  border-radius: ${staticTheme.radii.full};
  flex-shrink: 0;
`

const SA_ItemBody = styled.div`
  flex: 1;
  min-width: 0;
`

const SA_ItemTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 11px;
  color: ${staticTheme.colors.slate[200]};
`

const SA_ItemMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 10px;
  color: ${staticTheme.colors.slate[500]};
`

const SA_ItemCity = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
`

const SA_ItemPrice = styled.span`
  font-weight: 700;
  color: ${staticTheme.colors.gold};
`

const SA_ItemRoi = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: ${staticTheme.colors.emerald};
`

const SA_ItemStatus = styled.span`
  font-size: 10px;
  font-weight: 600;
`

const SA_ArrowIcon = styled(ArrowLeft)`
  width: 12px;
  height: 12px;
  color: ${staticTheme.colors.slate[500]};
  opacity: 0.7;
`

const SA_Hint = styled.div`
  margin-top: 0.25rem;
  padding: 0.5rem 0.25rem 0.25rem;
  font-size: 10px;
  color: ${staticTheme.colors.slate[500]};
  text-align: center;

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    padding: 0 4px;
    margin: 0 2px;
    border-radius: ${staticTheme.radii.sm};
    background: rgba(255, 255, 255, 0.08);
    color: ${staticTheme.colors.slate[300]};
    font-size: 9px;
  }
`

const SA_EmptyState = styled.div`
  padding: 1.25rem 1rem;
  text-align: center;
  color: ${staticTheme.colors.slate[400]};
`

const SA_EmptyEmoji = styled.div`
  font-size: 18px;
  margin-bottom: 0.25rem;
`

const SA_EmptyTitle = styled.div`
  font-size: 11px;
  font-weight: 600;
`

const SA_EmptySubtitle = styled.div`
  margin-top: 0.25rem;
  font-size: 9px;
  color: ${staticTheme.colors.slate[500]};
`

const SA_Highlight = styled.span`
  color: ${staticTheme.colors.gold};
  font-weight: 600;
`

// ─── Component ───────────────────────────────────────────────────────────

export function SearchAutocomplete({
  value,
  onChange,
  plots = [],
  onSelectPlot,
  placeholder,
}: SearchAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const MAX_SUGGESTIONS = 6
  const suggestions = useMemo(() => {
    if (!value || value.length < 1) return []
    const q = value.toLowerCase()
    const results: SA_Plot[] = []

    const slashMatch = q.match(/^(\d{3,6})\s*\/\s*(\d{1,5})$/)
    const gushMatch = q.match(/\u05D2\u05D5\u05E9\s*(\d{3,6})/)
    const parcelMatch = q.match(/(?:\u05D7\u05DC\u05E7\u05D4|\u05D7\u05DC['\u05F3])\s*(\d{1,5})/)

    if (slashMatch || (gushMatch && parcelMatch)) {
      const targetBlock = slashMatch ? slashMatch[1] : gushMatch ? gushMatch[1] : null
      const targetParcel = slashMatch ? slashMatch[2] : parcelMatch ? parcelMatch[1] : null
      for (let i = 0; i < plots.length; i += 1) {
        if (results.length >= MAX_SUGGESTIONS) break
        const p = plots[i]
        const bn = (p.block_number ?? p.blockNumber ?? '').toString()
        const num = (p.number ?? '').toString()
        const blockMatch = !targetBlock || bn === targetBlock
        const parcelMatchOk = !targetParcel || num === targetParcel
        if (blockMatch && parcelMatchOk) results.push(p)
      }
    } else if (gushMatch) {
      const targetBlock = gushMatch[1]
      for (let i = 0; i < plots.length; i += 1) {
        if (results.length >= MAX_SUGGESTIONS) break
        const bn = (plots[i].block_number ?? plots[i].blockNumber ?? '').toString()
        if (bn === targetBlock) results.push(plots[i])
      }
    } else if (parcelMatch) {
      const targetParcel = parcelMatch[1]
      for (let i = 0; i < plots.length; i += 1) {
        if (results.length >= MAX_SUGGESTIONS) break
        const num = (plots[i].number ?? '').toString()
        if (num === targetParcel) results.push(plots[i])
      }
    } else {
      for (let i = 0; i < plots.length; i += 1) {
        if (results.length >= MAX_SUGGESTIONS) break
        const p = plots[i]
        const bn = (p.block_number ?? p.blockNumber ?? '').toString()
        const num = (p.number ?? '').toString()
        const city = (p.city ?? '').toLowerCase()
        const desc = (p.description ?? '').toLowerCase()
        if (bn.includes(q) || num.includes(q) || city.includes(q) || desc.includes(q)) {
          results.push(p)
        }
      }
    }

    return results
  }, [value, plots])

  const hasQuery = value && value.length >= 1

  const recentSearches = useMemo(() => {
    if (!isFocused || hasQuery) return []
    try {
      return JSON.parse(localStorage.getItem('landmap_recent_searches') || '[]').slice(0, 3)
    } catch (err) {
      return []
    }
  }, [isFocused, hasQuery])

  const recentlyViewedPlots = useMemo(() => {
    if (!isFocused || hasQuery || plots.length === 0) return []
    try {
      const ids = JSON.parse(localStorage.getItem('landmap_recently_viewed') || '[]').slice(0, 4)
      if (ids.length === 0) return []
      return ids.map((id: number | string) => plots.find(p => p.id === id)).filter(Boolean) as SA_Plot[]
    } catch (err) {
      return []
    }
  }, [isFocused, hasQuery, plots])

  const popularPlots = useMemo(() => {
    if (!isFocused || hasQuery || plots.length === 0) return []
    const remaining = 4 - recentlyViewedPlots.length
    if (remaining <= 0) return []
    const recentIds = new Set(recentlyViewedPlots.map(p => p.id))
    return [...plots]
      .filter(p => !recentIds.has(p.id) && (p.views ?? 0) > 0)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, remaining)
  }, [isFocused, hasQuery, plots, recentlyViewedPlots])

  const { data: trendingRaw = [] } = useTrendingSearches()
  const trendingSearches = useMemo(() => {
    if (!isFocused || hasQuery) return []
    const recentSet = new Set(recentSearches.map((s: string) => s.toLowerCase()))
    return trendingRaw.filter((s: string) => !recentSet.has(s.toLowerCase())).slice(0, 3)
  }, [isFocused, hasQuery, trendingRaw, recentSearches])

  const showFocusMenu =
    isFocused &&
    !hasQuery &&
    (recentSearches.length > 0 ||
      trendingSearches.length > 0 ||
      recentlyViewedPlots.length > 0 ||
      popularPlots.length > 0)

  const saveRecentSearch = useCallback((query: string) => {
    try {
      const recent = JSON.parse(localStorage.getItem('landmap_recent_searches') || '[]')
      const updated = [query, ...recent.filter((q: string) => q !== query)].slice(0, 5)
      localStorage.setItem('landmap_recent_searches', JSON.stringify(updated))
    } catch (err) {
      return
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setHighlightIndex(-1)
  }, [value])

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined
      if (item) item.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isFocused) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
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
    },
    [isFocused, highlightIndex, suggestions, onSelectPlot, saveRecentSearch, value]
  )

  const handleSelect = useCallback(
    (plot: SA_Plot) => {
      if (value) saveRecentSearch(value)
      onSelectPlot(plot)
      setIsFocused(false)
    },
    [onSelectPlot, value, saveRecentSearch]
  )

  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <SA_Highlight>{text.slice(idx, idx + query.length)}</SA_Highlight>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <SA_Wrap ref={wrapRef}>
      <SA_InputWrap $open={(isFocused && hasQuery) || showFocusMenu}>
        <SA_SearchIcon />
        <SA_SearchInput
          ref={inputRef}
          type="text"
          placeholder={placeholder || '\u05D7\u05D9\u05E4\u05D5\u05E9 \u05D2\u05D5\u05E9, \u05D7\u05DC\u05E7\u05D4, \u05E2\u05D9\u05E8... (Ctrl+K)'}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          role="combobox"
          aria-expanded={(isFocused && hasQuery) || showFocusMenu}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={isFocused ? 'search-autocomplete-listbox' : undefined}
          aria-activedescendant={
            highlightIndex >= 0 && hasQuery && suggestions[highlightIndex]
              ? `search-option-${suggestions[highlightIndex].id}`
              : undefined
          }
        />
        {value && (
          <SA_ClearButton
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
          >
            <X size={12} />
          </SA_ClearButton>
        )}
      </SA_InputWrap>

      {showFocusMenu && (
        <SA_Dropdown role="listbox" ref={listRef}>
          {recentSearches.length > 0 && (
            <>
              <SA_Header>
                <History size={12} />
                <span>{'\u05D7\u05D9\u05E4\u05D5\u05E9\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD'}</span>
              </SA_Header>
              {recentSearches.map((query: string, i: number) => (
                <SA_ItemButton
                  key={`search-${i}`}
                  onClick={() => {
                    onChange(query)
                    setIsFocused(true)
                  }}
                  role="option"
                  aria-selected={false}
                >
                  <Search size={12} color={staticTheme.colors.slate[500]} />
                  <span style={{ fontSize: '11px', color: staticTheme.colors.slate[300], flex: 1 }}>
                    {query}
                  </span>
                  <SA_ArrowIcon />
                </SA_ItemButton>
              ))}
            </>
          )}

          {trendingSearches.length > 0 && (
            <>
              <SA_Header>
                <Flame size={12} color={staticTheme.colors.orange} />
                <span>{'\u05D7\u05D9\u05E4\u05D5\u05E9\u05D9\u05DD \u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9\u05D9\u05DD'}</span>
              </SA_Header>
              {trendingSearches.map((query: string, i: number) => (
                <SA_ItemButton
                  key={`trend-${i}`}
                  onClick={() => {
                    onChange(query)
                    setIsFocused(true)
                  }}
                  role="option"
                  aria-selected={false}
                >
                  <TrendingUp size={12} color={staticTheme.colors.orange} />
                  <span style={{ fontSize: '11px', color: staticTheme.colors.slate[300], flex: 1 }}>
                    {query}
                  </span>
                  <SA_ArrowIcon />
                </SA_ItemButton>
              ))}
            </>
          )}

          {recentlyViewedPlots.length > 0 && (
            <>
              <SA_Header>
                <Eye size={12} />
                <span>{'\u05E0\u05E6\u05E4\u05D5 \u05DC\u05D0\u05D7\u05E8\u05D5\u05E0\u05D4'}</span>
              </SA_Header>
              {recentlyViewedPlots.map(plot => {
                const color = statusColors[plot.status as keyof typeof statusColors]
                const price = plot.total_price ?? plot.totalPrice
                const blockNum = (plot.block_number ?? plot.blockNumber ?? '').toString()

                return (
                  <SA_ItemButton
                    key={`rv-${plot.id}`}
                    onClick={() => {
                      onSelectPlot(plot)
                      setIsFocused(false)
                    }}
                    role="option"
                    aria-selected={false}
                  >
                    <SA_ItemColor style={{ background: color }} />
                    <SA_ItemBody>
                      <SA_ItemTitle>
                        <span>{'\u05D2\u05D5\u05E9'} {blockNum} | {'\u05D7\u05DC\u05E7\u05D4'} {plot.number}</span>
                      </SA_ItemTitle>
                      <SA_ItemMeta>
                        <SA_ItemCity>
                          <MapPin size={10} />
                          {plot.city}
                        </SA_ItemCity>
                        <SA_ItemPrice>{formatPriceShort(price)}</SA_ItemPrice>
                      </SA_ItemMeta>
                    </SA_ItemBody>
                    <SA_ArrowIcon size={14} />
                  </SA_ItemButton>
                )
              })}
            </>
          )}

          {popularPlots.length > 0 && (
            <>
              <SA_Header>
                <TrendingUp size={12} />
                <span>{'\u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9\u05D9\u05DD'}</span>
              </SA_Header>
              {popularPlots.map(plot => {
                const color = statusColors[plot.status as keyof typeof statusColors]
                const price = plot.total_price ?? plot.totalPrice
                const blockNum = (plot.block_number ?? plot.blockNumber ?? '').toString()

                return (
                  <SA_ItemButton
                    key={`pop-${plot.id}`}
                    onClick={() => {
                      onSelectPlot(plot)
                      setIsFocused(false)
                    }}
                    role="option"
                    aria-selected={false}
                  >
                    <SA_ItemColor style={{ background: color }} />
                    <SA_ItemBody>
                      <SA_ItemTitle>
                        <span>{'\u05D2\u05D5\u05E9'} {blockNum} | {'\u05D7\u05DC\u05E7\u05D4'} {plot.number}</span>
                        <span style={{ fontSize: '8px', color: staticTheme.colors.purple }}>{'\uD83D\uDC41'} {plot.views}</span>
                      </SA_ItemTitle>
                      <SA_ItemMeta>
                        <SA_ItemCity>
                          <MapPin size={10} />
                          {plot.city}
                        </SA_ItemCity>
                        <SA_ItemPrice>{formatPriceShort(price)}</SA_ItemPrice>
                      </SA_ItemMeta>
                    </SA_ItemBody>
                    <SA_ArrowIcon size={14} />
                  </SA_ItemButton>
                )
              })}
            </>
          )}

          <SA_Hint>
            <span>{'\u05D4\u05E7\u05DC\u05D3 \u05DC\u05D7\u05D9\u05E4\u05D5\u05E9 \u05D2\u05D5\u05E9, \u05D7\u05DC\u05E7\u05D4 \u05D0\u05D5 \u05E2\u05D9\u05E8'}</span>
          </SA_Hint>
        </SA_Dropdown>
      )}

      {hasQuery && isFocused && (
        <SA_Dropdown role="listbox" id="search-autocomplete-listbox" aria-label={'\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D7\u05D9\u05E4\u05D5\u05E9'} ref={listRef}>
          {suggestions.length === 0 ? (
            <SA_EmptyState>
              <SA_EmptyEmoji>{'\uD83D\uDD0D'}</SA_EmptyEmoji>
              <SA_EmptyTitle>{'\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05E2\u05D1\u05D5\u05E8'} &quot;{value}&quot;</SA_EmptyTitle>
              <SA_EmptySubtitle>{'\u05E0\u05E1\u05D4 \u05DC\u05D7\u05E4\u05E9 \u05DC\u05E4\u05D9 \u05DE\u05E1\u05E4\u05E8 \u05D2\u05D5\u05E9, \u05D7\u05DC\u05E7\u05D4 \u05D0\u05D5 \u05E9\u05DD \u05E2\u05D9\u05E8'}</SA_EmptySubtitle>
            </SA_EmptyState>
          ) : (
            <>
              <SA_Header>
                <Search size={12} />
                <span>{suggestions.length} {'\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA'}</span>
              </SA_Header>
              {suggestions.map((plot, i) => {
                const color = statusColors[plot.status as keyof typeof statusColors]
                const price = plot.total_price ?? plot.totalPrice
                const projValue = plot.projected_value ?? plot.projectedValue
                const roi = price ? Math.round(((projValue ?? 0) - price) / price * 100) : 0
                const blockNum = (plot.block_number ?? plot.blockNumber ?? '').toString()
                const readiness = plot.readiness_estimate ?? plot.readinessEstimate
                const isHighlighted = i === highlightIndex

                return (
                  <SA_ItemButton
                    key={plot.id}
                    id={`search-option-${plot.id}`}
                    $active={isHighlighted}
                    onClick={() => handleSelect(plot)}
                    onMouseEnter={() => setHighlightIndex(i)}
                    role="option"
                    aria-selected={isHighlighted}
                  >
                    <SA_ItemColor style={{ background: color }} />
                    <SA_ItemBody>
                      <SA_ItemTitle>
                        <span>
                          {'\u05D2\u05D5\u05E9'} {highlightMatch(blockNum, value)} | {'\u05D7\u05DC\u05E7\u05D4'}{' '}
                          {highlightMatch((plot.number ?? '').toString(), value)}
                        </span>
                        <SA_ItemStatus style={{ color }}>
                          {statusLabels[plot.status as keyof typeof statusLabels]}
                        </SA_ItemStatus>
                      </SA_ItemTitle>
                      <SA_ItemMeta>
                        <SA_ItemCity>
                          <MapPin size={10} />
                          {highlightMatch(plot.city || '', value)}
                        </SA_ItemCity>
                        <SA_ItemPrice>{formatPriceShort(price)}</SA_ItemPrice>
                        <SA_ItemRoi>
                          <TrendingUp size={10} />
                          +{roi}%
                        </SA_ItemRoi>
                        {readiness && (
                          <SA_ItemCity>
                            <Clock size={10} />
                            {readiness}
                          </SA_ItemCity>
                        )}
                      </SA_ItemMeta>
                    </SA_ItemBody>
                    <SA_ArrowIcon size={14} />
                  </SA_ItemButton>
                )
              })}
              <SA_Hint>
                <kbd>{'\u2191'}</kbd>
                <kbd>{'\u2193'}</kbd> {'\u05E0\u05D9\u05D5\u05D5\u05D8'} {'\u00B7'} <kbd>Enter</kbd> {'\u05D1\u05D7\u05D9\u05E8\u05D4'} {'\u00B7'} <kbd>Esc</kbd> {'\u05E1\u05D2\u05D9\u05E8\u05D4'}
              </SA_Hint>
            </>
          )}
        </SA_Dropdown>
      )}
    </SA_Wrap>
  )
}
