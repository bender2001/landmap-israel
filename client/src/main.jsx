import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/ToastContainer'
import App from './App'
import './index.css'
import { initWebVitals } from './utils/webVitals'

// Track real user performance metrics (LCP, FID, CLS, TTFB)
initWebVitals()

// Reduce animations for users on slow connections or who prefer reduced motion
if (navigator.connection?.saveData || navigator.connection?.effectiveType === '2g') {
  document.documentElement.classList.add('reduce-motion')
}

// Register service worker for PWA + offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: true,
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // 'offlineFirst' — serve stale cache instantly while revalidating in background.
      // Critical for real estate apps where users switch between map/detail/compare
      // and expect instant navigation. Like Madlan's seamless page transitions.
      networkMode: 'offlineFirst',
      // Refetch on reconnect — catches up after offline periods
      refetchOnReconnect: 'always',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
