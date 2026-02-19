import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider, useToast } from './components/ui/ToastContainer'
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

// ─── Global React Query error handler ─────────────────────────────────
// Shows toast notifications when API calls fail, so users know something
// went wrong instead of facing silent failures. Like Google Maps' error
// toasts when tile loading or geocoding fails. Only fires once per error
// (React Query deduplicates retries internally before calling onError).
//
// Debounce: avoids toast spam when multiple queries fail simultaneously
// (e.g., network drops — all 5 in-flight queries fail at once). Only the
// first error shows a toast; subsequent errors within 3s are suppressed.
let lastErrorToastMs = 0
const ERROR_TOAST_DEBOUNCE_MS = 3000

function handleQueryError(error) {
  const now = Date.now()
  if (now - lastErrorToastMs < ERROR_TOAST_DEBOUNCE_MS) return
  lastErrorToastMs = now

  // Suppress toast for abort/timeout (user navigated away) and 404 (expected)
  if (error?.name === 'AbortError' || error?.status === 404) return

  // Use the injected toast function (set after render — see below)
  if (window.__landmap_toast) {
    const status = error?.status
    const reqId = error?.requestId
    // Include request ID in error toasts for traceability — users can report
    // "I got error abc123" and we can find the exact request in server logs.
    // Like Google Cloud Console's error reference codes.
    const refSuffix = reqId ? ` (${reqId})` : ''
    const msg = status === 429
      ? 'יותר מדי בקשות — נסו שוב בעוד דקה'
      : status >= 500
        ? `שגיאת שרת — הנתונים עשויים להיות לא מעודכנים${refSuffix}`
        : error?.message?.includes('timeout') || error?.code === 'REQUEST_TIMEOUT'
          ? 'השרת לא מגיב — בדקו את החיבור לאינטרנט'
          : 'שגיאה בטעינת הנתונים'
    window.__landmap_toast(msg, 'warning')
  }
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
      onError: handleQueryError,
    },
  },
})

// Wire up the global query error handler via the query cache's onError callback.
// This fires AFTER all retries are exhausted — users see exactly one toast per failure,
// not one per retry attempt. Combined with the debounce above, this prevents toast spam.
queryClient.getQueryCache().config.onError = handleQueryError

/**
 * ToastInjector — bridges the React toast system with the global query error handler.
 * Injects the toast function into window.__landmap_toast so handleQueryError() can
 * show notifications without being inside the React tree. Runs once on mount.
 */
function ToastInjector() {
  const { toast } = useToast()
  React.useEffect(() => {
    window.__landmap_toast = toast
    return () => { delete window.__landmap_toast }
  }, [toast])
  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <ToastInjector />
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
