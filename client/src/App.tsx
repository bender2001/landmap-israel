import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import Spinner from './components/ui/Spinner'
import { ErrorBoundary } from './components/ui/ErrorBoundaries'
import MobileBottomNav from './components/MobileBottomNav'
import { useWebVitals } from './hooks/useInfra'

const GushRedirect = lazy(() => import('./pages/public/GushRedirect'))
const CookieConsent = lazy(() => import('./components/CookieConsent'))
const InstallPrompt = lazy(() => import('./components/InstallPrompt'))

const MapView = lazy(() => import('./pages/public/MapView'))
const PlotDetail = lazy(() => import('./pages/public/PlotDetail'))
const About = lazy(() => import('./pages/public/About'))
const Contact = lazy(() => import('./pages/public/Contact'))
const Terms = lazy(() => import('./pages/public/Terms'))
const Privacy = lazy(() => import('./pages/public/Privacy'))
const Favorites = lazy(() => import('./pages/public/Favorites'))
const Compare = lazy(() => import('./pages/public/Compare'))
const Calculator = lazy(() => import('./pages/public/Calculator'))
const Areas = lazy(() => import('./pages/public/Areas'))
const AreaCity = lazy(() => import('./pages/public/AreaCity'))
const Pricing = lazy(() => import('./pages/public/Pricing'))
const NotFound = lazy(() => import('./pages/public/NotFound'))

const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const PlotList = lazy(() => import('./pages/admin/PlotList'))
const PlotForm = lazy(() => import('./pages/admin/PlotForm'))
const LeadList = lazy(() => import('./pages/admin/LeadList'))
const LeadDetail = lazy(() => import('./pages/admin/LeadDetail'))
const PoiList = lazy(() => import('./pages/admin/PoiList'))
const PoiForm = lazy(() => import('./pages/admin/PoiForm'))
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'))
const Settings = lazy(() => import('./pages/admin/Settings'))

const PageLoaderWrap = styled.div`
  height: var(--vh-dynamic, 100dvh);
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
`

const LoaderSpinner = styled(Spinner)`
  width: 48px;
  height: 48px;
  color: ${({ theme }) => theme.colors.primary};
`

const SkipToContent = styled.a`
  position: fixed;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  padding: 12px 32px;
  background: ${({ theme }) => theme.colors.primary};
  color: #FFFFFF;
  font-weight: 700;
  font-size: 14px;
  border-radius: 0 0 12px 12px;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
  transition: top 0.2s ease;
  white-space: nowrap;

  &:focus {
    top: 0;
    outline: 3px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`

const MainContent = styled.main`
  outline: none;
`

/* ── Route progress bar (inlined) ── */

const rpPulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.9; }
`

const ProgressWrap = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  height: 3px;
  pointer-events: none;
`

const ProgressBar = styled.div<{ $progress: number; $complete: boolean }>`
  height: 100%;
  width: ${({ $progress }) => `${$progress}%`};
  background: linear-gradient(90deg, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  box-shadow: 0 0 10px rgba(200, 148, 42, 0.5), 0 0 5px rgba(200, 148, 42, 0.3);
  opacity: ${({ $complete }) => ($complete ? 0 : 1)};
  transition: ${({ $complete }) => ($complete
    ? 'width 200ms ease-out, opacity 400ms ease-out'
    : 'width 300ms ease-out')};
`

const ProgressGlow = styled.div<{ $progress: number }>`
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 96px;
  transform: translateX(${({ $progress }) => `${100 - $progress}%`});
  background: linear-gradient(90deg, transparent, rgba(200, 148, 42, 0.3));
  animation: ${rpPulse} 1.5s ease-in-out infinite;
`

function RouteProgressBar() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<number | null>(null)
  const completeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const start = () => {
      setIsLoading(true)
      setVisible(true)
      setProgress(0)
      let current = 0
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(() => {
        current += current < 50 ? 8 : current < 80 ? 3 : 0.5
        if (current > 95) current = 95
        setProgress(current)
      }, 200)
    }

    const complete = () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      setProgress(100)
      setIsLoading(false)
      if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current)
      completeTimerRef.current = window.setTimeout(() => {
        setVisible(false)
        setProgress(0)
      }, 400)
    }

    let loading = false
    const observer = new MutationObserver(() => {
      const hasFallback = document.querySelector('[data-page-loader]')
      if (hasFallback && !loading) { loading = true; start() }
      else if (!hasFallback && loading) { loading = false; complete() }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-page-loader'],
    })

    return () => {
      observer.disconnect()
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (completeTimerRef.current) window.clearTimeout(completeTimerRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <ProgressWrap role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="טוען עמוד">
      <ProgressBar $progress={progress} $complete={progress >= 100} />
      {progress < 100 && <ProgressGlow $progress={progress} />}
    </ProgressWrap>
  )
}

function PageLoader() {
  return (
    <PageLoaderWrap data-page-loader>
      <LoaderSpinner />
    </PageLoaderWrap>
  )
}

export default function App() {
  useWebVitals()

  // ScrollToTop (inlined)
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <>
      <SkipToContent href="#main-content">דלג לתוכן הראשי</SkipToContent>

      <RouteProgressBar />
      <ErrorBoundary>
        <MainContent id="main-content" tabIndex={-1}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<MapView />} />
              <Route path="/plot/by-gush/:block/:parcel" element={<GushRedirect />} />
              <Route path="/plot/:id" element={<PlotDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/calculator" element={<Calculator />} />
              <Route path="/areas" element={<Areas />} />
              <Route path="/areas/:city" element={<AreaCity />} />
              <Route path="/pricing" element={<Pricing />} />

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="plots" element={<PlotList />} />
                <Route path="plots/new" element={<PlotForm />} />
                <Route path="plots/:id/edit" element={<PlotForm />} />
                <Route path="leads" element={<LeadList />} />
                <Route path="leads/:id" element={<LeadDetail />} />
                <Route path="pois" element={<PoiList />} />
                <Route path="pois/new" element={<PoiForm />} />
                <Route path="pois/:id/edit" element={<PoiForm />} />
                <Route path="activity" element={<ActivityLog />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MainContent>
      </ErrorBoundary>

      <MobileBottomNav />

      <Suspense fallback={null}>
        <CookieConsent />
      </Suspense>
      <Suspense fallback={null}>
        <InstallPrompt />
      </Suspense>
    </>
  )
}
