import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, X, ArrowLeft, Share2, Check, ChevronUp, ChevronDown, TrendingUp, Ruler, Clock, DollarSign, Award } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels } from '../utils/constants'
import { formatPriceShort, calcInvestmentScore, getInvestmentGrade, calcCAGR, calcMonthlyPayment, formatMonthlyPayment } from '../utils/formatters'
import { showToast } from './ui/ToastContainer'

/**
 * Inline quick comparison grid — shows key investment metrics side-by-side
 * directly in the compare bar. Like Madlan's floating comparison panel,
 * this avoids navigating to /compare for quick decisions. Investors can
 * see price, ROI, size, zoning, and monthly payment at a glance.
 */
function QuickComparisonGrid({ plots }) {
  if (plots.length < 2) return null

  const metrics = useMemo(() => {
    const rows = []

    // Price row
    const prices = plots.map(p => p.total_price ?? p.totalPrice ?? 0)
    const minPrice = Math.min(...prices.filter(v => v > 0))
    rows.push({
      label: 'מחיר',
      icon: DollarSign,
      values: plots.map((p, i) => ({
        text: formatPriceShort(prices[i]),
        isBest: prices[i] === minPrice && prices[i] > 0,
      })),
    })

    // ROI row
    const rois = plots.map(p => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      return price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    })
    const maxRoi = Math.max(...rois)
    rows.push({
      label: 'תשואה',
      icon: TrendingUp,
      values: plots.map((p, i) => ({
        text: `+${rois[i]}%`,
        isBest: rois[i] === maxRoi && rois[i] > 0,
      })),
    })

    // Size row
    const sizes = plots.map(p => (p.size_sqm ?? p.sizeSqM ?? 0) / 1000)
    const maxSize = Math.max(...sizes)
    rows.push({
      label: 'שטח',
      icon: Ruler,
      values: plots.map((p, i) => ({
        text: `${sizes[i].toFixed(1)} דונם`,
        isBest: sizes[i] === maxSize && sizes[i] > 0,
      })),
    })

    // Price per dunam row
    const priceDunams = plots.map((p, i) => {
      const size = sizes[i]
      return size > 0 ? Math.round(prices[i] / size) : 0
    })
    const minPpd = Math.min(...priceDunams.filter(v => v > 0))
    rows.push({
      label: '₪/דונם',
      icon: BarChart3,
      values: plots.map((p, i) => ({
        text: priceDunams[i] > 0 ? `₪${priceDunams[i].toLocaleString()}` : '—',
        isBest: priceDunams[i] === minPpd && priceDunams[i] > 0,
      })),
    })

    // Monthly payment row
    const monthlies = plots.map(p => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const payment = calcMonthlyPayment(price)
      return payment ? payment.monthly : 0
    })
    const minMonthly = Math.min(...monthlies.filter(v => v > 0))
    rows.push({
      label: 'חודשי',
      icon: Clock,
      values: plots.map((p, i) => ({
        text: monthlies[i] > 0 ? formatMonthlyPayment(monthlies[i]) : '—',
        isBest: monthlies[i] === minMonthly && monthlies[i] > 0,
      })),
    })

    // Investment score row
    const scores = plots.map(p => p._investmentScore ?? calcInvestmentScore(p))
    const maxScore = Math.max(...scores)
    rows.push({
      label: 'דירוג',
      icon: Award,
      values: plots.map((p, i) => {
        const { grade, color } = getInvestmentGrade(scores[i])
        return {
          text: `${grade} (${scores[i]}/10)`,
          isBest: scores[i] === maxScore,
          color,
        }
      }),
    })

    return rows
  }, [plots])

  return (
    <div className="mt-2 overflow-x-auto scrollbar-none">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-white/5">
            <th className="py-1.5 pe-2 text-right text-slate-500 font-medium w-16" />
            {plots.map(plot => {
              const blockNum = plot.block_number ?? plot.blockNumber
              const color = statusColors[plot.status]
              return (
                <th key={plot.id} className="py-1.5 px-1.5 text-center font-medium min-w-[80px]">
                  <span className="text-slate-300">
                    {blockNum}/{plot.number}
                  </span>
                  <br />
                  <span className="text-[8px] font-normal" style={{ color }}>
                    {statusLabels[plot.status]}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {metrics.map((row, ri) => {
            const Icon = row.icon
            return (
              <tr key={ri} className="border-b border-white/[0.03] last:border-0">
                <td className="py-1 pe-2 text-right text-slate-500 whitespace-nowrap">
                  <div className="flex items-center gap-1 justify-end">
                    <span>{row.label}</span>
                    <Icon className="w-2.5 h-2.5 opacity-60" />
                  </div>
                </td>
                {row.values.map((val, ci) => (
                  <td
                    key={ci}
                    className="py-1 px-1.5 text-center whitespace-nowrap"
                  >
                    <span
                      className={`${val.isBest ? 'font-bold' : 'text-slate-400'}`}
                      style={{ color: val.color || (val.isBest ? '#C8942A' : undefined) }}
                    >
                      {val.text}
                      {val.isBest && <span className="ms-0.5 text-[8px]">👑</span>}
                    </span>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function CompareBar({ compareIds, plots, onRemove, onClear }) {
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  if (!compareIds || compareIds.length === 0) return null

  const comparePlots = compareIds
    .map((id) => plots.find((p) => p.id === id))
    .filter(Boolean)

  return (
    <div className="compare-bar" dir="rtl">
      <div className="compare-bar-inner">
        {/* Label */}
        <div className="compare-bar-label">
          <BarChart3 className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-slate-200">
            השוואה ({comparePlots.length}/3)
          </span>
          {/* Expand/collapse toggle — visible when 2+ plots for quick inline comparison */}
          {comparePlots.length >= 2 && (
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className="flex items-center gap-0.5 text-[10px] text-gold/70 hover:text-gold transition-colors ms-1 px-1.5 py-0.5 rounded-md hover:bg-gold/10"
              title={isExpanded ? 'הסתר השוואה מהירה' : 'הצג השוואה מהירה'}
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              <span className="hidden sm:inline">{isExpanded ? 'הסתר' : 'השוואה מהירה'}</span>
            </button>
          )}
        </div>

        {/* Plot chips */}
        <div className="compare-bar-chips">
          {comparePlots.map((plot) => {
            const color = statusColors[plot.status]
            const blockNum = plot.block_number ?? plot.blockNumber
            const price = plot.total_price ?? plot.totalPrice
            return (
              <div key={plot.id} className="compare-bar-chip" style={{ borderColor: `${color}40` }}>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                />
                <span className="text-xs text-slate-300 truncate">
                  {blockNum}/{plot.number} · {formatPriceShort(price)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(plot.id) }}
                  className="w-4 h-4 rounded-full bg-white/10 hover:bg-red-500/30 flex items-center justify-center transition flex-shrink-0"
                >
                  <X className="w-2.5 h-2.5 text-slate-400" />
                </button>
              </div>
            )
          })}

          {/* Empty slots */}
          {Array.from({ length: 3 - comparePlots.length }).map((_, i) => (
            <div key={`empty-${i}`} className="compare-bar-chip-empty">
              <span className="text-[10px] text-slate-600">+ בחר חלקה</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="compare-bar-actions">
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-red-400 transition"
          >
            נקה
          </button>
          {comparePlots.length >= 2 && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/compare?plots=${compareIds.join(',')}`
                navigator.clipboard.writeText(url).then(() => {
                  setLinkCopied(true)
                  showToast('🔗 קישור ההשוואה הועתק — שלח למשקיע אחר', 'success')
                  setTimeout(() => setLinkCopied(false), 2000)
                }).catch(() => {
                  showToast('לא הצלחנו להעתיק את הקישור', 'error')
                })
              }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-gold transition px-2 py-1 rounded-lg hover:bg-white/5"
              title="העתק קישור להשוואה"
            >
              {linkCopied ? <Check className="w-3 h-3 text-green-400" /> : <Share2 className="w-3 h-3" />}
              <span className="hidden sm:inline">{linkCopied ? 'הועתק!' : 'שתף'}</span>
            </button>
          )}
          <button
            onClick={() => navigate(`/compare?plots=${compareIds.join(',')}`)}
            disabled={comparePlots.length < 2}
            className="compare-bar-cta disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>השווה</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable inline comparison grid — instant side-by-side metrics
          without navigating to /compare page. Key metrics highlighted with 👑.
          Like Madlan's floating comparison that keeps investors in the map view. */}
      {isExpanded && comparePlots.length >= 2 && (
        <div className="px-3 pb-3 pt-1 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-200">
          <QuickComparisonGrid plots={comparePlots} />
        </div>
      )}
    </div>
  )
}
