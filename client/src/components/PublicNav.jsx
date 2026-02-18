import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Map, Heart, Info, Phone, Menu, X, BarChart3 } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

const navLinks = [
  { to: '/areas', icon: BarChart3, label: 'אזורים' },
  { to: '/about', icon: Info, label: 'אודות' },
  { to: '/contact', icon: Phone, label: 'צור קשר' },
  { to: '/favorites', icon: Heart, label: 'מועדפים' },
]

export default function PublicNav() {
  const location = useLocation()
  const { favorites } = useFavorites()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <>
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

          {/* Desktop nav links */}
          <div className="nav-desktop-links flex items-center gap-1">
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

          {/* Mobile hamburger */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      <div className={`nav-mobile-menu ${menuOpen ? 'is-open' : ''}`} dir="rtl">
        {navLinks.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={isActive ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          )
        })}
        <Link
          to="/"
          onClick={() => setMenuOpen(false)}
          className="!bg-gradient-to-r !from-gold/20 !to-gold-bright/10 !text-gold font-bold"
        >
          <Map className="w-5 h-5" />
          חזרה למפה
        </Link>
      </div>

      {/* Backdrop for mobile menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[48] bg-black/30 sm:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
