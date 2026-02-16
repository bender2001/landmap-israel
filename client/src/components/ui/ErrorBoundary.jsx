import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-gold mb-4" />
          <h2 className="text-lg font-bold text-slate-200 mb-2">משהו השתבש</h2>
          <p className="text-sm text-slate-400 mb-4">{this.state.error?.message || 'שגיאה לא צפויה'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-gold/20 border border-gold/30 text-gold rounded-lg text-sm hover:bg-gold/30 transition"
          >
            נסה שוב
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
