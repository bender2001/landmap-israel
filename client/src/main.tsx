import { StrictMode, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, type QueryCache } from '@tanstack/react-query'
import { ThemeProvider } from 'styled-components'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider, useToast } from './components/ui/ToastContainer'
import App from './App'
import { GlobalStyles } from './styles/GlobalStyles'
import { theme } from './styles/theme'
import { initWebVitals } from './utils/webVitals'

type ToastVariant = 'success' | 'warning' | 'error' | 'info'

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void
}

type QueryError = {
  name?: string
  status?: number
  requestId?: string
  message?: string
  code?: string
}

type ClientErrorPayload = {
  message: string
  stack: string
  source: string
  url: string
  userAgent: string
  timestamp: string
}

declare global {
  interface Window {
    __landmap_toast?: (message: string, variant?: ToastVariant) => void
  }
}

initWebVitals()

const reportGlobalError = (message: unknown, source?: unknown, stack?: unknown): void => {
  if (!import.meta.env.PROD) return
  try {
    const payload: ClientErrorPayload = {
      message: String(message).slice(0, 500),
      stack: String(stack || '').slice(0, 1000),
      source: String(source || 'global').slice(0, 200),
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    }
    const sent = navigator.sendBeacon?.(
      '/api/health/client-error',
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    )
    if (!sent) {
      fetch('/api/health/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    return
  }
}

window.addEventListener('error', (event: ErrorEvent) => {
  reportGlobalError(event.message, event.filename, event.error?.stack)
})

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const reason = event.reason as QueryError | string | undefined
  const message = typeof reason === 'string' ? reason : reason?.message || String(reason)
  reportGlobalError(`Unhandled rejection: ${message}`, 'promise', typeof reason === 'string' ? undefined : reason?.stack)
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000)

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification(registration)
            }
          })
        })
      })
      .catch(() => {})
  })
}

const showUpdateNotification = (registration: ServiceWorkerRegistration): void => {
  const banner = document.createElement('div')
  banner.dir = 'rtl'
  banner.className = 'sw-update-banner'
  banner.innerHTML = `
    <div style="position:fixed;bottom:16px;left:16px;z-index:9999;display:flex;align-items:center;gap:10px;padding:12px 16px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);font-family:Heebo,sans-serif;animation:slideUp 0.3s ease-out">
      <span style="font-size:14px">🆕</span>
      <span style="color:#1F2937;font-size:12px;font-weight:500">גרסה חדשה זמינה</span>
      <button onclick="this.closest('.sw-update-banner').querySelector('[data-action=reload]').click()" style="padding:4px 12px;background:#1A73E8;color:#FFFFFF;font-size:11px;font-weight:700;border:none;border-radius:8px;cursor:pointer">
        עדכן
      </button>
      <button data-action="reload" style="display:none"></button>
    </div>
  `
  const reloadButton = banner.querySelector<HTMLButtonElement>('[data-action=reload]')
  if (reloadButton) {
    reloadButton.addEventListener('click', () => {
      registration.waiting?.postMessage('SKIP_WAITING')
      window.location.reload()
    })
  }
  document.body.appendChild(banner)
}

let lastErrorToastMs = 0
const ERROR_TOAST_DEBOUNCE_MS = 3000

const handleQueryError = (error: QueryError): void => {
  const now = Date.now()
  if (now - lastErrorToastMs < ERROR_TOAST_DEBOUNCE_MS) return
  lastErrorToastMs = now

  if (error?.name === 'AbortError' || error?.status === 404) return

  if (window.__landmap_toast) {
    const status = error?.status
    const reqId = error?.requestId
    const refSuffix = reqId ? ` (${reqId})` : ''
    const msg = status === 429
      ? 'יותר מדי בקשות — נסו שוב בעוד דקה'
      : status && status >= 500
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
      networkMode: 'offlineFirst',
      refetchOnReconnect: 'always',
    },
    mutations: {
      networkMode: 'offlineFirst',
      onError: handleQueryError,
    },
  },
})

const queryCache = queryClient.getQueryCache() as QueryCache & { config: { onError?: (error: QueryError) => void } }
queryCache.config.onError = handleQueryError

function ToastInjector() {
  const { toast } = useToast() as ToastContextValue
  useEffect(() => {
    window.__landmap_toast = toast
    return () => {
      delete window.__landmap_toast
    }
  }, [toast])
  return null
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <GlobalStyles />
              <ToastInjector />
              <App />
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
)
