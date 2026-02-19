import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Map, Heart, Info, Phone, Menu, X, BarChart3, Calculator, GitCompareArrows } from 'lucide-react'
import styled from 'styled-components'
import { useFavorites } from '../hooks/useUserData'
import { useLocalStorage } from '../hooks/useInfra'
import { media, theme } from '../styles/theme'

type NavLinkItem = {
  to: string
  icon: LucideIcon
  label: string
  badge?: 'compare'
}

const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  '/areas': () => import('../pages/public/Areas'),
  '/compare': () => import('../pages/public/Compare'),
  '/calculator': () => import('../pages/public/Calculator'),
  '/about': () => import('../pages/public/About'),
  '/contact': () => import('../pages/public/Contact'),
  '/favorites': () => import('../pages/public/Favorites'),
}

const prefetchedRoutes = new Set<string>()

const navLinks: NavLinkItem[] = [
  { to: '/areas', icon: BarChart3, label: 'אזורים' },
  { to: '/compare', icon: GitCompareArrows, label: 'השוואה', badge: 'compare' },
  { to: '/calculator', icon: Calculator, label: 'מחשבון' },
  { to: '/about', icon: Info, label: 'אודות' },
  { to: '/contact', icon: Phone, label: 'צור קשר' },
  { to: '/favorites', icon: Heart, label: 'מועדפים' },
]

const prefetchRoute = (path: string) => {
  if (prefetchedRoutes.has(path)) return
  const loader = routePrefetchMap[path]
  if (!loader) return
  prefetchedRoutes.add(path)
  loader().catch(() => {
    prefetchedRoutes.delete(path)
  })
}

export default function PublicNav() {
  const location = useLocation()
  const { favorites } = useFavorites() as { favorites: string[] }
  const [compareIds] = useLocalStorage('landmap_compare', [] as string[])
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen || !menuRef.current) return
    const menu = menuRef.current
    const focusableEls = menu.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    )
    if (focusableEls.length > 0) focusableEls[0].focus()

    const handleTab = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
        hamburgerRef.current?.focus()
        return
      }
      if (event.key !== 'Tab') return
      const first = focusableEls[0]
      const last = focusableEls[focusableEls.length - 1]
      const active = document.activeElement
      if (!active) return
      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [menuOpen])

  return (
    <>
      <NavBar dir="rtl">
        <NavInner>
          <LogoLink to="/">
            <LogoEmoji aria-hidden>🏗️</LogoEmoji>
            <BrandText>LandMap</BrandText>
          </LogoLink>

          <DesktopLinks>
            {navLinks.map(({ to, icon: Icon, label, badge }) => {
              const isActive = location.pathname === to
              const isFav = to === '/favorites'
              const isCompare = badge === 'compare'
              const badgeCount = isFav ? favorites.length : isCompare ? compareIds.length : 0
              return (
                <NavItemLink
                  key={to}
                  to={to}
                  aria-current={isActive ? 'page' : undefined}
                  onMouseEnter={() => prefetchRoute(to)}
                  onFocus={() => prefetchRoute(to)}
                  $active={isActive}
                >
                  <Icon aria-hidden />
                  <NavLabel>{label}</NavLabel>
                  {badgeCount > 0 && (
                    <Badge $tone={isFav ? 'favorite' : 'compare'}>{badgeCount}</Badge>
                  )}
                </NavItemLink>
              )
            })}

            <BackToMap to="/">
              <Map aria-hidden />
              <NavLabel>למפה</NavLabel>
            </BackToMap>
          </DesktopLinks>

          <HamburgerButton
            ref={hamburgerRef}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'סגור תפריט' : 'פתח תפריט'}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
          >
            {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
          </HamburgerButton>
        </NavInner>
      </NavBar>

      <MobileMenu
        ref={menuRef}
        id="mobile-nav-menu"
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
        dir="rtl"
        $open={menuOpen}
      >
        {navLinks.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to
          return (
            <MobileNavLink
              key={to}
              to={to}
              aria-current={isActive ? 'page' : undefined}
              onMouseEnter={() => prefetchRoute(to)}
              onFocus={() => prefetchRoute(to)}
              onClick={() => setMenuOpen(false)}
              $active={isActive}
            >
              <Icon aria-hidden />
              {label}
            </MobileNavLink>
          )
        })}
        <MobileNavLink
          to="/"
          onClick={() => setMenuOpen(false)}
          $variant="cta"
        >
          <Map aria-hidden />
          חזרה למפה
        </MobileNavLink>
      </MobileMenu>

      {menuOpen && <MenuBackdrop onClick={() => setMenuOpen(false)} />}
    </>
  )
}

const NavBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(10, 22, 40, 0.82);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`

const NavInner = styled.div`
  max-width: 72rem;
  margin: 0 auto;
  padding: 0 1rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  ${media.sm} {
    padding: 0 1.5rem;
  }
`

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: ${theme.colors.white};
`

const LogoEmoji = styled.span`
  font-size: 1.125rem;
`

const BrandText = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  letter-spacing: 0.02em;
`

const DesktopLinks = styled.div`
  display: none;
  align-items: center;
  gap: 0.25rem;
  ${media.md} {
    display: flex;
  }
`

const NavLabel = styled.span`
  display: none;
  ${media.sm} {
    display: inline;
  }
`

const NavItemLink = styled(Link)<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.radii.lg};
  font-size: 0.875rem;
  text-decoration: none;
  color: ${({ $active }) => ($active ? theme.colors.gold : theme.colors.slate[400])};
  background: ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.15)' : 'transparent')};
  transition: ${theme.transitions.fast};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover,
  &:focus-visible {
    color: ${theme.colors.slate[200]};
    background: rgba(255, 255, 255, 0.05);
  }
`

const Badge = styled.span<{ $tone: 'favorite' | 'compare' }>`
  position: absolute;
  top: -4px;
  left: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: ${theme.radii.full};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: ${theme.colors.white};
  background: ${({ $tone }) => ($tone === 'favorite' ? theme.colors.red : theme.colors.purple)};
`

const BackToMap = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  margin-right: 0.5rem;
  border-radius: ${theme.radii.lg};
  font-size: 0.875rem;
  font-weight: 700;
  color: ${theme.colors.navy};
  text-decoration: none;
  background: ${theme.gradients.gold};
  transition: ${theme.transitions.normal};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover,
  &:focus-visible {
    box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3);
  }
`

const HamburgerButton = styled.button`
  border: none;
  background: transparent;
  color: ${theme.colors.white};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
  border-radius: ${theme.radii.md};
  ${media.md} {
    display: none;
  }

  svg {
    width: 24px;
    height: 24px;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.08);
  }
`

const MobileMenu = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 4rem;
  left: 0;
  right: 0;
  z-index: 49;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: rgba(8, 18, 35, 0.96);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: ${({ $open }) => ($open ? 'translateY(0)' : 'translateY(-10px)')};
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  transition: ${theme.transitions.smooth};
  ${media.md} {
    display: none;
  }
`

const MobileNavLink = styled(Link)<{ $active?: boolean; $variant?: 'cta' }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: ${theme.radii.lg};
  text-decoration: none;
  font-weight: ${({ $variant }) => ($variant === 'cta' ? 700 : 500)};
  color: ${({ $variant, $active }) => {
    if ($variant === 'cta') return theme.colors.gold
    return $active ? theme.colors.gold : theme.colors.slate[200]
  }};
  background: ${({ $variant, $active }) => {
    if ($variant === 'cta') return 'linear-gradient(90deg, rgba(200, 148, 42, 0.2), rgba(229, 185, 78, 0.12))'
    return $active ? 'rgba(200, 148, 42, 0.12)' : 'rgba(255, 255, 255, 0.03)'
  }};

  svg {
    width: 20px;
    height: 20px;
  }
`

const MenuBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 48;
  background: rgba(0, 0, 0, 0.3);
  ${media.md} {
    display: none;
  }
`
