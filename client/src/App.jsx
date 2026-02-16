import { lazy, Suspense, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import IntroOverlay from './components/IntroOverlay'
import Spinner from './components/ui/Spinner'
import ErrorBoundary from './components/ui/ErrorBoundary'

const MapView = lazy(() => import('./pages/public/MapView'))
const PlotDetail = lazy(() => import('./pages/public/PlotDetail'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const PlotList = lazy(() => import('./pages/admin/PlotList'))
const PlotForm = lazy(() => import('./pages/admin/PlotForm'))
const LeadList = lazy(() => import('./pages/admin/LeadList'))

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

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="plots" element={<PlotList />} />
              <Route path="plots/new" element={<PlotForm />} />
              <Route path="plots/:id/edit" element={<PlotForm />} />
              <Route path="leads" element={<LeadList />} />
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}
