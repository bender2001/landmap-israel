import React, { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { Menu, X, Map, Calculator, Info, CreditCard, LayoutDashboard, Heart, GitCompare, Settings, Users, FileText, BarChart3, LogOut, ChevronRight, Search, Command } from 'lucide-react'
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
const SearchTrigger = styled.button`
  display:inline-flex;align-items:center;gap:8px;padding:6px 14px;
  background:${t.lBorder};border:1px solid transparent;border-radius:${t.r.full};
  color:${t.lTextSec};font-size:13px;font-family:${t.font};font-weight:500;
  cursor:pointer;transition:all ${tr};white-space:nowrap;
  &:hover{border-color:${t.gold};color:${t.gold};background:${t.goldDim};}
  ${mobile}{padding:6px;gap:0;width:36px;height:36px;justify-content:center;border-radius:${t.r.md};}
`
const SearchTriggerText = styled.span`${mobile}{display:none;}`
const SearchTriggerKbd = styled.kbd`
  display:inline-flex;align-items:center;gap:2px;padding:1px 6px;
  font-size:10px;font-weight:600;font-family:${t.font};line-height:1.4;
  color:${t.lTextSec};background:rgba(0,0,0,0.05);
  border:1px solid ${t.lBorder};border-radius:4px;
  ${mobile}{display:none;}
`
const MobileActions = styled.div`
  display:none;align-items:center;gap:4px;
  ${mobile}{display:flex;}
`
const MobileSearchBtn = styled.button`
  display:flex;align-items:center;justify-content:center;
  width:36px;height:36px;border-radius:${t.r.md};
  background:none;border:none;color:${t.lText};cursor:pointer;
  transition:all ${tr};
  &:hover{background:${t.lBorder};color:${t.gold};}
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
  { to: '/explore', label: 'מפה' }, { to: '/about', label: 'אודות' },
  { to: '/pricing', label: 'מחירים' }, { to: '/contact', label: 'צור קשר' },
]

export function PublicNav() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  React.useEffect(() => { setMobileOpen(false) }, [pathname])

  React.useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [mobileOpen])

  return (
    <>
      <NavWrap $scrolled={scrolled}>
        <NavInner>
          <Logo to="/">LandMap</Logo>
          <NavLinks>
            {NAV_ITEMS.map(n => {
              const active = pathname.startsWith(n.to)
              return <NavLink key={n.to} to={n.to} $active={active} aria-current={active ? 'page' : undefined}>{n.label}</NavLink>
            })}
          </NavLinks>
          <AuthBtns>
            <SearchTrigger
              onClick={() => {
                // Dispatch Ctrl+K to open the command palette
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
              }}
              aria-label="חיפוש מהיר (Ctrl+K)"
              title="חיפוש מהיר (Ctrl+K)"
            >
              <Search size={15} />
              <SearchTriggerText>חיפוש</SearchTriggerText>
              <SearchTriggerKbd>⌘K</SearchTriggerKbd>
            </SearchTrigger>
            <BtnGhost to="/login">התחבר</BtnGhost>
            <BtnGold to="/login">הרשם</BtnGold>
          </AuthBtns>
          <MobileActions>
            <MobileSearchBtn
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
              }}
              aria-label="חיפוש מהיר"
            >
              <Search size={18} />
            </MobileSearchBtn>
            <Burger onClick={() => setMobileOpen(true)} aria-label="תפריט"><Menu size={24} /></Burger>
          </MobileActions>
        </NavInner>
      </NavWrap>
      <MobileMenu $open={mobileOpen}>
        <CloseBtn onClick={() => setMobileOpen(false)} aria-label="סגור"><X size={28} /></CloseBtn>
        {NAV_ITEMS.map(n => <MobileLink key={n.to} to={n.to} onClick={() => setMobileOpen(false)}>{n.label}</MobileLink>)}
        <MobileLink to="/login" onClick={() => setMobileOpen(false)}>התחבר</MobileLink>
        <MobileLink to="/login" onClick={() => setMobileOpen(false)} style={{ color: t.gold }}>הרשם</MobileLink>
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

const FooterColTitle = styled.span`font-weight:700;color:${t.text};font-size:13px;margin-bottom:4px;`
const FooterDesc = styled.span`font-size:12px;color:${t.textDim};line-height:1.7;max-width:260px;`
const FooterSocials = styled.div`display:flex;align-items:center;gap:8px;margin-top:8px;`
const FooterSocialLink = styled.a`
  display:flex;align-items:center;justify-content:center;width:34px;height:34px;
  border-radius:${t.r.sm};border:1px solid ${t.border};color:${t.textSec};
  text-decoration:none!important;transition:all ${tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`
const FooterBadges = styled.div`
  display:flex;align-items:center;gap:12px;justify-content:center;margin-top:8px;
  flex-wrap:wrap;
`
const FooterTrustBadge = styled.div`
  display:flex;align-items:center;gap:5px;padding:4px 10px;
  border-radius:${t.r.full};background:rgba(255,255,255,0.03);
  border:1px solid ${t.border};font-size:10px;color:${t.textDim};
`

export function PublicFooter() {
  const year = new Date().getFullYear()
  return (
    <FooterWrap>
      <FooterInner>
        <FooterCol>
          <FooterLogo>LandMap</FooterLogo>
          <FooterDesc>פלטפורמת השקעות קרקע מובילה בישראל — מפה אינטראקטיבית, ניתוח AI ונתוני שוק בזמן אמת.</FooterDesc>
          <FooterSocials>
            <FooterSocialLink href="https://wa.me/message/landmap" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp">💬</FooterSocialLink>
            <FooterSocialLink href="mailto:info@landmap.co.il" aria-label="אימייל" title="אימייל">📧</FooterSocialLink>
            <FooterSocialLink href="/contact" aria-label="צור קשר" title="צור קשר">📞</FooterSocialLink>
          </FooterSocials>
        </FooterCol>
        <FooterCol>
          <FooterColTitle>ניווט</FooterColTitle>
          {NAV_ITEMS.map(n => <FooterLink key={n.to} to={n.to}>{n.label}</FooterLink>)}
          <FooterLink to="/explore">חיפוש חלקות</FooterLink>
          <FooterLink to="/login">הרשמה / התחברות</FooterLink>
        </FooterCol>
        <FooterCol>
          <FooterColTitle>משאבים</FooterColTitle>
          <FooterLink to="/#faq">שאלות נפוצות</FooterLink>
          <FooterLink to="/about">אודות LandMap</FooterLink>
          <FooterLink to="/contact">צור קשר</FooterLink>
        </FooterCol>
        <FooterCol>
          <FooterColTitle>משפטי</FooterColTitle>
          <FooterLink to="/terms">תנאי שימוש</FooterLink>
          <FooterLink to="/privacy">מדיניות פרטיות</FooterLink>
          <FooterLink to="/accessibility">הצהרת נגישות</FooterLink>
        </FooterCol>
      </FooterInner>
      <FooterDivider />
      <FooterBadges>
        <FooterTrustBadge>🔒 SSL מאובטח</FooterTrustBadge>
        <FooterTrustBadge>📋 נתוני תקן 22</FooterTrustBadge>
        <FooterTrustBadge>🤖 מונע AI</FooterTrustBadge>
        <FooterTrustBadge>🇮🇱 תוצרת ישראל</FooterTrustBadge>
      </FooterBadges>
      <Copyright style={{marginTop:12}}>&copy; {year} LandMap Israel. כל הזכויות שמורות. המידע באתר אינו מהווה ייעוץ השקעות.</Copyright>
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
  return (
    <PublicWrap>
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
      <PublicNav />
      <PublicMain id="main-content" role="main">{children}</PublicMain>
      <PublicFooter />
    </PublicWrap>
  )
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
