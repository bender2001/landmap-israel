import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

/**
 * DataCompletenessBar — visual indicator of data quality/completeness for a plot.
 *
 * Professional investors need to know HOW MUCH they can trust the data. A plot with
 * full coordinates, enrichment data, images, and market context is far more actionable
 * than one with just price and area. This tiny bar gives instant data confidence.
 *
 * Scoring criteria (each adds to the percentage):
 * - Has coordinates (polygon data)
 * - Has description
 * - Has zoning stage
 * - Has readiness estimate
 * - Has projected value
 * - Has images
 * - Has enrichment data (market_data field)
 * - Has valid price > 0
 * - Has city
 * - Has block/parcel numbers
 *
 * Like Bloomberg's "Data Completeness" indicator on securities — unique to LandMap,
 * neither Madlan nor Yad2 show data quality transparency.
 */
export default function DataCompletenessBar({ plot, variant = 'compact', className = '' }) {
  const { score, total, pct, level, missing } = useMemo(() => {
    if (!plot) return { score: 0, total: 10, pct: 0, level: 'low', missing: [] }

    const checks = [
      { key: 'coordinates', label: 'מיקום מדויק', pass: Array.isArray(plot.coordinates) && plot.coordinates.length >= 3 },
      { key: 'price', label: 'מחיר', pass: (plot.total_price ?? plot.totalPrice ?? 0) > 0 },
      { key: 'projected', label: 'שווי צפוי', pass: (plot.projected_value ?? plot.projectedValue ?? 0) > 0 },
      { key: 'city', label: 'עיר', pass: !!(plot.city) },
      { key: 'block', label: 'גוש/חלקה', pass: !!(plot.block_number ?? plot.blockNumber) && !!(plot.number) },
      { key: 'description', label: 'תיאור', pass: !!(plot.description) && plot.description.length > 10 },
      { key: 'zoning', label: 'שלב תכנוני', pass: !!(plot.zoning_stage ?? plot.zoningStage) && (plot.zoning_stage ?? plot.zoningStage) !== 'UNKNOWN' },
      { key: 'readiness', label: 'הערכת מוכנות', pass: !!(plot.readiness_estimate ?? plot.readinessEstimate) },
      { key: 'images', label: 'תמונות', pass: Array.isArray(plot.plot_images) && plot.plot_images.length > 0 },
      { key: 'enrichment', label: 'נתוני שוק', pass: !!(plot.market_data || plot.enrichment_data) },
    ]

    const passed = checks.filter(c => c.pass).length
    const percentage = Math.round((passed / checks.length) * 100)
    const missingItems = checks.filter(c => !c.pass).map(c => c.label)

    let lvl = 'low'
    if (percentage >= 80) lvl = 'high'
    else if (percentage >= 60) lvl = 'medium'
    else if (percentage >= 40) lvl = 'fair'

    return { score: passed, total: checks.length, pct: percentage, level: lvl, missing: missingItems }
  }, [plot])

  const levelConfig = {
    high: { color: '#22C55E', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'מלא', icon: CheckCircle2 },
    medium: { color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'טוב', icon: Info },
    fair: { color: '#F97316', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'חלקי', icon: AlertTriangle },
    low: { color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'בסיסי', icon: AlertTriangle },
  }

  const config = levelConfig[level]
  const Icon = config.icon

  if (variant === 'micro') {
    // Ultra-compact: just a colored dot + percentage (for card strips)
    return (
      <div
        className={`flex items-center gap-1 ${className}`}
        title={`שלמות נתונים: ${pct}% (${score}/${total})${missing.length > 0 ? ` · חסר: ${missing.join(', ')}` : ''}`}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ background: config.color }}
        />
        <span className="text-[8px] tabular-nums" style={{ color: config.color }}>
          {pct}%
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
        title={missing.length > 0 ? `חסר: ${missing.join(', ')}` : 'כל הנתונים זמינים'}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color: config.color }} />
          <span className="text-[10px] font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
        <div className="relative w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: config.color }}
          />
        </div>
        <span className="text-[9px] text-slate-500 tabular-nums">{score}/{total}</span>
      </div>
    )
  }

  // Full variant — shows missing items
  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: config.color }} />
          <span className="text-xs font-bold" style={{ color: config.color }}>
            שלמות נתונים: {config.label}
          </span>
        </div>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: config.color }}>
          {pct}%
        </span>
      </div>
      <div className="relative w-full h-2 rounded-full bg-white/5 overflow-hidden mb-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: config.color }}
        />
      </div>
      {missing.length > 0 && missing.length <= 4 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {missing.map(item => (
            <span key={item} className="text-[8px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
