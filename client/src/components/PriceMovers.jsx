import { useState, useCallback } from 'react'
import { TrendingDown, TrendingUp, ChevronUp, ChevronDown, Activity } from 'lucide-react'
import { usePriceChanges } from '../hooks/usePriceChanges.js'
import { formatPriceShort, formatCurrency } from '../utils/formatters.js'
import { statusColors } from '../utils/constants.js'

/**
 * PriceMovers — floating "Price Changes" widget on the map.
 * Like Yad2's "המחיר ירד!" badges but as a dedicated discoverable widget.
 * Shows plots where the price has recently changed (up or down) based on
 * server-side price_snapshots comparison — persistent, cross-device.
 *
 * Key competitive advantage: no Israeli land investment platform shows
 * real-time price movement tracking. Madlan does it for apartments, not land.
 *
 * Collapsed by default. Positioned above FeaturedDeals on the left side.
 */
export default function PriceMovers({ onSelectPlot, plots = [] }) {
  const { raw: priceChanges } = usePriceChanges({ days: 30, minPct: 2 })
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelect = useCallback((plotId) => {
    if (!onSelectPlot || !plots.length) return
    const plot = plots.find(p => p.id === plotId)
    if (plot) {
      onSelectPlot(plot)
      setIsExpanded(false)
    }
  }, [onSelectPlot, plots])

  // Don't render if no price changes detected
  if (!priceChanges || priceChanges.length === 0) return null

  const drops = priceChanges.filter(c => c.direction === 'down')
  const rises = priceChanges.filter(c => c.direction === 'up')

  return (
    <div
      className="fixed z-[28] hidden sm:block"
      style={{ bottom: '24rem', left: '1rem' }}
      dir="rtl"
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold backdrop-blur-md border transition-all hover:scale-105 ${
          isExpanded
            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10'
            : 'bg-navy/80 border-white/10 text-slate-400 hover:text-blue-400 hover:border-blue-500/20'
        }`}
        aria-expanded={isExpanded}
        aria-label="שינויי מחירים אחרונים"
        title="חלקות ששינו מחיר לאחרונה"
      >
        <Activity className={`w-3.5 h-3.5 ${isExpanded ? 'text-blue-400' : ''}`} />
        <span>שינויי מחיר</span>
        <span className="flex items-center gap-1">
          {drops.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center">
              {drops.length}
            </span>
          )}
          {rises.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black flex items-center justify-center">
              {rises.length}
            </span>
          )}
        </span>
        {isExpanded
          ? <ChevronDown className="w-3 h-3 opacity-50" />
          : <ChevronUp className="w-3 h-3 opacity-50" />
        }
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          className="absolute bottom-full left-0 mb-2 w-72 bg-navy/95 backdrop-blur-xl border border-blue-500/15 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          style={{ animation: 'filter-dropdown-in 0.2s ease-out' }}
        >
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-blue-400/70 font-medium">
                <Activity className="w-3 h-3" />
                <span>שינויי מחיר — 30 ימים אחרונים</span>
              </div>
              <div className="flex items-center gap-2 text-[9px]">
                {drops.length > 0 && (
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <TrendingDown className="w-2.5 h-2.5" />
                    {drops.length} ירידות
                  </span>
                )}
                {rises.length > 0 && (
                  <span className="text-red-400 flex items-center gap-0.5">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {rises.length} עליות
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Price change cards — drops first (more interesting to investors) */}
          <div className="p-2 space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
            {[...drops, ...rises].slice(0, 8).map((change) => {
              const color = statusColors[change.status] || '#94A3B8'
              const isDown = change.direction === 'down'

              return (
                <button
                  key={change.plotId}
                  onClick={() => handleSelect(change.plotId)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-right group bg-white/[0.02] border border-transparent hover:bg-white/[0.05] hover:border-white/5"
                >
                  {/* Direction indicator */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isDown ? 'bg-emerald-500/15' : 'bg-red-500/15'
                  }`}>
                    {isDown
                      ? <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                      : <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                    }
                  </div>

                  {/* Plot info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-200 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      גוש {change.blockNumber} | חלקה {change.number}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {change.city}
                    </div>
                  </div>

                  {/* Price change */}
                  <div className="text-left flex-shrink-0">
                    <div className={`text-[11px] font-black ${isDown ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isDown ? '↓' : '↑'} {change.pctChange}%
                    </div>
                    <div className="text-[9px] text-slate-500 flex items-center gap-1 justify-end">
                      <span className="line-through opacity-50">{formatPriceShort(change.oldPrice)}</span>
                      <span>→</span>
                      <span className="font-medium text-slate-400">{formatPriceShort(change.currentPrice)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-white/5 text-center">
            <span className="text-[9px] text-slate-600">
              מעקב מחירים מבוסס צילומי מחיר יומיים · {priceChanges.length} שינויים
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
