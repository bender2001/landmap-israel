import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Log to console for debugging
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-navy flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-orange-400" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-black text-slate-100 mb-2">
              <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">אופס!</span> משהו השתבש
            </h2>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              אירעה שגיאה בלתי צפויה. הצוות שלנו קיבל התראה.
              <br />
              נסה לרענן את הדף או לחזור לעמוד הראשי.
            </p>

            {/* Error details (collapsible) */}
            {this.state.error?.message && (
              <details className="mb-6 text-right">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors">
                  פרטים טכניים
                </summary>
                <pre className="mt-2 text-[10px] text-slate-500 bg-navy-light/60 border border-white/5 rounded-xl p-3 overflow-auto max-h-32 text-left font-mono">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold to-gold-bright text-navy font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-gold/30 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                נסה שוב
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-slate-300 font-medium text-sm rounded-xl hover:bg-white/10 transition-all"
              >
                <Home className="w-4 h-4" />
                עמוד ראשי
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
