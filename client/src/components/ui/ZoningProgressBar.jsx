import { useMemo, memo } from 'react'
import { zoningPipelineStages } from '../../utils/constants'

/**
 * ZoningProgressBar — compact visual indicator showing where a plot is
 * in the regulatory pipeline (Agricultural → Building Permit).
 *
 * Like a "status tracker" on package delivery apps — investors can see
 * at a glance how far along the zoning approval process is. This is
 * critical for land investment since the zoning stage determines 80%
 * of the plot's current and projected value.
 *
 * Variants:
 * - "compact" (default): thin segmented bar for cards/tooltips
 * - "detailed": full bar with stage labels for sidebar/detail page
 */
const ZoningProgressBar = memo(function ZoningProgressBar({
  currentStage,
  variant = 'compact',
  className = '',
}) {
  const stageIndex = useMemo(() => {
    if (!currentStage) return -1
    return zoningPipelineStages.findIndex(s => s.key === currentStage)
  }, [currentStage])

  if (stageIndex < 0) return null

  const totalStages = zoningPipelineStages.length
  const progress = ((stageIndex + 1) / totalStages) * 100
  const currentLabel = zoningPipelineStages[stageIndex]?.label || ''
  const currentIcon = zoningPipelineStages[stageIndex]?.icon || ''
  const nextStage = stageIndex < totalStages - 1 ? zoningPipelineStages[stageIndex + 1] : null

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-1.5 ${className}`}
        title={`שלב נוכחי: ${currentLabel} (${stageIndex + 1}/${totalStages}) ${nextStage ? `→ הבא: ${nextStage.label}` : '— שלב סופי!'}`}
      >
        <div className="flex gap-[2px] flex-1 min-w-[48px] max-w-[72px]">
          {zoningPipelineStages.map((stage, i) => (
            <div
              key={stage.key}
              className="h-[4px] flex-1 rounded-full transition-all duration-300"
              style={{
                background: i <= stageIndex
                  ? i === stageIndex
                    ? '#C8942A' // gold for current
                    : '#22C55E' // green for completed
                  : 'rgba(255,255,255,0.06)', // dim for future
                boxShadow: i === stageIndex ? '0 0 4px rgba(200,148,42,0.4)' : 'none',
              }}
            />
          ))}
        </div>
        <span className="text-[8px] text-slate-500 whitespace-nowrap">
          {stageIndex + 1}/{totalStages}
        </span>
      </div>
    )
  }

  // Detailed variant — with stage labels and next-step indicator
  return (
    <div className={`${className}`} dir="rtl">
      {/* Progress header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{currentIcon}</span>
          <span className="text-[11px] font-semibold text-slate-200">{currentLabel}</span>
        </div>
        <span className="text-[10px] text-gold font-medium bg-gold/10 px-2 py-0.5 rounded-md border border-gold/20">
          שלב {stageIndex + 1} מתוך {totalStages}
        </span>
      </div>

      {/* Segmented progress bar */}
      <div className="flex gap-[3px] mb-2">
        {zoningPipelineStages.map((stage, i) => (
          <div
            key={stage.key}
            className="relative group"
            style={{ flex: 1 }}
          >
            <div
              className="h-[6px] rounded-full transition-all duration-500"
              style={{
                background: i <= stageIndex
                  ? i === stageIndex
                    ? 'linear-gradient(90deg, #C8942A, #E8B445)'
                    : '#22C55E'
                  : 'rgba(255,255,255,0.06)',
                boxShadow: i === stageIndex
                  ? '0 0 6px rgba(200,148,42,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : 'none',
              }}
            />
            {/* Tooltip on hover */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-navy-light/95 backdrop-blur-sm border border-white/10 rounded-md px-2 py-1 text-[9px] text-slate-300 whitespace-nowrap shadow-lg">
                {stage.icon} {stage.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Next step indicator */}
      {nextStage && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-1 h-1 rounded-full bg-gold/40 animate-pulse" />
          <span>שלב הבא:</span>
          <span className="text-slate-400 font-medium">{nextStage.icon} {nextStage.label}</span>
        </div>
      )}
      {!nextStage && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span>✅</span>
          <span className="font-medium">הושלם — קרקע מוכנה לבנייה!</span>
        </div>
      )}
    </div>
  )
})

export default ZoningProgressBar
