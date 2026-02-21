import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { ErrorBoundary, PageLoader } from './components/UI'
import { RoleGuard } from './components/Layout'

const Landing = lazy(() => import('./pages/Landing'))
const Explore = lazy(() => import('./pages/Explore'))
const PlotDetail = lazy(() => import('./pages/PlotDetail'))
const Auth = lazy(() => import('./pages/Auth'))
const Public = lazy(() => import('./pages/Public'))
const UserDash = lazy(() => import('./pages/UserDash'))
const Business = lazy(() => import('./pages/Business'))
const Admin = lazy(() => import('./pages/Admin'))

const NotFound = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, background: '#0B1120', color: '#94A3B8' }}>
    <span style={{ fontSize: 56 }}>🏗️</span>
    <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F1F5F9' }}>404</h1>
    <p style={{ fontSize: 15 }}>העמוד לא נמצא</p>
    <a href="/" style={{ color: '#D4A84B', fontSize: 14 }}>חזרה לדף הבית</a>
  </div>
)

export default function App() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">דלג לתוכן הראשי</a>
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
    </ErrorBoundary>
  )
}
