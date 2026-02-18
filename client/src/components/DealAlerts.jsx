import { useState, useEffect, useMemo } from 'react'
import { X, TrendingUp, Flame, ChevronLeft } from 'lucide-react'
import { formatPriceShort, formatCurrency, calcInvestmentScore } from '../utils/formatters'
import { statusColors } from '../utils/constants'

/**
 * Smart deal alerts — highlights plots that are significantly below area average
 * or have exceptional ROI. Shows as a slide-in toast on first load.
 * Inspired by Madlan's "הזדמנויות" section.
 */
export default function DealAlerts({ plots, onSelectPlot }) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const deals = useMemo(() => {
    if (!plots || plots.length < 3) return []

    // Calculate area averages by city
    const byCity = {}
    for (const p of plots) {
      const city = p.city || 'unknown'
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 1
      if (price <= 0 || size <= 0) continue
      if (!byCity[city]) byCity[city] = { totalPsm: 0, count: 0 }
      byCity[city].totalPsm += price / size
      byCity[city].count += 1
    }
    const cityAvg = {}
    for (const [city, data] of Object.entries(byCity)) {
      cityAvg[city] = data.totalPsm / data.count
    }

    // Find deals: below average price/sqm OR high investment score
    const hotDeals = plots
      .filter(p => p.status === 'AVAILABLE')
      .map(p => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 1
        const proj = p.projected_value ?? p.projectedValue ?? 0
        if (price <= 0 || size <= 0) return null

        const psm = price / size
        const avg = cityAvg[p.city] || psm
        const diffPct = Math.round(((psm - avg) / avg) * 100)
        const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
        const score = calcInvestmentScore(p)

        // Must be at least 10% below average OR have score >= 8
        if (diffPct > -10 && score < 8) return null

        return {
          plot: p,
          diffPct,
          roi,
          score,
          // Sort priority: biggest discount first, then highest score
          priority: Math.abs(Math.min(diffPct, 0)) + score * 5,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)

    return hotDeals
  }, [plots])

  // Show after a short delay, only once per session
  useEffect(() => {
    if (deals.length === 0) return
    const shown = sessionStorage.getItem('landmap_deals_shown')
    if (shown) return

    const timer = setTimeout(() => {
      setIsVisible(true)
      sessionStorage.setItem('landmap_deals_shown', '1')
    }, 3000)

    return () => clearTimeout(timer)
  }, [deals.length])

  // Auto-cycle through deals
  useEffect(() => {
    if (!isVisible || isDismissed || deals.length <= 1) return
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % deals.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isVisible, isDismissed, deals.length])

  // Auto-dismiss after 15s
  useEffect(() => {
    if (!isVisible || isDismissed) return
    const timer = setTimeout(() => setIsDismissed(true), 15000)
    return () => clearTimeout(timer)
  }, [isVisible, isDismissed])

  if (!isVisible || isDismissed || deals.length === 0) return null

  const currentDeal = deals[activeIndex]
  const { plot, diffPct, roi, score } = currentDeal
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = plot.total_price ?? plot.totalPrice
  const color = statusColors[plot.status]

  return (
    <div
      className="fixed top-[5.5rem] left-4 z-[45] animate-slide-in-left max-w-[280px]"
      dir="rtl"
    >
      <div className="relative bg-gradient-to-br from-navy-light/95 to-navy/95 backdrop-blur-xl border border-gold/20 rounded-2xl shadow-2xl shadow-gold/10 overflow-hidden">
        {/* Gold accent */}
        <div className="h-0.5 bg-gradient-to-r from-gold via-gold-bright to-gold" />

        {/* Close */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <span className="text-[11px] font-bold text-orange-400">🔥 הזדמנות השקעה</span>
          {deals.length > 1 && (
            <span className="text-[9px] text-slate-500 mr-auto">{activeIndex + 1}/{deals.length}</span>
          )}
        </div>

        {/* Deal card */}
        <button
          onClick={() => {
            onSelectPlot(plot)
            setIsDismissed(true)
          }}
          className="w-full text-right px-3 pb-3 pt-1 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-6 rounded-full" style={{ background: color }} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-200 truncate">
                גוש {blockNum} | חלקה {plot.number}
              </div>
              <div className="text-[10px] text-slate-500">{plot.city}</div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-500 flex-shrink-0" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-gold">{formatPriceShort(price)}</span>
            </div>
            {diffPct < 0 && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {Math.abs(diffPct)}% מתחת לממוצע
              </span>
            )}
            <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">
              +{roi}% ROI
            </span>
          </div>
        </button>

        {/* Progress dots */}
        {deals.length > 1 && (
          <div className="flex justify-center gap-1 pb-2">
            {deals.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === activeIndex ? 'bg-gold w-3' : 'bg-white/15'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
