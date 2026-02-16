import { Link, useLocation } from 'react-router-dom'
import { Map, Heart, Info, Phone, ArrowRight } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

const navLinks = [
  { to: '/about', icon: Info, label: 'אודות' },
  { to: '/contact', icon: Phone, label: 'צור קשר' },
  { to: '/favorites', icon: Heart, label: 'מועדפים' },
]

export default function PublicNav() {
  const location = useLocation()
  const { favorites } = useFavorites()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-navy/80 backdrop-blur-xl border-b border-white/10"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-lg">🏗️</span>
          <span className="text-lg font-bold brand-text">LandMap</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to
            const isFav = to === '/favorites'
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors relative ${
                  isActive
                    ? 'bg-gold/15 text-gold font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                {isFav && favorites.length > 0 && (
                  <span className="absolute -top-1 -left-1 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
                    {favorites.length}
                  </span>
                )}
              </Link>
            )
          })}

          {/* Back to map */}
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 mr-2 bg-gradient-to-r from-gold to-gold-bright rounded-xl text-navy font-bold text-sm hover:shadow-lg hover:shadow-gold/30 transition"
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">למפה</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
