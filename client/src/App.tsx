import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ErrorBoundary, PageLoader } from './components/UI'

const MapView = lazy(() => import('./pages/MapView'))
const PlotDetail = lazy(() => import('./pages/PlotDetail'))
const Favorites = lazy(() => import('./pages/Favorites'))
const Compare = lazy(() => import('./pages/Compare'))
const Calculator = lazy(() => import('./pages/Calculator'))
const Areas = lazy(() => import('./pages/Areas'))
const Static = lazy(() => import('./pages/Static'))
const Admin = lazy(() => import('./pages/admin/Admin'))

const NotFound = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, color: '#94A3B8' }}>
    <span style={{ fontSize: 48 }}>🏗️</span>
    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F1F5F9' }}>404</h1>
    <p>העמוד לא נמצא</p>
    <a href="/" style={{ color: '#D4A84B' }}>חזרה למפה</a>
  </div>
)

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/plot/:id" element={<PlotDetail />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/areas" element={<Areas />} />
          <Route path="/about" element={<Static />} />
          <Route path="/contact" element={<Static />} />
          <Route path="/terms" element={<Static />} />
          <Route path="/privacy" element={<Static />} />
          <Route path="/pricing" element={<Static />} />
          <Route path="/admin/*" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
