import { lazy, Suspense, useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import ScrollToTop from './components/ui/ScrollToTop'
import Spinner from './components/ui/Spinner'
import ErrorBoundary from './components/ui/ErrorBoundary'
import RouteProgressBar from './components/ui/RouteProgressBar'
import MobileBottomNav from './components/MobileBottomNav'
import { useWebVitals } from './hooks/useWebVitals'

// Lazy-load overlay components — they're all conditional (first visit, consent, PWA)
// and don't need to be in the initial bundle (saves ~8-12KB from index.js).
const IntroOverlay = lazy(() => import('./components/IntroOverlay'))
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

function PageLoader() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-navy" data-page-loader>
      <Spinner className="w-12 h-12 text-gold" />
    </div>
  )
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true)

  // Monitor Core Web Vitals (LCP, FID, CLS, TTFB) — like Madlan/Yad2
  // Reports to analytics endpoint for real performance monitoring
  useWebVitals()

  // Skip intro eagerly for returning visitors — avoids loading the IntroOverlay chunk entirely.
  // IntroOverlay is ~3KB and includes animation logic we don't need on repeat visits.
  const introSeen = useState(() => !!localStorage.getItem('landmap_intro_seen'))[0]
  useEffect(() => {
    if (introSeen && showIntro) setShowIntro(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Skip-to-content link — WCAG 2.4.1 bypass blocks.
          Allows keyboard/screen-reader users to skip past navigation directly to main content.
          Visually hidden until focused (Tab key), then appears as a prominent gold banner. */}
      <a
        href="#main-content"
        className="skip-to-content"
      >
        דלג לתוכן הראשי
      </a>

      {showIntro && !introSeen && (
        <Suspense fallback={null}>
          <IntroOverlay onComplete={() => setShowIntro(false)} />
        </Suspense>
      )}

      <RouteProgressBar />
      <ScrollToTop />
      <ErrorBoundary>
        {/* <main> landmark — lets screen readers jump to main content (WCAG 1.3.1 + 2.4.1) */}
        <main id="main-content" tabIndex={-1} className="outline-none">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<MapView />} />
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

              {/* Admin */}
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

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </ErrorBoundary>

      {/* Mobile bottom navigation — always visible, outside Suspense.
          Renders nothing on desktop (CSS-hidden via .mobile-bnav display:none).
          Imported eagerly (not lazy) because it's <1KB and renders on every mobile page. */}
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
