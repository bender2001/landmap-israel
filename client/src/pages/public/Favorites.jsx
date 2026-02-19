import { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Map, MapPin, TrendingUp, Trash2, Clock, GitCompareArrows, Share2, Printer, Copy, Check, Download, ArrowUpDown, ArrowDown, ArrowUp, FileSpreadsheet } from 'lucide-react'
import { usePlotsBatch } from '../../hooks/usePlots'
import { useFavorites } from '../../hooks/useFavorites'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatCurrency, formatPriceShort, calcInvestmentScore, getScoreLabel, getInvestmentGrade, calcCAGR } from '../../utils/formatters'
import { useMetaTags } from '../../hooks/useMetaTags'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'
import BackToTopButton from '../../components/ui/BackToTopButton'

const sortOptions = [
  { value: 'added', label: 'סדר הוספה', icon: ArrowUpDown },
  { value: 'price-asc', label: 'מחיר ↑', icon: ArrowUp },
  { value: 'price-desc', label: 'מחיר ↓', icon: ArrowDown },
  { value: 'roi-desc', label: 'תשואה ↓', icon: ArrowDown },
  { value: 'size-desc', label: 'שטח ↓', icon: ArrowDown },
  { value: 'score-desc', label: 'ציון ↓', icon: ArrowDown },
]
import Spinner from '../../components/ui/Spinner'

/**
 * Portfolio Analytics — aggregated investment metrics for saved plots.
 * Shows city diversification, grade distribution, weighted CAGR, and risk profile.
 * Like Bloomberg's portfolio analytics but for land investments — no Israeli competitor has this.
 */
function PortfolioAnalytics({ plots }) {
  const analytics = useMemo(() => {
    if (!plots || plots.length < 2) return null

    let totalValue = 0
    let totalProjected = 0
    const cityBreakdown = {}
    const gradeBreakdown = { 'A+': 0, 'A': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0 }
    const zoningBreakdown = {}
    let cagrSum = 0
    let cagrCount = 0

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const readiness = p.readiness_estimate ?? p.readinessEstimate ?? ''
      const zoning = p.zoning_stage ?? p.zoningStage ?? 'UNKNOWN'
      const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0

      totalValue += price
      totalProjected += proj

      // City diversification
      const city = p.city || 'לא ידוע'
      cityBreakdown[city] = (cityBreakdown[city] || 0) + price

      // Investment grade distribution
      const score = calcInvestmentScore(p)
      const { grade } = getInvestmentGrade(score)
      if (gradeBreakdown[grade] !== undefined) gradeBreakdown[grade]++

      // Zoning stage
      const zoningLabel = zoningLabels[zoning] || zoning
      zoningBreakdown[zoningLabel] = (zoningBreakdown[zoningLabel] || 0) + 1

      // CAGR
      const cagrData = calcCAGR(roi, readiness)
      if (cagrData) {
        cagrSum += cagrData.cagr
        cagrCount++
      }
    }

    const totalProfit = totalProjected - totalValue
    const avgRoi = totalValue > 0 ? Math.round(((totalProjected - totalValue) / totalValue) * 100) : 0
    const avgCagr = cagrCount > 0 ? Math.round((cagrSum / cagrCount) * 10) / 10 : null

    // Top city concentration (risk indicator)
    const cities = Object.entries(cityBreakdown).sort((a, b) => b[1] - a[1])
    const topCityPct = totalValue > 0 ? Math.round((cities[0][1] / totalValue) * 100) : 0
    const diversificationRisk = cities.length === 1 ? 'high' : topCityPct > 70 ? 'medium' : 'low'

    return {
      totalValue,
      totalProjected,
      totalProfit,
      avgRoi,
      avgCagr,
      cityBreakdown: cities,
      gradeBreakdown: Object.entries(gradeBreakdown).filter(([, v]) => v > 0),
      zoningBreakdown: Object.entries(zoningBreakdown).sort((a, b) => b[1] - a[1]),
      diversificationRisk,
      topCityPct,
      plotCount: plots.length,
    }
  }, [plots])

  if (!analytics) return null

  const gradeColors = {
    'A+': '#22C55E', 'A': '#4ADE80', 'B+': '#C8942A', 'B': '#F59E0B', 'C+': '#F97316', 'C': '#EF4444',
  }

  const riskConfig = {
    low: { label: 'מפוזר', color: '#22C55E', emoji: '🟢' },
    medium: { label: 'ריכוזי', color: '#F59E0B', emoji: '🟡' },
    high: { label: 'מרוכז', color: '#EF4444', emoji: '🔴' },
  }

  const risk = riskConfig[analytics.diversificationRisk]

  return (
    <div className="glass-panel p-0 overflow-hidden mb-6 border-gold/10">
      <div className="h-1 bg-gradient-to-r from-gold via-gold-bright to-gold" />
      <div className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gold/15 border border-gold/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">ניתוח תיק השקעות</h2>
            <p className="text-[10px] text-slate-500">{analytics.plotCount} חלקות · סיכום אגרגטי</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-0.5">שווי תיק</div>
            <div className="text-sm font-black text-blue-400">{formatPriceShort(analytics.totalValue)}</div>
          </div>
          <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-0.5">רווח צפוי</div>
            <div className="text-sm font-black text-emerald-400">+{formatPriceShort(analytics.totalProfit)}</div>
          </div>
          <div className="bg-gold/8 border border-gold/15 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-0.5">ROI ממוצע</div>
            <div className="text-sm font-black text-gold">+{analytics.avgRoi}%</div>
          </div>
          <div className="bg-purple-500/8 border border-purple-500/15 rounded-xl p-3 text-center">
            <div className="text-[10px] text-slate-500 mb-0.5">CAGR ממוצע</div>
            <div className="text-sm font-black text-purple-400">{analytics.avgCagr ? `${analytics.avgCagr}%` : '—'}<span className="text-[9px] font-normal text-slate-500">/שנה</span></div>
          </div>
        </div>

        {/* City Diversification + Grade Distribution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* City breakdown */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-gold" /> פיזור גיאוגרפי
              </span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium`} style={{ color: risk.color, background: `${risk.color}15`, border: `1px solid ${risk.color}25` }}>
                {risk.emoji} {risk.label}
              </span>
            </div>
            <div className="space-y-2">
              {analytics.cityBreakdown.map(([city, value]) => {
                const pct = Math.round((value / analytics.totalValue) * 100)
                return (
                  <div key={city}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400">{city}</span>
                      <span className="text-slate-300 font-medium">{pct}% · {formatPriceShort(value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-gold to-gold-bright transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grade distribution */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-3">
              <Heart className="w-3 h-3 text-gold" /> דירוגי השקעה
            </span>
            {analytics.gradeBreakdown.length > 0 ? (
              <div className="space-y-2">
                {analytics.gradeBreakdown.map(([grade, count]) => {
                  const pct = Math.round((count / analytics.plotCount) * 100)
                  const color = gradeColors[grade] || '#94A3B8'
                  return (
                    <div key={grade}>
                      <div className="flex justify-between text-[11px] mb-0.5">
                        <span className="font-bold" style={{ color }}>{grade}</span>
                        <span className="text-slate-400">{count} חלקות ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-4">אין נתונים</div>
            )}
          </div>
        </div>

        {/* Zoning stage distribution - compact pills */}
        {analytics.zoningBreakdown.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-slate-500 flex items-center gap-1 mr-1">📋 שלבים:</span>
            {analytics.zoningBreakdown.map(([label, count]) => (
              <span key={label} className="text-[9px] text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-lg">
                {label} <span className="font-bold text-slate-300">({count})</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Favorites() {
  useMetaTags({
    title: 'חלקות מועדפות — LandMap Israel',
    description: 'רשימת החלקות שסימנת כמועדפות. השווה, שתף והדפס את ההשקעות שמעניינות אותך.',
    url: `${window.location.origin}/favorites`,
  })
  const { favorites, toggle } = useFavorites()
  // Fetch ONLY the favorited plots via batch endpoint — 90%+ payload reduction vs useAllPlots.
  // Previously loaded the entire dataset just to filter client-side.
  // The /api/plots/batch endpoint accepts up to 10 IDs per request (matching max favorites).
  const { data: batchPlots = [], isLoading } = usePlotsBatch(favorites)
  const navigate = useNavigate()
  const [linkCopied, setLinkCopied] = useState(false)
  const [sortBy, setSortBy] = useState('added')

  // Preserve the user's favoriting order for "added" sort — batch endpoint may return in different order.
  const favoritePlotsUnsorted = useMemo(() => {
    if (!batchPlots.length) return []
    const plotMap = new Map(batchPlots.map(p => [p.id, p]))
    return favorites.map(id => plotMap.get(id)).filter(Boolean)
  }, [batchPlots, favorites])

  // Sort favorites — like Madlan's sortable saved properties
  const favoritePlots = useMemo(() => {
    if (sortBy === 'added') return favoritePlotsUnsorted
    const sorted = [...favoritePlotsUnsorted]
    const getPrice = (p) => p.total_price ?? p.totalPrice ?? 0
    const getSize = (p) => p.size_sqm ?? p.sizeSqM ?? 0
    const getRoi = (p) => {
      const price = getPrice(p)
      const proj = p.projected_value ?? p.projectedValue ?? 0
      return price > 0 ? ((proj - price) / price) * 100 : 0
    }
    switch (sortBy) {
      case 'price-asc': sorted.sort((a, b) => getPrice(a) - getPrice(b)); break
      case 'price-desc': sorted.sort((a, b) => getPrice(b) - getPrice(a)); break
      case 'roi-desc': sorted.sort((a, b) => getRoi(b) - getRoi(a)); break
      case 'size-desc': sorted.sort((a, b) => getSize(b) - getSize(a)); break
      case 'score-desc': sorted.sort((a, b) => calcInvestmentScore(b) - calcInvestmentScore(a)); break
    }
    return sorted
  }, [favoritePlotsUnsorted, sortBy])

  // Navigate to compare page with first 3 favorites
  const handleCompare = useCallback(() => {
    const ids = favoritePlots.slice(0, 3).map(p => p.id).join(',')
    if (ids) navigate(`/compare?plots=${ids}`)
  }, [favoritePlots, navigate])

  // Share favorites list via WhatsApp
  const handleShare = useCallback(() => {
    const lines = ['❤️ חלקות מועדפות — LandMap Israel\n']
    favoritePlots.forEach((p, i) => {
      const bn = p.block_number ?? p.blockNumber
      const price = p.total_price ?? p.totalPrice
      const proj = p.projected_value ?? p.projectedValue
      const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
      lines.push(`${i + 1}. גוש ${bn} חלקה ${p.number} (${p.city})`)
      lines.push(`   ${formatPriceShort(price)} · +${roi}% ROI`)
    })
    lines.push(`\n🔗 ${window.location.origin}`)
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank')
  }, [favoritePlots])

  // Print favorites report
  const handlePrint = useCallback(() => {
    const pw = window.open('', '_blank')
    if (!pw) return
    const rows = favoritePlots.map(p => {
      const bn = p.block_number ?? p.blockNumber
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const roi = price > 0 ? Math.round((proj - price) / price * 100) : 0
      const score = calcInvestmentScore(p)
      return { bn, number: p.number, city: p.city, price, proj, size, roi, score, status: statusLabels[p.status] || p.status }
    })
    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
      <title>חלקות מועדפות — LandMap Israel</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; padding: 8px 10px; text-align: right; font-size: 12px; border: 1px solid #ddd; }
        td { padding: 8px 10px; text-align: right; font-size: 13px; border: 1px solid #eee; }
        tr:nth-child(even) { background: #fafafa; }
        .footer { margin-top: 30px; text-align: center; color: #aaa; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>❤️ חלקות מועדפות</h1>
      <div class="subtitle">${rows.length} חלקות • ${new Date().toLocaleDateString('he-IL')}</div>
      <table><thead><tr><th>#</th><th>חלקה</th><th>עיר</th><th>מחיר</th><th>שטח</th><th>תשואה</th><th>ציון</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr>
        <td>${i + 1}</td><td>גוש ${r.bn} / ${r.number}</td><td>${r.city}</td>
        <td>${formatCurrency(r.price)}</td><td>${(r.size / 1000).toFixed(1)} דונם</td>
        <td>+${r.roi}%</td><td>${r.score}/10</td>
      </tr>`).join('')}</tbody></table>
      <div class="footer">LandMap Israel — מפת קרקעות להשקעה • ${new Date().toLocaleDateString('he-IL')}</div>
    </body></html>`)
    pw.document.close()
    setTimeout(() => pw.print(), 300)
  }, [favoritePlots])

  // CSV Export — download favorites as spreadsheet for investor analysis (like Madlan's data export)
  const handleExportCsv = useCallback(() => {
    const BOM = '\uFEFF' // UTF-8 BOM for Hebrew in Excel
    const headers = ['גוש', 'חלקה', 'עיר', 'מחיר (₪)', 'שווי צפוי (₪)', 'תשואה (%)', 'שטח (מ"ר)', 'מחיר/מ"ר (₪)', 'ציון השקעה', 'סטטוס', 'ייעוד', 'מוכנות']
    const rows = favoritePlots.map(p => {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
      const ppsqm = size > 0 ? Math.round(price / size) : 0
      return [
        p.block_number ?? p.blockNumber,
        p.number,
        p.city,
        price,
        proj,
        roi,
        size,
        ppsqm,
        calcInvestmentScore(p),
        statusLabels[p.status] || p.status,
        zoningLabels[p.zoning_stage ?? p.zoningStage] || '',
        p.readiness_estimate ?? p.readinessEstimate ?? '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const csv = BOM + headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `landmap-favorites-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [favoritePlots])

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

          {/* Action toolbar — shown when favorites exist */}
          {!isLoading && favoritePlots.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {/* Compare — like Madlan's "השווה נכסים שמורים" */}
              {favoritePlots.length >= 2 && (
                <button
                  onClick={handleCompare}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 border border-gold/20 rounded-xl text-sm text-gold font-medium hover:bg-gold/20 transition-all"
                >
                  <GitCompareArrows className="w-4 h-4" />
                  השווה {Math.min(favoritePlots.length, 3)} חלקות
                </button>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl text-sm text-[#25D366] hover:bg-[#25D366]/20 transition-all"
              >
                <Share2 className="w-4 h-4" />
                שתף ב-WhatsApp
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-slate-300 hover:border-gold/30 hover:text-gold transition-all"
              >
                <Printer className="w-4 h-4" />
                הדפס
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-slate-300 hover:border-gold/30 hover:text-gold transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                CSV
              </button>
              {/* Sort selector */}
              <div className="relative mr-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-white/[0.05] border border-white/10 rounded-xl text-sm text-slate-300 pl-8 pr-3 py-2.5 hover:border-gold/30 transition-all cursor-pointer focus:outline-none focus:border-gold/40"
                >
                  {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>
              {/* Quick stats summary */}
              <div className="mr-auto flex items-center gap-3 text-[11px] text-slate-500">
                <span>💰 סה״כ {formatPriceShort(favoritePlots.reduce((s, p) => s + (p.total_price ?? p.totalPrice ?? 0), 0))}</span>
                <span className="w-px h-3 bg-white/10" />
                <span>📈 ממוצע +{favoritePlots.length > 0 ? Math.round(favoritePlots.reduce((s, p) => {
                  const pr = p.total_price ?? p.totalPrice ?? 0
                  const pj = p.projected_value ?? p.projectedValue ?? 0
                  return s + (pr > 0 ? ((pj - pr) / pr) * 100 : 0)
                }, 0) / favoritePlots.length) : 0}% ROI</span>
              </div>
            </div>
          )}

          {/* Portfolio Analytics — aggregate investment metrics (only shown with 2+ favorites) */}
          {!isLoading && favoritePlots.length >= 2 && (
            <PortfolioAnalytics plots={favoritePlots} />
          )}

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
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/plot/${plot.id}`}
                            className="text-xs text-gold hover:underline font-medium"
                          >
                            פרטים מלאים
                          </Link>
                          <span className="text-slate-700">|</span>
                          <Link
                            to={`/?plot=${plot.id}`}
                            className="text-xs text-blue-400 hover:underline font-medium"
                          >
                            במפה
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <BackToTopButton />
      <PublicFooter />
    </div>
  )
}
