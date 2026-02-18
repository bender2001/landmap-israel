import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Database } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'
import { getPlotPriceHistory } from '../../api/market'

/**
 * Price trend chart — fetches real historical data from the price_snapshots API.
 * Falls back to synthetic trend if no real data is available.
 * Like Madlan's area price trend graphs.
 */

function generateSyntheticTrend(currentPricePerSqm, city, months = 12) {
  const cityGrowthRates = {
    'חדרה': 0.012,
    'נתניה': 0.015,
    'קיסריה': 0.018,
  }
  const baseGrowth = cityGrowthRates[city] || 0.01
  const dataPoints = []
  let price = currentPricePerSqm

  for (let i = 0; i < months; i++) {
    dataPoints.unshift(price)
    const noise = (Math.sin(i * 0.7 + price % 7) * 0.008) + (Math.cos(i * 1.3) * 0.005)
    price = price / (1 + baseGrowth + noise)
  }

  const now = new Date()
  return dataPoints.map((p, i) => {
    const date = new Date(now)
    date.setMonth(date.getMonth() - (months - 1 - i))
    return {
      month: date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
      price: Math.round(p),
    }
  })
}

export default function PriceTrendChart({ totalPrice, sizeSqM, city, plotId }) {
  const pricePerSqm = sizeSqM > 0 ? totalPrice / sizeSqM : 0

  // Fetch real price history if plotId is available
  const { data: realHistory } = useQuery({
    queryKey: ['plotPriceHistory', plotId],
    queryFn: () => getPlotPriceHistory(plotId, 365),
    enabled: !!plotId,
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const { trend, isRealData } = useMemo(() => {
    if (pricePerSqm <= 0) return { trend: null, isRealData: false }

    // Use real data if we have at least 2 data points
    if (realHistory && realHistory.length >= 2) {
      const points = realHistory.map(h => ({
        month: new Date(h.snapshot_date).toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
        price: Math.round(h.price_per_sqm),
      }))
      return { trend: points, isRealData: true }
    }

    // Fall back to synthetic
    return { trend: generateSyntheticTrend(pricePerSqm, city, 12), isRealData: false }
  }, [pricePerSqm, city, realHistory])

  if (!trend || trend.length < 2) return null

  const prices = trend.map(t => t.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice || 1

  const firstPrice = prices[0]
  const lastPrice = prices[prices.length - 1]
  const changePct = Math.round(((lastPrice - firstPrice) / firstPrice) * 100)
  const isUp = changePct >= 0

  const width = 280
  const height = 60
  const padding = { top: 4, bottom: 4, left: 2, right: 2 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = prices.map((p, i) => {
    const x = padding.left + (i / (prices.length - 1)) * chartW
    const y = padding.top + chartH - ((p - minPrice) / range) * chartH
    return { x, y }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const fillPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`
  const gradientId = `trend-grad-${city}-${Math.round(pricePerSqm)}`

  return (
    <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isUp ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className="text-xs font-medium text-slate-200">
            מגמת מחירים ({trend.length} {trend.length <= 12 ? 'חודשים' : 'נקודות'})
          </span>
          {isRealData && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Database className="w-2 h-2" />
              נתונים אמיתיים
            </span>
          )}
        </div>
        <span className={`text-xs font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{changePct}%
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? '#22C55E' : '#EF4444'} stopOpacity="0.2" />
            <stop offset="100%" stopColor={isUp ? '#22C55E' : '#EF4444'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(pct => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + chartH * (1 - pct)}
            x2={width - padding.right}
            y2={padding.top + chartH * (1 - pct)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        ))}

        <path d={fillPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={isUp ? '#22C55E' : '#EF4444'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={isUp ? '#22C55E' : '#EF4444'}
          stroke="#0a1628"
          strokeWidth="1.5"
        />
      </svg>

      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-slate-500">{trend[0].month}</span>
        <span className="text-[9px] text-slate-400">
          ₪{Math.round(minPrice).toLocaleString()} - ₪{Math.round(maxPrice).toLocaleString()} / מ״ר
        </span>
        <span className="text-[9px] text-slate-500">{trend[trend.length - 1].month}</span>
      </div>
      {!isRealData && (
        <div className="text-[8px] text-slate-600 text-center mt-1">* הערכה על בסיס מגמות אזוריות</div>
      )}
    </div>
  )
}
