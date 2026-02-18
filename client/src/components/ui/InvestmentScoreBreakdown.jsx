import { useMemo } from 'react'
import { calcInvestmentScoreBreakdown, generateInvestmentNarrative } from '../../utils/formatters'

/**
 * Investment Score Breakdown — transparent, factor-by-factor scoring display.
 * Like Madlan's property rating breakdown — shows WHY a plot scored what it did.
 *
 * Renders:
 * 1. Overall grade badge (S&P-style: A+, A, B+, etc.)
 * 2. Individual factor bars with scores and explanations
 * 3. Auto-generated investment narrative
 *
 * @param {{ plot: Object, areaAvgPriceSqm?: number, compact?: boolean }} props
 */
export default function InvestmentScoreBreakdown({ plot, areaAvgPriceSqm, compact = false }) {
  const breakdown = useMemo(
    () => calcInvestmentScoreBreakdown(plot, { areaAvgPriceSqm }),
    [plot, areaAvgPriceSqm]
  )

  const narrative = useMemo(
    () => generateInvestmentNarrative(plot, { areaAvgPriceSqm, cityName: plot?.city }),
    [plot, areaAvgPriceSqm]
  )

  if (!breakdown) return null

  const { total, grade, factors } = breakdown

  // Compact mode — just the grade badge + mini bars
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2"
          style={{
            color: grade.color,
            borderColor: `${grade.color}40`,
            backgroundColor: `${grade.color}15`,
          }}
        >
          {grade.grade}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {factors.slice(0, 3).map(f => (
            <div key={f.key} className="flex items-center gap-1.5">
              <span className="text-[8px] text-slate-500 w-10 truncate">{f.label}</span>
              <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.round(f.score * 100)}%`,
                    backgroundColor: f.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-navy-light/40 border border-white/5 rounded-xl p-4" dir="rtl">
      {/* Header — grade + score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 shadow-lg"
            style={{
              color: grade.color,
              borderColor: `${grade.color}40`,
              backgroundColor: `${grade.color}15`,
              boxShadow: `0 4px 12px ${grade.color}20`,
            }}
          >
            {grade.grade}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-200">ציון השקעה: {total}/10</div>
            <div className="text-[10px] text-slate-500">
              על בסיס {factors.length} פרמטרים
            </div>
          </div>
        </div>
      </div>

      {/* Factor bars */}
      <div className="space-y-2.5 mb-3">
        {factors.map(f => (
          <div key={f.key} className="group">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{f.emoji}</span>
                <span className="text-[11px] font-medium text-slate-300">{f.label}</span>
              </div>
              <span
                className="text-[10px] font-bold"
                style={{ color: f.color }}
              >
                {f.points}/{f.maxPoints}
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="absolute inset-y-0 right-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.round(f.score * 100)}%`,
                  backgroundColor: f.color,
                  opacity: 0.8,
                }}
              />
            </div>
            {/* Explanation — shown on hover/focus via group */}
            <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
              {f.explanation}
            </p>
          </div>
        ))}
      </div>

      {/* Investment narrative */}
      {narrative && (
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-xs">📝</span>
            <span className="text-[10px] font-bold text-gold/80">סיכום השקעה</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            {narrative}
          </p>
        </div>
      )}
    </div>
  )
}
