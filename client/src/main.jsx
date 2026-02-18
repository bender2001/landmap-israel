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

// ─── Global error reporting ─────────────────────────────────────────
// Catches unhandled JS errors and promise rejections that escape React's
// error boundaries. Reports to server for production monitoring.
// Like Google's Error Reporting — full client-side error coverage.
function reportGlobalError(message, source, stack) {
  if (!import.meta.env.PROD) return // Only report in production
  try {
    const payload = {
      message: String(message).slice(0, 500),
      stack: String(stack || '').slice(0, 1000),
      source: String(source || 'global').slice(0, 200),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }
    // Use sendBeacon for reliability — fires even during page unload
    const sent = navigator.sendBeacon?.(
      '/api/health/client-error',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    )
    // Fallback to fetch if sendBeacon unavailable or fails
    if (!sent) {
      fetch('/api/health/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // Never throw in error handlers
  }
}

window.addEventListener('error', (event) => {
  reportGlobalError(event.message, event.filename, event.error?.stack)
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message = reason?.message || String(reason)
  reportGlobalError(`Unhandled rejection: ${message}`, 'promise', reason?.stack)
})

// ─── Service Worker registration with update detection ──────────────
// When a new SW version is detected, we notify the user with a subtle
// toast instead of silently updating — prevents confusion from mid-session
// code changes (like Slack's "new version available" bar).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Check for updates every 30 minutes (matches Madlan's update cycle)
        setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000)

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            // New SW installed and ready — show update prompt
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification(registration)
            }
          })
        })
      })
      .catch(() => {})
  })
}

function showUpdateNotification(registration) {
  // Create a minimal, non-intrusive update banner (bottom-left, like Vercel's deployment notification)
  const banner = document.createElement('div')
  banner.dir = 'rtl'
  banner.className = 'sw-update-banner'
  banner.innerHTML = `
    <div style="position:fixed;bottom:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(5,13,26,0.95);backdrop-filter:blur(12px);border:1px solid rgba(200,148,42,0.25);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-family:Heebo,sans-serif;animation:slideUp 0.3s ease-out">
      <span style="font-size:14px">🆕</span>
      <span style="color:#e2e8f0;font-size:12px;font-weight:500">גרסה חדשה זמינה</span>
      <button onclick="this.closest('.sw-update-banner').querySelector('[data-action=reload]').click()" style="padding:4px 12px;background:linear-gradient(135deg,#C8942A,#E5B84B);color:#050D1A;font-size:11px;font-weight:700;border:none;border-radius:8px;cursor:pointer">
        עדכן
      </button>
      <button data-action="reload" style="display:none"></button>
    </div>
  `
  banner.querySelector('[data-action=reload]').addEventListener('click', () => {
    // Tell the waiting SW to take over, then reload
    registration.waiting?.postMessage('SKIP_WAITING')
    window.location.reload()
  })
  document.body.appendChild(banner)
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
