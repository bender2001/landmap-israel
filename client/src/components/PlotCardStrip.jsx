import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { MapPin, Clock, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Ruler, GitCompareArrows, Share2 } from 'lucide-react'
import PriceSparkline from './ui/PriceSparkline'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatCurrency, calcInvestmentScore, getScoreLabel, formatRelativeTime, getFreshnessColor, calcCAGR, calcMonthlyPayment, formatMonthlyPayment } from '../utils/formatters'
import { usePrefetchPlot } from '../hooks/usePlots'
import { whatsappShareLink } from '../utils/config'

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

const PlotCardItem = memo(function PlotCardItem({ plot, isSelected, isCompared, wasViewed, areaAvgPsm, onSelectPlot, onToggleCompare, prefetchPlot, priceChange }) {
  const color = statusColors[plot.status]
  const price = plot.total_price ?? plot.totalPrice
  const projValue = plot.projected_value ?? plot.projectedValue
  const roi = price ? Math.round((projValue - price) / price * 100) : 0
  const blockNum = plot.block_number ?? plot.blockNumber
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  const pricePerDunam = sizeSqM > 0 ? formatPriceShort(Math.round(price / sizeSqM * 1000)) : null

  // Freshness & popularity badges (like Madlan/Yad2 "חדש!" and "פופולרי")
  const createdAt = plot.created_at ?? plot.createdAt
  const daysSinceCreated = createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) : Infinity
  const isNew = daysSinceCreated <= 7
  const viewCount = plot.views ?? 0
  const isHot = viewCount >= 10
  const isTrending = viewCount >= 5 && viewCount < 10

  return (
    <div
      data-plot-id={plot.id}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelectPlot(plot)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPlot(plot) } }}
      onMouseEnter={() => prefetchPlot(plot.id)}
      onFocus={() => prefetchPlot(plot.id)}
      className={`plot-card-mini ${isSelected ? 'plot-card-mini-selected' : ''} ${isCompared ? 'plot-card-mini-compared' : ''}`}
      style={{ '--card-color': color }}
      aria-label={`גוש ${blockNum} חלקה ${plot.number}, ${plot.city}, ${formatPriceShort(price)}, תשואה +${roi}%`}
    >
      {/* Freshness / popularity / trending badges */}
      {(isNew || isHot || isTrending || priceChange) && (
        <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
          {isNew && (
            <span className="px-1.5 py-0.5 text-[8px] font-black rounded-md bg-emerald-500 text-white shadow-sm shadow-emerald-500/40 leading-none">
              חדש!
            </span>
          )}
          {isHot && !isNew && (
            <span className="px-1.5 py-0.5 text-[8px] font-black rounded-md bg-orange-500 text-white shadow-sm shadow-orange-500/40 leading-none">
              🔥 פופולרי
            </span>
          )}
          {isTrending && !isHot && !isNew && (
            <span className="px-1.5 py-0.5 text-[8px] font-black rounded-md bg-purple-500 text-white shadow-sm shadow-purple-500/40 leading-none">
              📈 במגמה
            </span>
          )}
          {priceChange && priceChange.direction === 'down' && (
            <span className="px-1.5 py-0.5 text-[8px] font-black rounded-md bg-green-500 text-white shadow-sm shadow-green-500/40 leading-none">
              ↓ ירד {priceChange.pctChange}%
            </span>
          )}
          {priceChange && priceChange.direction === 'up' && (
            <span className="px-1.5 py-0.5 text-[8px] font-black rounded-md bg-red-500/80 text-white shadow-sm shadow-red-500/40 leading-none">
              ↑ עלה {priceChange.pctChange}%
            </span>
          )}
        </div>
      )}
      {/* Thumbnail image with error fallback — prevents broken image icons */}
      {(() => {
        const images = plot.plot_images
        const thumbUrl = images && images.length > 0 ? images[0].url : null
        if (!thumbUrl) return (
          <div className="plot-card-mini-accent" style={{ background: isCompared ? '#8B5CF6' : color }} />
        )
        return (
          <div className="plot-card-mini-thumb">
            <img
              src={thumbUrl}
              alt={images[0].alt || `גוש ${blockNum}`}
              className="plot-card-mini-thumb-img"
              loading="lazy"
              onError={(e) => {
                // Replace broken image with styled gradient placeholder
                e.target.style.display = 'none'
                const fallback = e.target.parentElement.querySelector('.plot-card-mini-thumb-fallback')
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <div className="plot-card-mini-thumb-fallback" style={{ display: 'none', position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${color}25, ${color}08)`, alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '20px', opacity: 0.5 }}>🏗️</span>
            </div>
            <div className="plot-card-mini-thumb-overlay" />
            <div className="plot-card-mini-accent" style={{ background: isCompared ? '#8B5CF6' : color, position: 'absolute', bottom: 0, left: 0, right: 0 }} />
          </div>
        )
      })()}

      {/* Quick share (WhatsApp) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          const url = `${window.location.origin}/plot/${plot.id}`
          const text = `גוש ${blockNum} חלקה ${plot.number} | ${plot.city}\n${formatPriceShort(price)} · +${roi}% ROI\n${url}`
          window.open(whatsappShareLink(text), '_blank')
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
        <div className="plot-card-mini-header">
          <span className="plot-card-mini-title">
            {wasViewed && !isSelected && <span className="plot-card-viewed-dot" title="נצפה לאחרונה" />}
            גוש {blockNum} | חלקה {plot.number}
          </span>
          <span className="plot-card-mini-status" style={{ background: `${color}20`, color }}>
            {statusLabels[plot.status]}
          </span>
        </div>

        <div className="plot-card-mini-city">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
          <span>{plot.city}</span>
          {(() => {
            const score = calcInvestmentScore(plot)
            const { color } = getScoreLabel(score)
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
          {viewCount > 0 ? (
            <span className="text-[8px] text-indigo-400/60 mr-auto" title={`${viewCount} צפיות`}>
              👁 {viewCount}
            </span>
          ) : (() => {
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

        {/* Deal badge */}
        {(() => {
          if (!areaAvgPsm || sizeSqM <= 0) return null
          const plotPsm = price / sizeSqM
          const diffPct = Math.round(((plotPsm - areaAvgPsm) / areaAvgPsm) * 100)
          if (diffPct >= -3) return null
          return (
            <div className="plot-card-mini-deal">
              🔥 {Math.abs(diffPct)}% מתחת לממוצע
            </div>
          )
        })()}

        <div className="plot-card-mini-footer">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="plot-card-mini-price">{formatPriceShort(price)}</span>
              <PriceSparkline currentPrice={price} projectedValue={projValue} />
            </div>
            {pricePerDunam && <span className="text-[9px] text-slate-500">{pricePerDunam}/דונם</span>}
            {(() => {
              const payment = calcMonthlyPayment(price)
              if (!payment) return null
              return <span className="text-[9px] text-blue-400/70" title={`הון עצמי: ${formatPriceShort(payment.downPayment)} | הלוואה: ${formatPriceShort(payment.loanAmount)}`}>~{formatMonthlyPayment(payment.monthly)}</span>
            })()}
          </div>
          <div className="plot-card-mini-tags">
            <span className="plot-card-mini-roi">+{roi}%</span>
            {(() => {
              const cagrData = calcCAGR(roi, readiness)
              if (!cagrData) return null
              return (
                <span className="plot-card-mini-cagr" title={`תשואה שנתית על בסיס ${cagrData.years} שנים`}>
                  {cagrData.cagr}%/שנה
                </span>
              )
            })()}
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
})

export default function PlotCardStrip({ plots, selectedPlot, onSelectPlot, compareIds = [], onToggleCompare, isLoading = false, onClearFilters, getPriceChange }) {
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

  // Aggregate stats — includes total investment value and projected profit for investor decision-making
  const stats = useMemo(() => {
    if (!plots || plots.length === 0) return null
    const available = plots.filter(p => p.status === 'AVAILABLE')
    let totalValue = 0
    let totalProjected = 0
    let roiSum = 0
    let totalArea = 0

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      totalValue += price
      totalProjected += proj
      totalArea += p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0) roiSum += ((proj - price) / price) * 100
    }

    const avgRoi = Math.round(roiSum / plots.length)
    const totalProfit = totalProjected - totalValue

    return { available: available.length, totalValue, totalProjected, totalProfit, avgRoi, totalArea }
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
        <div className="flex items-center gap-4 bg-navy-light/40 border border-white/5 rounded-xl px-5 py-3">
          <span className="text-2xl">🔍</span>
          <div>
            <div className="text-xs font-medium text-slate-300">לא נמצאו חלקות מתאימות</div>
            <div className="text-[10px] text-slate-500 mt-0.5">נסה להרחיב את טווח המחיר, לשנות עיר, או להסיר סינונים</div>
          </div>
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="flex-shrink-0 px-3 py-1.5 text-[11px] font-medium text-gold bg-gold/10 border border-gold/20 rounded-lg hover:bg-gold/20 transition-colors"
            >
              נקה סינון
            </button>
          )}
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
      {/* Aggregate stats bar — key portfolio metrics for investor decision-making */}
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
          {stats.totalProfit > 0 && (
            <>
              <div className="plot-strip-stat-divider" />
              <div className="plot-strip-stat" title={`שווי נוכחי: ₪${stats.totalValue.toLocaleString()} → צפי: ₪${stats.totalProjected.toLocaleString()}`}>
                <span className="text-emerald-400">💎</span>
                <span>רווח פוטנציאלי ₪{formatPriceShort(stats.totalProfit)}</span>
              </div>
            </>
          )}
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

      {/* Cards — supports ← → arrow key navigation between cards (WCAG listbox pattern) */}
      <div
        ref={scrollRef}
        className="plot-strip-scroll"
        role="listbox"
        aria-label="רשימת חלקות"
        onKeyDown={(e) => {
          // Arrow key navigation within the card strip
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          const focused = document.activeElement
          if (!focused || !focused.hasAttribute('data-plot-id')) return
          e.preventDefault()
          // RTL: ArrowRight = previous, ArrowLeft = next
          const sibling = e.key === 'ArrowLeft'
            ? focused.nextElementSibling
            : focused.previousElementSibling
          if (sibling && sibling.hasAttribute('data-plot-id')) {
            sibling.focus()
            sibling.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
          }
        }}
      >
        {plots.map((plot) => (
          <PlotCardItem
            key={plot.id}
            plot={plot}
            isSelected={selectedPlot?.id === plot.id}
            isCompared={compareIds.includes(plot.id)}
            wasViewed={recentlyViewed.has(plot.id)}
            areaAvgPsm={areaAverages[plot.city]}
            onSelectPlot={onSelectPlot}
            onToggleCompare={onToggleCompare}
            prefetchPlot={prefetchPlot}
            priceChange={getPriceChange ? getPriceChange(plot.id) : null}
          />
        ))}
      </div>
    </div>
  )
}
