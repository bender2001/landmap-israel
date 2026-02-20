import { Component, useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { t, fadeInUp, popIn, countUp } from '../theme'
import { X, AlertTriangle } from 'lucide-react'

/* ── Spinner ── */
export const Spinner = ({ size = 24, color = '#D4A84B' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity=".25" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </svg>
)

/* ── PageLoader ── */
export const PageLoader = () => (
  <LoaderWrap><Spinner size={36} /></LoaderWrap>
)
const LoaderWrap = styled.div`display:flex;align-items:center;justify-content:center;height:100vh;width:100%;background:${t.bg};`

/* ── Toast System ── */
type Variant = 'success' | 'warning' | 'error' | 'info'
type Toast = { id: number; msg: string; variant: Variant }
type Ctx = { toast: (msg: string, variant?: Variant) => void }

const ToastCtx = createContext<Ctx>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

let _id = 0
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Toast[]>([])
  const toast = useCallback((msg: string, variant: Variant = 'info') => {
    const id = ++_id
    setItems(p => [...p, { id, msg, variant }])
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <ToastList>{items.map(i => (
        <ToastItem key={i.id} $v={i.variant}>
          <span>{i.msg}</span>
          <X size={14} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setItems(p => p.filter(t => t.id !== i.id))} />
        </ToastItem>
      ))}</ToastList>
    </ToastCtx.Provider>
  )
}

const VCOLORS: Record<Variant, string> = { success: t.ok, warning: t.warn, error: t.err, info: t.info }
const slideIn = keyframes`from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}`

const ToastList = styled.div`position:fixed;bottom:24px;right:24px;z-index:${t.z.toast};display:flex;flex-direction:column;gap:8px;pointer-events:none;`
const ToastItem = styled.div<{ $v: Variant }>`
  display:flex;align-items:center;gap:10px;padding:10px 16px;min-width:260px;
  background:${t.surface};border:1px solid ${({ $v }) => VCOLORS[$v]};border-radius:${t.r.md};
  color:${t.text};font-size:13px;font-family:${t.font};box-shadow:${t.sh.lg};
  pointer-events:auto;animation:${slideIn} 0.3s ease-out;
  &::before{content:'';width:4px;height:100%;position:absolute;left:0;top:0;border-radius:${t.r.md} 0 0 ${t.r.md};background:${({ $v }) => VCOLORS[$v]};}
  position:relative;overflow:hidden;
`

/* ── ErrorBoundary ── */
type EBState = { err: Error | null }
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, EBState> {
  state: EBState = { err: null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (this.state.err) return this.props.fallback ?? (
      <ErrWrap>
        <AlertTriangle size={32} color={t.err} />
        <h3 style={{ color: t.text, margin: '12px 0 4px' }}>Something went wrong</h3>
        <p style={{ color: t.textSec, fontSize: 13 }}>{this.state.err.message}</p>
      </ErrWrap>
    )
    return this.props.children
  }
}
const ErrWrap = styled.div`display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;text-align:center;`

/* ── Glass Panel ── */
export const Glass = styled.div`
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.border};border-radius:${t.r.lg};
`

/* ── Buttons ── */
export const GoldButton = styled.button`
  display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 24px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.md};font-weight:700;font-size:14px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-1px);}
  &:active{transform:translateY(0);}
  &:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none;}
`

export const GhostButton = styled.button`
  display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 24px;
  background:transparent;color:${t.gold};border:1px solid ${t.goldBorder};border-radius:${t.r.md};
  font-weight:600;font-size:14px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.goldDim};border-color:${t.gold};}
  &:active{transform:translateY(0);}
  &:disabled{opacity:0.5;cursor:not-allowed;}
`

/* ── Badge ── */
export const Badge = styled.span<{ $color?: string }>`
  display:inline-flex;align-items:center;padding:2px 10px;font-size:11px;font-weight:700;
  border-radius:${t.r.full};color:${({ $color }) => $color || t.gold};
  background:${({ $color }) => ($color || t.gold) + '18'};
`

/* ── SectionTitle ── */
export const SectionTitle = styled.h3`
  font-size:15px;font-weight:700;color:${t.text};margin-bottom:12px;
  display:flex;align-items:center;gap:8px;font-family:${t.font};
`

/* ── CloseBtn ── */
const CloseBtnWrap = styled.button`
  display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
export const CloseBtn = ({ onClick, size = 18 }: { onClick: () => void; size?: number }) => (
  <CloseBtnWrap onClick={onClick} aria-label="Close"><X size={size} /></CloseBtnWrap>
)

/* ── AnimatedCard ── */
export const AnimatedCard = styled.div<{ $delay?: number }>`
  animation:${fadeInUp} 0.5s ease-out both;
  animation-delay:${({ $delay }) => $delay ?? 0}s;
`

/* ── CountUpNumber ── */
export const CountUpNumber = ({ value, duration = 1000 }: { value: number; duration?: number }) => {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(eased * value))
      if (progress < 1) start = requestAnimationFrame(step)
    }
    start = requestAnimationFrame(step)
    return () => cancelAnimationFrame(start)
  }, [value, duration])
  return <CountWrap>{display.toLocaleString()}</CountWrap>
}
const CountWrap = styled.span`animation:${countUp} 0.4s ease-out;display:inline-block;`
