import { useState, useCallback } from 'react'
import { Flame, ChevronUp, ChevronDown, TrendingUp, MapPin } from 'lucide-react'
import { useFeaturedPlots } from '../hooks/usePlots.js'
import { formatPriceShort } from '../utils/formatters.js'
import { statusColors } from '../utils/constants.js'

/**
 * FeaturedDeals — floating "Hot Deals" widget on the map.
 * Like Madlan's "הזדמנויות חמות" section — shows server-scored top investments.
 * Uses the existing /api/plots/featured endpoint (was built but never wired to UI).
 *
 * Collapsed by default to avoid clutter. Expands on click to show 3 top picks.
 * Positioned on the right side, above the contact CTA buttons.
 */
export default function FeaturedDeals({ onSelectPlot, selectedPlot }) {
  const { data: featured = [] } = useFeaturedPlots(3)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelect = useCallback((plot) => {
    if (onSelectPlot) onSelectPlot(plot)
    setIsExpanded(false)
  }, [onSelectPlot])

  // Don't render if no featured plots available
  if (!featured || featured.length === 0) return null

  return (
    <div
      className="fixed z-[28] hidden sm:block"
      style={{ bottom: '21rem', left: '1rem' }}
      dir="rtl"
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold backdrop-blur-md border transition-all hover:scale-105 ${
          isExpanded
            ? 'bg-orange-500/15 border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/10'
            : 'bg-navy/80 border-white/10 text-slate-400 hover:text-orange-400 hover:border-orange-500/20'
        }`}
        aria-expanded={isExpanded}
        aria-label="הזדמנויות חמות"
        title="הזדמנויות השקעה מומלצות"
      >
        <Flame className={`w-3.5 h-3.5 ${isExpanded ? 'text-orange-400' : ''}`} />
        <span>הזדמנויות חמות</span>
        <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-black flex items-center justify-center">
          {featured.length}
        </span>
        {isExpanded
          ? <ChevronDown className="w-3 h-3 opacity-50" />
          : <ChevronUp className="w-3 h-3 opacity-50" />
        }
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          className="absolute bottom-full left-0 mb-2 w-64 bg-navy/95 backdrop-blur-xl border border-orange-500/15 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          style={{ animation: 'filter-dropdown-in 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-orange-400/70 font-medium">
              <Flame className="w-3 h-3" />
              <span>מדורגות לפי ציון השקעה</span>
            </div>
          </div>

          {/* Deal cards */}
          <div className="p-2 space-y-1.5">
            {featured.map((plot, i) => {
              const bn = plot.block_number ?? plot.blockNumber
              const price = plot.total_price ?? plot.totalPrice
              const roi = plot._roi ?? 0
              const dealPct = plot._dealPct ?? 0
              const color = statusColors[plot.status]
              const isSelected = selectedPlot?.id === plot.id

              return (
                <button
                  key={plot.id}
                  onClick={() => handleSelect(plot)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-right group ${
                    isSelected
                      ? 'bg-gold/10 border border-gold/20'
                      : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/5'
                  }`}
                >
                  {/* Rank badge */}
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                    i === 0 ? 'bg-orange-500/20 text-orange-400' :
                    i === 1 ? 'bg-amber-500/15 text-amber-400' :
                    'bg-slate-500/15 text-slate-400'
                  }`}>
                    {i + 1}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      גוש {bn} | חלקה {plot.number}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[9px] text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-2 h-2" />
                        {plot.city}
                      </span>
                      {dealPct < -3 && (
                        <span className="text-emerald-400 font-medium">
                          {Math.abs(dealPct)}%↓
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & ROI */}
                  <div className="text-left flex-shrink-0">
                    <div className="text-[11px] font-bold text-gold">{formatPriceShort(price)}</div>
                    <div className="text-[9px] font-medium text-emerald-400 flex items-center gap-0.5 justify-end">
                      <TrendingUp className="w-2 h-2" />
                      +{roi}%
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-white/5 text-center">
            <span className="text-[9px] text-slate-600">
              מעודכן כל 5 דקות · מבוסס ROI, מחיר אזורי, טריות
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
