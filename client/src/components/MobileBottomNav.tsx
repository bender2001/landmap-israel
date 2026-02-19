import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { Map, Heart, Calculator, BarChart3 } from 'lucide-react'
import { useFavorites } from '../hooks/useUserData'
import { useScrollDirection } from '../hooks/useUI'
import { theme, media } from '../styles/theme'

interface NavItemDef {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>
  label: string
  exact?: boolean
  badge?: 'favorites'
}

interface NavItemProps extends NavItemDef {
  isActive: boolean
  badgeCount: number
}

const navItems: NavItemDef[] = [
  { to: '/', icon: Map, label: 'מפה', exact: true },
  { to: '/areas', icon: BarChart3, label: 'אזורים' },
  { to: '/calculator', icon: Calculator, label: 'מחשבון' },
  { to: '/favorites', icon: Heart, label: 'מועדפים', badge: 'favorites' },
]

const Nav = styled.nav<{ $hidden: boolean }>`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(10, 22, 40, 0.95);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  gap: 6px;
  z-index: ${theme.zIndex.filterBar};
  transform: ${({ $hidden }) => ($hidden ? 'translateY(100%)' : 'translateY(0)')};
  transition: transform ${theme.transitions.smooth};

  ${media.sm} {
    display: none;
  }
`

const Item = styled(Link)<{ $active: boolean }>`
  position: relative;
  flex: 1;
  padding: 6px 4px;
  border-radius: ${theme.radii.md};
  text-decoration: none;
  color: ${({ $active }) => ($active ? theme.colors.gold : theme.colors.slate[400])};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
  }
`

const IconWrap = styled.div`
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
`

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.red};
  color: ${theme.colors.white};
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const Label = styled.span`
  font-size: 10px;
  font-weight: 600;
`

const Indicator = styled.span`
  position: absolute;
  bottom: -6px;
  width: 16px;
  height: 3px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.gold};
`

function NavItem({ to, icon: Icon, label, isActive, badge, badgeCount }: NavItemProps) {
  return (
    <Item to={to} aria-current={isActive ? 'page' : undefined} $active={isActive}>
      <IconWrap>
        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
        {badge && badgeCount > 0 && (
          <Badge>{badgeCount > 9 ? '9+' : badgeCount}</Badge>
        )}
      </IconWrap>
      <Label>{label}</Label>
      {isActive && <Indicator />}
    </Item>
  )
}

function MobileBottomNav() {
  const location = useLocation()
  const { favorites } = useFavorites()
  const scrollDirection = useScrollDirection({ threshold: 20 })

  if (location.pathname.startsWith('/admin')) return null

  const isHidden = scrollDirection === 'down'

  return (
    <Nav $hidden={isHidden} dir="rtl" role="navigation" aria-label="ניווט מהיר">
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
    </Nav>
  )
}

export default memo(MobileBottomNav)
