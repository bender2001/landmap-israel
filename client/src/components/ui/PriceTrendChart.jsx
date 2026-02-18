import { useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '../../utils/formatters'

/**
 * Mini price trend chart (sparkline) — similar to Madlan's area price trends.
 * Generates a realistic price trend based on the plot's current price and area context.
 * In production, this would pull from actual transaction history API.
 */

function generatePriceTrend(currentPricePerSqm, city, months = 12) {
  // Simulate realistic Israeli land price trends based on area
  const cityGrowthRates = {
    'חדרה': 0.012,   // ~1.2% monthly appreciation
    'נתניה': 0.015,  // ~1.5% monthly
    'קיסריה': 0.018, // ~1.8% monthly (premium area)
  }
  const baseGrowth = cityGrowthRates[city] || 0.01
  const points = []
  
  // Work backwards from current price
  let price = currentPricePerSqm
  const dataPoints = []
  for (let i = 0; i < months; i++) {
    dataPoints.unshift(price)
    // Add some realistic noise + seasonal variation
    const noise = (Math.sin(i * 0.7 + price % 7) * 0.008) + (Math.cos(i * 1.3) * 0.005)
    price = price / (1 + baseGrowth + noise)
  }
  
  // Generate month labels
  const now = new Date()
  for (let i = 0; i < months; i++) {
    const date = new Date(now)
    date.setMonth(date.getMonth() - (months - 1 - i))
    points.push({
      month: date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
      price: Math.round(dataPoints[i]),
    })
  }
  
  return points
}

export default function PriceTrendChart({ totalPrice, sizeSqM, city }) {
  const pricePerSqm = sizeSqM > 0 ? totalPrice / sizeSqM : 0
  
  const trend = useMemo(() => {
    if (pricePerSqm <= 0) return null
    return generatePriceTrend(pricePerSqm, city, 12)
  }, [pricePerSqm, city])
  
  if (!trend || trend.length < 2) return null
  
  const prices = trend.map(t => t.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice || 1
  
  // Calculate overall change
  const firstPrice = prices[0]
  const lastPrice = prices[prices.length - 1]
  const changePct = Math.round(((lastPrice - firstPrice) / firstPrice) * 100)
  const isUp = changePct >= 0
  
  // SVG dimensions
  const width = 280
  const height = 60
  const padding = { top: 4, bottom: 4, left: 2, right: 2 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  
  // Generate path
  const points = prices.map((p, i) => {
    const x = padding.left + (i / (prices.length - 1)) * chartW
    const y = padding.top + chartH - ((p - minPrice) / range) * chartH
    return { x, y }
  })
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  
  // Gradient fill path (close at bottom)
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
          <span className="text-xs font-medium text-slate-200">מגמת מחירים (12 חודשים)</span>
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
        
        {/* Grid lines */}
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
        
        {/* Fill area */}
        <path d={fillPath} fill={`url(#${gradientId})`} />
        
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={isUp ? '#22C55E' : '#EF4444'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Current price dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={isUp ? '#22C55E' : '#EF4444'}
          stroke="#0a1628"
          strokeWidth="1.5"
        />
      </svg>
      
      {/* Labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-slate-500">{trend[0].month}</span>
        <span className="text-[9px] text-slate-400">
          ₪{Math.round(minPrice).toLocaleString()} - ₪{Math.round(maxPrice).toLocaleString()} / מ״ר
        </span>
        <span className="text-[9px] text-slate-500">{trend[trend.length - 1].month}</span>
      </div>
    </div>
  )
}
