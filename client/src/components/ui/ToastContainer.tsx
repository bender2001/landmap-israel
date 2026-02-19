import { useState, useCallback, createContext, useContext, useRef, useEffect, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X, Info, AlertTriangle, Undo2 } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { theme } from '../../styles/theme'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  duration?: number
  onUndo?: () => void
}

interface ToastItemData {
  id: number
  message: string
  type: ToastType
  duration: number
  onUndo?: () => void
}

const ToastContext = createContext<{ toast: (message: string, type?: ToastType, options?: ToastOptions) => void } | null>(null)

let toastId = 0
const MAX_VISIBLE_TOASTS = 5

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const Container = styled.div`
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
`

const Toast = styled.div<{ $border: string }>`
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  border: 1px solid ${({ $border }) => $border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.elevated};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 280px;
  max-width: 420px;
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  animation: ${fadeIn} 0.2s ease;
  direction: rtl;
`

const Message = styled.span`
  font-size: 14px;
  color: ${theme.colors.slate[200]};
  flex: 1;
`

const ProgressTrack = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.05);
`

const Progress = styled.div<{ $color: string; $duration: number; $paused: boolean }>`
  height: 100%;
  width: 100%;
  background: ${({ $color }) => $color};
  opacity: 0.4;
  animation: toast-progress ${({ $duration }) => `${$duration}ms`} linear forwards;
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};

  @keyframes toast-progress {
    from { transform: scaleX(1); transform-origin: left; }
    to { transform: scaleX(0); transform-origin: left; }
  }
`

const Action = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: ${theme.radii.md};
  background: ${theme.colors.gold}26;
  border: 1px solid ${theme.colors.gold}33;
  color: ${theme.colors.gold};
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background ${theme.transitions.normal};

  &:hover {
    background: ${theme.colors.gold}40;
  }
`

const Close = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: ${theme.colors.slate[500]};
  cursor: pointer;
  transition: color ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.slate[300]};
  }
`

const TOAST_STYLES = {
  success: { icon: CheckCircle2, color: theme.colors.emerald },
  error: { icon: XCircle, color: theme.colors.red },
  info: { icon: Info, color: theme.colors.blue },
  warning: { icon: AlertTriangle, color: theme.colors.amber },
} as const

function ToastItem({ toast, onRemove }: { toast: ToastItemData; onRemove: (id: number) => void }) {
  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info
  const Icon = style.icon
  const durationMs = toast.duration || 4000
  const [paused, setPaused] = useState(false)
  const startRef = useRef(Date.now())
  const remainingRef = useRef(durationMs)

  useEffect(() => {
    let timerId: number | null = null
    const scheduleRemove = (ms: number) => {
      timerId = window.setTimeout(() => onRemove(toast.id), ms)
    }

    if (!paused) {
      startRef.current = Date.now()
      scheduleRemove(remainingRef.current)
    }

    return () => {
      if (timerId) window.clearTimeout(timerId)
      if (!paused) {
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
    <Toast
      $border={`${style.color}33`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Icon size={20} color={style.color} />
      <Message>{toast.message}</Message>
      {toast.onUndo && (
        <Action onClick={handleUndo}>
          <Undo2 size={12} />
          ביטול
        </Action>
      )}
      <Close onClick={() => onRemove(toast.id)} aria-label="סגור הודעה">
        <X size={14} />
      </Close>
      <ProgressTrack>
        <Progress $color={style.color} $duration={durationMs} $paused={paused} />
      </ProgressTrack>
    </Toast>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItemData[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'success', options: ToastOptions = {}) => {
    const id = ++toastId
    const duration = options.duration || (type === 'error' ? 6000 : 4000)
    setToasts(prev => {
      const next = [...prev, { id, message, type, duration, onUndo: options.onUndo }]
      return next.length > MAX_VISIBLE_TOASTS ? next.slice(-MAX_VISIBLE_TOASTS) : next
    })
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration + 500)
  }, [])

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent
      const { message, type, options } = custom.detail || {}
      if (message) addToast(message, type, options)
    }
    window.addEventListener('landmap:toast', handler as EventListener)
    return () => window.removeEventListener('landmap:toast', handler as EventListener)
  }, [addToast])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <Container role="region" aria-label="הודעות מערכת">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </Container>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function showToast(message: string, type: ToastType = 'success', options: ToastOptions = {}) {
  window.dispatchEvent(new CustomEvent('landmap:toast', { detail: { message, type, options } }))
}
