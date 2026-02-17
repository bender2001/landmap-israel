import { useState, useMemo } from 'react'
import { Clock, ChevronDown, X } from 'lucide-react'
import { statusColors } from '../utils/constants'
import { formatPriceShort } from '../utils/formatters'

/**
 * Floating "Recently Viewed" mini-panel on the map.
 * Shows last 5 viewed plots for quick navigation back.
 * Similar to Madlan's "נצפו לאחרונה" feature.
 */
export default function RecentlyViewed({ plots, selectedPlot, onSelectPlot }) {
  const [isOpen, setIsOpen] = useState(false)

  const recentPlots = useMemo(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('landmap_recently_viewed') || '[]')
      if (ids.length === 0) return []
      // Map ids to plot objects, keep order, limit to 5
      const plotMap = new Map(plots.map(p => [p.id, p]))
      return ids
        .map(id => plotMap.get(id))
        .filter(Boolean)
        .slice(0, 5)
    } catch {
      return []
    }
  }, [plots, selectedPlot?.id])

  if (recentPlots.length === 0) return null

  return (
    <div className="absolute top-16 right-4 z-[25] pointer-events-none hidden sm:block" dir="rtl">
      <div className="pointer-events-auto">
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="glass-panel px-3 py-2 flex items-center gap-2 hover:border-gold/20 transition-colors"
        >
          <Clock className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs text-slate-300">נצפו לאחרונה</span>
          <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">{recentPlots.length}</span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="glass-panel mt-1 p-2 min-w-[220px] max-w-[280px] space-y-1">
            {recentPlots.map(plot => {
              const color = statusColors[plot.status]
              const price = plot.total_price ?? plot.totalPrice
              const blockNum = plot.block_number ?? plot.blockNumber
              const isSelected = selectedPlot?.id === plot.id
              const projValue = plot.projected_value ?? plot.projectedValue
              const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0

              return (
                <button
                  key={plot.id}
                  onClick={() => { onSelectPlot(plot); setIsOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-right transition-all ${
                    isSelected
                      ? 'bg-gold/10 border border-gold/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-200 truncate">
                      גוש {blockNum} | חלקה {plot.number}
                    </div>
                    <div className="text-[10px] text-slate-500">{plot.city}</div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <div className="text-xs font-bold text-gold">{formatPriceShort(price)}</div>
                    <div className="text-[10px] text-emerald-400">+{roi}%</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
