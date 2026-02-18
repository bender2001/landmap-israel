import { useMemo, useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Zap, Clock, MapPin } from 'lucide-react'
import { formatPriceShort } from '../utils/formatters'
import { useVisibilityInterval } from '../hooks/useVisibilityInterval'

/**
 * Animated market ticker bar — cycles through real-time market insights.
 * Inspired by financial news tickers (Bloomberg-style) and Madlan's data-driven UX.
 * Shows: new listings, price movements, top deals, market velocity.
 */
export default function MarketTicker({ plots }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const items = useMemo(() => {
    if (!plots || plots.length === 0) return []

    const now = Date.now()
    const result = []

    // 1. New listings this week
    const newThisWeek = plots.filter(p => {
      const created = p.created_at ?? p.createdAt
      return created && (now - new Date(created).getTime()) < 7 * 24 * 60 * 60 * 1000
    })
    if (newThisWeek.length > 0) {
      result.push({
        icon: Zap,
        color: '#22C55E',
        text: `${newThisWeek.length} חלקות חדשות השבוע`,
        highlight: true,
      })
    }

    // 2. Best ROI available
    const available = plots.filter(p => p.status === 'AVAILABLE')
    if (available.length > 0) {
      const bestRoi = available.reduce((best, p) => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        const roi = price > 0 ? ((proj - price) / price) * 100 : 0
        return roi > best.roi ? { plot: p, roi } : best
      }, { plot: null, roi: 0 })

      if (bestRoi.plot) {
        const bn = bestRoi.plot.block_number ?? bestRoi.plot.blockNumber
        result.push({
          icon: TrendingUp,
          color: '#4ADE80',
          text: `תשואה מובילה: +${Math.round(bestRoi.roi)}% — גוש ${bn} ב${bestRoi.plot.city}`,
        })
      }
    }

    // 3. Cheapest available per dunam
    if (available.length > 0) {
      const cheapest = available.reduce((best, p) => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 1
        const priceDunam = size > 0 ? (price / size) * 1000 : Infinity
        return priceDunam < best.price ? { plot: p, price: priceDunam } : best
      }, { plot: null, price: Infinity })

      if (cheapest.plot && cheapest.price < Infinity) {
        result.push({
          icon: MapPin,
          color: '#3B82F6',
          text: `מחיר נמוך ביותר: ${formatPriceShort(Math.round(cheapest.price))}/דונם ב${cheapest.plot.city}`,
        })
      }
    }

    // 4. Total market value
    const totalValue = plots.reduce((s, p) => s + (p.total_price ?? p.totalPrice ?? 0), 0)
    const totalArea = plots.reduce((s, p) => s + (p.size_sqm ?? p.sizeSqM ?? 0), 0)
    if (totalValue > 0) {
      result.push({
        icon: TrendingUp,
        color: '#E5B94E',
        text: `שווי שוק כולל: ${formatPriceShort(totalValue)} · ${(totalArea / 1000).toFixed(0)} דונם`,
      })
    }

    // 5. Per-city stats
    const cities = {}
    plots.forEach(p => {
      const city = p.city || 'אחר'
      if (!cities[city]) cities[city] = { count: 0, available: 0 }
      cities[city].count++
      if (p.status === 'AVAILABLE') cities[city].available++
    })
    const cityEntries = Object.entries(cities).filter(([, v]) => v.available > 0)
    if (cityEntries.length > 1) {
      const cityText = cityEntries.map(([city, v]) => `${city}: ${v.available} זמינות`).join(' · ')
      result.push({
        icon: MapPin,
        color: '#A78BFA',
        text: cityText,
      })
    }

    // 6. Recently updated
    const recentlyUpdated = plots.filter(p => {
      const updated = p.updated_at ?? p.updatedAt
      return updated && (now - new Date(updated).getTime()) < 24 * 60 * 60 * 1000
    })
    if (recentlyUpdated.length > 0) {
      result.push({
        icon: Clock,
        color: '#F59E0B',
        text: `${recentlyUpdated.length} חלקות עודכנו ב-24 שעות האחרונות`,
      })
    }

    return result
  }, [plots])

  // Auto-cycle through items — pauses when tab is hidden to avoid
  // wasting cycles and showing stale animations when user returns.
  useVisibilityInterval(
    () => setActiveIndex(prev => (prev + 1) % items.length),
    5000,
    { enabled: items.length > 1, catchUp: false }
  )

  if (items.length === 0) return null

  const currentItem = items[activeIndex % items.length]
  const Icon = currentItem.icon

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[50] transition-all duration-300 hidden sm:block ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
      dir="rtl"
    >
      <div className="bg-navy-light/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-center gap-2 px-4 py-1.5 relative">
          {/* Indicator dots */}
          {items.length > 1 && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex gap-1">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-1 h-1 rounded-full transition-all ${
                    i === activeIndex % items.length ? 'bg-gold w-3' : 'bg-white/20 hover:bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Content */}
          <div
            className="flex items-center gap-2 transition-all duration-500 animate-ticker-in"
            key={activeIndex}
          >
            <div
              className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: `${currentItem.color}20` }}
            >
              <Icon className="w-3 h-3" style={{ color: currentItem.color }} />
            </div>
            <span className={`text-[11px] font-medium ${currentItem.highlight ? 'text-emerald-400' : 'text-slate-300'}`}>
              {currentItem.text}
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
            aria-label="סגור"
          >
            <span className="text-xs">✕</span>
          </button>
        </div>
      </div>
    </div>
  )
}
