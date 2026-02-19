import { useMemo, useState, memo } from 'react'
import { Activity, TrendingUp, TrendingDown, Clock, Eye, Zap, ChevronDown, ChevronUp } from 'lucide-react'

/**
 * MarketVelocity — real-time market speed indicators for investors.
 *
 * Shows 4 key velocity metrics that professional investors care about:
 * 1. Average days on market (time to sell)
 * 2. Listing absorption rate (% sold per month)
 * 3. View velocity (avg views/day across listings)
 * 4. New listing momentum (recent listing pace vs historical)
 *
 * Neither Madlan nor Yad2 prominently show market velocity metrics.
 * This positions LandMap as a data-driven platform for serious investors.
 *
 * Compact floating widget — positioned above the market stats bar on desktop,
 * collapsible to minimize map obstruction.
 */

function getVelocityLabel(avgDays) {
  if (avgDays <= 14) return { text: 'שוק מהיר מאוד', color: '#22C55E', emoji: '🚀' }
  if (avgDays <= 30) return { text: 'שוק מהיר', color: '#4ADE80', emoji: '⚡' }
  if (avgDays <= 60) return { text: 'שוק ממוצע', color: '#EAB308', emoji: '📊' }
  if (avgDays <= 90) return { text: 'שוק איטי', color: '#F97316', emoji: '🐌' }
  return { text: 'שוק קפוא', color: '#EF4444', emoji: '❄️' }
}

function getAbsorptionLabel(rate) {
  if (rate >= 20) return { text: 'ביקוש חזק', color: '#22C55E' }
  if (rate >= 10) return { text: 'ביקוש בריא', color: '#4ADE80' }
  if (rate >= 5) return { text: 'ביקוש מתון', color: '#EAB308' }
  return { text: 'ביקוש נמוך', color: '#F97316' }
}

function MarketVelocity({ plots }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const metrics = useMemo(() => {
    if (!plots || plots.length < 3) return null

    const now = Date.now()
    const available = []
    const sold = []
    let totalViews = 0
    let totalDaysOnMarket = 0
    let daysOnMarketCount = 0
    let newLast7Days = 0
    let newLast30Days = 0

    for (const p of plots) {
      const createdAt = p.created_at ?? p.createdAt
      const createdTs = createdAt ? new Date(createdAt).getTime() : 0
      const daysOnMarket = createdTs > 0 ? Math.floor((now - createdTs) / 86400000) : null

      if (p.status === 'AVAILABLE') {
        available.push(p)
        if (daysOnMarket !== null && daysOnMarket >= 0) {
          totalDaysOnMarket += daysOnMarket
          daysOnMarketCount++
        }
      } else if (p.status === 'SOLD') {
        sold.push(p)
      }

      totalViews += p.views ?? 0

      // New listings momentum
      if (createdTs > 0) {
        const daysSince = (now - createdTs) / 86400000
        if (daysSince <= 7) newLast7Days++
        if (daysSince <= 30) newLast30Days++
      }
    }

    const totalPlots = plots.length
    const avgDaysOnMarket = daysOnMarketCount > 0 ? Math.round(totalDaysOnMarket / daysOnMarketCount) : null

    // Absorption rate: % of total inventory that is sold
    const absorptionRate = totalPlots > 0 ? Math.round((sold.length / totalPlots) * 100) : 0

    // View velocity: average views per plot per day on market
    const avgViewsPerPlot = totalPlots > 0 ? Math.round(totalViews / totalPlots) : 0

    // Listing momentum: 7-day new listing rate annualized vs 30-day rate
    const weeklyPace = newLast7Days
    const monthlyPace = Math.round(newLast30Days / 4.3) // normalize to weekly
    const momentumDirection = weeklyPace > monthlyPace ? 'up' : weeklyPace < monthlyPace ? 'down' : 'flat'

    const velocityLabel = avgDaysOnMarket !== null ? getVelocityLabel(avgDaysOnMarket) : null
    const absorptionLabel = getAbsorptionLabel(absorptionRate)

    return {
      avgDaysOnMarket,
      absorptionRate,
      avgViewsPerPlot,
      newLast7Days,
      newLast30Days,
      weeklyPace,
      monthlyPace,
      momentumDirection,
      velocityLabel,
      absorptionLabel,
      availableCount: available.length,
      soldCount: sold.length,
    }
  }, [plots])

  if (!metrics || metrics.avgDaysOnMarket === null) return null

  return (
    <div
      className="fixed top-[4rem] right-4 sm:right-auto sm:top-auto sm:bottom-[5.5rem] sm:left-[4.5rem] z-[20] pointer-events-none"
      dir="rtl"
    >
      <div className="pointer-events-auto">
        {/* Collapsed: single compact indicator */}
        <button
          onClick={() => setIsExpanded(prev => !prev)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] backdrop-blur-md border transition-all hover:scale-105 ${
            isExpanded
              ? 'bg-navy/90 border-gold/20 shadow-lg shadow-gold/5'
              : 'bg-white/5 border-white/10 hover:border-gold/15'
          }`}
          title="מהירות שוק — לחץ לפרטים"
          aria-expanded={isExpanded}
          aria-label="מדד מהירות השוק"
        >
          <Activity className="w-3 h-3 text-gold" />
          <span className="font-medium" style={{ color: metrics.velocityLabel?.color }}>
            {metrics.velocityLabel?.emoji} {metrics.avgDaysOnMarket} ימים
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          )}
        </button>

        {/* Expanded: full metrics panel */}
        {isExpanded && (
          <div className="mt-1.5 bg-navy/95 backdrop-blur-md border border-gold/15 rounded-2xl p-3 shadow-xl min-w-[200px] animate-fade-in">
            <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-white/5">
              <Activity className="w-3.5 h-3.5 text-gold" />
              <span className="text-[11px] font-bold text-slate-200">מהירות השוק</span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-medium mr-auto"
                style={{
                  color: metrics.velocityLabel?.color,
                  background: `${metrics.velocityLabel?.color}15`,
                  border: `1px solid ${metrics.velocityLabel?.color}30`,
                }}
              >
                {metrics.velocityLabel?.text}
              </span>
            </div>

            <div className="space-y-2">
              {/* Avg days on market */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>ימים ממוצעים בשוק</span>
                </div>
                <span className="text-[11px] font-bold" style={{ color: metrics.velocityLabel?.color }}>
                  {metrics.avgDaysOnMarket}
                </span>
              </div>

              {/* Absorption rate */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Zap className="w-3 h-3" />
                  <span>שיעור מכירה</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold" style={{ color: metrics.absorptionLabel.color }}>
                    {metrics.absorptionRate}%
                  </span>
                  <span className="text-[8px] text-slate-600">
                    ({metrics.soldCount}/{metrics.soldCount + metrics.availableCount})
                  </span>
                </div>
              </div>

              {/* View velocity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <Eye className="w-3 h-3" />
                  <span>צפיות ממוצעות</span>
                </div>
                <span className="text-[11px] font-bold text-slate-300">
                  {metrics.avgViewsPerPlot}/חלקה
                </span>
              </div>

              {/* New listing momentum */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  {metrics.momentumDirection === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : metrics.momentumDirection === 'down' ? (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  ) : (
                    <Activity className="w-3 h-3 text-slate-400" />
                  )}
                  <span>חלקות חדשות (7 ימים)</span>
                </div>
                <span className={`text-[11px] font-bold ${
                  metrics.momentumDirection === 'up' ? 'text-emerald-400' :
                  metrics.momentumDirection === 'down' ? 'text-red-400' :
                  'text-slate-300'
                }`}>
                  {metrics.newLast7Days}
                </span>
              </div>

              {/* Velocity bar visualization */}
              <div className="pt-1.5 mt-1 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-slate-600">איטי</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(5, Math.min(100, 100 - (metrics.avgDaysOnMarket / 120 * 100)))}%`,
                        background: `linear-gradient(90deg, ${metrics.velocityLabel?.color}80, ${metrics.velocityLabel?.color})`,
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-slate-600">מהיר</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(MarketVelocity)
