import { useMemo, useState } from 'react'
import { TrendingUp, BarChart3, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { statusLabels, statusColors } from '../utils/constants'

/**
 * Floating market stats widget — shows aggregate market data like Madlan's
 * data-driven approach. Displays key metrics for the currently filtered plots.
 */
export default function MarketStatsWidget({ plots }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const stats = useMemo(() => {
    if (!plots || plots.length === 0) return null

    const prices = []
    const rois = []
    const sizes = []
    const byCity = {}
    const byStatus = {}

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const city = p.city || 'אחר'

      if (price > 0) {
        prices.push(price)
        if (proj > 0) rois.push(Math.round(((proj - price) / price) * 100))
      }
      if (size > 0) sizes.push(size)

      byCity[city] = (byCity[city] || 0) + 1
      byStatus[p.status] = (byStatus[p.status] || 0) + 1
    }

    const avgPrice = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : 0
    const medianPrice = prices.length > 0
      ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
      : 0
    const avgRoi = rois.length > 0
      ? Math.round(rois.reduce((a, b) => a + b, 0) / rois.length)
      : 0
    const maxRoi = rois.length > 0 ? Math.max(...rois) : 0
    const totalArea = sizes.reduce((a, b) => a + b, 0)

    // Price range
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0

    // Top city
    const topCity = Object.entries(byCity).sort((a, b) => b[1] - a[1])[0]

    // Per-city investment breakdown for comparison bars
    const cityInvestment = {}
    for (const p of plots) {
      const city = p.city || 'אחר'
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      if (!cityInvestment[city]) cityInvestment[city] = { totalPrice: 0, totalProj: 0, totalSize: 0, count: 0 }
      cityInvestment[city].totalPrice += price
      cityInvestment[city].totalProj += proj
      cityInvestment[city].totalSize += size
      cityInvestment[city].count += 1
    }
    const cityComparison = Object.entries(cityInvestment)
      .map(([city, d]) => ({
        city,
        count: d.count,
        avgPricePerDunam: d.totalSize > 0 ? Math.round(d.totalPrice / d.totalSize * 1000) : 0,
        avgRoi: d.totalPrice > 0 ? Math.round(((d.totalProj - d.totalPrice) / d.totalPrice) * 100) : 0,
      }))
      .sort((a, b) => b.avgRoi - a.avgRoi)

    return {
      count: plots.length,
      avgPrice,
      medianPrice,
      avgRoi,
      maxRoi,
      totalArea,
      minPrice,
      maxPrice,
      byCity,
      byStatus,
      topCity: topCity ? { name: topCity[0], count: topCity[1] } : null,
      cityComparison,
    }
  }, [plots])

  if (!stats) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none hidden md:block">
      <div className="glass-panel pointer-events-auto max-w-lg">
        {/* Compact row — always visible */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-right"
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-gold flex-shrink-0" />
              <span className="text-xs font-bold text-gold">{stats.count}</span>
              <span className="text-[10px] text-slate-400">חלקות</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">ממוצע</span>
              <span className="text-xs font-bold text-blue-400">{formatCurrency(stats.avgPrice)}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-bold text-emerald-400">+{stats.avgRoi}%</span>
              <span className="text-[10px] text-slate-400">ROI ממוצע</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400">📐</span>
              <span className="text-xs text-slate-300">{(stats.totalArea / 1000).toFixed(0)} דונם</span>
            </div>
          </div>
          {isExpanded
            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          }
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-3 pt-1 border-t border-white/5 space-y-3 animate-fade-in">
            {/* Price range bar */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>טווח מחירים</span>
                <span>{formatCurrency(stats.minPrice)} – {formatCurrency(stats.maxPrice)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-gold"
                  style={{ width: '100%' }}
                />
                {/* Median marker */}
                {stats.maxPrice > stats.minPrice && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white/60"
                    style={{
                      right: `${((stats.medianPrice - stats.minPrice) / (stats.maxPrice - stats.minPrice)) * 100}%`,
                    }}
                    title={`חציון: ${formatCurrency(stats.medianPrice)}`}
                  />
                )}
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5 text-center">
                חציון: {formatCurrency(stats.medianPrice)}
              </div>
            </div>

            {/* City breakdown */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.byCity)
                .sort((a, b) => b[1] - a[1])
                .map(([city, count]) => (
                  <span
                    key={city}
                    className="inline-flex items-center gap-1 text-[10px] bg-white/5 text-slate-300 px-2 py-1 rounded-md"
                  >
                    <MapPin className="w-2.5 h-2.5 text-gold" />
                    {city} ({count})
                  </span>
                ))}
            </div>

            {/* Status breakdown */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md"
                  style={{
                    background: `${statusColors[status]}14`,
                    color: statusColors[status],
                    border: `1px solid ${statusColors[status]}25`,
                  }}
                >
                  {statusLabels[status]} ({count})
                </span>
              ))}
            </div>

            {/* City ROI comparison bars — like Madlan area insights */}
            {stats.cityComparison && stats.cityComparison.length > 1 && (
              <div>
                <div className="text-[10px] text-slate-400 mb-1.5 font-medium">השוואת תשואות לפי עיר</div>
                <div className="space-y-1.5">
                  {stats.cityComparison.map(c => {
                    const maxRoiCity = stats.cityComparison[0].avgRoi || 1
                    const barPct = Math.max(8, (c.avgRoi / maxRoiCity) * 100)
                    return (
                      <div key={c.city} className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-300 w-14 flex-shrink-0 truncate">{c.city}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${barPct}%`,
                              background: c.avgRoi >= stats.avgRoi
                                ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                                : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 w-10 text-left">+{c.avgRoi}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Best deal highlight */}
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>🏆</span>
              <span>תשואה מקסימלית: <span className="text-emerald-400 font-bold">+{stats.maxRoi}%</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
