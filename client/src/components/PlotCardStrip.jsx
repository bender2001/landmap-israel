import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { MapPin, Clock, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Ruler, GitCompareArrows, Share2, Heart, Clipboard, Check } from 'lucide-react'
import PriceSparkline from './ui/PriceSparkline'
import ZoningProgressBar from './ui/ZoningProgressBar'
import CardImageCarousel from './ui/CardImageCarousel'
import { statusColors, statusLabels } from '../utils/constants'
import { formatPriceShort, formatCurrency, calcInvestmentScore, getScoreLabel, getInvestmentGrade, formatRelativeTime, getFreshnessColor, calcCAGR, calcMonthlyPayment, formatMonthlyPayment, calcDemandVelocity, calcBestInCategory, calcBuildableValue, plotCenter, plotNavigateUrl, haversineKm, formatDistanceKm } from '../utils/formatters'
import { calcTransactionCosts } from '../utils/plot'
import { usePrefetchPlot } from '../hooks/usePlots'
import { useAreaAverages } from '../hooks/useAreaAverages'
import { whatsappShareLink, useNativeShare, buildPlotShareData } from '../utils/config'
import { useDragScroll } from '../hooks/useDragScroll'
import { useViewportPrefetch } from '../hooks/useViewportPrefetch'

/**
 * Compute price-per-sqm percentile for each plot relative to all plots.
 * Returns a Map<plotId, number> where number is 0-100 percentile.
 * Used by the MarketPositionDot to show where each plot sits in the price distribution.
 */
function usePricePercentiles(plots) {
  return useMemo(() => {
    if (!plots || plots.length < 3) return new Map()
    // Collect price/sqm for all plots with valid data
    const entries = []
    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0 && size > 0) {
        entries.push({ id: p.id, ppsqm: price / size })
      }
    }
    if (entries.length < 3) return new Map()
    // Sort by price/sqm ascending
    entries.sort((a, b) => a.ppsqm - b.ppsqm)
    const result = new Map()
    for (let i = 0; i < entries.length; i++) {
      result.set(entries[i].id, Math.round((i / (entries.length - 1)) * 100))
    }
    return result
  }, [plots])
}

/**
 * MarketPositionDot — tiny gradient bar with a dot showing where a plot's price/sqm
 * sits relative to all plots. Green = cheap, Gold = mid, Red = expensive.
 * Gives instant market context without opening the sidebar.
 */
function MarketPositionDot({ percentile }) {
  if (percentile == null) return null
  const label = percentile <= 25 ? 'זול' : percentile <= 50 ? 'מתחת לממוצע' : percentile <= 75 ? 'מעל הממוצע' : 'יקר'
  return (
    <div
      className="flex items-center gap-1 mt-0.5"
      title={`מיקום בשוק: ${label} (${percentile}% מהחלקות זולות יותר)`}
    >
      <span className="text-[7px] text-slate-600">זול</span>
      <div className="relative w-14 h-1.5 rounded-full overflow-hidden bg-white/5">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #22C55E40, #F59E0B40, #EF444440)',
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-white/40 shadow-sm transition-all duration-500"
          style={{
            left: `calc(${percentile}% - 4px)`,
            background: percentile <= 30 ? '#22C55E' : percentile <= 70 ? '#F59E0B' : '#EF4444',
          }}
        />
      </div>
      <span className="text-[7px] text-slate-600">יקר</span>
    </div>
  )
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

/**
 * PlotShareButtons — uses native Web Share API on mobile (opens system share sheet
 * with WhatsApp, Telegram, Messages, etc. — like Madlan/Airbnb). Falls back to
 * individual WhatsApp + Telegram buttons on desktop where Web Share isn't supported.
 */
const PlotShareButtons = memo(function PlotShareButtons({ plot, blockNum, price, roi }) {
  const { isSupported, share } = useNativeShare()

  if (isSupported) {
    return (
      <div className="plot-card-share-group">
        <button
          onClick={async (e) => {
            e.stopPropagation()
            const data = buildPlotShareData(plot)
            const shared = await share(data)
            if (!shared) {
              // Fallback: copy link to clipboard
              try {
                await navigator.clipboard.writeText(data.url)
              } catch {}
            }
          }}
          className="plot-card-share-btn"
          title="שתף חלקה"
        >
          <Share2 className="w-3 h-3" />
        </button>
      </div>
    )
  }

  // Desktop fallback: separate WhatsApp + Telegram buttons
  return (
    <div className="plot-card-share-group">
      <button
        onClick={(e) => {
          e.stopPropagation()
          const data = buildPlotShareData(plot)
          window.open(whatsappShareLink(data.text), '_blank')
        }}
        className="plot-card-share-btn"
        title="שתף ב-WhatsApp"
      >
        <Share2 className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          const data = buildPlotShareData(plot)
          window.open(`https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`, '_blank')
        }}
        className="plot-card-share-btn plot-card-share-tg"
        title="שתף בטלגרם"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      </button>
    </div>
  )
})

/**
 * QuickCopyButton — one-click clipboard copy of plot essentials.
 * Copies: "גוש X חלקה Y · City · ₪Price · +ROI%"
 * 
 * Investors constantly need to paste plot info into WhatsApp, email, or notes.
 * The full share flow (WhatsApp/Telegram) is overkill for a quick text paste.
 * This button gives instant clipboard access — a pattern Google Maps uses
 * for addresses and coordinates. No Israeli RE competitor has this.
 */
const QuickCopyButton = memo(function QuickCopyButton({ plot }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback((e) => {
    e.stopPropagation()
    const blockNum = plot.block_number ?? plot.blockNumber
    const price = plot.total_price ?? plot.totalPrice ?? 0
    const proj = plot.projected_value ?? plot.projectedValue ?? 0
    const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
    const dunam = sizeSqM > 0 ? (sizeSqM / 1000).toFixed(1) : '?'

    const text = `גוש ${blockNum} חלקה ${plot.number} · ${plot.city} · ${formatPriceShort(price)} · ${dunam} דונם · +${roi}% ROI`

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }, [plot])

  return (
    <button
      onClick={handleCopy}
      className={`plot-card-copy-btn ${copied ? 'is-copied' : ''}`}
      title={copied ? 'הועתק!' : 'העתק פרטי חלקה'}
      aria-label={copied ? 'הועתק ללוח' : 'העתק פרטי חלקה ללוח'}
    >
      {copied ? <Check className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
    </button>
  )
})

const PlotCardItem = memo(function PlotCardItem({ plot, isSelected, isCompared, isFavorite, wasViewed, areaAvgPsm, onSelectPlot, onToggleCompare, onToggleFavorite, prefetchPlot, priceChange, pricePercentile, categoryBadges, distanceKm, imagePriority = false }) {
  // Viewport-based prefetching — loads plot detail into React Query cache when the card
  // scrolls into (or near) the visible area. On mobile, users scroll and tap without
  // hovering, so this ensures data is ready before the click. Skips if already selected
  // (data already loaded). Uses 200px rootMargin to prefetch slightly ahead of the viewport.
  const viewportRef = useViewportPrefetch(
    () => prefetchPlot(plot.id),
    { rootMargin: '200px', skip: isSelected }
  )
  const color = statusColors[plot.status]
  const price = plot.total_price ?? plot.totalPrice
  const projValue = plot.projected_value ?? plot.projectedValue
  // Prefer server-computed ROI when available (saves client Math on every card render)
  const roi = plot._roi ?? (price ? Math.round((projValue - price) / price * 100) : 0)
  const blockNum = plot.block_number ?? plot.blockNumber
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
  const readiness = plot.readiness_estimate ?? plot.readinessEstimate
  const pricePerDunam = sizeSqM > 0 ? formatPriceShort(Math.round(price / sizeSqM * 1000)) : null

  // Demand velocity — views/day metric for urgency signaling
  const demandVelocity = useMemo(() => calcDemandVelocity(plot), [plot])

  // Freshness & popularity badges (like Madlan/Yad2 "חדש!" and "פופולרי")
  // Prefer server-computed _daysOnMarket when available to avoid redundant Date math
  const createdAt = plot.created_at ?? plot.createdAt
  const daysSinceCreated = plot._daysOnMarket ?? (createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)) : Infinity)
  const isNew = daysSinceCreated <= 7
  const viewCount = plot.views ?? 0
  const isHot = viewCount >= 10
  const isTrending = viewCount >= 5 && viewCount < 10

  return (
    <div
      ref={viewportRef}
      data-plot-id={plot.id}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelectPlot(plot)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPlot(plot) } }}
      onMouseEnter={() => prefetchPlot(plot.id)}
      onFocus={() => prefetchPlot(plot.id)}
      className={`plot-card-mini ${isSelected ? 'plot-card-mini-selected' : ''} ${isCompared ? 'plot-card-mini-compared' : ''} ${plot.status === 'SOLD' ? 'plot-card-mini-sold' : ''}`}
      style={{ '--card-color': color }}
      aria-label={`${plot.status === 'SOLD' ? 'נמכר — ' : ''}גוש ${blockNum} חלקה ${plot.number}, ${plot.city}, ${formatPriceShort(price)}, תשואה +${roi}%`}
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
      {/* Sold overlay — like Madlan's distinctive "נמכר" diagonal banner */}
      {plot.status === 'SOLD' && (
        <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-navy/40" />
          <span className="relative px-3 py-1 text-[10px] font-black tracking-wider text-red-300 bg-red-500/25 border border-red-500/30 rounded-lg backdrop-blur-sm -rotate-12 shadow-lg">
            נמכר
          </span>
        </div>
      )}
      {/* Image carousel — swipeable multi-image thumbnail like Madlan/Airbnb */}
      <CardImageCarousel
        images={plot.plot_images}
        blockNum={blockNum}
        color={color}
        isCompared={isCompared}
        priority={imagePriority}
      />

      {/* Quick share — native share sheet (mobile) or WhatsApp/Telegram fallback (desktop) */}
      <PlotShareButtons plot={plot} blockNum={blockNum} price={price} roi={roi} />

      {/* Quick copy — one-click clipboard copy of plot essentials.
          Investors need to paste plot info into WhatsApp/email/notes constantly.
          Like Google Maps' "copy address" — instant and practical. */}
      <QuickCopyButton plot={plot} />

      {/* Navigate to plot — opens Google Maps/Waze directions.
          Critical for the investor workflow: browse cards → visit plot in person.
          Like Madlan/Yad2's "הנחיות הגעה" but accessible directly from the card strip,
          not just the popup. Mobile users browse via cards, not map popups. */}
      {(() => {
        const navUrl = plotNavigateUrl(plot.coordinates)
        if (!navUrl) return null
        return (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="plot-card-navigate-btn"
            onClick={(e) => e.stopPropagation()}
            title="נווט לחלקה (Google Maps)"
            aria-label="נווט לחלקה"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
          </a>
        )
      })()}

      {/* Favorite toggle — like Madlan/Yad2's heart on every listing card.
          Allows one-click save without opening the sidebar. */}
      {onToggleFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(plot.id) }}
          className={`plot-card-favorite-btn ${isFavorite ? 'is-active' : ''}`}
          title={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          aria-label={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          aria-pressed={isFavorite}
        >
          <Heart className={`w-3.5 h-3.5 transition-transform ${isFavorite ? 'fill-current scale-110' : ''}`} />
        </button>
      )}

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
          {/* Distance from user — shown when geolocation is active (like Madlan/Yad2's proximity indicator) */}
          {distanceKm != null && (
            <span
              className="text-[8px] text-blue-400/80 font-medium whitespace-nowrap"
              title={`${distanceKm.toFixed(1)} ק״מ ממיקומך`}
            >
              📍 {formatDistanceKm(distanceKm)}
            </span>
          )}
          {(() => {
            // Prefer server-computed score when available (reduces client CPU)
            const score = plot._investmentScore ?? calcInvestmentScore(plot)
            const { grade, color } = getInvestmentGrade(score)
            return (
              <span
                className="plot-card-mini-score"
                style={{ color, background: `${color}15`, borderColor: `${color}30` }}
                title={`דירוג השקעה: ${grade} (${score}/10)`}
              >
                {plot._grade || grade}
              </span>
            )
          })()}
          {/* Area market trend — shows if the city is trending up/down based on 30-day price snapshots.
              Like Madlan's area arrows — gives instant market context without opening area details. */}
          {plot._marketTrend && plot._marketTrend.direction !== 'stable' && (
            <span
              className={`text-[7px] font-bold ${
                plot._marketTrend.direction === 'up'
                  ? 'text-emerald-400/80'
                  : 'text-red-400/80'
              }`}
              title={`מגמת אזור ${plot.city}: ${plot._marketTrend.direction === 'up' ? 'עלייה' : 'ירידה'} ${Math.abs(plot._marketTrend.changePct)}% ב-30 יום`}
            >
              {plot._marketTrend.direction === 'up' ? '📈' : '📉'} {plot._marketTrend.changePct > 0 ? '+' : ''}{plot._marketTrend.changePct}%
            </span>
          )}
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

        {/* "Best in category" badges — highlight top deals in filtered results */}
        {categoryBadges && categoryBadges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5 mb-0.5">
            {categoryBadges.map((badge, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 px-1.5 py-[1px] text-[7px] font-black rounded-md leading-none"
                style={{
                  background: `${badge.color}15`,
                  border: `1px solid ${badge.color}30`,
                  color: badge.color,
                }}
                title={badge.label}
              >
                <span>{badge.emoji}</span>
                <span>{badge.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Zoning pipeline progress — compact regulatory stage tracker */}
        {(() => {
          const zoningStage = plot.zoning_stage ?? plot.zoningStage
          if (!zoningStage) return null
          return <ZoningProgressBar currentStage={zoningStage} variant="compact" className="mt-0.5" />
        })()}

        {/* Risk level badge — server-computed investment risk indicator.
            Like credit rating agencies' risk grades — gives instant risk context.
            Neither Madlan nor Yad2 surface risk assessment; this is a pro-investor feature.
            Uses server-side _riskLevel to avoid expensive client computation. */}
        {plot._riskLevel && plot._riskLevel !== 'low' && (
          <div
            className="flex items-center gap-1 mt-0.5 text-[8px] font-medium"
            title={plot._riskFactors?.length > 0 ? `גורמי סיכון: ${plot._riskFactors.join(', ')}` : `סיכון: ${plot._riskScore}/100`}
          >
            {plot._riskLevel === 'medium' && (
              <span className="text-amber-400/80">⚠️ סיכון בינוני</span>
            )}
            {plot._riskLevel === 'high' && (
              <span className="text-orange-400/80">🔶 סיכון גבוה</span>
            )}
            {plot._riskLevel === 'very_high' && (
              <span className="text-red-400/80">🔴 סיכון גבוה מאוד</span>
            )}
          </div>
        )}

        {/* Demand velocity indicator — views/day urgency signal */}
        {demandVelocity && demandVelocity.tier !== 'low' && (
          <div
            className="flex items-center gap-1 mt-0.5 text-[8px] font-medium"
            style={{ color: demandVelocity.color }}
            title={`${demandVelocity.velocity} צפיות/יום`}
          >
            <span>{demandVelocity.emoji}</span>
            <span>{demandVelocity.label}</span>
            <span className="text-[7px] opacity-60">({demandVelocity.velocity}/יום)</span>
          </div>
        )}

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
            {/* Total entry cost — shows real investment required (price + tax + attorney + appraiser).
                Professional investors always think in total entry cost, not just listing price.
                This is a key differentiator vs Madlan/Yad2 which only show listed price. */}
            {(() => {
              if (price <= 0) return null
              const txn = calcTransactionCosts(price)
              return (
                <span
                  className="text-[8px] text-amber-400/60"
                  title={`סה״כ עלות כניסה: ${formatPriceShort(txn.totalWithPurchase)}\nמס רכישה: ${formatPriceShort(txn.purchaseTax)} (6%)\nשכ״ט עו״ד: ${formatPriceShort(txn.attorneyFees)}\nשמאי: ${formatPriceShort(txn.appraiserFee)}`}
                >
                  🔑 כניסה: {formatPriceShort(txn.totalWithPurchase)}
                </span>
              )
            })()}
            {/* Buildable value — shows price per buildable sqm when density data available.
                THE metric professional land investors use for quick deal evaluation. */}
            {(() => {
              const bv = calcBuildableValue(plot)
              if (!bv) return null
              return (
                <span
                  className="text-[8px] text-purple-400/70"
                  title={`${bv.estimatedUnits} יח׳ דיור · ${formatPriceShort(bv.pricePerUnit)}/יח׳ · ${bv.totalBuildableArea.toLocaleString()} מ״ר בנוי`}
                >
                  🏢 {formatPriceShort(bv.pricePerBuildableSqm)}/מ״ר בנוי
                </span>
              )
            })()}
            <MarketPositionDot percentile={pricePercentile} />
          </div>
          <div className="plot-card-mini-tags">
            <span className="plot-card-mini-roi">+{roi}%</span>
            {(() => {
              // Prefer server-computed _cagr when available (avoids recalculating per card)
              const serverCagr = plot._cagr
              const serverYears = plot._holdingYears
              if (serverCagr != null && serverCagr > 0) {
                return (
                  <span className="plot-card-mini-cagr" title={`תשואה שנתית על בסיס ${serverYears || '?'} שנים`}>
                    {serverCagr}%/שנה
                  </span>
                )
              }
              // Fallback to client-side calculation (mock data, offline, etc.)
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

export default function PlotCardStrip({ plots, selectedPlot, onSelectPlot, compareIds = [], onToggleCompare, isLoading = false, onClearFilters, getPriceChange, favorites, userLocation }) {
  const prefetchPlot = usePrefetchPlot()
  const areaAverages = useAreaAverages(plots)
  const pricePercentiles = usePricePercentiles(plots)
  // "Best in category" badges — highlight top deals in filtered results (like Madlan's deal indicators)
  const bestInCategory = useMemo(() => calcBestInCategory(plots), [plots])

  // Precompute distances from user — only when geolocation is active.
  // Returns Map<plotId, distanceKm>. Memoized to avoid haversine math on every render.
  const plotDistances = useMemo(() => {
    if (!userLocation) return new Map()
    const result = new Map()
    for (const p of plots) {
      const center = plotCenter(p.coordinates)
      if (center) {
        result.set(p.id, haversineKm(userLocation.lat, userLocation.lng, center.lat, center.lng))
      }
    }
    return result
  }, [plots, userLocation])
  const scrollRef = useRef(null)

  // Desktop drag-to-scroll — like Madlan/Airbnb card strips where you grab and drag.
  // Includes momentum/inertia scrolling and prevents accidental card clicks during drag.
  useDragScroll(scrollRef)

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0) // 0-100%
  const [visibleIndex, setVisibleIndex] = useState(0) // Which card is roughly centered

  // Throttled scroll handler using requestAnimationFrame — prevents 60+ state updates
  // per second during fast scrolling (especially on mobile/trackpad).
  // Without this, every scroll pixel triggers 4 setState calls which cascade re-renders.
  const rafRef = useRef(null)
  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    // RTL: scrollLeft is 0 at start (right edge) and negative when scrolled
    const { scrollLeft, scrollWidth, clientWidth } = el
    // In RTL, scrollLeft starts at 0 and goes negative
    setCanScrollRight(Math.abs(scrollLeft) > 1)
    setCanScrollLeft(Math.abs(scrollLeft) + clientWidth < scrollWidth - 1)

    // Calculate scroll progress percentage for the progress bar
    const maxScroll = scrollWidth - clientWidth
    const progress = maxScroll > 0 ? Math.round((Math.abs(scrollLeft) / maxScroll) * 100) : 0
    setScrollProgress(progress)

    // Estimate which card index is visible (RTL: right-to-left)
    // Average card width ~200px; compute approximate visible center card
    const avgCardWidth = 200
    const approxIdx = Math.round(Math.abs(scrollLeft) / avgCardWidth)
    setVisibleIndex(Math.min(approxIdx, (plots?.length ?? 1) - 1))
  }, [plots?.length])

  const throttledCheckScroll = useCallback(() => {
    if (rafRef.current) return // already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      checkScroll()
    })
  }, [checkScroll])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    checkScroll() // initial measurement (synchronous, no throttle needed)
    el.addEventListener('scroll', throttledCheckScroll, { passive: true })
    window.addEventListener('resize', throttledCheckScroll)
    return () => {
      el.removeEventListener('scroll', throttledCheckScroll)
      window.removeEventListener('resize', throttledCheckScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [plots, checkScroll, throttledCheckScroll])

  // Reset scroll to start when filtered results change (new plots from filter/sort).
  // Without this, after changing a filter the strip stays at its old scroll position —
  // the user might see card #5 instead of the new #1 result. Like Airbnb/Madlan,
  // always show the top result first after a filter change.
  const prevPlotsRef = useRef(plots)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Only reset if the actual plot IDs changed (not just a re-render with same data)
    const prev = prevPlotsRef.current
    if (prev !== plots && plots?.length > 0) {
      // Quick check: if first plot ID changed, the list is different
      const prevFirst = prev?.[0]?.id
      const currFirst = plots[0]?.id
      if (prevFirst !== currFirst) {
        // RTL: scrollLeft=0 is the start (rightmost)
        el.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }
    prevPlotsRef.current = plots
  }, [plots])

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
    const sold = plots.filter(p => p.status === 'SOLD')
    let totalValue = 0
    let totalProjected = 0
    let roiSum = 0
    let totalArea = 0
    let freshCount = 0 // plots added in last 7 days
    const now = Date.now()

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      totalValue += price
      totalProjected += proj
      totalArea += p.size_sqm ?? p.sizeSqM ?? 0
      if (price > 0) roiSum += ((proj - price) / price) * 100
      const created = p.created_at ?? p.createdAt
      if (created && (now - new Date(created).getTime()) < 7 * 86400000) freshCount++
    }

    const avgRoi = Math.round(roiSum / plots.length)
    const totalProfit = totalProjected - totalValue

    // Market temperature — a composite signal of market activity:
    // - High availability ratio (>80%) + fresh listings + high ROI = 🔥 Hot
    // - Moderate = 🟡 Warm
    // - Low activity / mostly sold = ❄️ Cold
    // No Israeli competitor surfaces this as a single indicator.
    const availRatio = plots.length > 0 ? available.length / plots.length : 0
    const freshRatio = plots.length > 0 ? freshCount / plots.length : 0
    const heatScore = (availRatio * 40) + (freshRatio * 30) + (Math.min(avgRoi, 200) / 200 * 30)
    let marketTemp
    if (heatScore >= 55) {
      marketTemp = { emoji: '🔥', label: 'חם', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' }
    } else if (heatScore >= 30) {
      marketTemp = { emoji: '🟡', label: 'פעיל', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' }
    } else {
      marketTemp = { emoji: '❄️', label: 'שקט', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' }
    }

    return { available: available.length, totalValue, totalProjected, totalProfit, avgRoi, totalArea, marketTemp, freshCount }
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
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-navy-light/40 border border-white/5 rounded-xl px-5 py-4 max-w-lg">
          <span className="text-3xl">🔍</span>
          <div className="text-center sm:text-right">
            <div className="text-sm font-semibold text-slate-200">לא נמצאו חלקות מתאימות</div>
            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              נסה להרחיב את הסינון — שנה עיר, הרחב טווח מחיר או הסר חלק מהפילטרים
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
              {onClearFilters && (
                <button
                  onClick={onClearFilters}
                  className="px-3.5 py-1.5 text-[11px] font-semibold text-navy bg-gradient-to-r from-gold to-gold-bright rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all"
                >
                  נקה הכל וצפה בכל החלקות
                </button>
              )}
              <a
                href="/areas"
                className="px-3 py-1.5 text-[11px] font-medium text-slate-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-slate-200 transition-colors"
              >
                עיין באזורים
              </a>
            </div>
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
          {/* Market Temperature — composite market activity indicator.
              Unique to LandMap: neither Madlan nor Yad2 surface a single "market heat" metric.
              Combines availability ratio, listing freshness, and ROI levels. */}
          {stats.marketTemp && (
            <>
              <div className="plot-strip-stat-divider" />
              <div
                className={`plot-strip-stat px-2 py-0.5 rounded-md border ${stats.marketTemp.bg}`}
                title={`שוק ${stats.marketTemp.label} — ${stats.available} זמינות, ${stats.freshCount} חדשות השבוע, ממוצע +${stats.avgRoi}% ROI`}
              >
                <span>{stats.marketTemp.emoji}</span>
                <span className={`font-bold ${stats.marketTemp.color}`}>{stats.marketTemp.label}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Scroll position indicator — shows "X/Y" and progress bar (like Madlan's results counter) */}
      {plots.length > 3 && (
        <div className="absolute top-0.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-navy/80 backdrop-blur-sm border border-white/5 rounded-lg">
            <span className="text-[9px] text-slate-400 font-medium tabular-nums">
              {visibleIndex + 1}/{plots.length}
            </span>
            <div className="w-12 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gold/40 transition-all duration-200"
                style={{ width: `${Math.max(8, scrollProgress)}%` }}
              />
            </div>
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
        {plots.map((plot, index) => (
          <PlotCardItem
            key={plot.id}
            plot={plot}
            isSelected={selectedPlot?.id === plot.id}
            isCompared={compareIds.includes(plot.id)}
            isFavorite={favorites?.isFavorite(plot.id) ?? false}
            wasViewed={recentlyViewed.has(plot.id)}
            areaAvgPsm={areaAverages[plot.city]}
            onSelectPlot={onSelectPlot}
            onToggleCompare={onToggleCompare}
            onToggleFavorite={favorites?.toggle}
            prefetchPlot={prefetchPlot}
            priceChange={getPriceChange ? getPriceChange(plot.id) : null}
            pricePercentile={pricePercentiles.get(plot.id) ?? null}
            categoryBadges={bestInCategory.get(plot.id)?.badges ?? null}
            distanceKm={plotDistances.get(plot.id) ?? null}
            imagePriority={index < 3}
          />
        ))}
      </div>
    </div>
  )
}
