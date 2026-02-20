import React, { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { Menu, X, Map, Calculator, Info, CreditCard, LayoutDashboard, Heart, GitCompare, Settings, Users, FileText, BarChart3, LogOut, ChevronRight } from 'lucide-react'
import { t, sm, md, lg, mobile, fadeIn, fadeInUp } from '../theme'
import { useAuth } from '../hooks'
import type { Role } from '../types'

/* ━━ styled helpers ━━ */
const goldGrad = `linear-gradient(135deg, ${t.gold}, ${t.goldBright})`
const tr = t.tr

/* ══════════════════════ PUBLIC NAV ══════════════════════ */
const NavWrap = styled.header<{ $scrolled: boolean }>`
  position: sticky; top: 0; z-index: ${t.z.nav}; width: 100%;
  background: ${p => p.$scrolled ? 'rgba(255,255,255,0.97)' : t.lSurface};
  backdrop-filter: ${p => p.$scrolled ? 'blur(12px)' : 'none'};
  box-shadow: ${p => p.$scrolled ? t.sh.sm : 'none'};
  border-bottom: 1px solid ${t.lBorder}; transition: all ${tr};
`
const NavInner = styled.nav`
  max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: 64px; direction: rtl;
`
const Logo = styled(Link)`
  font-size: 22px; font-weight: 800; background: ${goldGrad}; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; text-decoration: none !important; letter-spacing: -0.5px;
`
const NavLinks = styled.div`display:flex;align-items:center;gap:8px;${mobile}{display:none;}`
const NavLink = styled(Link)<{ $active?: boolean }>`
  padding: 6px 14px; border-radius: ${t.r.full}; font-size: 14px; font-weight: 500;
  color: ${p => p.$active ? t.gold : t.lTextSec}; text-decoration: none !important;
  transition: all ${tr}; &:hover { color: ${t.gold}; background: ${t.goldDim}; }
  ${p => p.$active && css`background: ${t.goldDim};`}
`
const AuthBtns = styled.div`display:flex;align-items:center;gap:10px;${mobile}{display:none;}`
const BtnGhost = styled(Link)`
  padding: 8px 18px; border-radius: ${t.r.full}; font-size: 13px; font-weight: 600;
  color: ${t.lText}; text-decoration: none !important; transition: all ${tr};
  &:hover { background: ${t.lBorder}; }
`
const BtnGold = styled(Link)`
  padding: 8px 18px; border-radius: ${t.r.full}; font-size: 13px; font-weight: 600;
  background: ${goldGrad}; color: ${t.black}; text-decoration: none !important;
  transition: all ${tr}; &:hover { box-shadow: ${t.sh.glow}; transform: translateY(-1px); }
`
const Burger = styled.button`
  display: none; background: none; border: none; color: ${t.lText}; cursor: pointer; padding: 8px;
  ${mobile}{ display: flex; align-items: center; }
`
const MobileMenu = styled.div<{ $open: boolean }>`
  position: fixed; inset: 0; z-index: 999; background: rgba(255,255,255,0.98); backdrop-filter: blur(16px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
  animation: ${fadeIn} 0.2s; ${p => !p.$open && 'display:none;'}
`
const MobileLink = styled(Link)`
  font-size: 20px; font-weight: 600; color: ${t.lText}; text-decoration: none !important; padding: 12px 0;
  &:hover { color: ${t.gold}; }
`
const CloseBtn = styled.button`
  position: absolute; top: 16px; left: 16px; background: none; border: none; cursor: pointer; color: ${t.lText};
`

const NAV_ITEMS = [
  { to: '/map', label: 'מפה' }, { to: '/regions', label: 'אזורים' },
  { to: '/calculator', label: 'מחשבון' }, { to: '/about', label: 'אודות' },
  { to: '/pricing', label: 'מחירים' },
]

export function PublicNav() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  React.useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <>
      <NavWrap $scrolled={scrolled}>
        <NavInner>
          <Logo to="/">LandMap</Logo>
          <NavLinks>
            {NAV_ITEMS.map(n => (
              <NavLink key={n.to} to={n.to} $active={pathname.startsWith(n.to)}>{n.label}</NavLink>
            ))}
          </NavLinks>
          <AuthBtns>
            <BtnGhost to="/login">התחבר</BtnGhost>
            <BtnGold to="/register">הרשם</BtnGold>
          </AuthBtns>
          <Burger onClick={() => setMobileOpen(true)} aria-label="תפריט"><Menu size={24} /></Burger>
        </NavInner>
      </NavWrap>
      <MobileMenu $open={mobileOpen}>
        <CloseBtn onClick={() => setMobileOpen(false)} aria-label="סגור"><X size={28} /></CloseBtn>
        {NAV_ITEMS.map(n => <MobileLink key={n.to} to={n.to} onClick={() => setMobileOpen(false)}>{n.label}</MobileLink>)}
        <MobileLink to="/login" onClick={() => setMobileOpen(false)}>התחבר</MobileLink>
        <MobileLink to="/register" onClick={() => setMobileOpen(false)} style={{ color: t.gold }}>הרשם</MobileLink>
      </MobileMenu>
    </>
  )
}

/* ══════════════════════ PUBLIC FOOTER ══════════════════════ */
const FooterWrap = styled.footer`
  background: ${t.black}; color: ${t.textSec}; padding: 48px 24px 24px; direction: rtl;
`
const FooterInner = styled.div`
  max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 40px; justify-content: space-between;
  align-items: flex-start; ${mobile}{ flex-direction: column; gap: 24px; }
`
const FooterLogo = styled.span`font-size: 20px; font-weight: 800; background: ${goldGrad}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;`
const FooterCol = styled.div`display: flex; flex-direction: column; gap: 8px;`
const FooterLink = styled(Link)`color: ${t.textSec}; font-size: 13px; text-decoration: none !important; transition: color ${tr}; &:hover { color: ${t.gold}; }`
const FooterDivider = styled.div`width: 100%; height: 1px; background: ${t.border}; margin: 32px auto 16px;`
const Copyright = styled.p`text-align: center; font-size: 12px; color: ${t.textDim}; max-width: 1200px; margin: 0 auto;`

export function PublicFooter() {
  return (
    <FooterWrap>
      <FooterInner>
        <FooterCol><FooterLogo>LandMap</FooterLogo><span style={{ fontSize: 13 }}>פלטפורמת השקעות קרקע מובילה בישראל</span></FooterCol>
        <FooterCol>
          <span style={{ fontWeight: 700, color: t.text, fontSize: 13 }}>ניווט</span>
          {NAV_ITEMS.map(n => <FooterLink key={n.to} to={n.to}>{n.label}</FooterLink>)}
        </FooterCol>
        <FooterCol>
          <span style={{ fontWeight: 700, color: t.text, fontSize: 13 }}>משפטי</span>
          <FooterLink to="/terms">תנאי שימוש</FooterLink>
          <FooterLink to="/privacy">מדיניות פרטיות</FooterLink>
          <FooterLink to="/contact">צור קשר</FooterLink>
        </FooterCol>
      </FooterInner>
      <FooterDivider />
      <Copyright>&copy; {new Date().getFullYear()} LandMap. כל הזכויות שמורות.</Copyright>
    </FooterWrap>
  )
}

/* ══════════════════════ AUTH SIDEBAR ══════════════════════ */
const sidebarItems: Record<string, { to: string; icon: React.ElementType; label: string }[]> = {
  user: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'דשבורד' },
    { to: '/favorites', icon: Heart, label: 'מועדפים' },
    { to: '/compare', icon: GitCompare, label: 'השוואה' },
    { to: '/calculator', icon: Calculator, label: 'מחשבון' },
    { to: '/settings', icon: Settings, label: 'הגדרות' },
  ],
  business: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'דשבורד' },
    { to: '/my-plots', icon: Map, label: 'חלקות שלי' },
    { to: '/leads', icon: FileText, label: 'לידים' },
    { to: '/analytics', icon: BarChart3, label: 'אנליטיקס' },
  ],
  admin: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'דשבורד' },
    { to: '/admin/users', icon: Users, label: 'משתמשים' },
    { to: '/admin/plots', icon: Map, label: 'חלקות' },
    { to: '/admin/leads', icon: FileText, label: 'לידים' },
    { to: '/admin/settings', icon: Settings, label: 'הגדרות' },
  ],
}

const SideWrap = styled.aside<{ $collapsed: boolean }>`
  position: fixed; top: 0; right: 0; bottom: 0; z-index: ${t.z.sidebar};
  width: ${p => p.$collapsed ? '64px' : '240px'}; background: #111827; border-left: 1px solid ${t.border};
  display: flex; flex-direction: column; transition: width 0.3s cubic-bezier(0.4,0,0.2,1); overflow: hidden;
  ${mobile}{ width: ${p => p.$collapsed ? '0' : '260px'}; box-shadow: ${p => p.$collapsed ? 'none' : t.sh.xl}; }
`
const SideHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; padding: 18px 16px; border-bottom: 1px solid ${t.border};
`
const SideLogo = styled.span<{ $show: boolean }>`
  font-size: 18px; font-weight: 800; background: ${goldGrad}; -webkit-background-clip: text;
  -webkit-text-fill-color: transparent; white-space: nowrap; opacity: ${p => p.$show ? 1 : 0}; transition: opacity 0.2s;
`
const CollapseBtn = styled.button<{ $flip: boolean }>`
  background: none; border: none; color: ${t.textSec}; cursor: pointer; padding: 4px; display: flex;
  transition: transform 0.3s; transform: rotate(${p => p.$flip ? '180deg' : '0'});
`
const SideNav = styled.nav`flex: 1; overflow-y: auto; padding: 12px 8px; display: flex; flex-direction: column; gap: 2px;`
const SideItem = styled(Link)<{ $active?: boolean; $collapsed?: boolean }>`
  display: flex; align-items: center; gap: 12px; padding: 10px ${p => p.$collapsed ? '0' : '12px'};
  justify-content: ${p => p.$collapsed ? 'center' : 'flex-start'};
  border-radius: ${t.r.md}; font-size: 14px; font-weight: 500;
  color: ${p => p.$active ? t.goldBright : t.textSec}; text-decoration: none !important;
  background: ${p => p.$active ? t.goldDim : 'transparent'};
  transition: all ${tr}; position: relative;
  ${p => p.$active && css`&::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 20px; border-radius: 2px; background: ${t.gold}; }`}
  &:hover { color: ${t.goldBright}; background: rgba(255,255,255,0.04); }
`
const SideLabel = styled.span<{ $show: boolean }>`
  white-space: nowrap; opacity: ${p => p.$show ? 1 : 0}; transition: opacity 0.15s;
  ${p => !p.$show && 'width: 0; overflow: hidden;'}
`
const SideFooter = styled.div`padding: 12px 8px; border-top: 1px solid ${t.border};`
const LogoutBtn = styled.button<{ $collapsed: boolean }>`
  display: flex; align-items: center; gap: 12px; width: 100%; padding: 10px ${p => p.$collapsed ? '0' : '12px'};
  justify-content: ${p => p.$collapsed ? 'center' : 'flex-start'};
  border-radius: ${t.r.md}; border: none; background: none; cursor: pointer;
  color: ${t.err}; font-size: 14px; font-weight: 500; font-family: ${t.font}; transition: all ${tr};
  &:hover { background: rgba(239,68,68,0.08); }
`
const Overlay = styled.div`position:fixed;inset:0;z-index:${t.z.sidebar - 1};background:rgba(0,0,0,0.4);${md}{display:none;}`

export function AuthSidebar({ role }: { role: Role }) {
  const { pathname } = useLocation()
  const { logout } = useAuth()
  const nav = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const items = sidebarItems[role] || sidebarItems.user

  const handleLogout = () => { logout(); nav('/login') }

  return (
    <>
      {!collapsed && <Overlay onClick={() => setCollapsed(true)} />}
      <SideWrap $collapsed={collapsed}>
        <SideHeader>
          <SideLogo $show={!collapsed}>LandMap</SideLogo>
          <CollapseBtn $flip={collapsed} onClick={() => setCollapsed(p => !p)} aria-label="צמצם תפריט">
            <ChevronRight size={18} />
          </CollapseBtn>
        </SideHeader>
        <SideNav>
          {items.map(item => (
            <SideItem key={item.to} to={item.to} $active={pathname.startsWith(item.to)} $collapsed={collapsed}
              title={collapsed ? item.label : undefined}>
              <item.icon size={20} />
              <SideLabel $show={!collapsed}>{item.label}</SideLabel>
            </SideItem>
          ))}
        </SideNav>
        <SideFooter>
          <LogoutBtn $collapsed={collapsed} onClick={handleLogout} title={collapsed ? 'התנתק' : undefined}>
            <LogOut size={20} />
            <SideLabel $show={!collapsed}>התנתק</SideLabel>
          </LogoutBtn>
        </SideFooter>
      </SideWrap>
    </>
  )
}

/* ══════════════════════ LAYOUT WRAPPERS ══════════════════════ */
const PublicWrap = styled.div`min-height: 100vh; display: flex; flex-direction: column; animation: ${fadeInUp} 0.4s;`
const PublicMain = styled.main`flex: 1;`

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicWrap><PublicNav /><PublicMain>{children}</PublicMain><PublicFooter /></PublicWrap>
}

const DashWrap = styled.div`min-height: 100vh; display: flex; direction: rtl;`
const DashContent = styled.main<{ $collapsed: boolean }>`
  flex: 1; margin-right: ${p => p.$collapsed ? '64px' : '240px'}; padding: 24px 32px;
  background: ${t.lBg}; min-height: 100vh; transition: margin-right 0.3s cubic-bezier(0.4,0,0.2,1);
  animation: ${fadeIn} 0.3s; ${mobile}{ margin-right: 0; padding: 16px; }
`

export function DashLayout({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <DashWrap>
      <AuthSidebar role={role} />
      <DashContent $collapsed={false}>{children}</DashContent>
    </DashWrap>
  )
}

/* ══════════════════════ ROLE GUARD ══════════════════════ */
export function RoleGuard({ role, children }: { role: Role | Role[]; children: React.ReactNode }) {
  const { user, role: userRole, isLoading } = useAuth()
  if (isLoading) return null
  const allowed = Array.isArray(role) ? role : [role]
  if (!user || !allowed.includes(userRole)) return <Navigate to="/login" replace />
  return <>{children}</>
}
