import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react'

/**
 * AreaComparisonWidget — shows how a selected plot compares to its area (city) averages.
 * Like Madlan's "ביחס לאזור" indicators — gives investors instant context about whether
 * they're looking at a deal or premium pricing relative to the local market.
 *
 * Computes 4 key comparison metrics:
 * 1. Price per sqm vs city average
 * 2. ROI vs city average
 * 3. Investment score vs city average
 * 4. Size vs city average
 *
 * Each metric shows a colored bar and percentage difference.
 */

function ComparisonBar({ label, plotValue, avgValue, unit, formatter, lowerIsBetter = false }) {
  if (avgValue <= 0 || plotValue == null) return null

  const diff = plotValue - avgValue
  const diffPct = Math.round((diff / avgValue) * 100)
  const absDiffPct = Math.abs(diffPct)

  // Determine if this is good/bad
  const isGood = lowerIsBetter ? diff < 0 : diff > 0
  const isNeutral = absDiffPct <= 3

  const color = isNeutral
    ? 'text-slate-400'
    : isGood
      ? 'text-emerald-400'
      : 'text-red-400'
  const bgColor = isNeutral
    ? 'bg-slate-400/10'
    : isGood
      ? 'bg-emerald-400/10'
      : 'bg-red-400/10'

  const Icon = isNeutral ? Minus : diff > 0 ? TrendingUp : TrendingDown

  // Bar position: avgValue is center (50%), plotValue extends left or right
  const barPct = Math.min(100, Math.max(0, 50 + (diffPct / 2)))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-200">
            {formatter ? formatter(plotValue) : plotValue}
            {unit && <span className="text-slate-500 text-[9px]"> {unit}</span>}
          </span>
          {!isNeutral && (
            <span className={`flex items-center gap-0.5 text-[9px] font-bold ${color}`}>
              <Icon className="w-2.5 h-2.5" />
              {absDiffPct}%
            </span>
          )}
        </div>
      </div>

      {/* Comparison bar */}
      <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
        {/* Center marker (area average) */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600 z-10" />
        {/* Plot position bar */}
        <div
          className={`absolute top-0 bottom-0 rounded-full transition-all duration-700 ${
            isNeutral ? 'bg-slate-500/40' : isGood ? 'bg-emerald-500/50' : 'bg-red-500/50'
          }`}
          style={{
            left: diffPct >= 0 ? '50%' : `${barPct}%`,
            width: `${Math.min(50, absDiffPct / 2)}%`,
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[8px] text-slate-600">
        <span>{lowerIsBetter ? 'יקר' : 'נמוך'}</span>
        <span>ממוצע {formatter ? formatter(avgValue) : avgValue}{unit ? ` ${unit}` : ''}</span>
        <span>{lowerIsBetter ? 'זול' : 'גבוה'}</span>
      </div>
    </div>
  )
}

export default function AreaComparisonWidget({ plot, allPlots }) {
  const cityStats = useMemo(() => {
    if (!plot || !allPlots || allPlots.length < 3) return null

    const city = plot.city
    const cityPlots = allPlots.filter(p => p.city === city && p.id !== plot.id)
    if (cityPlots.length < 2) return null

    // Compute city averages
    let totalPsm = 0, totalRoi = 0, totalScore = 0, totalSize = 0
    let psmCount = 0, roiCount = 0, scoreCount = 0, sizeCount = 0

    for (const p of cityPlots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const score = p._investmentScore ?? 0

      if (price > 0 && size > 0) {
        totalPsm += price / size
        psmCount++
      }
      if (price > 0 && proj > 0) {
        totalRoi += ((proj - price) / price) * 100
        roiCount++
      }
      if (score > 0) {
        totalScore += score
        scoreCount++
      }
      if (size > 0) {
        totalSize += size
        sizeCount++
      }
    }

    if (psmCount === 0) return null

    return {
      city,
      count: cityPlots.length,
      avgPsm: Math.round(totalPsm / psmCount),
      avgRoi: roiCount > 0 ? Math.round(totalRoi / roiCount) : 0,
      avgScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0,
      avgSize: sizeCount > 0 ? Math.round(totalSize / sizeCount) : 0,
    }
  }, [plot?.id, plot?.city, allPlots])

  // Plot's own metrics
  const plotMetrics = useMemo(() => {
    if (!plot) return null
    const price = plot.total_price ?? plot.totalPrice ?? 0
    const size = plot.size_sqm ?? plot.sizeSqM ?? 0
    const proj = plot.projected_value ?? plot.projectedValue ?? 0
    const score = plot._investmentScore ?? 0
    return {
      psm: size > 0 ? Math.round(price / size) : 0,
      roi: price > 0 ? Math.round(((proj - price) / price) * 100) : 0,
      score,
      size,
    }
  }, [plot])

  if (!cityStats || !plotMetrics) return null

  // Overall verdict
  const metrics = [
    { diff: cityStats.avgPsm > 0 ? (plotMetrics.psm - cityStats.avgPsm) / cityStats.avgPsm : 0, lowerIsBetter: true },
    { diff: cityStats.avgRoi > 0 ? (plotMetrics.roi - cityStats.avgRoi) / cityStats.avgRoi : 0, lowerIsBetter: false },
    { diff: cityStats.avgScore > 0 ? (plotMetrics.score - cityStats.avgScore) / cityStats.avgScore : 0, lowerIsBetter: false },
  ]
  const goodCount = metrics.filter(m => {
    const isGood = m.lowerIsBetter ? m.diff < -0.03 : m.diff > 0.03
    return isGood
  }).length

  const verdict = goodCount >= 2
    ? { label: 'עסקה מעל הממוצע', color: '#22C55E', emoji: '🔥' }
    : goodCount >= 1
      ? { label: 'בטווח הממוצע', color: '#EAB308', emoji: '📊' }
      : { label: 'מתחת לממוצע', color: '#EF4444', emoji: '⚠️' }

  const formatILS = (v) => `₪${v.toLocaleString()}`
  const formatSqm = (v) => `${(v / 1000).toFixed(1)} דונם`

  return (
    <div className="bg-gradient-to-br from-indigo-500/8 to-purple-500/5 border border-indigo-500/15 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">ביחס לאזור — {cityStats.city}</div>
            <div className="text-[9px] text-slate-500">בהשוואה ל-{cityStats.count} חלקות באזור</div>
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
          style={{
            background: `${verdict.color}15`,
            border: `1px solid ${verdict.color}30`,
            color: verdict.color,
          }}
        >
          <span>{verdict.emoji}</span>
          <span>{verdict.label}</span>
        </div>
      </div>

      <div className="space-y-3">
        <ComparisonBar
          label="מחיר/מ״ר"
          plotValue={plotMetrics.psm}
          avgValue={cityStats.avgPsm}
          unit="/מ״ר"
          formatter={formatILS}
          lowerIsBetter={true}
        />
        <ComparisonBar
          label="תשואה צפויה"
          plotValue={plotMetrics.roi}
          avgValue={cityStats.avgRoi}
          unit="%"
          lowerIsBetter={false}
        />
        <ComparisonBar
          label="ציון השקעה"
          plotValue={plotMetrics.score}
          avgValue={cityStats.avgScore}
          unit="/10"
          lowerIsBetter={false}
        />
        <ComparisonBar
          label="שטח"
          plotValue={plotMetrics.size}
          avgValue={cityStats.avgSize}
          formatter={formatSqm}
          lowerIsBetter={false}
        />
      </div>
    </div>
  )
}
