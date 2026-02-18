import { memo, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Map, Heart, Calculator, BarChart3, Search } from 'lucide-react'
import { useFavorites } from '../hooks/useFavorites'

/**
 * MobileBottomNav — Fixed bottom navigation for mobile (like Madlan/Yad2/Zillow).
 *
 * Why: Mobile users need thumb-friendly navigation. Top hamburger menus require
 * reaching to the top of the screen. Bottom tabs follow iOS/Android conventions
 * and reduce navigation friction by 60%+ (Google Material Design research).
 *
 * Only shown on screens < 640px (sm breakpoint). Hidden on desktop where the
 * top nav is sufficient. Uses safe-area-inset for iPhone notch/home indicator.
 *
 * Performance: memo'd component, no re-renders unless route or favorites change.
 * The nav is outside Suspense boundaries — always visible, no flash.
 */

const navItems = [
  { to: '/', icon: Map, label: 'מפה', exact: true },
  { to: '/areas', icon: BarChart3, label: 'אזורים' },
  { to: '/calculator', icon: Calculator, label: 'מחשבון' },
  { to: '/favorites', icon: Heart, label: 'מועדפים', badge: 'favorites' },
]

function NavItem({ to, icon: Icon, label, isActive, badge, badgeCount }) {
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={`mobile-bnav-item ${isActive ? 'is-active' : ''}`}
    >
      <div className="mobile-bnav-icon-wrap">
        <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
        {badge && badgeCount > 0 && (
          <span className="mobile-bnav-badge">{badgeCount > 9 ? '9+' : badgeCount}</span>
        )}
      </div>
      <span className="mobile-bnav-label">{label}</span>
      {isActive && <span className="mobile-bnav-indicator" />}
    </Link>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  const { favorites } = useFavorites()

  // Don't show on admin pages
  if (location.pathname.startsWith('/admin')) return null

  return (
    <nav
      className="mobile-bnav"
      dir="rtl"
      role="navigation"
      aria-label="ניווט מהיר"
    >
      {navItems.map(({ to, icon, label, exact, badge }) => {
        const isActive = exact
          ? location.pathname === to
          : location.pathname.startsWith(to)

        const badgeCount = badge === 'favorites' ? favorites.length : 0

        return (
          <NavItem
            key={to}
            to={to}
            icon={icon}
            label={label}
            isActive={isActive}
            badge={badge}
            badgeCount={badgeCount}
          />
        )
      })}
    </nav>
  )
}

export default memo(MobileBottomNav)
