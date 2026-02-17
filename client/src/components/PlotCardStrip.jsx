import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { MapPin, Clock, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Ruler, GitCompareArrows } from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatCurrency } from '../utils/formatters'

export default function PlotCardStrip({ plots, selectedPlot, onSelectPlot, compareIds = [], onToggleCompare }) {
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // RTL: scrollLeft is 0 at start (right edge) and negative when scrolled
    const { scrollLeft, scrollWidth, clientWidth } = el
    // In RTL, scrollLeft starts at 0 and goes negative
    setCanScrollRight(Math.abs(scrollLeft) > 1)
    setCanScrollLeft(Math.abs(scrollLeft) + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [plots, checkScroll])

  // Scroll to selected card
  useEffect(() => {
    if (!selectedPlot || !scrollRef.current) return
    const card = scrollRef.current.querySelector(`[data-plot-id="${selectedPlot.id}"]`)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedPlot?.id])

  // Aggregate stats
  const stats = useMemo(() => {
    if (!plots || plots.length === 0) return null
    const available = plots.filter(p => p.status === 'AVAILABLE')
    const totalValue = plots.reduce((sum, p) => sum + (p.total_price ?? p.totalPrice ?? 0), 0)
    const avgRoi = plots.reduce((sum, p) => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      return sum + (price > 0 ? ((proj - price) / price) * 100 : 0)
    }, 0) / plots.length
    const totalArea = plots.reduce((sum, p) => sum + (p.size_sqm ?? p.sizeSqM ?? 0), 0)
    return { available: available.length, totalValue, avgRoi: Math.round(avgRoi), totalArea }
  }, [plots])

  // Track recently viewed plots
  useEffect(() => {
    if (!selectedPlot) return
    try {
      const key = 'landmap_recently_viewed'
      const recent = JSON.parse(localStorage.getItem(key) || '[]')
      const updated = [selectedPlot.id, ...recent.filter(id => id !== selectedPlot.id)].slice(0, 20)
      localStorage.setItem(key, JSON.stringify(updated))
    } catch {}
  }, [selectedPlot?.id])

  const recentlyViewed = useMemo(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('landmap_recently_viewed') || '[]'))
    } catch { return new Set() }
  }, [selectedPlot?.id])

  if (!plots || plots.length === 0) return null

  // RTL scroll: positive = scroll left visually (show more to the left)
  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' })
  }

  return (
    <div className="plot-strip-wrapper" dir="rtl">
      {/* Aggregate stats bar */}
      {stats && (
        <div className="plot-strip-stats">
          <div className="plot-strip-stat">
            <BarChart3 className="w-3 h-3 text-gold" />
            <span>{stats.available} זמינות</span>
          </div>
          <div className="plot-strip-stat-divider" />
          <div className="plot-strip-stat">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>ממוצע +{stats.avgRoi}% ROI</span>
          </div>
          <div className="plot-strip-stat-divider" />
          <div className="plot-strip-stat">
            <Ruler className="w-3 h-3 text-blue-400" />
            <span>{(stats.totalArea / 1000).toFixed(1)} דונם סה״כ</span>
          </div>
        </div>
      )}

      {/* Fade edges */}
      <div className="plot-strip-fade-right" />
      <div className="plot-strip-fade-left" />

      {/* Scroll arrows (desktop) */}
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          className="plot-strip-arrow plot-strip-arrow-right hidden sm:flex"
          aria-label="הבא"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          className="plot-strip-arrow plot-strip-arrow-left hidden sm:flex"
          aria-label="הקודם"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Cards */}
      <div
        ref={scrollRef}
        className="plot-strip-scroll"
      >
        {plots.map((plot) => {
          const color = statusColors[plot.status]
          const price = plot.total_price ?? plot.totalPrice
          const projValue = plot.projected_value ?? plot.projectedValue
          const roi = price ? Math.round((projValue - price) / price * 100) : 0
          const blockNum = plot.block_number ?? plot.blockNumber
          const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
          const readiness = plot.readiness_estimate ?? plot.readinessEstimate
          const pricePerDunam = sizeSqM > 0 ? formatPriceShort(Math.round(price / sizeSqM * 1000)) : null
          const isSelected = selectedPlot?.id === plot.id

          const wasViewed = recentlyViewed.has(plot.id)
          const isCompared = compareIds.includes(plot.id)

          return (
            <div
              key={plot.id}
              data-plot-id={plot.id}
              onClick={() => onSelectPlot(plot)}
              className={`plot-card-mini ${isSelected ? 'plot-card-mini-selected' : ''} ${isCompared ? 'plot-card-mini-compared' : ''}`}
              style={{ '--card-color': color }}
            >
              {/* Top color line */}
              <div className="plot-card-mini-accent" style={{ background: isCompared ? '#8B5CF6' : color }} />

              {/* Compare toggle */}
              {onToggleCompare && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleCompare(plot.id) }}
                  className={`plot-card-compare-btn ${isCompared ? 'is-active' : ''}`}
                  title={isCompared ? 'הסר מהשוואה' : 'הוסף להשוואה'}
                >
                  <GitCompareArrows className="w-3 h-3" />
                </button>
              )}

              <div className="plot-card-mini-body">
                {/* Title row */}
                <div className="plot-card-mini-header">
                  <span className="plot-card-mini-title">
                    {wasViewed && !isSelected && <span className="plot-card-viewed-dot" title="נצפה לאחרונה" />}
                    גוש {blockNum} | חלקה {plot.number}
                  </span>
                  <span
                    className="plot-card-mini-status"
                    style={{ background: `${color}20`, color }}
                  >
                    {statusLabels[plot.status]}
                  </span>
                </div>

                {/* City */}
                <div className="plot-card-mini-city">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>{plot.city}</span>
                </div>

                {/* Price + ROI row */}
                <div className="plot-card-mini-footer">
                  <div className="flex flex-col">
                    <span className="plot-card-mini-price">{formatPriceShort(price)}</span>
                    {pricePerDunam && <span className="text-[9px] text-slate-500">{pricePerDunam}/דונם</span>}
                  </div>
                  <div className="plot-card-mini-tags">
                    <span className="plot-card-mini-roi">+{roi}%</span>
                    {readiness && (
                      <span className="plot-card-mini-time">
                        <Clock className="w-2.5 h-2.5" />
                        {readiness}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
