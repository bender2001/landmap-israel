import { useState, useEffect } from 'react'
import { X, Cookie, Shield } from 'lucide-react'

const CONSENT_KEY = 'landmap_cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      // Delay showing to not interfere with intro overlay
      const timer = setTimeout(() => setVisible(true), 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-[80] animate-slide-up"
      dir="rtl"
    >
      <div className="bg-navy-light/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-200 mb-1">פרטיות ועוגיות</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              אנו משתמשים בעוגיות לשיפור חוויית השימוש, ניתוח תעבורה ושמירת העדפות.
              בלחיצה על ״אישור״ אתה מסכים ל
              <a href="/privacy" className="text-gold hover:underline mx-0.5">מדיניות הפרטיות</a>
              שלנו.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 py-2 bg-gradient-to-r from-gold to-gold-bright text-navy text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-gold/20 transition-all"
          >
            אישור
          </button>
          <button
            onClick={decline}
            className="px-4 py-2 bg-white/5 border border-white/10 text-xs text-slate-400 rounded-xl hover:bg-white/10 transition-colors"
          >
            רק הכרחיות
          </button>
        </div>
      </div>
    </div>
  )
}
