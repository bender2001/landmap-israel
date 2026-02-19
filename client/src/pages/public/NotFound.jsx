import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Map, Search, Calculator, MapPin, ArrowLeft, BarChart3, Heart } from 'lucide-react'
import { useMetaTags } from '../../hooks/useMetaTags'
import PublicNav from '../../components/PublicNav'
import PublicFooter from '../../components/PublicFooter'

/**
 * Smart suggested links — based on the attempted URL path.
 * If someone typed /plot/abc we suggest the map. If /area/xyz we suggest areas.
 * Like Google's "Did you mean?" — reduces bounce rate by guiding users to relevant content.
 */
function useSuggestedLinks(pathname) {
  const defaultLinks = [
    { to: '/', icon: Map, label: 'מפת חלקות', desc: 'צפה בכל החלקות על המפה' },
    { to: '/areas', icon: MapPin, label: 'סקירת אזורים', desc: 'השוואת ערים ואזורים' },
    { to: '/calculator', icon: Calculator, label: 'מחשבון השקעה', desc: 'חשב תשואה צפויה' },
  ]

  if (!pathname || pathname === '/') return defaultLinks

  const lower = pathname.toLowerCase()

  // If they tried to access a plot, suggest the map with search
  if (lower.includes('plot') || lower.includes('gush') || lower.includes('parcel')) {
    return [
      { to: '/', icon: Map, label: 'מפת חלקות', desc: 'חפש חלקות על המפה האינטראקטיבית' },
      { to: '/areas', icon: MapPin, label: 'סקירת אזורים', desc: 'עיין באזורים לפי עיר' },
      { to: '/favorites', icon: Heart, label: 'מועדפים', desc: 'צפה בחלקות שמורות' },
    ]
  }

  // If they tried to access an area
  if (lower.includes('area') || lower.includes('city')) {
    return [
      { to: '/areas', icon: MapPin, label: 'סקירת אזורים', desc: 'כל הערים והאזורים' },
      { to: '/', icon: Map, label: 'מפת חלקות', desc: 'צפה בכל החלקות על המפה' },
      { to: '/calculator', icon: Calculator, label: 'מחשבון השקעה', desc: 'חשב תשואה צפויה' },
    ]
  }

  // If they tried to access pricing/compare
  if (lower.includes('price') || lower.includes('compare') || lower.includes('calc')) {
    return [
      { to: '/calculator', icon: Calculator, label: 'מחשבון השקעה', desc: 'חשב תשואה צפויה' },
      { to: '/compare', icon: BarChart3, label: 'השוואת חלקות', desc: 'השווה בין חלקות' },
      { to: '/', icon: Map, label: 'מפת חלקות', desc: 'צפה בכל החלקות על המפה' },
    ]
  }

  return defaultLinks
}

export default function NotFound() {
  useMetaTags({
    title: 'הדף לא נמצא — LandMap Israel',
    description: 'הדף שחיפשת לא קיים. חזרו למפת הקרקעות או חפשו חלקה ספציפית.',
  })

  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const quickLinks = useSuggestedLinks(location.pathname)

  // Auto-redirect countdown — like Yad2's 404 that says "redirecting in X seconds".
  // Gives users 15 seconds to act, then redirects home. Prevents permanent dead-end pages
  // that hurt SEO (soft 404s) and user experience.
  const [countdown, setCountdown] = useState(15)

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/', { replace: true })
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, navigate])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex flex-col" dir="rtl">
      <PublicNav />

      {/* Main content — centered vertically in the available space */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-12">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1 className="text-[120px] sm:text-[180px] font-black leading-none bg-gradient-to-b from-gold via-gold-bright to-gold/30 bg-clip-text text-transparent select-none animate-fade-in">
            404
          </h1>
          <div className="absolute inset-0 text-[120px] sm:text-[180px] font-black leading-none text-gold/5 blur-2xl select-none">
            404
          </div>
        </div>

        {/* Message + Quick Search */}
        <div className="glass-panel p-8 max-w-lg w-full text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-slate-100 mb-3">
            הדף לא נמצא
          </h2>
          <p className="text-slate-400 mb-2">
            מצטערים, הדף שחיפשת לא קיים או שהקישור שגוי.
          </p>
          {/* Attempted path hint — helps users understand what went wrong */}
          {location.pathname !== '/' && (
            <p className="text-[11px] text-slate-600 mb-4 font-mono truncate max-w-full">
              {location.pathname}
            </p>
          )}
          {/* Auto-redirect notice */}
          <p className="text-[11px] text-slate-500 mb-6">
            מפנים לעמוד הראשי בעוד <span className="text-gold font-bold tabular-nums">{countdown}</span> שניות...
          </p>

          {/* Quick search — reduce bounce rate by letting users search directly */}
          <form onSubmit={handleSearch} className="relative mb-6">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש גוש, חלקה, עיר..."
              className="w-full pr-10 pl-4 py-3 bg-navy-light/60 border border-white/10 rounded-xl text-slate-200 placeholder-slate-500 focus:border-gold/50 focus:outline-none transition text-sm"
              autoFocus
            />
            {query.trim() && (
              <button
                type="submit"
                className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gold/20 border border-gold/30 text-gold text-xs font-bold rounded-lg hover:bg-gold/30 transition"
              >
                חפש
              </button>
            )}
          </form>

          {/* Quick links — context-aware based on attempted URL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {quickLinks.map(({ to, icon: Icon, label, desc }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-gold/30 hover:bg-gold/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <span className="text-sm font-bold text-slate-200">{label}</span>
                <span className="text-[10px] text-slate-500">{desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  )
}
