import { lazy, Suspense, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import IntroOverlay from './components/IntroOverlay'
import CookieConsent from './components/CookieConsent'
import InstallPrompt from './components/InstallPrompt'
import Spinner from './components/ui/Spinner'
import ErrorBoundary from './components/ui/ErrorBoundary'

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
    <div className="h-screen w-screen flex items-center justify-center bg-navy">
      <Spinner className="w-12 h-12 text-gold" />
    </div>
  )
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true)

  return (
    <>
      {showIntro && <IntroOverlay onComplete={() => setShowIntro(false)} />}

      <ErrorBoundary>
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
      </ErrorBoundary>

      <CookieConsent />
      <InstallPrompt />
    </>
  )
}
