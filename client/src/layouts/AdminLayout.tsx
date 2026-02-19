import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { LayoutDashboard, Map, Users, MapPin, Activity, Settings, LogOut, type LucideIcon } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../components/ui/Spinner'
import { media, theme } from '../styles/theme'

type AuthUser = {
  email?: string | null
}

type AuthContextValue = {
  user?: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
}

type NavItemConfig = {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
}

const navItems: NavItemConfig[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'דשבורד', end: true },
  { to: '/admin/plots', icon: Map, label: 'חלקות' },
  { to: '/admin/leads', icon: Users, label: 'לידים' },
  { to: '/admin/pois', icon: MapPin, label: 'נק׳ עניין' },
  { to: '/admin/activity', icon: Activity, label: 'יומן' },
  { to: '/admin/settings', icon: Settings, label: 'הגדרות' },
]

const LayoutRoot = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${theme.colors.navy};
  direction: rtl;

  ${media.md} {
    flex-direction: row;
  }
`

const Sidebar = styled.aside`
  display: none;
  width: 14rem;
  flex-shrink: 0;
  background: ${theme.colors.navyMid};
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  flex-direction: column;

  ${media.md} {
    display: flex;
  }
`

const LogoSection = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const LogoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const LogoIcon = styled.span`
  font-size: 18px;
`

const LogoText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const brandShimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`

const BrandText = styled.span`
  font-size: 14px;
  font-weight: 700;
  background: linear-gradient(90deg, ${theme.colors.gold} 0%, ${theme.colors.goldBright} 25%, ${theme.colors.goldLight} 50%, ${theme.colors.goldBright} 75%, ${theme.colors.gold} 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${brandShimmer} 6s linear infinite;
`

const LogoSubtitle = styled.span`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const Nav = styled.nav`
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  text-decoration: none;
  transition: color ${theme.transitions.normal}, background ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.slate[200]};
    background: rgba(255, 255, 255, 0.05);
  }

  &.active {
    background: rgba(200, 148, 42, 0.15);
    color: ${theme.colors.gold};
    font-weight: 500;
  }
`

const NavIconWrap = styled.span`
  display: inline-flex;
  width: 16px;
  height: 16px;

  svg {
    width: 16px;
    height: 16px;
  }
`

const SidebarBottom = styled.div`
  padding: 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const UserEmail = styled.div`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
  padding: 0 12px;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const LogoutButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  color: rgba(248, 113, 113, 0.9);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: rgba(239, 68, 68, 0.1);
  }
`

const MainContent = styled.main`
  flex: 1;
  overflow-y: auto;
  padding-bottom: 64px;

  ${media.md} {
    padding-bottom: 0;
  }
`

const MobileNav = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  background: ${theme.colors.navyMid};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: env(safe-area-inset-bottom, 0px);

  ${media.md} {
    display: none;
  }
`

const MobileNavItem = styled(NavLink)`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 8px;
  min-height: 56px;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  text-decoration: none;
  transition: color ${theme.transitions.normal};

  &.active {
    color: ${theme.colors.gold};
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const MobileLogoutButton = styled.button`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 8px;
  min-height: 56px;
  font-size: 10px;
  color: rgba(248, 113, 113, 0.9);
  background: transparent;
  border: none;
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
  }
`

const LoadingScreen = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.navyDark};
`

const LoadingSpinner = styled(Spinner)`
  width: 40px;
  height: 40px;
  color: ${theme.colors.gold};
`

export default function AdminLayout() {
  const { user, loading, logout } = useAuth() as AuthContextValue
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login', { replace: true })
    }
  }, [loading, user, navigate])

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  if (loading) {
    return (
      <LoadingScreen>
        <LoadingSpinner />
      </LoadingScreen>
    )
  }

  if (!user) return null

  return (
    <LayoutRoot>
      <Sidebar>
        <LogoSection>
          <LogoRow>
            <LogoIcon>🏗️</LogoIcon>
            <LogoText>
              <BrandText>LandMap</BrandText>
              <LogoSubtitle>ניהול מערכת</LogoSubtitle>
            </LogoText>
          </LogoRow>
        </LogoSection>

        <Nav>
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavItem key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <NavIconWrap>
                <Icon />
              </NavIconWrap>
              {label}
            </NavItem>
          ))}
        </Nav>

        <SidebarBottom>
          <UserEmail>{user.email}</UserEmail>
          <LogoutButton onClick={handleLogout} type="button">
            <NavIconWrap>
              <LogOut />
            </NavIconWrap>
            התנתק
          </LogoutButton>
        </SidebarBottom>
      </Sidebar>

      <MainContent>
        <Outlet />
      </MainContent>

      <MobileNav>
        {navItems.slice(0, 4).map(({ to, icon: Icon, label, end }) => (
          <MobileNavItem key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon />
            {label}
          </MobileNavItem>
        ))}
        <MobileLogoutButton onClick={handleLogout} type="button">
          <LogOut />
          יציאה
        </MobileLogoutButton>
      </MobileNav>
    </LayoutRoot>
  )
}
