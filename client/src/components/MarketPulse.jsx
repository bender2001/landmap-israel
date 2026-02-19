import { useState, useMemo, memo, useCallback } from 'react'
import { Activity, ChevronDown, ChevronUp, TrendingUp, Clock, Zap, Target, Gauge } from 'lucide-react'
import { formatPriceShort, calcInvestmentScore } from '../utils/formatters'
import { useMarketMomentum } from '../hooks/useMarketMomentum'

/**
 * MarketPulse — floating widget showing real-time market activity metrics.
 *
 * Positioned on the map as a compact, collapsible panel. Gives investors
 * instant "market temperature" context — how active is the market right now,
 * what's the velocity of new listings, and where are the opportunities.
 *
 * Inspired by Bloomberg Terminal's "market overview" widgets and Madlan's
 * area-level market indicators. This adds urgency and engagement.
 *
 * Data is computed client-side from the currently visible/filtered plots.
 */
const MarketPulse = memo(function MarketPulse({ plots }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { momentum: momentumMap, dataSource: momentumSource } = useMarketMomentum()

  const metrics = useMemo(() => {
    if (!plots || plots.length === 0) return null

    const now = Date.now()
    const oneWeekAgo = now - 7 * 86400000
    const oneMonthAgo = now - 30 * 86400000

    let totalPrice = 0
    let totalSize = 0
    let availableCount = 0
    let soldCount = 0
    let newThisWeek = 0
    let newThisMonth = 0
    let totalViews = 0
    let hotDeals = 0 // plots with score >= 8
    let priceSum = 0
    let priceCount = 0

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const created = new Date(p.created_at ?? p.createdAt ?? 0).getTime()
      const views = p.views ?? 0

      if (price > 0) {
        priceSum += price
        priceCount++
      }
      totalPrice += price
      totalSize += size
      totalViews += views

      if (p.status === 'AVAILABLE') availableCount++
      if (p.status === 'SOLD') soldCount++
      if (created >= oneWeekAgo) newThisWeek++
      if (created >= oneMonthAgo) newThisMonth++

      const score = p._investmentScore ?? calcInvestmentScore(p)
      if (score >= 8) hotDeals++
    }

    const avgPrice = priceCount > 0 ? Math.round(priceSum / priceCount) : 0
    const avgPriceSqm = totalSize > 0 ? Math.round(totalPrice / totalSize) : 0
    const soldPct = plots.length > 0 ? Math.round((soldCount / plots.length) * 100) : 0

    // Market heat: composite score from velocity, demand, and opportunity
    const velocityScore = Math.min(100, (newThisWeek / Math.max(plots.length, 1)) * 500)
    const demandScore = Math.min(100, (totalViews / Math.max(plots.length, 1)) * 10)
    const opportunityScore = Math.min(100, (hotDeals / Math.max(plots.length, 1)) * 200)
    const marketHeat = Math.round((velocityScore * 0.4 + demandScore * 0.3 + opportunityScore * 0.3))

    let heatLabel, heatColor, heatEmoji
    if (marketHeat >= 70) { heatLabel = 'שוק רותח'; heatColor = '#EF4444'; heatEmoji = '🔥' }
    else if (marketHeat >= 45) { heatLabel = 'שוק פעיל'; heatColor = '#F59E0B'; heatEmoji = '📈' }
    else if (marketHeat >= 20) { heatLabel = 'שוק יציב'; heatColor = '#22C55E'; heatEmoji = '✅' }
    else { heatLabel = 'שוק שקט'; heatColor = '#64748B'; heatEmoji = '😴' }

    return {
      total: plots.length,
      available: availableCount,
      sold: soldCount,
      soldPct,
      newThisWeek,
      newThisMonth,
      avgPrice,
      avgPriceSqm,
      totalViews,
      hotDeals,
      marketHeat,
      heatLabel,
      heatColor,
      heatEmoji,
    }
  }, [plots])

  const toggle = useCallback(() => setIsExpanded(prev => !prev), [])

  if (!metrics || metrics.total === 0) return null

  return (
    <div className="fixed top-[4.2rem] left-[4.5rem] sm:left-auto sm:top-auto sm:bottom-[5.5rem] sm:left-4 z-[25]" dir="rtl">
      <div className="bg-navy/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden transition-all duration-300"
        style={{ width: isExpanded ? '220px' : 'auto' }}
      >
        {/* Compact header — always visible */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
          aria-expanded={isExpanded}
          aria-label="מדד פעילות השוק"
        >
          <div className="relative">
            <Activity className="w-4 h-4" style={{ color: metrics.heatColor }} />
            {/* Pulse dot for active markets */}
            {metrics.marketHeat >= 45 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                style={{ background: metrics.heatColor }}
              />
            )}
          </div>
          <span className="text-[11px] font-semibold" style={{ color: metrics.heatColor }}>
            {metrics.heatEmoji} {metrics.heatLabel}
          </span>
          {isExpanded
            ? <ChevronUp className="w-3 h-3 text-slate-500 mr-auto" />
            : <ChevronDown className="w-3 h-3 text-slate-500 mr-auto" />
          }
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2 animate-fade-in">
            {/* Market heat bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-slate-500">חום השוק</span>
                <span className="text-[9px] font-bold" style={{ color: metrics.heatColor }}>
                  {metrics.marketHeat}%
                </span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${metrics.marketHeat}%`,
                    background: `linear-gradient(90deg, #22C55E, ${metrics.heatColor})`,
                  }}
                />
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <Target className="w-2.5 h-2.5 text-emerald-400" />
                  <span className="text-[8px] text-slate-500">זמינות</span>
                </div>
                <div className="text-[12px] font-bold text-slate-200">
                  {metrics.available}/{metrics.total}
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <Zap className="w-2.5 h-2.5 text-gold" />
                  <span className="text-[8px] text-slate-500">חדשות השבוע</span>
                </div>
                <div className="text-[12px] font-bold text-gold">
                  {metrics.newThisWeek}
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingUp className="w-2.5 h-2.5 text-blue-400" />
                  <span className="text-[8px] text-slate-500">ממוצע מ״ר</span>
                </div>
                <div className="text-[12px] font-bold text-slate-200">
                  ₪{metrics.avgPriceSqm.toLocaleString()}
                </div>
              </div>

              <div className="bg-white/[0.03] rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="w-2.5 h-2.5 text-purple-400" />
                  <span className="text-[8px] text-slate-500">נמכרו</span>
                </div>
                <div className="text-[12px] font-bold text-slate-200">
                  {metrics.soldPct}%
                </div>
              </div>
            </div>

            {/* City momentum indicators — week-over-week price velocity.
                Shows investors whether the market is accelerating or slowing down.
                This is data Madlan/Yad2 don't show — key competitive advantage. */}
            {momentumMap.size > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 mb-1">
                  <Gauge className="w-2.5 h-2.5 text-slate-500" />
                  <span className="text-[8px] text-slate-500 font-medium">מומנטום מחירים</span>
                </div>
                {Array.from(momentumMap.entries()).slice(0, 3).map(([city, m]) => {
                  if (!m.signal) return null
                  const wowColor = m.wow > 0 ? 'text-emerald-400' : m.wow < 0 ? 'text-red-400' : 'text-slate-400'
                  return (
                    <div key={city} className="flex items-center justify-between bg-white/[0.02] rounded-md px-2 py-1">
                      <span className="text-[9px] text-slate-300 font-medium">{city}</span>
                      <div className="flex items-center gap-1.5">
                        {m.wow != null && (
                          <span className={`text-[9px] font-bold ${wowColor}`} title="שינוי שבועי">
                            {m.wow > 0 ? '+' : ''}{m.wow}%
                          </span>
                        )}
                        <span className="text-[8px]" title={`מגמה: ${m.signal}`}>
                          {m.signal?.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Hot deals indicator */}
            {metrics.hotDeals > 0 && (
              <div className="flex items-center gap-1.5 bg-gold/[0.06] border border-gold/15 rounded-lg px-2 py-1.5">
                <span className="text-sm">💎</span>
                <span className="text-[10px] text-gold font-medium">
                  {metrics.hotDeals} הזדמנויות השקעה חמות
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default MarketPulse
