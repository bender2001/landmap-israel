import { useMemo, useState, useCallback } from 'react'
import { Trophy, TrendingUp, MapPin, Sparkles, X, ChevronLeft } from 'lucide-react'
import { formatPriceShort, calcInvestmentScore, getScoreLabel, calcCAGR } from '../utils/formatters'
import { statusColors } from '../utils/constants'

/**
 * Deal Spotlight — highlights the best-value plot as a prominent, dismissable banner.
 * Inspired by Madlan's featured listings and Yad2's "הזדמנות!" badges.
 * 
 * Scoring algorithm considers:
 * - Investment score (1-10)
 * - Below-average price per sqm (deal factor)
 * - Freshness (newer listings score higher)
 * - ROI potential
 */
export default function DealSpotlight({ plots, onSelectPlot }) {
  const [isDismissed, setIsDismissed] = useState(false)

  const spotlight = useMemo(() => {
    if (!plots || plots.length < 3) return null

    // Calculate area averages for deal detection
    const avgPriceSqm = (() => {
      let total = 0, count = 0
      for (const p of plots) {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 0
        if (price > 0 && size > 0) { total += price / size; count++ }
      }
      return count > 0 ? total / count : 0
    })()

    // Score each plot
    const scored = plots
      .filter(p => (p.status === 'AVAILABLE') && (p.total_price ?? p.totalPrice ?? 0) > 0)
      .map(p => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        const roi = price > 0 ? ((proj - price) / price) * 100 : 0
        const priceSqm = size > 0 ? price / size : Infinity
        const investScore = calcInvestmentScore(p)

        // Deal factor: how much below average (0-3 points)
        const dealFactor = avgPriceSqm > 0
          ? Math.max(0, Math.min(3, ((avgPriceSqm - priceSqm) / avgPriceSqm) * 10))
          : 0

        // Freshness bonus (0-1 point)
        const createdAt = p.created_at ?? p.createdAt
        const daysOld = createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) : 999
        const freshBonus = daysOld <= 7 ? 1 : daysOld <= 14 ? 0.5 : 0

        // ROI bonus (0-3 points)
        const roiBonus = Math.min(3, roi / 80)

        const totalScore = investScore + dealFactor + freshBonus + roiBonus
        return { ...p, _spotlightScore: totalScore, _roi: roi, _dealPct: Math.round(((avgPriceSqm - priceSqm) / avgPriceSqm) * 100) }
      })
      .sort((a, b) => b._spotlightScore - a._spotlightScore)

    return scored[0] || null
  }, [plots])

  const handleClick = useCallback(() => {
    if (spotlight && onSelectPlot) onSelectPlot(spotlight)
  }, [spotlight, onSelectPlot])

  if (!spotlight || isDismissed) return null
  if (spotlight._dealPct < 5) return null // Only show if actually a deal

  const price = spotlight.total_price ?? spotlight.totalPrice
  const blockNum = spotlight.block_number ?? spotlight.blockNumber
  const readiness = spotlight.readiness_estimate ?? spotlight.readinessEstimate
  const cagrData = calcCAGR(spotlight._roi, readiness)
  const score = calcInvestmentScore(spotlight)
  const { color: scoreColor } = getScoreLabel(score)

  return (
    <div className="fixed bottom-[200px] sm:bottom-[140px] right-4 z-[25] animate-slide-in-right max-w-[280px]">
      <div
        className="relative glass-panel overflow-hidden cursor-pointer group hover:border-gold/40 transition-all"
        onClick={handleClick}
      >
        {/* Shimmer accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent opacity-60" />

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsDismissed(true) }}
          className="absolute top-2 left-2 w-5 h-5 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition opacity-0 group-hover:opacity-100"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>

        <div className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold/20 to-amber-500/20 border border-gold/30 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-gold" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-gold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                הזדמנות השבוע
              </div>
              <div className="text-[9px] text-slate-500">{spotlight._dealPct}% מתחת לממוצע</div>
            </div>
          </div>

          {/* Plot info */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-slate-200">
              גוש {blockNum} | חלקה {spotlight.number}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: scoreColor, background: `${scoreColor}15` }}>
              {score}/10
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
            <MapPin className="w-2.5 h-2.5" />
            <span>{spotlight.city}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2.5 py-1.5">
            <div className="text-center">
              <div className="text-[9px] text-slate-500">מחיר</div>
              <div className="text-xs font-bold text-gold">{formatPriceShort(price)}</div>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="text-center">
              <div className="text-[9px] text-slate-500">תשואה</div>
              <div className="text-xs font-bold text-emerald-400">+{Math.round(spotlight._roi)}%</div>
            </div>
            {cagrData && (
              <>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center">
                  <div className="text-[9px] text-slate-500">CAGR</div>
                  <div className="text-xs font-bold text-blue-400">{cagrData.cagr}%</div>
                </div>
              </>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-gold/80 group-hover:text-gold transition">
            <span>צפה בפרטים</span>
            <ChevronLeft className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
