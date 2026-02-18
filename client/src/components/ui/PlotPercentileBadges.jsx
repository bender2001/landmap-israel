import { useMemo } from 'react'
import { TrendingUp, Ruler, DollarSign, BarChart3 } from 'lucide-react'
import { calcPlotPercentiles } from '../../utils/formatters'

/**
 * Shows where a plot ranks vs all other plots — "זול מ-70% מהחלקות" style badges.
 * Inspired by Madlan's competitive positioning indicators.
 */
export default function PlotPercentileBadges({ plot, allPlots, className = '' }) {
  const percentiles = useMemo(
    () => calcPlotPercentiles(plot, allPlots),
    [plot?.id, allPlots?.length]
  )

  if (!percentiles) return null

  const badges = [
    percentiles.price?.cheaperThan >= 30 && {
      icon: DollarSign,
      text: `זול מ-${percentiles.price.cheaperThan}% מהחלקות`,
      color: percentiles.price.cheaperThan >= 70 ? '#22C55E' : percentiles.price.cheaperThan >= 50 ? '#84CC16' : '#F59E0B',
      priority: percentiles.price.cheaperThan,
    },
    percentiles.roi?.betterThan >= 40 && {
      icon: TrendingUp,
      text: `תשואה גבוהה מ-${percentiles.roi.betterThan}%`,
      color: percentiles.roi.betterThan >= 70 ? '#22C55E' : percentiles.roi.betterThan >= 50 ? '#84CC16' : '#F59E0B',
      priority: percentiles.roi.betterThan,
    },
    percentiles.size?.biggerThan >= 50 && {
      icon: Ruler,
      text: `גדול מ-${percentiles.size.biggerThan}% מהחלקות`,
      color: percentiles.size.biggerThan >= 70 ? '#3B82F6' : '#60A5FA',
      priority: percentiles.size.biggerThan - 10, // slightly lower priority
    },
    percentiles.priceSqm?.cheaperThan >= 40 && {
      icon: BarChart3,
      text: `מחיר/מ״ר נמוך מ-${percentiles.priceSqm.cheaperThan}%`,
      color: percentiles.priceSqm.cheaperThan >= 70 ? '#22C55E' : '#84CC16',
      priority: percentiles.priceSqm.cheaperThan - 5,
    },
  ]
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3) // Show max 3 badges

  if (badges.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((badge, i) => {
        const Icon = badge.icon
        return (
          <div
            key={i}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all hover:scale-[1.02]"
            style={{
              background: `${badge.color}10`,
              borderColor: `${badge.color}25`,
              color: badge.color,
            }}
          >
            <Icon className="w-3 h-3 flex-shrink-0" />
            <span>{badge.text}</span>
          </div>
        )
      })}
    </div>
  )
}
