import { useRef, useEffect } from 'react'
import { TrendingUp, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels } from '../utils/constants'
import { formatPriceShort } from '../utils/formatters'

export default function PlotCardStrip({ plots, selectedPlot, onSelectPlot }) {
  const scrollRef = useRef(null)

  // Scroll to selected card
  useEffect(() => {
    if (!selectedPlot || !scrollRef.current) return
    const card = scrollRef.current.querySelector(`[data-plot-id="${selectedPlot.id}"]`)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [selectedPlot?.id])

  if (!plots || plots.length === 0) return null

  const scroll = (dir) => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 260, behavior: 'smooth' })
  }

  return (
    <div className="plot-card-strip absolute bottom-4 left-0 right-0 z-[25] pointer-events-none px-2 sm:px-4">
      <div className="relative pointer-events-auto">
        {/* Scroll arrows (desktop) */}
        <button
          onClick={() => scroll(-1)}
          className="plot-strip-arrow plot-strip-arrow-right hidden sm:flex"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll(1)}
          className="plot-strip-arrow plot-strip-arrow-left hidden sm:flex"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Cards */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-1 px-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {plots.map((plot) => {
            const color = statusColors[plot.status]
            const price = plot.total_price ?? plot.totalPrice
            const projValue = plot.projected_value ?? plot.projectedValue
            const roi = Math.round((projValue - price) / price * 100)
            const blockNum = plot.block_number ?? plot.blockNumber
            const readiness = plot.readiness_estimate ?? plot.readinessEstimate
            const isSelected = selectedPlot?.id === plot.id

            return (
              <div
                key={plot.id}
                data-plot-id={plot.id}
                onClick={() => onSelectPlot(plot)}
                className={`plot-card-mini flex-shrink-0 cursor-pointer transition-all duration-200 ${
                  isSelected ? 'plot-card-mini-selected' : ''
                }`}
                style={{
                  scrollSnapAlign: 'center',
                  '--card-color': color,
                }}
              >
                {/* Top color line */}
                <div className="h-0.5 rounded-t-xl" style={{ background: color }} />

                <div className="px-3 py-2.5">
                  {/* Title row */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-200 truncate">
                      גוש {blockNum} | חלקה {plot.number}
                    </span>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                      style={{ background: `${color}20`, color }}
                    >
                      {statusLabels[plot.status]}
                    </span>
                  </div>

                  {/* City */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-2">
                    <MapPin className="w-2.5 h-2.5" />
                    {plot.city}
                  </div>

                  {/* Price + ROI row */}
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-sm font-bold text-gold">{formatPriceShort(price)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        +{roi}%
                      </span>
                      {readiness && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {readiness}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
