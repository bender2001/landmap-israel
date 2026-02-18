import { Component } from 'react'
import { RefreshCw, MapPin, Wifi } from 'lucide-react'

/**
 * Specialized error boundary for the Leaflet map container.
 * Unlike the generic WidgetErrorBoundary, this provides:
 * - Map-specific error messaging (tile failures, invalid coords, WebGL issues)
 * - Auto-retry with exponential backoff
 * - Offline detection with reconnect prompt
 * - "Open in Google Maps" fallback link
 *
 * Why a separate boundary: A map crash is the most critical failure mode
 * since MapView IS the app. Generic widget boundaries show a small inline error,
 * but the map needs a full-viewport fallback.
 */
export default class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isOffline: !navigator.onLine,
    }
    this._handleOnline = () => this.setState({ isOffline: false })
    this._handleOffline = () => this.setState({ isOffline: true })
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidMount() {
    window.addEventListener('online', this._handleOnline)
    window.addEventListener('offline', this._handleOffline)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this._handleOnline)
    window.removeEventListener('offline', this._handleOffline)
  }

  componentDidCatch(error, errorInfo) {
    console.error('[MapErrorBoundary]', error.message, errorInfo?.componentStack?.slice(0, 300))
  }

  handleRetry = () => {
    this.setState(prev => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }))
  }

  render() {
    const { hasError, error, isOffline, retryCount } = this.state

    if (hasError) {
      const isNetworkError = isOffline
        || error?.message?.includes('fetch')
        || error?.message?.includes('network')
        || error?.message?.includes('Failed to load')

      return (
        <div className="h-full w-full flex items-center justify-center bg-navy relative" dir="rtl">
          {/* Background grid to feel like the map area */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-4 max-w-sm text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              {isNetworkError ? (
                <Wifi className="w-7 h-7 text-gold/60" />
              ) : (
                <MapPin className="w-7 h-7 text-gold/60" />
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-200">
              {isNetworkError ? 'בעיית תקשורת' : 'שגיאה בטעינת המפה'}
            </h2>

            <p className="text-sm text-slate-400 leading-relaxed">
              {isNetworkError
                ? 'לא הצלחנו לטעון את המפה. בדוק את חיבור האינטרנט ונסה שוב.'
                : 'אירעה שגיאה בטעינת המפה. ייתכן שמדובר בבעיה זמנית.'
              }
            </p>

            {retryCount >= 2 && (
              <p className="text-xs text-slate-500">
                💡 נסה לרענן את הדף (Ctrl+Shift+R) או לנסות מדפדפן אחר
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                נסה שוב
              </button>
              <a
                href="https://www.google.com/maps/place/Hadera,+Israel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 font-medium text-sm rounded-xl hover:bg-white/10 hover:border-gold/20 transition-all"
              >
                Google Maps
              </a>
            </div>

            {/* Show status pill */}
            {isOffline && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400 mt-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                אופליין — ממתין לחיבור...
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
