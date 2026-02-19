import { useMemo, useState, memo } from 'react'
import { BarChart3, TrendingUp, Ruler, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPriceShort, formatCurrency, calcMonthlyPayment } from '../utils/formatters'

/**
 * ViewportSummary — Bloomberg-style aggregate stats for the currently visible plot set.
 * Shows total portfolio value, avg price/sqm, avg ROI, and avg monthly payment.
 * Updates dynamically as filters/sort change — gives investors instant market context.
 *
 * Professional investors need aggregate context when evaluating a market segment.
 * Neither Madlan nor Yad2 surface portfolio-level metrics like this — it positions
 * LandMap as a data-driven platform for serious investors (like Bloomberg Terminal
 * shows sector summaries alongside individual securities).
 *
 * Positioned at the top-left of the map, below the filter bar. Collapses to a
 * compact one-line summary on mobile to save vertical space.
 */
const ViewportSummary = memo(function ViewportSummary({ plots }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const stats = useMemo(() => {
    if (!plots || plots.length === 0) return null

    let totalValue = 0
    let totalProjected = 0
    let totalArea = 0
    let priceCount = 0
    let availableCount = 0
    let monthlySum = 0
    let monthlyCount = 0
    let minPrice = Infinity
    let maxPrice = 0

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0

      if (price > 0) {
        totalValue += price
        priceCount++
        if (price < minPrice) minPrice = price
        if (price > maxPrice) maxPrice = price
      }
      if (proj > 0) totalProjected += proj
      if (size > 0) totalArea += size
      if (p.status === 'AVAILABLE') availableCount++

      if (price > 0) {
        const payment = calcMonthlyPayment(price)
        if (payment) {
          monthlySum += payment.monthly
          monthlyCount++
        }
      }
    }

    const avgPriceSqm = totalArea > 0 ? Math.round(totalValue / totalArea) : 0
    const avgRoi = totalValue > 0 ? Math.round(((totalProjected - totalValue) / totalValue) * 100) : 0
    const avgMonthly = monthlyCount > 0 ? Math.round(monthlySum / monthlyCount) : 0
    const avgPrice = priceCount > 0 ? Math.round(totalValue / priceCount) : 0

    return {
      count: plots.length,
      available: availableCount,
      totalValue,
      avgPrice,
      avgPriceSqm,
      avgRoi,
      avgMonthly,
      totalArea,
      priceRange: { min: minPrice === Infinity ? 0 : minPrice, max: maxPrice },
    }
  }, [plots])

  if (!stats || stats.count === 0) return null

  return (
    <div
      className="fixed top-[3.2rem] sm:top-[3.5rem] left-3 sm:left-4 z-[20] animate-fade-in"
      dir="rtl"
    >
      <div className="bg-navy/85 backdrop-blur-md border border-white/10 rounded-xl shadow-lg overflow-hidden max-w-[280px]">
        {/* Compact header — always visible */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors"
          aria-expanded={isExpanded}
          aria-label="סיכום תיק השקעות"
        >
          <BarChart3 className="w-3.5 h-3.5 text-gold flex-shrink-0" />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[11px] font-bold text-gold tabular-nums">
              {stats.count}
            </span>
            <span className="text-[10px] text-slate-400">חלקות</span>
            <span className="text-[10px] text-slate-600 mx-0.5">·</span>
            <span className="text-[10px] text-slate-300 font-medium tabular-nums">
              {formatPriceShort(stats.totalValue)}
            </span>
            <span className="text-[10px] text-slate-600 mx-0.5">·</span>
            <span className={`text-[10px] font-medium tabular-nums ${stats.avgRoi >= 100 ? 'text-emerald-400' : stats.avgRoi >= 50 ? 'text-gold' : 'text-slate-400'}`}>
              +{stats.avgRoi}%
            </span>
          </div>
          {isExpanded
            ? <ChevronUp className="w-3 h-3 text-slate-500 flex-shrink-0" />
            : <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
          }
        </button>

        {/* Expanded detail panel */}
        {isExpanded && (
          <div className="px-3 pb-2.5 pt-1 border-t border-white/5 space-y-1.5 animate-fade-in">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <StatRow
                icon={<DollarSign className="w-3 h-3 text-gold/60" />}
                label="שווי כולל"
                value={formatCurrency(stats.totalValue)}
              />
              <StatRow
                icon={<TrendingUp className="w-3 h-3 text-emerald-400/60" />}
                label="תשואה ממוצעת"
                value={`+${stats.avgRoi}%`}
                valueClass={stats.avgRoi >= 100 ? 'text-emerald-400' : 'text-gold'}
              />
              <StatRow
                icon={<Ruler className="w-3 h-3 text-blue-400/60" />}
                label="מחיר/מ״ר ממוצע"
                value={`₪${stats.avgPriceSqm.toLocaleString()}`}
              />
              <StatRow
                icon={<BarChart3 className="w-3 h-3 text-purple-400/60" />}
                label="תשלום חודשי ממ׳"
                value={stats.avgMonthly > 0 ? `₪${stats.avgMonthly.toLocaleString()}` : '—'}
              />
            </div>

            {/* Price range mini-bar */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[9px] text-slate-500">טווח:</span>
              <span className="text-[9px] text-slate-400 tabular-nums">{formatPriceShort(stats.priceRange.min)}</span>
              <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/40 via-gold/40 to-red-500/40"
                  style={{ width: '100%' }}
                />
              </div>
              <span className="text-[9px] text-slate-400 tabular-nums">{formatPriceShort(stats.priceRange.max)}</span>
            </div>

            {/* Available vs total */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-[9px] text-slate-500">
                {stats.available} זמינות מתוך {stats.count}
              </span>
              <span className="text-[9px] text-slate-600 mr-auto">
                {(stats.totalArea / 1000).toFixed(1)} דונם סה״כ
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

function StatRow({ icon, label, value, valueClass = 'text-slate-200' }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="flex flex-col">
        <span className="text-[8px] text-slate-500 leading-tight">{label}</span>
        <span className={`text-[10px] font-medium tabular-nums leading-tight ${valueClass}`}>{value}</span>
      </div>
    </div>
  )
}

export default ViewportSummary
