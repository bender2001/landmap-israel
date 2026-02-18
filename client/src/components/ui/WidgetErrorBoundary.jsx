import { Component } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * Lightweight error boundary for individual widgets/cards.
 * Unlike the full-page ErrorBoundary, this renders an inline retry block
 * so a single crashing widget doesn't take down the entire MapView.
 *
 * Features:
 * - Auto-retry with exponential backoff for silent widgets (non-essential)
 * - Manual retry button for visible widgets
 * - Max retry limit to prevent infinite loops
 * - Retry count tracking for debugging
 *
 * Usage:
 *   <WidgetErrorBoundary name="DealSpotlight">
 *     <DealSpotlight ... />
 *   </WidgetErrorBoundary>
 *
 *   // Silent with auto-retry (3 attempts with exponential backoff)
 *   <WidgetErrorBoundary name="MarketTicker" silent maxRetries={3}>
 *     <MarketTicker ... />
 *   </WidgetErrorBoundary>
 */
export default class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
    this._retryTimer = null
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    const { name = 'unknown', silent, maxRetries = 3 } = this.props
    const { retryCount } = this.state
    console.warn(`[WidgetError:${name}] attempt ${retryCount + 1}`, error.message, errorInfo?.componentStack?.slice(0, 200))

    // Auto-retry with exponential backoff for silent widgets
    // Silent widgets are non-essential (MarketTicker, FeaturedDeals, etc.)
    // so retrying is low-risk and keeps the UI complete without user action.
    if (silent && retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 8000) // 1s, 2s, 4s, 8s max
      this._retryTimer = setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
        }))
      }, delay)
    }
  }

  componentWillUnmount() {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer)
      this._retryTimer = null
    }
  }

  handleRetry = () => {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer)
      this._retryTimer = null
    }
    this.setState({ hasError: false, error: null, retryCount: 0 })
  }

  render() {
    if (this.state.hasError) {
      const { silent, maxRetries = 3 } = this.props
      const { retryCount } = this.state

      // Silent widgets: return null while retrying, or permanently after max retries
      if (silent) {
        return retryCount < maxRetries ? null : null
      }

      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-500 ${this.props.className || ''}`}
          dir="rtl"
        >
          <span className="text-orange-400/70">⚠</span>
          <span className="truncate flex-1">
            {this.props.name || 'רכיב'} — שגיאה בטעינה
            {retryCount > 0 && <span className="text-slate-600"> (ניסיון {retryCount + 1})</span>}
          </span>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-300 transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>נסה שוב</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
