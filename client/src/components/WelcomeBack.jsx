import { useState, useEffect, useMemo } from 'react'
import { X, Sparkles, ArrowLeft } from 'lucide-react'
import { formatPriceShort } from '../utils/formatters'

const LAST_VISIT_KEY = 'landmap_last_visit_ts'
const DISMISS_KEY = 'landmap_welcome_dismissed'

/**
 * WelcomeBack — greeting notification for returning users.
 * 
 * Tracks last visit timestamp in localStorage. On return (after 1+ hours),
 * shows a dismissable banner: "ברוכים השבים! X חלקות חדשות מאז הביקור האחרון"
 * 
 * Creates engagement & FOMO — like Airbnb's "New since your last search" and
 * LinkedIn's "X new posts in your feed" prompts. No Israeli competitor does this.
 * 
 * Auto-dismisses after 15 seconds or on click. Won't show again for 30 minutes.
 */
export default function WelcomeBack({ plots }) {
  const [isVisible, setIsVisible] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [newBestDeal, setNewBestDeal] = useState(null)
  const [hoursSince, setHoursSince] = useState(0)

  useEffect(() => {
    const now = Date.now()
    const lastVisit = parseInt(localStorage.getItem(LAST_VISIT_KEY) || '0', 10)
    const lastDismissed = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10)

    // Update last visit timestamp
    localStorage.setItem(LAST_VISIT_KEY, String(now))

    // Don't show on first visit (no previous timestamp)
    if (!lastVisit) return

    // Don't show if dismissed within last 30 minutes
    if (now - lastDismissed < 30 * 60 * 1000) return

    // Only show if user was away for at least 1 hour
    const hoursDelta = (now - lastVisit) / (1000 * 60 * 60)
    if (hoursDelta < 1) return

    // Count plots created since last visit
    if (!plots || plots.length === 0) return

    const newPlots = plots.filter(p => {
      const created = p.created_at ?? p.createdAt
      if (!created) return false
      return new Date(created).getTime() > lastVisit
    })

    if (newPlots.length === 0) return

    // Find the best deal among new plots
    let bestDeal = null
    let bestRoi = -Infinity
    for (const p of newPlots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      if (price > 0) {
        const roi = ((proj - price) / price) * 100
        if (roi > bestRoi) {
          bestRoi = roi
          bestDeal = p
        }
      }
    }

    setNewCount(newPlots.length)
    setNewBestDeal(bestDeal)
    setHoursSince(Math.round(hoursDelta))
    setIsVisible(true)

    // Auto-dismiss after 15 seconds
    const timer = setTimeout(() => handleDismiss(), 15000)
    return () => clearTimeout(timer)
  }, [plots])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  const timeLabel = useMemo(() => {
    if (hoursSince < 24) return `${hoursSince} שעות`
    const days = Math.round(hoursSince / 24)
    if (days === 1) return 'יום'
    if (days < 7) return `${days} ימים`
    if (days < 14) return 'שבוע'
    return `${Math.round(days / 7)} שבועות`
  }, [hoursSince])

  if (!isVisible || newCount === 0) return null

  const bestPrice = newBestDeal ? (newBestDeal.total_price ?? newBestDeal.totalPrice ?? 0) : 0
  const bestRoi = newBestDeal && bestPrice > 0
    ? Math.round(((newBestDeal.projected_value ?? newBestDeal.projectedValue ?? 0) - bestPrice) / bestPrice * 100)
    : 0

  return (
    <div
      className="fixed top-14 left-1/2 -translate-x-1/2 z-[95] animate-bounce-in"
      dir="rtl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gold/15 via-gold/10 to-gold/15 backdrop-blur-xl border border-gold/25 rounded-2xl shadow-xl shadow-gold/10 max-w-sm">
        <div className="w-9 h-9 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-gold">
            ברוכים השבים! 👋
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            {newCount === 1
              ? `חלקה חדשה 1 נוספה מאז הביקור האחרון (לפני ${timeLabel})`
              : `${newCount} חלקות חדשות נוספו מאז הביקור האחרון (לפני ${timeLabel})`
            }
          </div>
          {newBestDeal && bestRoi > 0 && (
            <div className="text-[10px] text-emerald-400 mt-0.5">
              🔥 העסקה הטובה: {formatPriceShort(bestPrice)} · +{bestRoi}% ROI
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors"
          aria-label="סגור"
        >
          <X className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </div>
  )
}
