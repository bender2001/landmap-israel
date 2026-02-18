import { useMemo } from 'react'
import { TrendingUp, Landmark, BarChart3, Building2, Coins } from 'lucide-react'
import { formatCurrency, calcCAGR } from '../../utils/formatters'

/**
 * InvestmentBenchmark — compares plot's expected annual return (CAGR) against
 * common alternative investments. Helps investors answer the critical question:
 * "Is this land deal better than putting my money elsewhere?"
 *
 * Benchmarks (current Israeli market, Feb 2026):
 *   - Bank deposit: ~4.5% (Bank of Israel base rate environment)
 *   - Government bonds: ~5.0% (Galil indexed)
 *   - S&P 500 avg: ~10% (historical long-term)
 *   - Israeli RE avg: ~7% (apartments, long-term avg)
 *
 * This is a differentiator vs Madlan/Yad2 — they don't show alt-investment context.
 */

const BENCHMARKS = [
  { id: 'deposit', label: 'פיקדון בנקאי', rate: 4.5, icon: Landmark, color: '#94A3B8', emoji: '🏦' },
  { id: 'bonds', label: 'אג״ח ממשלתי', rate: 5.0, icon: Coins, color: '#818CF8', emoji: '📜' },
  { id: 'realestate', label: 'נדל״ן ממוצע', rate: 7.0, icon: Building2, color: '#60A5FA', emoji: '🏠' },
  { id: 'sp500', label: 'S&P 500', rate: 10.0, icon: BarChart3, color: '#A78BFA', emoji: '📊' },
]

export default function InvestmentBenchmark({ totalPrice, projectedValue, readinessEstimate, className = '' }) {
  const analysis = useMemo(() => {
    if (!totalPrice || totalPrice <= 0 || !projectedValue || projectedValue <= totalPrice) return null

    const roi = ((projectedValue - totalPrice) / totalPrice) * 100
    const cagrData = calcCAGR(roi, readinessEstimate)
    if (!cagrData || cagrData.cagr <= 0) return null

    const { cagr, years } = cagrData

    // Calculate what each alternative would yield over the same period
    const plotFinal = totalPrice * Math.pow(1 + cagr / 100, years)
    const plotProfit = plotFinal - totalPrice

    const comparisons = BENCHMARKS.map(b => {
      const altFinal = totalPrice * Math.pow(1 + b.rate / 100, years)
      const altProfit = altFinal - totalPrice
      const advantage = plotProfit - altProfit
      const advantagePct = altProfit > 0 ? Math.round((advantage / altProfit) * 100) : 999
      return {
        ...b,
        altProfit,
        advantage,
        advantagePct,
        isBetter: cagr > b.rate,
      }
    })

    // Max rate for bar width normalization
    const maxRate = Math.max(cagr, ...BENCHMARKS.map(b => b.rate))

    // Determine verdict
    let verdict, verdictColor
    const betterCount = comparisons.filter(c => c.isBetter).length
    if (betterCount === 4) { verdict = 'עדיף על כל האלטרנטיבות'; verdictColor = '#22C55E' }
    else if (betterCount >= 3) { verdict = 'עדיף על רוב האלטרנטיבות'; verdictColor = '#84CC16' }
    else if (betterCount >= 2) { verdict = 'עדיף על חלק מהאלטרנטיבות'; verdictColor = '#EAB308' }
    else { verdict = 'תשואה נמוכה ביחס לאלטרנטיבות'; verdictColor = '#EF4444' }

    return { cagr, years, comparisons, maxRate, verdict, verdictColor, plotProfit, betterCount }
  }, [totalPrice, projectedValue, readinessEstimate])

  if (!analysis) return null

  return (
    <div className={`bg-navy-light/40 border border-white/5 rounded-xl p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-gold" />
          <span className="text-xs font-medium text-slate-200">השוואה להשקעות חלופיות</span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{
            color: analysis.verdictColor,
            background: `${analysis.verdictColor}15`,
            border: `1px solid ${analysis.verdictColor}30`,
          }}
        >
          {analysis.verdict}
        </span>
      </div>

      <div className="space-y-2">
        {/* Plot's CAGR bar (highlighted) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gold font-bold w-24 flex-shrink-0 truncate flex items-center gap-1">
            🏗️ חלקה זו
          </span>
          <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden relative">
            <div
              className="h-full rounded-full transition-all relative"
              style={{
                width: `${Math.min(100, (analysis.cagr / analysis.maxRate) * 100)}%`,
                background: 'linear-gradient(90deg, #C8942A, #E5B94E)',
              }}
            />
          </div>
          <span className="text-[10px] text-gold font-bold w-14 text-left flex-shrink-0">
            {analysis.cagr}%/שנה
          </span>
        </div>

        {/* Benchmark bars */}
        {analysis.comparisons.map(c => (
          <div key={c.id} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-24 flex-shrink-0 truncate flex items-center gap-1">
              {c.emoji} {c.label}
            </span>
            <div className="flex-1 h-3 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (c.rate / analysis.maxRate) * 100)}%`,
                  background: c.isBetter ? `${c.color}40` : c.color,
                  opacity: c.isBetter ? 0.5 : 0.8,
                }}
              />
            </div>
            <span className={`text-[10px] w-14 text-left flex-shrink-0 ${c.isBetter ? 'text-slate-500' : 'text-slate-300 font-medium'}`}>
              {c.rate}%/שנה
            </span>
          </div>
        ))}
      </div>

      {/* Advantage summary */}
      <div className="mt-3 pt-2.5 border-t border-white/5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">
            על השקעה של {formatCurrency(totalPrice)} לתקופה של {analysis.years} שנים:
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-1.5">
          <div className="text-center bg-gold/5 rounded-lg py-1.5 px-2">
            <div className="text-[9px] text-slate-500">רווח מהחלקה</div>
            <div className="text-xs font-bold text-gold">{formatCurrency(Math.round(analysis.plotProfit))}</div>
          </div>
          <div className="text-center bg-white/[0.03] rounded-lg py-1.5 px-2">
            <div className="text-[9px] text-slate-500">רווח מפיקדון</div>
            <div className="text-xs font-medium text-slate-400">{formatCurrency(Math.round(analysis.comparisons[0].altProfit))}</div>
          </div>
        </div>
        {analysis.comparisons[0].advantage > 0 && (
          <div className="text-[9px] text-emerald-400 text-center mt-1.5">
            ✨ עודף רווח של {formatCurrency(Math.round(analysis.comparisons[0].advantage))} מעל פיקדון בנקאי
          </div>
        )}
      </div>

      <p className="text-[8px] text-slate-600 mt-2">
        * ריביות משוערות, לפני מיסוי. תשואת החלקה מבוססת על הערכת שווי צפוי.
      </p>
    </div>
  )
}
