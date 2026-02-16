import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, X, Map, MapPin, Waves, TreePine, Hospital, TrendingUp, Award, Clock } from 'lucide-react'
import { useAllPlots } from '../../hooks/usePlots'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatCurrency } from '../../utils/formatters'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import Spinner from '../../components/ui/Spinner'

function CompareCell({ value, highlight = false, className = '' }) {
  return (
    <td className={`py-3 px-4 text-sm ${highlight ? 'text-gold font-bold' : 'text-slate-300'} ${className}`}>
      {value ?? '—'}
    </td>
  )
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams()
  const plotIds = (searchParams.get('plots') || '').split(',').filter(Boolean)
  const { data: allPlots = [], isLoading } = useAllPlots()

  const plots = useMemo(() => {
    return plotIds.map((id) => allPlots.find((p) => p.id === id)).filter(Boolean)
  }, [plotIds, allPlots])

  const removeFromCompare = (plotId) => {
    const next = plotIds.filter((id) => id !== plotId)
    if (next.length > 0) {
      setSearchParams({ plots: next.join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  // Helper to find best value in a row
  const bestValue = (getter, mode = 'max') => {
    const values = plots.map(getter).filter((v) => v != null)
    if (values.length === 0) return null
    return mode === 'max' ? Math.max(...values) : Math.min(...values)
  }

  return (
    <div className="min-h-screen bg-navy" dir="rtl">
      <PublicNav />

      <div className="pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">השוואת חלקות</h1>
              <p className="text-sm text-slate-400">
                {plots.length > 0 ? `${plots.length} חלקות להשוואה` : 'בחרו חלקות להשוואה'}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="w-10 h-10 text-gold" />
            </div>
          ) : plots.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-300 mb-2">אין חלקות להשוואה</h2>
              <p className="text-slate-500 mb-6">
                בחרו עד 3 חלקות מהמפה להשוואה מקיפה
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold hover:shadow-lg hover:shadow-gold/30 transition"
              >
                <Map className="w-5 h-5" />
                חזרה למפה
              </Link>
            </div>
          ) : (
            <div className="glass-panel p-0 overflow-hidden">
              <div
                className="h-[3px]"
                style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  {/* Header: plot cards */}
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-4 px-4 text-right text-slate-400 font-medium w-[140px]">חלקה</th>
                      {plots.map((plot) => {
                        const blockNum = plot.block_number ?? plot.blockNumber
                        const color = statusColors[plot.status]
                        return (
                          <th key={plot.id} className="py-4 px-4 text-right min-w-[180px]">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-base font-bold text-slate-100">
                                  גוש {blockNum} / {plot.number}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {plot.city}
                                </div>
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium mt-2"
                                  style={{ background: `${color}20`, color }}
                                >
                                  {statusLabels[plot.status]}
                                </span>
                              </div>
                              <button
                                onClick={() => removeFromCompare(plot.id)}
                                className="w-6 h-6 rounded-md bg-white/5 hover:bg-red-500/20 flex items-center justify-center transition"
                              >
                                <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                              </button>
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">מחיר</td>
                      {plots.map((p) => {
                        const price = p.total_price ?? p.totalPrice
                        const best = bestValue((pl) => pl.total_price ?? pl.totalPrice, 'min')
                        return <CompareCell key={p.id} value={formatCurrency(price)} highlight={price === best} />
                      })}
                    </tr>
                    {/* Size */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">שטח</td>
                      {plots.map((p) => {
                        const size = p.size_sqm ?? p.sizeSqM
                        const best = bestValue((pl) => pl.size_sqm ?? pl.sizeSqM, 'max')
                        return <CompareCell key={p.id} value={size ? `${size.toLocaleString()} מ"ר` : null} highlight={size === best} />
                      })}
                    </tr>
                    {/* Price/sqm */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">מחיר/מ"ר</td>
                      {plots.map((p) => {
                        const price = p.total_price ?? p.totalPrice
                        const size = p.size_sqm ?? p.sizeSqM
                        const ppsm = size ? Math.round(price / size) : null
                        const best = bestValue((pl) => {
                          const pr = pl.total_price ?? pl.totalPrice
                          const sz = pl.size_sqm ?? pl.sizeSqM
                          return sz ? Math.round(pr / sz) : null
                        }, 'min')
                        return <CompareCell key={p.id} value={ppsm ? `${ppsm.toLocaleString()} ₪` : null} highlight={ppsm === best} />
                      })}
                    </tr>
                    {/* Zoning */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">שלב ייעוד</td>
                      {plots.map((p) => (
                        <CompareCell key={p.id} value={zoningLabels[p.zoning_stage ?? p.zoningStage]} />
                      ))}
                    </tr>
                    {/* Projected Value */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">שווי צפוי</td>
                      {plots.map((p) => {
                        const val = p.projected_value ?? p.projectedValue
                        const best = bestValue((pl) => pl.projected_value ?? pl.projectedValue, 'max')
                        return <CompareCell key={p.id} value={val ? formatCurrency(val) : null} highlight={val === best} />
                      })}
                    </tr>
                    {/* ROI */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">תשואה צפויה</td>
                      {plots.map((p) => {
                        const price = p.total_price ?? p.totalPrice
                        const proj = p.projected_value ?? p.projectedValue
                        const roi = price && proj ? Math.round((proj - price) / price * 100) : null
                        const best = bestValue((pl) => {
                          const pr = pl.total_price ?? pl.totalPrice
                          const pj = pl.projected_value ?? pl.projectedValue
                          return pr && pj ? Math.round((pj - pr) / pr * 100) : null
                        }, 'max')
                        return <CompareCell key={p.id} value={roi != null ? `+${roi}%` : null} highlight={roi === best} />
                      })}
                    </tr>
                    {/* Readiness */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">מוכנות לבנייה</td>
                      {plots.map((p) => (
                        <CompareCell key={p.id} value={p.readiness_estimate ?? p.readinessEstimate} />
                      ))}
                    </tr>
                    {/* Committees - national */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">ועדה ארצית</td>
                      {plots.map((p) => (
                        <CompareCell key={p.id} value={p.committees?.national?.status === 'approved' ? 'אושר' : p.committees?.national?.status === 'pending' ? 'ממתין' : '—'} />
                      ))}
                    </tr>
                    {/* Distance to sea */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">מרחק מהים</td>
                      {plots.map((p) => {
                        const dist = p.distance_to_sea ?? p.distanceToSea
                        const best = bestValue((pl) => pl.distance_to_sea ?? pl.distanceToSea, 'min')
                        return <CompareCell key={p.id} value={dist != null ? `${dist} מ'` : null} highlight={dist === best} />
                      })}
                    </tr>
                    {/* Distance to park */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">מרחק מפארק</td>
                      {plots.map((p) => {
                        const dist = p.distance_to_park ?? p.distanceToPark
                        const best = bestValue((pl) => pl.distance_to_park ?? pl.distanceToPark, 'min')
                        return <CompareCell key={p.id} value={dist != null ? `${dist} מ'` : null} highlight={dist === best} />
                      })}
                    </tr>
                    {/* Distance to hospital */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">מרחק מביה"ח</td>
                      {plots.map((p) => {
                        const dist = p.distance_to_hospital ?? p.distanceToHospital
                        const best = bestValue((pl) => pl.distance_to_hospital ?? pl.distanceToHospital, 'min')
                        return <CompareCell key={p.id} value={dist != null ? `${dist} מ'` : null} highlight={dist === best} />
                      })}
                    </tr>
                    {/* Standard 22 */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">הערכת תקן 22</td>
                      {plots.map((p) => {
                        const s22 = p.standard22 ?? p.standard_22
                        return <CompareCell key={p.id} value={s22?.value ? formatCurrency(s22.value) : null} />
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-white/5 flex items-center justify-between">
                <Link
                  to="/"
                  className="text-sm text-slate-400 hover:text-gold transition"
                >
                  + הוסף חלקה להשוואה
                </Link>
                <button
                  onClick={() => setSearchParams({}, { replace: true })}
                  className="text-sm text-red-400 hover:text-red-300 transition"
                >
                  נקה הכל
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
