import { useState, useCallback, createContext, useContext, useRef, useEffect } from 'react'
import { CheckCircle2, XCircle, X, Info, AlertTriangle, Undo2 } from 'lucide-react'

const ToastContext = createContext(null)

let toastId = 0
const MAX_VISIBLE_TOASTS = 5

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-green-400',
    borderClass: 'border-green-500/20',
    progressClass: 'bg-green-400',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-400',
    borderClass: 'border-red-500/20',
    progressClass: 'bg-red-400',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    borderClass: 'border-blue-500/20',
    progressClass: 'bg-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    borderClass: 'border-amber-500/20',
    progressClass: 'bg-amber-400',
  },
}

/**
 * Individual toast with auto-dismiss progress bar and optional undo action.
 * The progress bar shows remaining time (like Gmail's undo toast).
 */
function ToastItem({ toast, onRemove }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info
  const Icon = style.icon
  const durationMs = toast.duration || 4000
  const progressRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const startRef = useRef(Date.now())
  const remainingRef = useRef(durationMs)

  // Auto-dismiss with pause-on-hover support
  useEffect(() => {
    let timerId
    const scheduleRemove = (ms) => {
      timerId = setTimeout(() => onRemove(toast.id), ms)
    }

    if (!paused) {
      startRef.current = Date.now()
      scheduleRemove(remainingRef.current)
    }

    return () => {
      if (timerId) clearTimeout(timerId)
      if (!paused) {
        // Save remaining time on cleanup (hover pause)
        const elapsed = Date.now() - startRef.current
        remainingRef.current = Math.max(0, remainingRef.current - elapsed)
      }
    }
  }, [paused, toast.id, onRemove])

  const handleUndo = () => {
    if (toast.onUndo) toast.onUndo()
    onRemove(toast.id)
  }

  return (
    <div
      className={`glass-panel px-4 py-3 flex items-center gap-3 pointer-events-auto animate-fade-in min-w-[280px] max-w-[420px] relative overflow-hidden ${style.borderClass}`}
      dir="rtl"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Auto-dismiss progress bar — pauses on hover */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
        <div
          ref={progressRef}
          className={`h-full ${style.progressClass} opacity-40`}
          style={{
            width: '100%',
            animation: `toast-progress ${durationMs}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>

      <Icon className={`w-5 h-5 flex-shrink-0 ${style.iconClass}`} />
      <span className="text-sm text-slate-200 flex-1">{toast.message}</span>

      {/* Undo action button — like Gmail's "Undo" after archive/delete */}
      {toast.onUndo && (
        <button
          onClick={handleUndo}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gold/15 border border-gold/20 text-gold text-xs font-medium hover:bg-gold/25 transition-colors flex-shrink-0"
        >
          <Undo2 className="w-3 h-3" />
          <span>ביטול</span>
        </button>
      )}

      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-500 hover:text-slate-300 flex-shrink-0 transition-colors"
        aria-label="סגור הודעה"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  /**
   * Show a toast notification.
   * @param {string} message — the text to display
   * @param {string} [type='success'] — 'success' | 'error' | 'info' | 'warning'
   * @param {object} [options] — { duration?: number, onUndo?: () => void }
   */
  const addToast = useCallback((message, type = 'success', options = {}) => {
    const id = ++toastId
    const { duration = type === 'error' ? 6000 : 4000, onUndo } = options
    setToasts(prev => {
      // Cap at MAX_VISIBLE_TOASTS — remove oldest to prevent visual clutter
      const next = [...prev, { id, message, type, duration, onUndo }]
      return next.length > MAX_VISIBLE_TOASTS ? next.slice(-MAX_VISIBLE_TOASTS) : next
    })
    // Auto-remove after duration (ToastItem also handles this with pause support)
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, (options.duration || (type === 'error' ? 6000 : 4000)) + 500) // +500ms buffer for exit animation
  }, [])

  // Global toast event bridge — allows any component (including those outside the
  // React context tree) to trigger toasts via custom events. Pattern:
  //   window.dispatchEvent(new CustomEvent('landmap:toast', { detail: { message, type, options } }))
  // Used by FilterBar, CompareBar, and SidebarDetails for clipboard copy feedback.
  // Like Google's global notification bus — decoupled from the component hierarchy.
  useEffect(() => {
    const handler = (e) => {
      const { message, type, options } = e.detail || {}
      if (message) addToast(message, type, options)
    }
    window.addEventListener('landmap:toast', handler)
    return () => window.removeEventListener('landmap:toast', handler)
  }, [addToast])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container — bottom-left, stacks upward */}
      <div
        className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 pointer-events-none"
        role="region"
        aria-label="הודעות מערכת"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/**
 * Global toast utility — fires a toast from anywhere without React context.
 * Uses a CustomEvent bridge to the ToastProvider listener.
 * 
 * Usage:
 *   import { showToast } from './ui/ToastContainer'
 *   showToast('הקישור הועתק!', 'success')
 *   showToast('שגיאה', 'error', { duration: 6000 })
 * 
 * Prefer useToast() inside React components for type-safe access.
 * Use showToast() for utility functions, event handlers outside React, or
 * components that don't want to add a useToast() dependency.
 */
export function showToast(message, type = 'success', options = {}) {
  window.dispatchEvent(new CustomEvent('landmap:toast', {
    detail: { message, type, options },
  }))
}
