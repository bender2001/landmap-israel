import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { MapPin, Clock, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Ruler, GitCompareArrows, Share2 } from 'lucide-react'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatCurrency, calcInvestmentScore, getScoreLabel, formatRelativeTime, getFreshnessColor } from '../utils/formatters'
import { usePrefetchPlot } from '../hooks/usePlots'

function useAreaAverages(plots) {
  return useMemo(() => {
    if (!plots || plots.length === 0) return {}
    const byCity = {}
    plots.forEach(p => {
      const city = p.city || 'unknown'
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 1
      if (!byCity[city]) byCity[city] = { total: 0, count: 0 }
      byCity[city].total += price / size
      byCity[city].count += 1
    })
    const result = {}
    for (const [city, data] of Object.entries(byCity)) {
      result[city] = Math.round(data.total / data.count)
    }
    return result
  }, [plots])
}

function PlotCardSkeleton() {
  return (
    <div className="plot-card-mini opacity-60 pointer-events-none">
      <div className="plot-card-mini-accent animate-pulse" style={{ background: '#334155' }} />
      <div className="plot-card-mini-body space-y-2">
        <div className="h-3 w-3/4 rounded bg-slate-700/50 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-slate-700/30 animate-pulse" />
        <div className="h-4 w-full rounded bg-slate-700/20 animate-pulse mt-1" />
        <div className="flex justify-between mt-1">
          <div className="h-3 w-16 rounded bg-gold/10 animate-pulse" />
          <div className="h-3 w-10 rounded bg-emerald-500/10 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

export default function PlotCardStrip({ plots, selectedPlot, onSelectPlot, compareIds = [], onToggleCompare, isLoading = false }) {
  const prefetchPlot = usePrefetchPlot()
  const areaAverages = useAreaAverages(plots)
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

  if (isLoading) return (
    <div className="plot-strip-wrapper" dir="rtl">
      <div className="plot-strip-scroll">
        {Array.from({ length: 6 }, (_, i) => <PlotCardSkeleton key={i} />)}
      </div>
    </div>
  )

  if (!plots || plots.length === 0) return (
    <div className="plot-strip-wrapper" dir="rtl">
      <div className="flex items-center justify-center py-4 px-6">
        <div className="flex items-center gap-3 bg-navy-light/40 border border-white/5 rounded-xl px-5 py-3">
          <span className="text-lg">🔍</span>
          <div>
            <div className="text-xs font-medium text-slate-300">לא נמצאו חלקות</div>
            <div className="text-[10px] text-slate-500">נסה לשנות את הסינון</div>
          </div>
        </div>
      </div>
    </div>
  )

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
              onMouseEnter={() => prefetchPlot(plot.id)}
              className={`plot-card-mini ${isSelected ? 'plot-card-mini-selected' : ''} ${isCompared ? 'plot-card-mini-compared' : ''}`}
              style={{ '--card-color': color }}
            >
              {/* Thumbnail image */}
              {(() => {
                const images = plot.plot_images
                const thumbUrl = images && images.length > 0 ? images[0].url : null
                if (!thumbUrl) return (
                  <>
                    <div className="plot-card-mini-accent" style={{ background: isCompared ? '#8B5CF6' : color }} />
                  </>
                )
                return (
                  <div className="plot-card-mini-thumb">
                    <img
                      src={thumbUrl}
                      alt={images[0].alt || `גוש ${blockNum}`}
                      className="plot-card-mini-thumb-img"
                      loading="lazy"
                    />
                    <div className="plot-card-mini-thumb-overlay" />
                    <div className="plot-card-mini-accent" style={{ background: isCompared ? '#8B5CF6' : color, position: 'absolute', bottom: 0, left: 0, right: 0 }} />
                  </div>
                )
              })()}
              {/* Top color line (no-image fallback handled above) */}

              {/* Quick share (WhatsApp) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const url = `${window.location.origin}/plot/${plot.id}`
                  const text = `גוש ${blockNum} חלקה ${plot.number} | ${plot.city}\n${formatPriceShort(price)} · +${roi}% ROI\n${url}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                }}
                className="plot-card-share-btn"
                title="שתף ב-WhatsApp"
              >
                <Share2 className="w-3 h-3" />
              </button>

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

                {/* City + Score + Freshness */}
                <div className="plot-card-mini-city">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>{plot.city}</span>
                  {(() => {
                    const score = calcInvestmentScore(plot)
                    const { label, color } = getScoreLabel(score)
                    return (
                      <span
                        className="plot-card-mini-score"
                        style={{ color, background: `${color}15`, borderColor: `${color}30` }}
                        title={`ציון השקעה: ${score}/10`}
                      >
                        {score}/10
                      </span>
                    )
                  })()}
                  {(() => {
                    const updatedAt = plot.updated_at ?? plot.updatedAt
                    const freshness = formatRelativeTime(updatedAt)
                    if (!freshness) return null
                    const colorClass = getFreshnessColor(updatedAt)
                    return (
                      <span className={`text-[8px] ${colorClass} mr-auto opacity-70`} title={`עודכן ${freshness}`}>
                        {freshness}
                      </span>
                    )
                  })()}
                </div>

                {/* ROI visual bar */}
                <div className="plot-card-mini-roi-bar">
                  <div
                    className="plot-card-mini-roi-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(8, (price / (projValue || 1)) * 100))}%`,
                      background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                    }}
                  />
                  <div
                    className="plot-card-mini-roi-bar-proj"
                    style={{
                      width: '100%',
                      background: 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))',
                    }}
                  />
                  <span className="plot-card-mini-roi-bar-label">{formatPriceShort(price)}</span>
                  <span className="plot-card-mini-roi-bar-target">→ {formatPriceShort(projValue)}</span>
                </div>

                {/* Deal badge — shows when plot is below area average */}
                {(() => {
                  const avgPsm = areaAverages[plot.city]
                  if (!avgPsm || sizeSqM <= 0) return null
                  const plotPsm = price / sizeSqM
                  const diffPct = Math.round(((plotPsm - avgPsm) / avgPsm) * 100)
                  if (diffPct >= -3) return null // only show if meaningfully below
                  return (
                    <div className="plot-card-mini-deal">
                      🔥 {Math.abs(diffPct)}% מתחת לממוצע
                    </div>
                  )
                })()}

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
