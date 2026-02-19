import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, X, Map, MapPin, Waves, TreePine, Hospital, TrendingUp, Award, Clock, Trophy, Crown, Share2, Printer, Check, Copy, Download, DollarSign, FileText } from 'lucide-react'
import { usePlotsBatch } from '../../hooks/usePlots'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatCurrency, calcInvestmentScore, calcMonthlyPayment, formatMonthlyPayment, calcCAGR } from '../../utils/formatters'
import { getPlotPrice, getPlotProjectedValue, getPlotSize, getPlotReadiness, calcTransactionCosts, calcExitCosts } from '../../utils/plot'
import { useMetaTags } from '../../hooks/useMetaTags'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Spinner from '../../components/ui/Spinner'

/**
 * Calculate full investment financials for a plot — used in the Net Profit Analysis section.
 * Uses centralized cost calculators from utils/plot.js for consistency across the app.
 */
function calcPlotFinancials(plot) {
  const price = getPlotPrice(plot)
  const projected = getPlotProjectedValue(plot)
  const sizeSqM = getPlotSize(plot)
  const readiness = getPlotReadiness(plot)
  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0

  const txn = calcTransactionCosts(price)
  const exit = calcExitCosts(price, projected)
  const totalInvestment = txn.totalWithPurchase

  const cagrData = calcCAGR(roi, readiness)

  return {
    price, projected, sizeSqM, roi, readiness,
    purchaseTax: txn.purchaseTax,
    attorneyFees: txn.attorneyFees,
    totalInvestment,
    grossProfit: projected - price,
    bettermentLevy: exit.bettermentLevy,
    capitalGains: exit.capitalGains,
    netProfit: exit.netProfit,
    netRoi: totalInvestment > 0 ? Math.round((exit.netProfit / totalInvestment) * 100) : 0,
    cagr: cagrData,
  }
}

/**
 * Net Profit Analysis Card — side-by-side financial summary showing the numbers
 * that actually matter to investors: total cost in, net profit out, and net ROI.
 * Like a mini P&L statement per plot. No competitor shows this level of clarity in comparisons.
 */
function NetProfitAnalysis({ plots }) {
  const financials = useMemo(() => plots.map(calcPlotFinancials), [plots])

  const bestNetProfit = Math.max(...financials.map(f => f.netProfit))
  const bestNetRoi = Math.max(...financials.map(f => f.netRoi))

  return (
    <div className="glass-panel p-6 mb-6 border-emerald-500/10">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
          <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">ניתוח רווחיות נטו</h3>
          <p className="text-[10px] text-slate-500">אחרי כל המיסים, היטלים ועלויות נלוות</p>
        </div>
      </div>

      <div className={`grid gap-4 ${plots.length === 3 ? 'grid-cols-3' : plots.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {plots.map((plot, i) => {
          const f = financials[i]
          const bn = plot.block_number ?? plot.blockNumber
          const isBestProfit = f.netProfit === bestNetProfit && plots.length > 1
          const isBestRoi = f.netRoi === bestNetRoi && plots.length > 1

          return (
            <div
              key={plot.id}
              className={`rounded-2xl p-4 border transition-all ${
                isBestProfit
                  ? 'bg-emerald-500/8 border-emerald-500/20'
                  : 'bg-white/[0.02] border-white/5'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PLOT_COLORS[i] }} />
                <span className="text-sm font-bold text-slate-200 truncate">גוש {bn}/{plot.number}</span>
                {isBestProfit && <span className="text-[9px] text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded mr-auto">👑 הכי רווחי</span>}
              </div>

              {/* Investment In */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">מחיר רכישה</span>
                  <span className="text-slate-300">{formatCurrency(f.price)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">מס רכישה (6%)</span>
                  <span className="text-slate-400">{formatCurrency(f.purchaseTax)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">שכ״ט עו״ד</span>
                  <span className="text-slate-400">{formatCurrency(f.attorneyFees)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium pt-1 border-t border-white/5">
                  <span className="text-blue-400">💰 סה״כ השקעה</span>
                  <span className="text-blue-400">{formatCurrency(f.totalInvestment)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">רווח גולמי</span>
                  <span className="text-emerald-400/70">{formatCurrency(f.grossProfit)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">היטל השבחה (50%)</span>
                  <span className="text-red-400/70">-{formatCurrency(f.bettermentLevy)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">מס שבח (25%)</span>
                  <span className="text-red-400/70">-{formatCurrency(f.capitalGains)}</span>
                </div>
              </div>

              {/* Bottom Line */}
              <div className={`rounded-xl p-3 ${f.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-300">✨ רווח נקי</span>
                  <span className={`text-lg font-black ${f.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(f.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">ROI נטו</span>
                  <span className={`font-bold ${isBestRoi ? 'text-gold' : 'text-slate-400'}`}>
                    {f.netRoi}%
                    {isBestRoi && plots.length > 1 ? ' 👑' : ''}
                  </span>
                </div>
                {f.cagr && (
                  <div className="flex justify-between text-[10px] mt-0.5">
                    <span className="text-slate-500">CAGR ({f.cagr.years} שנים)</span>
                    <span className="text-gold/80">{f.cagr.cagr}%/שנה</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[9px] text-slate-600 mt-3 text-center">
        ⚠️ חישוב משוער — אינו מהווה ייעוץ מס. מומלץ להתייעץ עם רו״ח לפני החלטת השקעה.
      </p>
    </div>
  )
}

// Plot colors for visual comparison charts
const PLOT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B']

/**
 * Visual bar chart comparing a single metric across plots.
 */
function CompareBarChart({ plots, label, getter, formatter, unit = '', mode = 'higher-better' }) {
  const values = plots.map(getter).filter(v => v != null)
  if (values.length === 0) return null
  const maxVal = Math.max(...values, 1)

  return (
    <div className="mb-6">
      <div className="text-xs font-medium text-slate-400 mb-2">{label}</div>
      <div className="space-y-2">
        {plots.map((plot, i) => {
          const val = getter(plot)
          if (val == null) return null
          const pct = (val / maxVal) * 100
          const blockNum = plot.block_number ?? plot.blockNumber
          const isBest = mode === 'higher-better' ? val === Math.max(...values) : val === Math.min(...values)
          return (
            <div key={plot.id} className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500 w-16 text-left flex-shrink-0 truncate">
                {blockNum}/{plot.number}
              </span>
              <div className="flex-1 h-6 rounded-lg bg-white/5 overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-2"
                  style={{
                    width: `${Math.max(pct, 8)}%`,
                    background: `linear-gradient(90deg, ${PLOT_COLORS[i]}40, ${PLOT_COLORS[i]}90)`,
                    borderRight: isBest ? `3px solid ${PLOT_COLORS[i]}` : 'none',
                  }}
                >
                  <span className={`text-[10px] font-bold ${isBest ? 'text-white' : 'text-white/70'}`}>
                    {formatter ? formatter(val) : val.toLocaleString()}{unit}
                  </span>
                </div>
              </div>
              {isBest && (
                <span className="text-[9px] text-gold font-bold flex-shrink-0">👑</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Radar chart comparing investment dimensions across plots.
 */
function CompareRadar({ plots }) {
  const dimensions = ['ROI', 'שטח', 'מיקום', 'תכנון', 'ציון']

  const getScores = (plot) => {
    const price = plot.total_price ?? plot.totalPrice ?? 0
    const proj = plot.projected_value ?? plot.projectedValue ?? 0
    const roi = price > 0 ? ((proj - price) / price) * 100 : 0
    const size = plot.size_sqm ?? plot.sizeSqM ?? 0
    const distSea = plot.distance_to_sea ?? plot.distanceToSea
    const investScore = calcInvestmentScore(plot)

    const zoningOrder = ['AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED', 'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT']
    const zoning = plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL'
    const zoningIdx = zoningOrder.indexOf(zoning)

    return [
      Math.min(10, roi / 25),                          // ROI: 250%+ = 10
      Math.min(10, size / 3000 * 10),                  // Size: 3000sqm = 10
      distSea != null ? Math.max(0, 10 - distSea / 500) : 5, // Location
      zoningIdx >= 0 ? (zoningIdx / 7) * 10 : 0,      // Planning stage
      investScore,                                       // Score
    ]
  }

  const cx = 100, cy = 100, r = 70
  const n = dimensions.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i, val) => {
    const angle = startAngle + i * angleStep
    const dist = (val / 10) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  return (
    <div className="glass-panel p-6 mb-6">
      <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
        <Award className="w-4 h-4 text-gold" />
        השוואה חזותית
      </h3>
      <svg viewBox="0 0 200 200" className="w-full max-w-[300px] mx-auto">
        {/* Grid */}
        {[2, 4, 6, 8, 10].map(level => {
          const points = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        })}
        {/* Axes */}
        {dimensions.map((_, i) => {
          const p = getPoint(i, 10)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        })}
        {/* Data polygons */}
        {plots.map((plot, pi) => {
          const scores = getScores(plot)
          const points = scores.map((s, i) => {
            const p = getPoint(i, s)
            return `${p.x},${p.y}`
          }).join(' ')
          return (
            <polygon
              key={plot.id}
              points={points}
              fill={`${PLOT_COLORS[pi]}15`}
              stroke={PLOT_COLORS[pi]}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          )
        })}
        {/* Data points */}
        {plots.map((plot, pi) => {
          const scores = getScores(plot)
          return scores.map((s, i) => {
            const p = getPoint(i, s)
            return <circle key={`${plot.id}-${i}`} cx={p.x} cy={p.y} r="3" fill={PLOT_COLORS[pi]} stroke="#1a1a2e" strokeWidth="1" />
          })
        })}
        {/* Labels */}
        {dimensions.map((d, i) => {
          const p = getPoint(i, 12.5)
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[9px] fill-slate-400">
              {d}
            </text>
          )
        })}
      </svg>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        {plots.map((plot, i) => {
          const blockNum = plot.block_number ?? plot.blockNumber
          return (
            <div key={plot.id} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full" style={{ background: PLOT_COLORS[i] }} />
              <span className="text-[10px] text-slate-400">גוש {blockNum}/{plot.number}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Winner Summary Card — shows which plot "wins" across the most comparison dimensions.
 * Like a TL;DR for the comparison: "Plot X is the best overall pick."
 */
function WinnerSummary({ plots }) {
  const criteria = [
    { label: 'מחיר נמוך', getter: (p) => p.total_price ?? p.totalPrice ?? Infinity, mode: 'min' },
    { label: 'שטח גדול', getter: (p) => p.size_sqm ?? p.sizeSqM ?? 0, mode: 'max' },
    { label: 'תשואה גבוהה', getter: (p) => { const pr = p.total_price ?? p.totalPrice ?? 0; const pj = p.projected_value ?? p.projectedValue ?? 0; return pr > 0 ? (pj - pr) / pr : 0 }, mode: 'max' },
    { label: 'מחיר/מ״ר', getter: (p) => { const pr = p.total_price ?? p.totalPrice ?? 0; const sz = p.size_sqm ?? p.sizeSqM ?? 1; return sz > 0 ? pr / sz : Infinity }, mode: 'min' },
    { label: 'ציון השקעה', getter: (p) => calcInvestmentScore(p), mode: 'max' },
    { label: 'קרבה לים', getter: (p) => p.distance_to_sea ?? p.distanceToSea ?? Infinity, mode: 'min' },
  ]

  // Count wins per plot
  const wins = {}
  plots.forEach(p => { wins[p.id] = { count: 0, categories: [] } })

  criteria.forEach(({ label, getter, mode }) => {
    const values = plots.map(p => ({ id: p.id, val: getter(p) }))
    const best = mode === 'max'
      ? Math.max(...values.map(v => v.val))
      : Math.min(...values.map(v => v.val))
    values.forEach(v => {
      if (v.val === best && isFinite(best)) {
        wins[v.id].count++
        wins[v.id].categories.push(label)
      }
    })
  })

  const sorted = plots.map(p => ({ plot: p, ...wins[p.id] })).sort((a, b) => b.count - a.count)
  const winner = sorted[0]
  if (!winner || winner.count === 0) return null

  const blockNum = winner.plot.block_number ?? winner.plot.blockNumber
  const isTie = sorted.length > 1 && sorted[1].count === winner.count

  return (
    <div className="glass-panel p-5 mb-6 border-gold/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">
            {isTie ? 'תיקו!' : `🏆 המנצח: גוש ${blockNum} חלקה ${winner.plot.number}`}
          </h3>
          <p className="text-[11px] text-slate-400">
            {isTie
              ? `שתי חלקות מובילות ב-${winner.count} קטגוריות כל אחת`
              : `מוביל ב-${winner.count} מתוך ${criteria.length} קטגוריות`
            }
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map(({ plot, count, categories }, i) => {
          const bn = plot.block_number ?? plot.blockNumber
          return (
            <div
              key={plot.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
                i === 0 ? 'bg-gold/10 border border-gold/20 text-gold' : 'bg-white/5 border border-white/5 text-slate-400'
              }`}
            >
              {i === 0 && <Crown className="w-3.5 h-3.5" />}
              <span className="font-medium">{bn}/{plot.number}</span>
              <span className="text-[10px] opacity-70">{count} ניצחונות</span>
              {categories.length > 0 && (
                <span className="text-[9px] opacity-50">({categories.slice(0, 3).join(', ')})</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompareCell({ value, highlight = false, className = '' }) {
  return (
    <td className={`py-3 px-4 text-sm ${highlight ? 'text-gold font-bold' : 'text-slate-300'} ${className}`}>
      {value ?? '—'}
    </td>
  )
}

export default function Compare() {
  useMetaTags({
    title: 'השוואת חלקות — LandMap Israel',
    description: 'השוואה מפורטת בין חלקות קרקע: מחירים, תשואות, מיקום, שלבי תכנון ואיכות השקעה.',
    url: `${window.location.origin}/compare`,
  })

  const [searchParams, setSearchParams] = useSearchParams()
  // Hydrate plot IDs from URL params, falling back to localStorage.
  // This lets users navigate directly to /compare after adding plots on the map
  // without needing the ?plots= URL parameter.
  const plotIds = useMemo(() => {
    const fromUrl = (searchParams.get('plots') || '').split(',').filter(Boolean)
    if (fromUrl.length > 0) return fromUrl
    try {
      const stored = JSON.parse(localStorage.getItem('landmap_compare') || '[]')
      return Array.isArray(stored) ? stored.filter(Boolean) : []
    } catch { return [] }
  }, [searchParams])

  // Sync URL with localStorage IDs on mount (so shareable URL works)
  useEffect(() => {
    if (plotIds.length > 0 && !searchParams.get('plots')) {
      setSearchParams({ plots: plotIds.join(',') }, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Batch fetch only the compared plots instead of loading ALL plots (~90% payload reduction)
  const { data: plots = [], isLoading } = usePlotsBatch(plotIds)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleShareComparison = useCallback(() => {
    const url = `${window.location.origin}/compare?plots=${plotIds.join(',')}`
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }).catch(() => {
      // Fallback for older browsers / insecure context
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.cssText = 'position:fixed;left:-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }, [plotIds])

  const removeFromCompare = useCallback((plotId) => {
    const next = plotIds.filter((id) => id !== plotId)
    // Also update localStorage to stay in sync with MapView
    try { localStorage.setItem('landmap_compare', JSON.stringify(next)) } catch {}
    if (next.length > 0) {
      setSearchParams({ plots: next.join(',') }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [plotIds, setSearchParams])

  // Helper to find best value in a row
  const bestValue = (getter, mode = 'max') => {
    const values = plots.map(getter).filter((v) => v != null)
    if (values.length === 0) return null
    return mode === 'max' ? Math.max(...values) : Math.min(...values)
  }

  return (
    <div className="min-h-screen bg-navy compare-page-container" dir="rtl">
      <PublicNav />

      <div className="pt-28 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <Breadcrumb
            items={[
              { label: 'מפה', to: '/' },
              { label: 'השוואת חלקות' },
            ]}
            className="mb-4"
          />
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-gold" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-100">השוואת חלקות</h1>
              <p className="text-sm text-slate-400">
                {plots.length > 0 ? `${plots.length} חלקות להשוואה` : 'בחרו חלקות להשוואה'}
              </p>
            </div>
            {/* Share comparison — generates a shareable URL with all compared plot IDs.
                Essential for investor teams who discuss deals via WhatsApp/email. */}
            {plots.length >= 2 && (
              <div className="flex items-center gap-2" data-print-hide>
                {/* Print comparison — like Bloomberg's "Print Report" for investor meetings.
                    Uses @media print styles in index.css for clean paper output. */}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:border-gold/20 hover:text-gold transition-all"
                  title="הדפס השוואה"
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">הדפס</span>
                </button>
                <button
                  onClick={handleShareComparison}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    linkCopied
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:border-gold/20 hover:text-gold'
                  }`}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  <span className="hidden sm:inline">{linkCopied ? 'הועתק!' : 'שתף השוואה'}</span>
                </button>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `📊 השוואת חלקות להשקעה\n${plots.map(p => {
                      const bn = p.block_number ?? p.blockNumber
                      const price = p.total_price ?? p.totalPrice ?? 0
                      const proj = p.projected_value ?? p.projectedValue ?? 0
                      const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
                      return `• גוש ${bn}/${p.number} (${p.city}) — ₪${Math.round(price/1000)}K · +${roi}%`
                    }).join('\n')}\n\n${window.location.origin}/compare?plots=${plotIds.join(',')}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center bg-[#25D366]/15 border border-[#25D366]/25 rounded-xl hover:bg-[#25D366]/25 transition-all"
                  title="שתף בוואטסאפ"
                >
                  <svg className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>
              </div>
            )}
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
            <>
            {/* Winner summary */}
            {plots.length >= 2 && <WinnerSummary plots={plots} />}

            {/* Net Profit Analysis — the bottom line every investor wants.
                Shows total investment cost, all deductions, and net profit side-by-side.
                No competitor offers this level of financial transparency in comparisons. */}
            {plots.length >= 1 && <NetProfitAnalysis plots={plots} />}

            {/* Visual comparison charts */}
            {plots.length >= 2 && (
              <>
                <CompareRadar plots={plots} />

                <div className="glass-panel p-6 mb-6">
                  <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gold" />
                    השוואה מספרית
                  </h3>
                  <CompareBarChart
                    plots={plots}
                    label="מחיר (נמוך יותר = טוב יותר)"
                    getter={(p) => p.total_price ?? p.totalPrice}
                    formatter={formatCurrency}
                    mode="lower-better"
                  />
                  <CompareBarChart
                    plots={plots}
                    label="תשואה צפויה (%)"
                    getter={(p) => {
                      const price = p.total_price ?? p.totalPrice ?? 0
                      const proj = p.projected_value ?? p.projectedValue ?? 0
                      return price > 0 ? Math.round((proj - price) / price * 100) : 0
                    }}
                    unit="%"
                    mode="higher-better"
                  />
                  <CompareBarChart
                    plots={plots}
                    label="שטח (מ״ר)"
                    getter={(p) => p.size_sqm ?? p.sizeSqM}
                    unit=" מ״ר"
                    mode="higher-better"
                  />
                  <CompareBarChart
                    plots={plots}
                    label="מחיר למ״ר (נמוך = טוב)"
                    getter={(p) => {
                      const price = p.total_price ?? p.totalPrice ?? 0
                      const size = p.size_sqm ?? p.sizeSqM ?? 1
                      return Math.round(price / size)
                    }}
                    formatter={(v) => `₪${v.toLocaleString()}`}
                    mode="lower-better"
                  />
                  <CompareBarChart
                    plots={plots}
                    label="ציון השקעה"
                    getter={(p) => calcInvestmentScore(p)}
                    unit="/10"
                    mode="higher-better"
                  />
                </div>
              </>
            )}

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
                    {/* Monthly Payment */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">תשלום חודשי*</td>
                      {plots.map((p) => {
                        const price = p.total_price ?? p.totalPrice
                        const payment = calcMonthlyPayment(price)
                        const best = bestValue((pl) => {
                          const pm = calcMonthlyPayment(pl.total_price ?? pl.totalPrice)
                          return pm ? pm.monthly : null
                        }, 'min')
                        return <CompareCell key={p.id} value={payment ? formatMonthlyPayment(payment.monthly) : null} highlight={payment && payment.monthly === best} />
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
                    {/* CAGR */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">CAGR שנתי</td>
                      {plots.map((p) => {
                        const f = calcPlotFinancials(p)
                        const bestCagr = Math.max(...plots.map(pl => {
                          const pf = calcPlotFinancials(pl)
                          return pf.cagr ? pf.cagr.cagr : 0
                        }))
                        return <CompareCell key={p.id} value={f.cagr ? `${f.cagr.cagr}%/שנה (${f.cagr.years}ש׳)` : null} highlight={f.cagr && f.cagr.cagr === bestCagr} />
                      })}
                    </tr>
                    {/* Net Profit */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] bg-emerald-500/[0.03]">
                      <td className="py-3 px-4 text-sm text-emerald-400 font-bold">✨ רווח נקי</td>
                      {plots.map((p) => {
                        const f = calcPlotFinancials(p)
                        const bestNet = Math.max(...plots.map(pl => calcPlotFinancials(pl).netProfit))
                        return (
                          <td key={p.id} className={`py-3 px-4 text-sm font-bold ${f.netProfit === bestNet && plots.length > 1 ? 'text-emerald-400' : f.netProfit >= 0 ? 'text-emerald-400/70' : 'text-red-400'}`}>
                            {formatCurrency(f.netProfit)}
                          </td>
                        )
                      })}
                    </tr>
                    {/* Net ROI */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02] bg-emerald-500/[0.03]">
                      <td className="py-3 px-4 text-sm text-emerald-400/80 font-medium">ROI נטו</td>
                      {plots.map((p) => {
                        const f = calcPlotFinancials(p)
                        const bestNetRoi = Math.max(...plots.map(pl => calcPlotFinancials(pl).netRoi))
                        return <CompareCell key={p.id} value={`${f.netRoi}%`} highlight={f.netRoi === bestNetRoi && plots.length > 1} />
                      })}
                    </tr>
                    {/* Section separator */}
                    <tr><td colSpan={plots.length + 1} className="py-1 bg-white/[0.02]" /></tr>
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
                    {/* Investment Score */}
                    <tr className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-3 px-4 text-sm text-slate-400 font-medium">ציון השקעה</td>
                      {plots.map((p) => {
                        const score = calcInvestmentScore(p)
                        const bestScore = Math.max(...plots.map(pl => calcInvestmentScore(pl)))
                        const isBest = score === bestScore && plots.length > 1
                        return (
                          <td key={p.id} className="py-3 px-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden max-w-[80px]">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${score * 10}%`,
                                    background: score >= 8 ? '#22C55E' : score >= 6 ? '#84CC16' : score >= 4 ? '#F59E0B' : '#EF4444',
                                  }}
                                />
                              </div>
                              <span className={`font-bold ${isBest ? 'text-gold' : 'text-slate-300'}`}>
                                {score}/10 {isBest ? '👑' : ''}
                              </span>
                            </div>
                          </td>
                        )
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

              {/* Footnote */}
              <div className="px-4 pt-2 pb-0">
                <p className="text-[9px] text-slate-600">* תשלום חודשי משוער: 50% הון עצמי, ריבית 6%, תקופה 15 שנה. לסימולציה מלאה ראה מחשבון המימון בעמוד החלקה.</p>
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
                  onClick={() => {
                    try { localStorage.setItem('landmap_compare', '[]') } catch {}
                    setSearchParams({}, { replace: true })
                  }}
                  className="text-sm text-red-400 hover:text-red-300 transition"
                >
                  נקה הכל
                </button>
              </div>
            </div>

            {/* Share, Print, Export toolbar — like Madlan's comparison sharing */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 2000)
                  }).catch(() => {})
                }}
                className={`flex items-center gap-2 px-5 py-2.5 border rounded-xl text-sm transition-all ${
                  linkCopied
                    ? 'bg-green-500/15 border-green-500/30 text-green-400'
                    : 'bg-white/[0.05] border-white/10 text-slate-300 hover:border-gold/30 hover:text-gold'
                }`}
              >
                {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? 'הועתק!' : 'שתף השוואה'}
              </button>
              <button
                onClick={() => {
                  // Build WhatsApp share text
                  const lines = ['📊 השוואת חלקות — LandMap Israel\n']
                  plots.forEach((p, i) => {
                    const bn = p.block_number ?? p.blockNumber
                    const price = p.total_price ?? p.totalPrice
                    const proj = p.projected_value ?? p.projectedValue
                    const size = p.size_sqm ?? p.sizeSqM
                    const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
                    lines.push(`${i + 1}. גוש ${bn} חלקה ${p.number} (${p.city})`)
                    lines.push(`   💰 ${formatCurrency(price)} | 📐 ${(size / 1000).toFixed(1)} דונם | 📈 +${roi}%`)
                  })
                  lines.push(`\n🔗 ${window.location.href}`)
                  const text = encodeURIComponent(lines.join('\n'))
                  window.open(`https://wa.me/?text=${text}`, '_blank')
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl text-sm text-[#25D366] hover:bg-[#25D366]/20 transition-all"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={() => {
                  // Generate printable comparison report
                  const pw = window.open('', '_blank')
                  if (!pw) return
                  const rows = plots.map(p => {
                    const bn = p.block_number ?? p.blockNumber
                    const price = p.total_price ?? p.totalPrice ?? 0
                    const proj = p.projected_value ?? p.projectedValue ?? 0
                    const size = p.size_sqm ?? p.sizeSqM ?? 0
                    const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
                    const score = calcInvestmentScore(p)
                    return { bn, number: p.number, city: p.city, price, proj, size, roi, score, status: statusLabels[p.status] || p.status, zoning: zoningLabels[p.zoning_stage ?? p.zoningStage] || '' }
                  })
                  const winner = rows.length >= 2 ? rows.reduce((best, r) => r.score > best.score ? r : best, rows[0]) : null
                  pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
                    <title>השוואת חלקות — LandMap Israel</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.5; }
                      h1 { font-size: 22px; margin-bottom: 4px; }
                      .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                      th { background: #f0f0f0; padding: 10px 12px; text-align: right; font-size: 12px; border: 1px solid #ddd; }
                      td { padding: 10px 12px; text-align: right; font-size: 13px; border: 1px solid #eee; }
                      tr:nth-child(even) { background: #fafafa; }
                      .highlight { background: #FFFBEB !important; font-weight: 700; }
                      .winner { background: #F0FDF4; border: 2px solid #22C55E; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
                      .footer { margin-top: 30px; text-align: center; color: #aaa; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
                      @media print { body { padding: 20px; } }
                    </style></head><body>
                    <h1>📊 השוואת חלקות — LandMap Israel</h1>
                    <div class="subtitle">${rows.length} חלקות להשוואה • ${new Date().toLocaleDateString('he-IL')}</div>
                    ${winner ? `<div class="winner">🏆 <strong>המנצחת:</strong> גוש ${winner.bn} חלקה ${winner.number} (${winner.city}) — ציון השקעה ${winner.score}/10, תשואה +${winner.roi}%</div>` : ''}
                    <table>
                      <thead><tr>
                        <th>חלקה</th><th>עיר</th><th>מחיר</th><th>שטח</th><th>שווי צפוי</th><th>תשואה</th><th>ציון</th><th>ייעוד</th><th>סטטוס</th>
                      </tr></thead>
                      <tbody>${rows.map(r => `<tr${winner && r.score === winner.score ? ' class="highlight"' : ''}>
                        <td>גוש ${r.bn} / ${r.number}</td>
                        <td>${r.city}</td>
                        <td>${formatCurrency(r.price)}</td>
                        <td>${(r.size / 1000).toFixed(1)} דונם</td>
                        <td>${formatCurrency(r.proj)}</td>
                        <td>+${r.roi}%</td>
                        <td>${r.score}/10</td>
                        <td>${r.zoning}</td>
                        <td>${r.status}</td>
                      </tr>`).join('')}</tbody>
                    </table>
                    <div class="footer">
                      <div>LandMap Israel — מפת קרקעות להשקעה</div>
                      <div>${window.location.href}</div>
                      <div style="margin-top:6px">⚠️ מסמך זה הינו לצרכי מידע בלבד ואינו מהווה ייעוץ השקעות</div>
                    </div>
                  </body></html>`)
                  pw.document.close()
                  setTimeout(() => pw.print(), 300)
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-slate-300 hover:border-gold/30 hover:text-gold transition-all"
              >
                <Printer className="w-4 h-4" />
                הדפס דוח
              </button>
            </div>
            </>
          )}
        </div>
      </div>

      <BackToTopButton />
      <PublicFooter />
    </div>
  )
}
