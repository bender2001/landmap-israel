import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ErrorBoundary, PageLoader, CookieConsent, PWAInstallPrompt } from './components/UI'
import { RoleGuard } from './components/Layout'
import { t } from './theme'
import { MapPin, Home, Search } from 'lucide-react'

const Landing = lazy(() => import('./pages/Landing'))
const Explore = lazy(() => import('./pages/Explore'))
const PlotDetail = lazy(() => import('./pages/PlotDetail'))
const Auth = lazy(() => import('./pages/Auth'))
const Public = lazy(() => import('./pages/Public'))
const UserDash = lazy(() => import('./pages/UserDash'))
const Business = lazy(() => import('./pages/Business'))
const Admin = lazy(() => import('./pages/Admin'))
const CommandPalette = lazy(() => import('./components/CommandPalette'))

/* ── Premium 404 Page ── */
const nfFloat = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}`
const nfFadeIn = keyframes`from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}`
const nfGlow = keyframes`0%,100%{box-shadow:0 0 40px rgba(212,168,75,0.1)}50%{box-shadow:0 0 80px rgba(212,168,75,0.2)}`

const NF = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  min-height:100vh;gap:24px;background:${t.bg};color:${t.textSec};
  position:relative;overflow:hidden;direction:rtl;font-family:${t.font};
  &::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;
    background:radial-gradient(ellipse at 50% 30%,rgba(212,168,75,0.04) 0%,transparent 60%);pointer-events:none;}
`
const NFIcon = styled.div`
  width:120px;height:120px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,rgba(212,168,75,0.08),rgba(212,168,75,0.02));
  border:1px solid ${t.goldBorder};
  animation:${nfFloat} 4s ease-in-out infinite,${nfGlow} 4s ease-in-out infinite;
`
const NFCode = styled.h1`
  font-size:clamp(56px,10vw,96px);font-weight:900;color:${t.text};
  background:linear-gradient(135deg,${t.gold},${t.goldBright});-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;margin:0;line-height:1;
  animation:${nfFadeIn} 0.6s 0.1s ease-out both;
`
const NFTitle = styled.h2`
  font-size:clamp(18px,3vw,24px);font-weight:700;color:${t.text};margin:0;
  animation:${nfFadeIn} 0.6s 0.2s ease-out both;
`
const NFDesc = styled.p`
  font-size:15px;color:${t.textSec};margin:0;max-width:400px;text-align:center;line-height:1.7;
  animation:${nfFadeIn} 0.6s 0.3s ease-out both;
`
const NFActions = styled.div`
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center;
  animation:${nfFadeIn} 0.6s 0.4s ease-out both;
`
const NFBtn = styled(Link)<{$primary?:boolean}>`
  display:inline-flex;align-items:center;gap:8px;padding:12px 28px;border-radius:${t.r.full};
  font-weight:700;font-size:14px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  text-decoration:none!important;
  ${pr => pr.$primary ? `
    background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};border:none;
    &:hover{box-shadow:${t.sh.glow};transform:translateY(-2px);}
  ` : `
    background:transparent;color:${t.gold};border:1px solid ${t.goldBorder};
    &:hover{background:${t.goldDim};border-color:${t.gold};}
  `}
`
const NFMeta = styled.div`
  font-size:12px;color:${t.textDim};margin-top:16px;
  animation:${nfFadeIn} 0.6s 0.5s ease-out both;
`

const NotFound = () => (
  <NF>
    <NFIcon><MapPin size={48} color={t.gold} /></NFIcon>
    <NFCode>404</NFCode>
    <NFTitle>הדף לא נמצא</NFTitle>
    <NFDesc>נראה שהחלקה שחיפשת לא קיימת, או שהכתובת שגויה. אל דאגה — יש עוד המון הזדמנויות להשקעה!</NFDesc>
    <NFActions>
      <NFBtn to="/" $primary><Home size={16} />חזרה לדף הבית</NFBtn>
      <NFBtn to="/explore"><Search size={16} />חיפוש חלקות</NFBtn>
    </NFActions>
    <NFMeta>LandMap Israel — פלטפורמת ההשקעות בקרקעות</NFMeta>
  </NF>
)

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => {
    // Explore page manages its own scroll (full-height map); skip it
    if (pathname === '/explore') return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
      <Suspense fallback={null}><CommandPalette /></Suspense>
      <Suspense fallback={<PageLoader />}>
        <main id="main-content">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/plot/:id" element={<PlotDetail />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/about" element={<Public />} />
          <Route path="/contact" element={<Public />} />
          <Route path="/pricing" element={<Public />} />
          <Route path="/terms" element={<Public />} />
          <Route path="/privacy" element={<Public />} />
          <Route path="/accessibility" element={<Public />} />

          {/* User */}
          <Route path="/dashboard" element={<RoleGuard role={['user', 'business', 'admin']}><UserDash /></RoleGuard>} />
          <Route path="/favorites" element={<RoleGuard role={['user', 'business', 'admin']}><UserDash /></RoleGuard>} />
          <Route path="/compare" element={<RoleGuard role={['user', 'business', 'admin']}><UserDash /></RoleGuard>} />
          <Route path="/calculator" element={<RoleGuard role={['user', 'business', 'admin']}><UserDash /></RoleGuard>} />
          <Route path="/settings" element={<RoleGuard role={['user', 'business', 'admin']}><UserDash /></RoleGuard>} />

          {/* Business */}
          <Route path="/business" element={<RoleGuard role={['business', 'admin']}><Business /></RoleGuard>} />
          <Route path="/business/*" element={<RoleGuard role={['business', 'admin']}><Business /></RoleGuard>} />

          {/* Admin */}
          <Route path="/admin" element={<RoleGuard role="admin"><Admin /></RoleGuard>} />
          <Route path="/admin/*" element={<RoleGuard role="admin"><Admin /></RoleGuard>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </main>
      </Suspense>
      <CookieConsent />
      <PWAInstallPrompt />
    </ErrorBoundary>
  )
}
