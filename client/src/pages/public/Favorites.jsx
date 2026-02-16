import { Link } from 'react-router-dom'
import { Heart, Map, MapPin, TrendingUp, Trash2, Clock } from 'lucide-react'
import { useAllPlots } from '../../hooks/usePlots'
import { useFavorites } from '../../hooks/useFavorites'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatters'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import Spinner from '../../components/ui/Spinner'

export default function Favorites() {
  const { favorites, toggle } = useFavorites()
  const { data: allPlots = [], isLoading } = useAllPlots()

  const favoritePlots = allPlots.filter((p) => favorites.includes(p.id))

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />

      <div className="pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">מועדפים</h1>
              <p className="text-sm text-slate-400">
                {favoritePlots.length > 0
                  ? `${favoritePlots.length} חלקות שמורות`
                  : 'לא שמרת חלקות עדיין'
                }
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="w-10 h-10 text-gold" />
            </div>
          ) : favoritePlots.length === 0 ? (
            /* Empty state */
            <div className="glass-panel p-12 text-center">
              <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-300 mb-2">אין חלקות מועדפות</h2>
              <p className="text-slate-500 mb-6">
                לחצו על לב ליד חלקה כדי לשמור אותה כאן
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold hover:shadow-lg hover:shadow-gold/30 transition"
              >
                <Map className="w-5 h-5" />
                גלו חלקות במפה
              </Link>
            </div>
          ) : (
            /* Plot cards grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {favoritePlots.map((plot) => {
                const price = plot.total_price ?? plot.totalPrice
                const projValue = plot.projected_value ?? plot.projectedValue
                const roi = Math.round((projValue - price) / price * 100)
                const blockNum = plot.block_number ?? plot.blockNumber
                const sizeSqm = plot.size_sqm ?? plot.sizeSqM
                const color = statusColors[plot.status]
                const readiness = plot.readiness_estimate ?? plot.readinessEstimate

                return (
                  <div
                    key={plot.id}
                    className="glass-panel p-0 overflow-hidden group hover:border-gold/30 transition-all card-lift"
                  >
                    {/* Color bar */}
                    <div className="h-1" style={{ background: color }} />

                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-100">
                            גוש {blockNum} | חלקה {plot.number}
                          </h3>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <MapPin className="w-3 h-3" />
                            {plot.city}
                          </div>
                        </div>
                        <button
                          onClick={() => toggle(plot.id)}
                          className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition"
                          title="הסר מהמועדפים"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>

                      {/* Status + Zoning */}
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: `${color}20`, color }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          {statusLabels[plot.status]}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                          {zoningLabels[plot.zoning_stage ?? plot.zoningStage]}
                        </span>
                      </div>

                      {/* Price + ROI */}
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <div className="text-xs text-slate-500">מחיר</div>
                          <div className="text-lg font-bold text-gold">{formatCurrency(price)}</div>
                        </div>
                        <div className="text-left">
                          <div className="text-xs text-slate-500">תשואה</div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-sm font-bold text-emerald-400">+{roi}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <span className="text-xs text-slate-500">
                          {sizeSqm?.toLocaleString()} מ"ר
                          {readiness && (
                            <span className="inline-flex items-center gap-1 mr-2">
                              <Clock className="w-3 h-3" />
                              {readiness}
                            </span>
                          )}
                        </span>
                        <Link
                          to={`/?plot=${plot.id}`}
                          className="text-xs text-gold hover:underline font-medium"
                        >
                          פרטים מלאים
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
