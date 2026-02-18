import { Component } from 'react'
import { RefreshCw } from 'lucide-react'

/**
 * Lightweight error boundary for individual widgets/cards.
 * Unlike the full-page ErrorBoundary, this renders an inline retry block
 * so a single crashing widget doesn't take down the entire MapView.
 *
 * Usage:
 *   <WidgetErrorBoundary name="DealSpotlight">
 *     <DealSpotlight ... />
 *   </WidgetErrorBoundary>
 */
export default class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`[WidgetError:${this.props.name || 'unknown'}]`, error.message, errorInfo?.componentStack?.slice(0, 200))
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // If parent wants completely silent failure (e.g., non-essential decorative widgets)
      if (this.props.silent) return null

      return (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-500 ${this.props.className || ''}`}
          dir="rtl"
        >
          <span className="text-orange-400/70">⚠</span>
          <span className="truncate flex-1">{this.props.name || 'רכיב'} — שגיאה בטעינה</span>
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
