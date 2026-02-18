import { useState, useCallback, useEffect } from 'react'
import { Bell, BellRing, X, Check, Mail, Phone, ChevronDown } from 'lucide-react'

const STORAGE_KEY = 'landmap_alert_email'
const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * Alert Subscription Widget — like Madlan's "קבל התראה על נכסים חדשים"
 * Floats near filter bar, lets users subscribe to new listings matching their current filters.
 */
export default function AlertSubscription({ filters, statusFilter }) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [phone, setPhone] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)

  // Check if user already subscribed (from localStorage)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setIsSubscribed(true)
  }, [])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!email || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const criteria = {}
      if (filters.city && filters.city !== 'all') criteria.city = filters.city
      if (filters.priceMin) criteria.priceMin = filters.priceMin
      if (filters.priceMax) criteria.priceMax = filters.priceMax
      if (filters.sizeMin) criteria.sizeMin = filters.sizeMin
      if (filters.sizeMax) criteria.sizeMax = filters.sizeMax
      if (filters.minRoi && filters.minRoi !== 'all') criteria.minRoi = filters.minRoi
      if (statusFilter && statusFilter.length > 0) criteria.status = statusFilter.join(',')

      const res = await fetch(`${API_BASE}/api/alerts/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone || undefined, criteria, frequency }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'שגיאה בהרשמה')
      }

      localStorage.setItem(STORAGE_KEY, email)
      setIsSubscribed(true)
      setStatus('success')
      setTimeout(() => {
        setIsOpen(false)
        setStatus('idle')
      }, 2500)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'שגיאה, נסה שוב')
    }
  }, [email, phone, frequency, filters, statusFilter, status])

  const handleUnsubscribe = useCallback(async () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      await fetch(`${API_BASE}/api/alerts/unsubscribe?email=${encodeURIComponent(saved)}`, {
        method: 'DELETE',
      })
    } catch {}

    localStorage.removeItem(STORAGE_KEY)
    setIsSubscribed(false)
    setEmail('')
  }, [])

  // Build human-readable criteria summary
  const criteriaLabel = (() => {
    const parts = []
    if (filters.city && filters.city !== 'all') parts.push(filters.city)
    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin ? `₪${(Number(filters.priceMin) / 1000).toFixed(0)}K` : ''
      const max = filters.priceMax ? `₪${(Number(filters.priceMax) / 1000).toFixed(0)}K` : ''
      parts.push(min && max ? `${min}–${max}` : min || `עד ${max}`)
    }
    if (statusFilter && statusFilter.length > 0) parts.push(`${statusFilter.length} סטטוסים`)
    return parts.length > 0 ? parts.join(' · ') : 'כל החלקות'
  })()

  return (
    <div className="alert-subscription-wrapper" dir="rtl">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`alert-sub-toggle ${isSubscribed ? 'is-subscribed' : ''} ${isOpen ? 'is-open' : ''}`}
        title={isSubscribed ? 'התראות פעילות — לחץ לניהול' : 'קבל התראה על חלקות חדשות'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {isSubscribed ? (
          <BellRing className="w-4 h-4 animate-bell-ring" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        <span className="hidden sm:inline text-xs">
          {isSubscribed ? 'התראות פעילות' : 'קבל התראות'}
        </span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="alert-sub-panel" role="dialog" aria-label="הרשמה להתראות">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center">
                <BellRing className="w-4 h-4 text-gold" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">התראות חלקות</h3>
                <p className="text-[10px] text-slate-500">קבל עדכון כשנוספת חלקה חדשה</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Current criteria preview */}
          <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 mb-3">
            <div className="text-[10px] text-slate-500 mb-0.5">קריטריונים נוכחיים:</div>
            <div className="text-xs text-slate-300 font-medium">{criteriaLabel}</div>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-emerald-400">נרשמת בהצלחה!</span>
              <span className="text-[10px] text-slate-500">נעדכן אותך על חלקות חדשות</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="כתובת אימייל"
                  required
                  className="alert-sub-input pr-9"
                  dir="ltr"
                />
              </div>

              {/* Phone (optional) */}
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="טלפון (אופציונלי)"
                  className="alert-sub-input pr-9"
                  dir="ltr"
                />
              </div>

              {/* Frequency selector */}
              <div className="relative">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="alert-sub-select"
                >
                  <option value="instant">מיידי — בכל חלקה חדשה</option>
                  <option value="daily">יומי — סיכום יומי</option>
                  <option value="weekly">שבועי — סיכום שבועי</option>
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              </div>

              {errorMsg && (
                <div className="text-[11px] text-red-400 px-1">{errorMsg}</div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !email}
                className="alert-sub-submit"
              >
                {status === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                    נרשם...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <BellRing className="w-3.5 h-3.5" />
                    הרשם להתראות
                  </span>
                )}
              </button>

              {isSubscribed && (
                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-red-400 transition-colors py-1"
                >
                  ביטול הרשמה
                </button>
              )}

              <p className="text-[9px] text-slate-600 text-center leading-relaxed">
                ניתן לבטל בכל עת. לא נשלח ספאם.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
