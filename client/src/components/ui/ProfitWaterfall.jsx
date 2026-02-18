import { useMemo } from 'react'
import { formatCurrency } from '../../utils/formatters'

/**
 * Visual waterfall chart showing investment profitability breakdown.
 * Like Madlan's financial analysis but more visual — shows how purchase price
 * transforms into net profit through costs and appreciation.
 */
export default function ProfitWaterfall({ totalPrice, projectedValue, sizeSqM }) {
  const breakdown = useMemo(() => {
    if (!totalPrice || !projectedValue || totalPrice <= 0) return null

    const purchaseTax = Math.round(totalPrice * 0.06)
    const legalFees = Math.round(totalPrice * 0.0175)
    const totalCost = totalPrice + purchaseTax + legalFees
    const grossProfit = projectedValue - totalPrice
    const bettermentLevy = Math.round(Math.max(0, grossProfit) * 0.5)
    const netProfit = projectedValue - totalCost - bettermentLevy
    const netRoi = Math.round((netProfit / totalCost) * 100)

    return {
      steps: [
        { label: 'מחיר רכישה', value: totalPrice, type: 'base', color: '#3B82F6' },
        { label: 'מס רכישה (6%)', value: purchaseTax, type: 'cost', color: '#EF4444' },
        { label: 'שכ״ט עו״ד', value: legalFees, type: 'cost', color: '#F59E0B' },
        { label: 'היטל השבחה', value: bettermentLevy, type: 'cost', color: '#F97316' },
        { label: 'רווח נקי', value: netProfit, type: 'profit', color: netProfit >= 0 ? '#22C55E' : '#EF4444' },
      ],
      totalCost,
      netProfit,
      netRoi,
      grossProfit,
    }
  }, [totalPrice, projectedValue])

  if (!breakdown) return null

  const { steps, totalCost, netProfit, netRoi, grossProfit } = breakdown
  const maxVal = Math.max(totalPrice, projectedValue, totalCost)

  return (
    <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">📊</span>
          <span className="text-xs font-medium text-slate-200">פירוט רווחיות</span>
        </div>
        <span className={`text-xs font-bold ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          ROI נקי: {netRoi > 0 ? '+' : ''}{netRoi}%
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const barWidth = Math.max(5, (Math.abs(step.value) / maxVal) * 100)
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-[80px] flex-shrink-0 text-right truncate" title={step.label}>
                {step.label}
              </span>
              <div className="flex-1 h-4 rounded bg-white/5 overflow-hidden relative">
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${step.color}CC, ${step.color}88)`,
                  }}
                />
              </div>
              <span className={`text-[10px] font-medium w-[65px] text-left flex-shrink-0 ${
                step.type === 'profit'
                  ? (step.value >= 0 ? 'text-emerald-400' : 'text-red-400')
                  : step.type === 'cost'
                    ? 'text-orange-400'
                    : 'text-slate-300'
              }`}>
                {step.type === 'cost' ? '-' : ''}{formatCurrency(Math.abs(step.value))}
              </span>
            </div>
          )
        })}
      </div>

      {/* Summary line */}
      <div className="mt-3 pt-2 border-t border-white/5 flex justify-between items-center">
        <span className="text-[10px] text-slate-500">
          עלות כוללת: {formatCurrency(totalCost)}
        </span>
        <span className="text-[10px] text-slate-500">
          שווי צפוי: {formatCurrency(projectedValue)}
        </span>
      </div>
    </div>
  )
}
