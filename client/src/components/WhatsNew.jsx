import { useState, useRef, useEffect, useMemo } from 'react'
import { Bell, X, Sparkles, TrendingUp, Map, BarChart3, Zap, Shield, Layers } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

/**
 * Changelog entries — newest first.
 * Each entry has a version (semver-ish), date, title, description, icon, and category.
 * The component tracks which version the user last saw and shows a badge for unseen updates.
 *
 * Like Madlan's "What's New" and Notion's changelog — increases engagement and trust.
 * Users feel the platform is alive and improving.
 */
const CHANGELOG = [
  {
    version: '2.8.0',
    date: '2026-02-18',
    icon: Layers,
    category: 'מפה',
    title: 'שכבות מפה חדשות',
    description: 'לוויין, טופוגרפי, רחובות ומצב כהה — בחרו את התצוגה שמתאימה לכם.',
  },
  {
    version: '2.7.0',
    date: '2026-02-17',
    icon: Zap,
    category: 'ביצועים',
    title: 'טעינה מהירה יותר',
    description: 'שיפורי ביצועים משמעותיים — SSE keepalive, lazy loading משופר, ומטמון שרת חכם.',
  },
  {
    version: '2.6.0',
    date: '2026-02-16',
    icon: BarChart3,
    category: 'ניתוח',
    title: 'דפי SEO לפי ערים',
    description: 'דפי נחיתה ייעודיים לכל עיר עם סטטיסטיקות שוק, ממוצעי מחירים וחלקות מובילות.',
  },
  {
    version: '2.5.0',
    date: '2026-02-15',
    icon: TrendingUp,
    category: 'השקעות',
    title: 'ניתוח עלויות מקיף',
    description: 'עלויות החזקה שנתיות, ניתוח נקודת איזון, ו-break-even analysis לכל חלקה.',
  },
  {
    version: '2.4.0',
    date: '2026-02-14',
    icon: Map,
    category: 'מפה',
    title: 'חיפוש באזור המפה',
    description: 'לחצו "חפש באזור זה" לסינון חלקות לפי תצוגת המפה הנוכחית — כמו ב-Airbnb.',
  },
  {
    version: '2.3.0',
    date: '2026-02-13',
    icon: Shield,
    category: 'בדיקות',
    title: 'רשימת בדיקת נאותות',
    description: 'צ׳קליסט Due Diligence אינטראקטיבי לכל חלקה — לא לפספס שום בדיקה לפני רכישה.',
  },
  {
    version: '2.2.0',
    date: '2026-02-12',
    icon: Sparkles,
    category: 'AI',
    title: 'יועץ AI חכם',
    description: 'שאלו את ה-AI כל שאלה על חלקות, תשואות, או תכנון — מקבל תשובות מותאמות אישית.',
  },
]

const CURRENT_VERSION = CHANGELOG[0]?.version || '1.0.0'

const categoryColors = {
  'מפה': 'text-blue-400 bg-blue-500/10',
  'ביצועים': 'text-amber-400 bg-amber-500/10',
  'ניתוח': 'text-purple-400 bg-purple-500/10',
  'השקעות': 'text-emerald-400 bg-emerald-500/10',
  'בדיקות': 'text-rose-400 bg-rose-500/10',
  'AI': 'text-cyan-400 bg-cyan-500/10',
}

export default function WhatsNew() {
  const [isOpen, setIsOpen] = useState(false)
  const [lastSeenVersion, setLastSeenVersion] = useLocalStorage('landmap_whats_new_version', '')
  const ref = useRef(null)

  // Count unseen updates
  const unseenCount = useMemo(() => {
    if (!lastSeenVersion) return CHANGELOG.length
    const lastIdx = CHANGELOG.findIndex(c => c.version === lastSeenVersion)
    return lastIdx <= 0 ? 0 : lastIdx
  }, [lastSeenVersion])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  // Mark as seen when opened
  const handleToggle = () => {
    setIsOpen(prev => {
      if (!prev) {
        // Opening — mark current version as seen
        setLastSeenVersion(CURRENT_VERSION)
      }
      return !prev
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors ${
          isOpen
            ? 'bg-gold/15 text-gold'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }`}
        aria-label={`מה חדש${unseenCount > 0 ? ` — ${unseenCount} עדכונים חדשים` : ''}`}
        aria-expanded={isOpen}
        title="מה חדש"
      >
        <Bell className="w-4 h-4" />
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gold text-navy text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-12 left-0 sm:left-auto sm:right-0 z-50 w-[340px] max-h-[420px] overflow-hidden bg-navy/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 animate-fade-in"
          dir="rtl"
          role="dialog"
          aria-label="מה חדש"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-slate-100">מה חדש</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Changelog entries */}
          <div className="overflow-y-auto max-h-[360px] divide-y divide-white/5">
            {CHANGELOG.map((entry, i) => {
              const Icon = entry.icon
              const isNew = lastSeenVersion && i < CHANGELOG.findIndex(c => c.version === lastSeenVersion)
              const colorClass = categoryColors[entry.category] || 'text-slate-400 bg-white/5'

              return (
                <div
                  key={entry.version}
                  className={`px-4 py-3 transition-colors ${
                    isNew ? 'bg-gold/[0.03]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass.split(' ')[1]}`}>
                      <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-200">{entry.title}</span>
                        {isNew && (
                          <span className="px-1.5 py-0.5 text-[8px] font-bold text-gold bg-gold/10 rounded-full">חדש</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{entry.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full ${colorClass}`}>
                          {entry.category}
                        </span>
                        <span className="text-[9px] text-slate-600">{entry.date}</span>
                        <span className="text-[9px] text-slate-700">v{entry.version}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
