import { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { Lightbulb, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { formatPriceShort, calcInvestmentScore, calcCAGR } from '../utils/formatters'

/**
 * SmartInsights — AI-style rotating investment insights derived from current filter results.
 * Like Bloomberg Terminal's "market intelligence" bar — surfaces non-obvious patterns.
 *
 * Generates contextual insights such as:
 * - "3 plots are below area average — potential buying opportunities"
 * - "חדרה shows 15% higher ROI than נתניה on average"
 * - "Best value: גוש 10043 at ₪285/sqm vs ₪420/sqm average"
 * - "4 plots have A+ investment grade — strongest in your filter"
 *
 * Key differentiator vs Madlan/Yad2: they show raw data, we show intelligence.
 * Professional investors don't just want numbers — they want actionable insights.
 *
 * Rotates every 6 seconds with smooth crossfade animation.
 * Dismissible (persisted in session) to avoid annoying repeat visitors.
 */
const SmartInsights = memo(function SmartInsights({ plots }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const insights = useMemo(() => {
    if (!plots || plots.length < 3) return []
    const result = []

    // Helper functions
    const getPrice = (p) => p.total_price ?? p.totalPrice ?? 0
    const getSize = (p) => p.size_sqm ?? p.sizeSqM ?? 0
    const getProj = (p) => p.projected_value ?? p.projectedValue ?? 0
    const getRoi = (p) => {
      const price = getPrice(p)
      const proj = getProj(p)
      return price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    }
    const getPsm = (p) => {
      const price = getPrice(p)
      const size = getSize(p)
      return price > 0 && size > 0 ? price / size : 0
    }

    // ── 1. Yield spread insight ──────────────────────────────────
    const rois = plots.map(getRoi).filter(r => r > 0)
    if (rois.length >= 2) {
      const minRoi = Math.min(...rois)
      const maxRoi = Math.max(...rois)
      const spread = maxRoi - minRoi
      if (spread > 50) {
        result.push({
          emoji: '📊',
          text: `מרווח תשואות: ${minRoi}%–${maxRoi}% — פער ${spread}% בין החלקות`,
          type: 'analysis',
        })
      }
    }

    // ── 2. City comparison insight ───────────────────────────────
    const cityRois = {}
    for (const p of plots) {
      const city = p.city
      if (!city) continue
      if (!cityRois[city]) cityRois[city] = []
      const roi = getRoi(p)
      if (roi > 0) cityRois[city].push(roi)
    }
    const cityEntries = Object.entries(cityRois).filter(([, arr]) => arr.length >= 2)
    if (cityEntries.length >= 2) {
      const cityAvgs = cityEntries.map(([city, arr]) => ({
        city,
        avgRoi: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
      })).sort((a, b) => b.avgRoi - a.avgRoi)
      const best = cityAvgs[0]
      const worst = cityAvgs[cityAvgs.length - 1]
      if (best.avgRoi - worst.avgRoi >= 15) {
        result.push({
          emoji: '🏙️',
          text: `${best.city} מציעה תשואה ממוצעת +${best.avgRoi}% — גבוהה ב-${best.avgRoi - worst.avgRoi}% מ${worst.city}`,
          type: 'comparison',
        })
      }
    }

    // ── 3. Undervalued plots (below avg price/sqm) ──────────────
    const validPsm = plots.map(p => ({ plot: p, psm: getPsm(p) })).filter(x => x.psm > 0)
    if (validPsm.length >= 3) {
      const avgPsm = validPsm.reduce((s, x) => s + x.psm, 0) / validPsm.length
      const undervalued = validPsm.filter(x => x.psm < avgPsm * 0.85) // 15%+ below average
      if (undervalued.length > 0 && undervalued.length <= 5) {
        result.push({
          emoji: '💎',
          text: `${undervalued.length} חלקות מתומחרות 15%+ מתחת לממוצע — הזדמנות פוטנציאלית`,
          type: 'opportunity',
        })
      }
    }

    // ── 4. Best investment grade insight ─────────────────────────
    const grades = plots.map(p => ({
      plot: p,
      score: p._investmentScore ?? calcInvestmentScore(p),
    }))
    const topGrade = grades.filter(g => g.score >= 8)
    if (topGrade.length > 0 && topGrade.length <= plots.length * 0.4) {
      result.push({
        emoji: '⭐',
        text: `${topGrade.length} חלקות בדירוג A+ (8+/10) — ההשקעות החזקות ביותר בסינון הנוכחי`,
        type: 'highlight',
      })
    }

    // ── 5. CAGR insight — best annualized return ────────────────
    const cagrEntries = plots.map(p => {
      const roi = getRoi(p)
      const readiness = p.readiness_estimate ?? p.readinessEstimate ?? ''
      const cagrData = calcCAGR(roi, readiness)
      return cagrData ? { plot: p, cagr: cagrData.cagr, years: cagrData.years } : null
    }).filter(Boolean).sort((a, b) => b.cagr - a.cagr)

    if (cagrEntries.length >= 2) {
      const best = cagrEntries[0]
      const bn = best.plot.block_number ?? best.plot.blockNumber
      result.push({
        emoji: '🚀',
        text: `התשואה השנתית הגבוהה ביותר: גוש ${bn} עם ${best.cagr}%/שנה (${best.years} שנים)`,
        type: 'highlight',
      })
    }

    // ── 6. Total portfolio value insight ────────────────────────
    const totalValue = plots.reduce((s, p) => s + getPrice(p), 0)
    const totalProjected = plots.reduce((s, p) => s + getProj(p), 0)
    const totalProfit = totalProjected - totalValue
    if (totalProfit > 0 && totalValue > 0) {
      const portfolioRoi = Math.round((totalProfit / totalValue) * 100)
      result.push({
        emoji: '💰',
        text: `שווי תיק: ${formatPriceShort(totalValue)} → ${formatPriceShort(totalProjected)} — רווח פוטנציאלי +${portfolioRoi}%`,
        type: 'portfolio',
      })
    }

    // ── 7. New listings momentum ────────────────────────────────
    const now = Date.now()
    const newPlots = plots.filter(p => {
      const created = p.created_at ?? p.createdAt
      return created && (now - new Date(created).getTime()) < 7 * 86400000
    })
    if (newPlots.length > 0) {
      result.push({
        emoji: '🆕',
        text: `${newPlots.length} חלקות חדשות השבוע — השוק פעיל, כדאי לעקוב`,
        type: 'momentum',
      })
    }

    // ── 8. Price diversity insight ──────────────────────────────
    const prices = plots.map(getPrice).filter(p => p > 0)
    if (prices.length >= 3) {
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      if (maxPrice > minPrice * 3) {
        result.push({
          emoji: '📈',
          text: `טווח מחירים: ${formatPriceShort(minPrice)}–${formatPriceShort(maxPrice)} — מתאים לכל תקציב`,
          type: 'diversity',
        })
      }
    }

    return result
  }, [plots])

  // Auto-rotate
  useEffect(() => {
    if (insights.length <= 1 || isPaused) return
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % insights.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [insights.length, isPaused])

  // Reset index when insights change
  useEffect(() => {
    setCurrentIndex(0)
  }, [insights.length])

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % insights.length)
  }, [insights.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + insights.length) % insights.length)
  }, [insights.length])

  if (dismissed || insights.length === 0) return null

  const current = insights[currentIndex]

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 pointer-events-auto"
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="status"
      aria-live="polite"
      aria-label="תובנות השקעה"
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Lightbulb className="w-3 h-3 text-gold/60 flex-shrink-0" />
        <div className="flex items-center gap-1 overflow-hidden">
          <span className="text-[10px] font-bold text-gold/50 flex-shrink-0">תובנה:</span>
          <span
            key={currentIndex}
            className="text-[10px] text-slate-400 truncate animate-fade-in"
          >
            {current.emoji} {current.text}
          </span>
        </div>
      </div>

      {insights.length > 1 && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={goPrev}
            className="w-4 h-4 flex items-center justify-center rounded text-slate-500 hover:text-gold/70 transition-colors"
            aria-label="תובנה קודמת"
          >
            <ChevronRight className="w-2.5 h-2.5" />
          </button>
          <span className="text-[8px] text-slate-600 tabular-nums w-5 text-center">
            {currentIndex + 1}/{insights.length}
          </span>
          <button
            onClick={goNext}
            className="w-4 h-4 flex items-center justify-center rounded text-slate-500 hover:text-gold/70 transition-colors"
            aria-label="תובנה הבאה"
          >
            <ChevronLeft className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="w-4 h-4 flex items-center justify-center rounded text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
        aria-label="סגור תובנות"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  )
})

export default SmartInsights
