import { useMemo, useState } from 'react'
import { TrendingUp, Calendar, Target } from 'lucide-react'
import { formatCurrency, formatPriceShort } from '../../utils/formatters'

/**
 * Investment Projection Chart — year-by-year value growth visualization.
 *
 * Shows how the plot value grows from purchase price to projected value over the
 * estimated holding period. Uses a smooth S-curve growth model (not linear) because
 * real estate rezoning value follows an S-curve: slow at start (planning), fast in
 * middle (approval), and tapering at end (construction).
 *
 * This is a DIFFERENTIATOR — neither Madlan nor Yad2 show forward-looking projections.
 * Both show historical price data; we show the investor's future.
 *
 * Features:
 * - S-curve growth model (sigmoid) for realistic projection
 * - Interactive hover to see value at each year
 * - Annual growth rate annotation
 * - "You are here" marker at year 0
 * - Break-even annotation (when value exceeds total cost including taxes)
 */
export default function InvestmentProjection({ totalPrice, projectedValue, readinessEstimate, zoningStage }) {
  const [hoveredYear, setHoveredYear] = useState(null)

  const projection = useMemo(() => {
    if (!totalPrice || !projectedValue || totalPrice <= 0) return null
    if (projectedValue <= totalPrice) return null

    // Determine holding period from readiness estimate
    let years = 5
    if (readinessEstimate) {
      if (readinessEstimate.includes('1-3')) years = 3
      else if (readinessEstimate.includes('3-5')) years = 5
      else if (readinessEstimate.includes('5+') || readinessEstimate.includes('5-')) years = 7
      else {
        const match = readinessEstimate.match(/(\d+)/)
        if (match) years = Math.max(2, Math.min(15, parseInt(match[1], 10)))
      }
    }

    // Calculate total investment cost (purchase + taxes + fees)
    const purchaseTax = Math.round(totalPrice * 0.06)
    const attorneyFees = Math.round(totalPrice * 0.0175)
    const totalCost = totalPrice + purchaseTax + attorneyFees

    // Generate S-curve growth points
    // Sigmoid function: f(t) = 1 / (1 + e^(-k*(t - midpoint)))
    // Normalized to map [0, years] → [purchasePrice, projectedValue]
    const points = []
    const midpoint = years * 0.55 // growth accelerates slightly past midpoint
    const steepness = 6 / years   // steeper for shorter periods

    for (let y = 0; y <= years; y++) {
      const t = y
      const sigmoid = 1 / (1 + Math.exp(-steepness * (t - midpoint)))
      // Normalize sigmoid: at t=0 it's not exactly 0, so we rescale
      const sigmoidStart = 1 / (1 + Math.exp(-steepness * (0 - midpoint)))
      const sigmoidEnd = 1 / (1 + Math.exp(-steepness * (years - midpoint)))
      const normalized = (sigmoid - sigmoidStart) / (sigmoidEnd - sigmoidStart)

      const value = Math.round(totalPrice + (projectedValue - totalPrice) * normalized)
      const roi = Math.round(((value - totalPrice) / totalPrice) * 100)
      const yearlyGrowth = y > 0
        ? Math.round(((value - points[y - 1].value) / points[y - 1].value) * 100 * 10) / 10
        : 0

      points.push({
        year: y,
        value,
        roi,
        yearlyGrowth,
        aboveCost: value >= totalCost,
      })
    }

    // Find break-even year (when value > total cost including taxes)
    const breakEvenYear = points.findIndex(p => p.aboveCost)

    return { points, years, totalCost, breakEvenYear }
  }, [totalPrice, projectedValue, readinessEstimate])

  if (!projection) return null

  const { points, years, totalCost, breakEvenYear } = projection
  const maxValue = projectedValue * 1.05
  const barHeight = 120 // px
  const activePoint = hoveredYear !== null ? points[hoveredYear] : null

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200">תחזית צמיחה שנתית</span>
            <span className="text-[9px] text-slate-500 block">מודל S-Curve · {years} שנים</span>
          </div>
        </div>
        {breakEvenYear > 0 && (
          <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-md">
            ✅ עובר עלות בשנה {breakEvenYear}
          </span>
        )}
      </div>

      {/* Active year tooltip */}
      {activePoint && (
        <div className="mb-2 flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-1.5 border border-white/5 transition-all">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-indigo-400" />
            <span className="text-[11px] font-medium text-slate-300">שנה {activePoint.year}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-100">{formatCurrency(activePoint.value)}</span>
            <span className={`text-[10px] font-bold ${activePoint.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {activePoint.roi >= 0 ? '+' : ''}{activePoint.roi}%
            </span>
            {activePoint.yearlyGrowth > 0 && (
              <span className="text-[9px] text-indigo-400">
                +{activePoint.yearlyGrowth}%/שנה
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div
        className="flex items-end gap-[3px] sm:gap-1"
        style={{ height: `${barHeight}px` }}
        onMouseLeave={() => setHoveredYear(null)}
        role="img"
        aria-label={`תחזית צמיחה: מ-${formatPriceShort(totalPrice)} ל-${formatPriceShort(projectedValue)} ב-${years} שנים`}
      >
        {points.map((point, i) => {
          const height = Math.max(8, (point.value / maxValue) * barHeight)
          const isFirst = i === 0
          const isLast = i === years
          const isBreakEven = i === breakEvenYear
          const isHovered = hoveredYear === i
          const isAboveCost = point.aboveCost

          // Color progression: blue (purchase) → indigo (growth) → emerald (target)
          let barColor
          if (isFirst) barColor = '#3B82F6'
          else if (isLast) barColor = '#22C55E'
          else if (!isAboveCost) barColor = '#6366F1'
          else barColor = `hsl(${140 + (i / years) * 20}, 70%, 55%)`

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end relative group cursor-pointer"
              style={{ height: '100%' }}
              onMouseEnter={() => setHoveredYear(i)}
              onClick={() => setHoveredYear(i === hoveredYear ? null : i)}
            >
              {/* Break-even marker */}
              {isBreakEven && !isFirst && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Target className="w-3 h-3 text-emerald-400" />
                </div>
              )}

              {/* Bar */}
              <div
                className={`w-full rounded-t-sm transition-all duration-200 ${
                  isHovered ? 'opacity-100 ring-1 ring-white/20' : 'opacity-75 hover:opacity-90'
                }`}
                style={{
                  height: `${height}px`,
                  background: barColor,
                  minHeight: '8px',
                }}
              />

              {/* Year label */}
              <span className={`text-[8px] mt-1 ${
                isFirst || isLast || isHovered ? 'text-slate-400 font-medium' : 'text-slate-600'
              }`}>
                {isFirst ? 'היום' : isLast ? 'יעד' : i}
              </span>
            </div>
          )
        })}
      </div>

      {/* Cost line annotation */}
      {totalCost < projectedValue && (
        <div className="relative mt-1" style={{ height: '12px' }}>
          <div
            className="absolute left-0 right-0 border-t border-dashed border-orange-500/30"
            style={{
              bottom: `${(totalCost / maxValue) * 100}%`,
            }}
          />
          <span className="text-[7px] text-orange-400/60 absolute right-0" style={{ top: 0 }}>
            עלות כוללת: {formatPriceShort(totalCost)}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[8px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue-500" />
          מחיר רכישה
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-indigo-500" />
          צמיחה צפויה
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500" />
          שווי יעד
        </span>
      </div>
    </div>
  )
}
