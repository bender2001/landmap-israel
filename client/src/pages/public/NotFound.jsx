import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Map, Search, Calculator, MapPin, ArrowLeft } from 'lucide-react'
import { useMetaTags } from '../../hooks/useMetaTags'

export default function NotFound() {
  useMetaTags({
    title: 'הדף לא נמצא — LandMap Israel',
    description: 'הדף שחיפשת לא קיים. חזרו למפת הקרקעות או חפשו חלקה ספציפית.',
  })

  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const quickLinks = [
    { to: '/', icon: Map, label: 'מפת חלקות', desc: 'צפה בכל החלקות על המפה' },
    { to: '/areas', icon: MapPin, label: 'סקירת אזורים', desc: 'השוואת ערים ואזורים' },
    { to: '/calculator', icon: Calculator, label: 'מחשבון השקעה', desc: 'חשב תשואה צפויה' },
  ]

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-4" dir="rtl">
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
        <p className="text-slate-400 mb-6">
          מצטערים, הדף שחיפשת לא קיים או שהקישור שגוי.
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

        {/* Quick links */}
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

      {/* Footer links */}
      <div className="flex items-center gap-4 mt-8">
        <Link to="/about" className="text-sm text-slate-500 hover:text-gold transition">אודות</Link>
        <span className="text-slate-700">|</span>
        <Link to="/contact" className="text-sm text-slate-500 hover:text-gold transition">צור קשר</Link>
      </div>
    </div>
  )
}
