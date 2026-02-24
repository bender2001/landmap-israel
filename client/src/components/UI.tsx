import { Component, useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { t, fadeInUp, popIn, countUp, pulse, mobile } from '../theme'
import { X, AlertTriangle, Check, ChevronDown, Search as SearchIcon, Heart, Eye, TrendingUp, TrendingDown, MessageCircle, ArrowUp, Bell, BellOff, Download, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Plot } from '../types'
import { p, roi, calcScore, getGrade, fmt, statusColors, statusLabels, daysOnMarket } from '../utils'
import { usePWAInstall } from '../hooks'

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
type EBState = { err: Error | null; retryCount: number }
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; onReset?: () => void }, EBState> {
  state: EBState = { err: null, retryCount: 0 }
  static getDerivedStateFromError(err: Error) { return { err } }
  componentDidCatch(err: Error, info: React.ErrorInfo) {
    // Log error details for debugging (production would send to error tracking)
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', err, info.componentStack)
  }
  handleRetry = () => {
    this.props.onReset?.()
    this.setState(prev => ({ err: null, retryCount: prev.retryCount + 1 }))
  }
  render() {
    if (this.state.err) {
      const tooManyRetries = this.state.retryCount >= 3
      return this.props.fallback ?? (
        <ErrWrap>
          <ErrIconWrap><AlertTriangle size={32} color={t.err} /></ErrIconWrap>
          <ErrTitle>משהו השתבש</ErrTitle>
          <ErrDesc>{this.state.err.message || 'אירעה שגיאה בלתי צפויה. נסו לרענן את הדף.'}</ErrDesc>
          <ErrActions>
            {!tooManyRetries && (
              <ErrRetryBtn onClick={this.handleRetry}>🔄 נסה שוב</ErrRetryBtn>
            )}
            <ErrReloadBtn onClick={() => window.location.reload()}>
              {tooManyRetries ? '🔄 רענן דף' : 'רענן דף'}
            </ErrReloadBtn>
          </ErrActions>
          {this.state.retryCount > 0 && (
            <ErrRetryNote>ניסיון {this.state.retryCount}/3 — {tooManyRetries ? 'מומלץ לרענן את הדף' : 'ניתן לנסות שוב'}</ErrRetryNote>
          )}
        </ErrWrap>
      )
    }
    return this.props.children
  }
}
const ErrWrap = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:48px 24px;text-align:center;direction:rtl;min-height:320px;gap:12px;
`
const ErrIconWrap = styled.div`
  width:64px;height:64px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
  margin-bottom:4px;
`
const ErrTitle = styled.h3`
  font-size:18px;font-weight:700;color:${t.text};margin:0;font-family:${t.font};
`
const ErrDesc = styled.p`
  font-size:13px;color:${t.textSec};margin:0;max-width:360px;line-height:1.6;
`
const ErrActions = styled.div`
  display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center;
`
const ErrRetryBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;padding:10px 24px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:${t.r.full};font-weight:700;font-size:14px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{box-shadow:0 0 24px rgba(212,168,75,0.2);transform:translateY(-2px);}
  &:active{transform:translateY(0);}
`
const ErrReloadBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;padding:10px 24px;
  background:transparent;color:${t.textSec};
  border:1px solid ${t.border};border-radius:${t.r.full};font-weight:600;font-size:13px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`
const ErrRetryNote = styled.div`
  font-size:11px;color:${t.textDim};margin-top:4px;
`

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

/* ── InfoTooltip — hoverable (i) with explanation ── */
const ttFadeIn = keyframes`from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}`
const InfoWrap = styled.span`
  position:relative;display:inline-flex;align-items:center;justify-content:center;
  width:16px;height:16px;border-radius:50%;cursor:help;flex-shrink:0;
  background:rgba(212,168,75,0.1);border:1px solid rgba(212,168,75,0.2);
  color:${t.gold};font-size:9px;font-weight:800;font-family:${t.font};
  transition:all 0.2s;vertical-align:middle;margin-inline-start:4px;
  &:hover{background:rgba(212,168,75,0.2);border-color:rgba(212,168,75,0.4);}
`
const InfoBubble = styled.div<{$pos?:'top'|'bottom'}>`
  position:absolute;${pr=>pr.$pos==='bottom'?'top:calc(100% + 8px)':'bottom:calc(100% + 8px)'};
  right:50%;transform:translateX(50%);z-index:${t.z.toast};
  min-width:200px;max-width:260px;padding:10px 14px;
  background:${t.surface};border:1px solid ${t.goldBorder};border-radius:${t.r.md};
  box-shadow:${t.sh.lg};font-size:12px;font-weight:500;color:${t.textSec};
  line-height:1.6;direction:rtl;text-align:right;pointer-events:none;
  animation:${ttFadeIn} 0.15s ease-out;white-space:normal;
  &::after{content:'';position:absolute;
    ${pr=>pr.$pos==='bottom'?'top:-5px':'bottom:-5px'};right:calc(50% - 5px);
    width:10px;height:10px;background:${t.surface};border:1px solid ${t.goldBorder};
    ${pr=>pr.$pos==='bottom'?'border-bottom:none;border-right:none;transform:rotate(45deg)':'border-top:none;border-left:none;transform:rotate(45deg)'};
  }
`
export function InfoTooltip({ text, pos = 'top' }: { text: string; pos?: 'top' | 'bottom' }) {
  const [show, setShow] = useState(false)
  return (
    <InfoWrap
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
      role="button"
      aria-label="מידע נוסף"
    >
      i
      {show && <InfoBubble $pos={pos}>{text}</InfoBubble>}
    </InfoWrap>
  )
}

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

/* ── AnimatedValue — smoothly interpolates between values with formatted output ── */
export const AnimatedValue = ({ value, format, duration = 600 }: {
  value: number; format?: (v: number) => string; duration?: number
}) => {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const frameRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value
    if (from === to) return
    const t0 = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - t0) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4) // ease-out quartic
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(step)
    }
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return <AnimValWrap>{format ? format(display) : display.toLocaleString()}</AnimValWrap>
}
const AnimValWrap = styled.span`display:inline-block;transition:color 0.3s;`

/* ── DemoModeBanner — shows when app is in demo/fallback mode ── */
const demoPulse = keyframes`0%,100%{opacity:0.8}50%{opacity:1}`
const demoSlideIn = keyframes`from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}`
const DemoBannerWrap = styled.div`
  position:fixed;top:0;left:0;right:0;z-index:${t.z.toast + 5};
  display:flex;align-items:center;justify-content:center;gap:10px;
  padding:8px 20px;direction:rtl;
  background:linear-gradient(135deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95));
  color:#fff;font-size:12px;font-weight:600;font-family:${t.font};
  box-shadow:0 2px 12px rgba(245,158,11,0.3);
  animation:${demoSlideIn} 0.35s cubic-bezier(0.32,0.72,0,1);
`
const DemoBannerDot = styled.span`
  width:6px;height:6px;border-radius:50%;background:#FDE68A;flex-shrink:0;
  animation:${demoPulse} 2s ease-in-out infinite;
`
const DemoBannerClose = styled.button`
  padding:2px 10px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);
  border-radius:${t.r.full};color:#fff;font-size:11px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{background:rgba(255,255,255,0.35);}
`

export const DemoModeBanner = ({ onRetry, onDismiss }: { onRetry?: () => void; onDismiss?: () => void }) => {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null
  return (
    <DemoBannerWrap>
      <DemoBannerDot />
      <span>⚠️ מצב הדגמה — הנתונים אינם מעודכנים</span>
      {onRetry && <DemoBannerClose onClick={onRetry}>🔄 נסה שוב</DemoBannerClose>}
      <DemoBannerClose onClick={() => { setDismissed(true); onDismiss?.() }}>✕</DemoBannerClose>
    </DemoBannerWrap>
  )
}

/* ── StaleDataBanner — shows when fetched data is older than threshold ── */
const staleSlideIn = keyframes`from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}`
const stalePulse = keyframes`0%,100%{opacity:0.7}50%{opacity:1}`
const StaleBannerWrap = styled.div`
  position:fixed;top:0;left:0;right:0;z-index:${t.z.toast + 4};
  display:flex;align-items:center;justify-content:center;gap:10px;
  padding:6px 20px;direction:rtl;
  background:linear-gradient(135deg, rgba(59,130,246,0.92), rgba(37,99,235,0.92));
  color:#fff;font-size:12px;font-weight:600;font-family:${t.font};
  box-shadow:0 2px 12px rgba(59,130,246,0.25);
  animation:${staleSlideIn} 0.35s cubic-bezier(0.32,0.72,0,1);
  backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
`
const StaleBannerDot = styled.span`
  width:6px;height:6px;border-radius:50%;background:#93C5FD;flex-shrink:0;
  animation:${stalePulse} 2s ease-in-out infinite;
`
const StaleBannerBtn = styled.button`
  padding:2px 10px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);
  border-radius:${t.r.full};color:#fff;font-size:11px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{background:rgba(255,255,255,0.35);}
`

export const StaleDataBanner = ({ age, onRefresh, onDismiss }: {
  age: string | null; onRefresh?: () => void; onDismiss?: () => void
}) => {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || !age) return null
  return (
    <StaleBannerWrap>
      <StaleBannerDot />
      <span>📡 נתונים מ{age} — ייתכן שיש עדכונים חדשים</span>
      {onRefresh && <StaleBannerBtn onClick={onRefresh}>🔄 רענן</StaleBannerBtn>}
      <StaleBannerBtn onClick={() => { setDismissed(true); onDismiss?.() }}>✕</StaleBannerBtn>
    </StaleBannerWrap>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   CUSTOM FORM COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

const dropIn = keyframes`from{opacity:0;transform:scaleY(0.92) translateY(-4px)}to{opacity:1;transform:scaleY(1) translateY(0)}`
const staggerUp = keyframes`from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}`
const waPulse = keyframes`0%,100%{box-shadow:0 4px 16px rgba(37,211,102,0.25)}50%{box-shadow:0 4px 28px rgba(37,211,102,0.5)}`

/* ── 1. Select ── */
export const Select = ({ value, onChange, options, placeholder = 'בחר...', label, searchable }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string; icon?: string }[]
  placeholder?: string; label?: string; searchable?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)
  const filtered = useMemo(() => query ? options.filter(o => o.label.includes(query)) : options, [options, query])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'Enter' && hi >= 0 && filtered[hi]) { onChange(filtered[hi].value); setOpen(false); setQuery('') }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(i => Math.max(i - 1, 0)) }
  }

  return (
    <SWrap ref={ref} dir="rtl" onKeyDown={onKey}>
      <STrigger $open={open} $hasVal={!!value} onClick={() => { setOpen(!open); setHi(-1); setQuery('') }} tabIndex={0}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selected?.icon && <span>{selected.icon}</span>}
          <span style={{ color: selected ? t.text : t.textDim }}>{selected?.label || placeholder}</span>
        </span>
        <SChevron $open={open}><ChevronDown size={16} /></SChevron>
        {label && <SFloat $up={!!value || open}>{label}</SFloat>}
      </STrigger>
      {open && (
        <SDrop>
          {searchable && (
            <SSearchRow>
              <SearchIcon size={14} color={t.textDim} />
              <SSearchIn autoFocus value={query} onChange={e => { setQuery(e.target.value); setHi(0) }} placeholder="חיפוש..." />
            </SSearchRow>
          )}
          <SList>
            {filtered.map((o, i) => (
              <SItem key={o.value} $active={o.value === value} $hi={i === hi}
                onMouseEnter={() => setHi(i)}
                onClick={() => { onChange(o.value); setOpen(false); setQuery('') }}>
                {o.icon && <span>{o.icon}</span>}
                <span style={{ flex: 1 }}>{o.label}</span>
                {o.value === value && <Check size={14} color={t.gold} />}
              </SItem>
            ))}
            {!filtered.length && <SEmpty>אין תוצאות</SEmpty>}
          </SList>
        </SDrop>
      )}
    </SWrap>
  )
}
const SWrap = styled.div`position:relative;font-family:${t.font};`
const STrigger = styled.div<{ $open: boolean; $hasVal: boolean }>`
  display:flex;align-items:center;justify-content:space-between;padding:10px 14px;min-height:44px;
  background:${t.surface};border:1.5px solid ${({ $open }) => $open ? t.gold : t.border};border-radius:${t.r.md};
  color:${t.text};font-size:14px;cursor:pointer;transition:all ${t.tr};position:relative;
  &:hover{border-color:${t.goldBorder}}
  ${({ $open }) => $open && `box-shadow:0 0 0 3px ${t.goldDim};`}
`
const SFloat = styled.span<{ $up: boolean }>`
  position:absolute;right:12px;background:${t.surface};padding:0 4px;pointer-events:none;
  font-size:${({ $up }) => $up ? '10px' : '14px'};color:${({ $up }) => $up ? t.gold : t.textDim};
  top:${({ $up }) => $up ? '-8px' : '50%'};transform:translateY(${({ $up }) => $up ? '0' : '-50%'});transition:all ${t.tr};
`
const SChevron = styled.span<{ $open: boolean }>`display:flex;color:${t.textDim};transition:transform ${t.tr};transform:rotate(${({ $open }) => $open ? '180deg' : '0'});`
const SDrop = styled.div`
  position:absolute;top:calc(100% + 6px);right:0;left:0;z-index:50;background:${t.surface};
  border:1px solid ${t.goldBorder};border-radius:${t.r.md};box-shadow:${t.sh.xl};
  overflow:hidden;transform-origin:top;animation:${dropIn} 0.2s ease-out;
`
const SSearchRow = styled.div`display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid ${t.border};`
const SSearchIn = styled.input`flex:1;background:transparent;border:none;color:${t.text};font-size:13px;font-family:${t.font};outline:none;&::placeholder{color:${t.textDim}}`
const SList = styled.div`max-height:220px;overflow-y:auto;`
const SItem = styled.div<{ $active: boolean; $hi: boolean }>`
  display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13px;cursor:pointer;transition:all 0.15s;
  color:${({ $active }) => $active ? t.gold : t.text};background:${({ $hi }) => $hi ? t.hover : 'transparent'};
  border-right:3px solid ${({ $active, $hi }) => $active ? t.gold : $hi ? t.goldBorder : 'transparent'};
  &:hover{background:${t.hover};}
`
const SEmpty = styled.div`padding:16px;text-align:center;color:${t.textDim};font-size:13px;`

/* ── 2. OptionGroup ── */
export const OptionGroup = ({ value, onChange, options, label, layout = 'vertical' }: {
  value: string; onChange: (v: string) => void
  options: { value: string; label: string; description?: string }[]
  label?: string; layout?: 'horizontal' | 'vertical'
}) => (
  <OGWrap dir="rtl">
    {label && <OGLabel>{label}</OGLabel>}
    <OGGrid $h={layout === 'horizontal'}>
      {options.map(o => (
        <OGCard key={o.value} $on={o.value === value} onClick={() => onChange(o.value)}>
          <OGRadio $on={o.value === value}><OGDot $on={o.value === value} /></OGRadio>
          <div><OGTitle $on={o.value === value}>{o.label}</OGTitle>
            {o.description && <OGDesc>{o.description}</OGDesc>}</div>
        </OGCard>
      ))}
    </OGGrid>
  </OGWrap>
)
const OGWrap = styled.div`font-family:${t.font};`
const OGLabel = styled.div`font-size:13px;font-weight:600;color:${t.textSec};margin-bottom:8px;`
const OGGrid = styled.div<{ $h: boolean }>`display:flex;flex-direction:${({ $h }) => $h ? 'row' : 'column'};gap:8px;flex-wrap:wrap;`
const OGCard = styled.div<{ $on: boolean }>`
  display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border-radius:${t.r.md};cursor:pointer;flex:1;min-width:140px;
  background:${({ $on }) => $on ? t.goldDim : t.surface};border:1.5px solid ${({ $on }) => $on ? t.gold : t.border};transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};background:${t.hover}}
`
const OGRadio = styled.div<{ $on: boolean }>`
  width:18px;height:18px;border-radius:50%;border:2px solid ${({ $on }) => $on ? t.gold : t.textDim};
  display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;transition:all ${t.tr};
`
const OGDot = styled.div<{ $on: boolean }>`
  width:10px;height:10px;border-radius:50%;background:${t.gold};
  transform:scale(${({ $on }) => $on ? 1 : 0});transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
`
const OGTitle = styled.div<{ $on: boolean }>`font-size:14px;font-weight:600;color:${({ $on }) => $on ? t.gold : t.text};`
const OGDesc = styled.div`font-size:12px;color:${t.textDim};margin-top:2px;`

/* ── 3. Toggle ── */
export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <TgWrap dir="rtl" onClick={() => onChange(!checked)}>
    <TgTrack $on={checked}><TgThumb $on={checked} /></TgTrack>
    {label && <TgLabel>{label}</TgLabel>}
  </TgWrap>
)
const TgWrap = styled.div`display:flex;align-items:center;gap:10px;cursor:pointer;font-family:${t.font};user-select:none;`
const TgTrack = styled.div<{ $on: boolean }>`
  width:44px;height:24px;border-radius:${t.r.full};position:relative;flex-shrink:0;transition:all ${t.tr};
  background:${({ $on }) => $on ? `linear-gradient(135deg,${t.gold},${t.goldBright})` : t.surfaceLight};
  border:1px solid ${({ $on }) => $on ? t.gold : t.border};
`
const TgThumb = styled.div<{ $on: boolean }>`
  position:absolute;top:2px;width:18px;height:18px;border-radius:50%;background:${t.text};
  box-shadow:${t.sh.sm};transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);
  right:${({ $on }) => $on ? '2px' : '22px'};
`
const TgLabel = styled.span`font-size:14px;color:${t.text};`

/* ── 4. RangeInput ── */
export const RangeInput = ({ min, max, valueMin, valueMax, onChange, label, formatValue }: {
  min: number; max: number; valueMin: number; valueMax: number
  onChange: (lo: number, hi: number) => void; label?: string; formatValue?: (v: number) => string
}) => {
  const fv = formatValue ?? ((v: number) => v.toLocaleString('he-IL'))
  const range = max - min || 1
  const loP = ((valueMin - min) / range) * 100, hiP = ((valueMax - min) / range) * 100
  const trackRef = useRef<HTMLDivElement>(null)

  const onPointer = (which: 'min' | 'max') => (e: React.PointerEvent) => {
    e.preventDefault(); const el = trackRef.current; if (!el) return
    const move = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const pct = Math.max(0, Math.min(100, ((rect.right - ev.clientX) / rect.width) * 100))
      const v = Math.round(min + (pct / 100) * range)
      if (which === 'min') onChange(Math.min(v, valueMax), valueMax)
      else onChange(valueMin, Math.max(v, valueMin))
    }
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up) }
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up)
  }

  return (
    <RIWrap dir="rtl">
      {label && <RILabel>{label}</RILabel>}
      <RIVals><span>{fv(valueMin)}</span><span>{fv(valueMax)}</span></RIVals>
      <RITrack ref={trackRef}>
        <RIBar /><RIFill style={{ right: `${loP}%`, width: `${hiP - loP}%` }} />
        <RIThWrap style={{ right: `${loP}%` }} onPointerDown={onPointer('min')}>
          <RITip>{fv(valueMin)}</RITip><RITh />
        </RIThWrap>
        <RIThWrap style={{ right: `${hiP}%` }} onPointerDown={onPointer('max')}>
          <RITip>{fv(valueMax)}</RITip><RITh />
        </RIThWrap>
      </RITrack>
    </RIWrap>
  )
}
const RIWrap = styled.div`font-family:${t.font};padding:8px 0;`
const RILabel = styled.div`font-size:13px;font-weight:600;color:${t.textSec};margin-bottom:4px;`
const RIVals = styled.div`display:flex;justify-content:space-between;font-size:12px;color:${t.textDim};margin-bottom:12px;`
const RITrack = styled.div`position:relative;height:6px;margin:16px 10px;`
const RIBar = styled.div`position:absolute;inset:0;background:${t.surfaceLight};border-radius:${t.r.full};`
const RIFill = styled.div`position:absolute;top:0;height:100%;background:linear-gradient(90deg,${t.gold},${t.goldBright});border-radius:${t.r.full};`
const RIThWrap = styled.div`
  position:absolute;top:50%;transform:translate(50%,-50%);cursor:grab;z-index:2;touch-action:none;
  &:active{cursor:grabbing;} &:hover > div:first-child{opacity:1;transform:translateX(50%) translateY(0) scale(1);}
`
const RITip = styled.div`
  position:absolute;bottom:calc(100% + 8px);right:50%;transform:translateX(50%) translateY(4px) scale(0.9);
  background:${t.gold};color:${t.bg};font-size:11px;font-weight:700;padding:3px 8px;border-radius:${t.r.sm};
  white-space:nowrap;opacity:0;transition:all 0.2s;pointer-events:none;
`
const RITh = styled.div`
  width:20px;height:20px;border-radius:50%;background:${t.text};border:3px solid ${t.gold};
  box-shadow:${t.sh.md};transition:all ${t.tr};&:hover{transform:scale(1.15);box-shadow:${t.sh.glow};}
`

/* ── 5. WhatsAppButton ── */
export const WhatsAppButton = ({ phone, message = '', label = 'שלח הודעה בוואטסאפ' }: {
  phone: string; message?: string; label?: string
}) => (
  <WALink href={`https://wa.me/${phone.replace(/\D/g, '')}${message ? `?text=${encodeURIComponent(message)}` : ''}`}
    target="_blank" rel="noopener noreferrer" dir="rtl">
    <MessageCircle size={18} />{label}
  </WALink>
)
const WALink = styled.a`
  display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 28px;
  background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;font-weight:700;font-size:15px;
  border-radius:${t.r.full};font-family:${t.font};text-decoration:none;transition:all ${t.tr};
  &:hover{transform:translateY(-2px);animation:${waPulse} 1.2s ease infinite;text-decoration:none;}
  &:active{transform:translateY(0);}
`

/* ── 6. PlotCard ── */
export const PlotCard = ({ plot, onFav, isFav, delay = 0 }: {
  plot: Plot; onFav?: () => void; isFav?: boolean; delay?: number
}) => {
  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const status = (plot.status || 'AVAILABLE') as string, dom = daysOnMarket(d.created)
  const sColor = statusColors[status] || t.gold
  return (
    <PCWrap $delay={delay}>
      <PCAccent style={{ background: `linear-gradient(90deg,${sColor},${sColor}88)` }} />
      <PCTop>
        <PCStatus style={{ color: sColor, background: sColor + '18' }}>{statusLabels[status] || status}</PCStatus>
        <PCGrade style={{ color: grade.color, borderColor: grade.color + '44' }}>{grade.grade}</PCGrade>
      </PCTop>
      <Link to={`/plot/${plot.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <PCBody>
          <PCCity>{plot.city}</PCCity>
          <PCBlock>גוש {d.block} | חלקה {plot.number}</PCBlock>
          <PCMetrics>
            <PCMetric><PCVal $gold>{d.price > 0 ? fmt.compact(d.price) : '---'}</PCVal><PCLbl>מחיר</PCLbl></PCMetric>
            <PCMetric><PCVal>{d.size > 0 ? `${fmt.num(d.size)} מ״ר` : '---'}</PCVal><PCLbl>שטח</PCLbl></PCMetric>
            <PCMetric><PCVal style={{ color: r > 0 ? t.ok : t.textDim }}>{r > 0 ? `${Math.round(r)}%` : '---'}</PCVal><PCLbl>ROI</PCLbl></PCMetric>
          </PCMetrics>
        </PCBody>
      </Link>
      <PCFoot>
        <PCFootL>
          {plot.views != null && <PCMeta><Eye size={12} /> {plot.views} צפיות</PCMeta>}
          {dom && <PCDom style={{ color: dom.color }}>{dom.label}</PCDom>}
        </PCFootL>
        {onFav && (
          <PCFavBtn onClick={e => { e.stopPropagation(); onFav() }} aria-label="מועדף">
            <Heart size={16} fill={isFav ? '#EF4444' : 'none'} color={isFav ? '#EF4444' : t.textDim} />
          </PCFavBtn>
        )}
      </PCFoot>
    </PCWrap>
  )
}
const PCWrap = styled.div<{ $delay: number }>`
  position:relative;border-radius:${t.r.lg};background:${t.surface};border:1px solid ${t.border};
  overflow:hidden;transition:all ${t.tr};font-family:${t.font};direction:rtl;
  animation:${staggerUp} 0.5s ease-out both;animation-delay:${({ $delay }) => $delay}s;
  &:hover{transform:translateY(-4px);border-color:${t.goldBorder};box-shadow:0 12px 40px rgba(212,168,75,0.12);}
`
const PCAccent = styled.div`height:3px;width:100%;`
const PCTop = styled.div`display:flex;align-items:center;justify-content:space-between;padding:10px 14px 0;`
const PCStatus = styled.span`font-size:11px;font-weight:700;padding:2px 10px;border-radius:${t.r.full};`
const PCGrade = styled.span`
  font-size:13px;font-weight:800;width:30px;height:30px;display:flex;align-items:center;justify-content:center;
  border-radius:${t.r.sm};border:1.5px solid;background:${t.bg};
`
const PCBody = styled.div`padding:10px 14px;`
const PCCity = styled.div`font-size:16px;font-weight:700;color:${t.text};`
const PCBlock = styled.div`font-size:12px;color:${t.textDim};margin-top:2px;`
const PCMetrics = styled.div`display:flex;gap:16px;margin-top:12px;`
const PCMetric = styled.div`text-align:center;flex:1;`
const PCVal = styled.div<{ $gold?: boolean }>`font-size:15px;font-weight:700;color:${({ $gold }) => $gold ? t.gold : t.text};`
const PCLbl = styled.div`font-size:10px;color:${t.textDim};margin-top:1px;`
const PCFoot = styled.div`display:flex;align-items:center;justify-content:space-between;padding:8px 14px;border-top:1px solid ${t.border};`
const PCFootL = styled.div`display:flex;align-items:center;gap:10px;`
const PCMeta = styled.span`display:flex;align-items:center;gap:4px;font-size:11px;color:${t.textDim};`
const PCDom = styled.span`font-size:11px;font-weight:600;`
const PCFavBtn = styled.button`
  background:transparent;border:none;cursor:pointer;padding:4px;border-radius:${t.r.sm};transition:all ${t.tr};
  &:hover{transform:scale(1.2);} &:active{transform:scale(0.95);}
`

/* ── Skeleton Shimmer ── */
const shimmerSk = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`

export const Skeleton = styled.div<{ $w?: string; $h?: string; $r?: string }>`
  width:${pr => pr.$w || '100%'};height:${pr => pr.$h || '14px'};
  border-radius:${pr => pr.$r || t.r.sm};
  background:linear-gradient(90deg,${t.surfaceLight} 25%,rgba(30,41,59,0.6) 50%,${t.surfaceLight} 75%);
  background-size:200% 100%;animation:${shimmerSk} 1.5s ease-in-out infinite;
`

export const SkeletonCircle = styled(Skeleton)<{ $size?: number }>`
  width:${pr => pr.$size || 40}px;height:${pr => pr.$size || 40}px;border-radius:50%;
`

/* ── Radial Score Ring ── */
export const RadialScore = ({ score, size = 56, strokeWidth = 4, grade, color }: {
  score: number; size?: number; strokeWidth?: number; grade: string; color: string
}) => {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score * 10))
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.surfaceLight} strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: size * 0.3, fontWeight: 900, fill: color, fontFamily: t.font }}>
        {grade}
      </text>
    </svg>
  )
}

/* ── 7. Stat ── */
export const Stat = ({ icon, label, value, trend, color = t.gold }: {
  icon: ReactNode; label: string; value: string | number; trend?: number; color?: string
}) => (
  <StWrap>
    <StIcon style={{ background: color + '18', color }}>{icon}</StIcon>
    <div style={{ flex: 1 }}>
      <StLabel>{label}</StLabel>
      <StVal>{typeof value === 'number' ? <CountUpNumber value={value} /> : value}</StVal>
    </div>
    {trend != null && trend !== 0 && (
      <StTrend $up={trend > 0}>
        {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {Math.abs(trend).toFixed(1)}%
      </StTrend>
    )}
  </StWrap>
)
const StWrap = styled.div`
  display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:${t.r.lg};
  background:${t.surface};border:1px solid ${t.border};font-family:${t.font};direction:rtl;
  transition:all ${t.tr};&:hover{transform:scale(1.02);border-color:${t.goldBorder};}
`
const StIcon = styled.div`width:40px;height:40px;border-radius:${t.r.md};display:flex;align-items:center;justify-content:center;flex-shrink:0;`
const StLabel = styled.div`font-size:12px;color:${t.textDim};`
const StVal = styled.div`font-size:20px;font-weight:800;color:${t.text};margin-top:1px;`
const StTrend = styled.div<{ $up: boolean }>`display:flex;align-items:center;gap:3px;font-size:12px;font-weight:700;color:${({ $up }) => $up ? t.ok : t.err};`

/* ── 8. NetworkBanner ── */
const bannerSlide = keyframes`from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}`
const bannerFade = keyframes`from{opacity:0}to{opacity:1}`

const BannerWrap = styled.div<{ $type: 'offline' | 'reconnected' }>`
  position:fixed;top:0;left:0;right:0;z-index:${t.z.toast + 10};
  display:flex;align-items:center;justify-content:center;gap:10px;
  padding:10px 20px;direction:rtl;
  background:${pr => pr.$type === 'offline'
    ? 'linear-gradient(135deg, #991B1B, #DC2626)'
    : 'linear-gradient(135deg, #065F46, #10B981)'};
  color:#fff;font-size:13px;font-weight:600;font-family:${t.font};
  box-shadow:0 4px 20px rgba(0,0,0,0.25);
  animation:${bannerSlide} 0.35s cubic-bezier(0.32,0.72,0,1);
`
const BannerDot = styled.span<{ $type: 'offline' | 'reconnected' }>`
  width:8px;height:8px;border-radius:50%;flex-shrink:0;
  background:${pr => pr.$type === 'offline' ? '#FCA5A5' : '#6EE7B7'};
  ${pr => pr.$type === 'offline' && `animation: ${pulse} 1.5s ease-in-out infinite;`}
`
const BannerRetryBtn = styled.button`
  padding:4px 14px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);
  border-radius:${t.r.full};color:#fff;font-size:12px;font-weight:700;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{background:rgba(255,255,255,0.35);}
`

export const NetworkBanner = ({ online, wasOffline, onRetry }: {
  online: boolean; wasOffline: boolean; onRetry?: () => void
}) => {
  if (online && !wasOffline) return null

  if (!online) {
    return (
      <BannerWrap $type="offline">
        <BannerDot $type="offline" />
        <span>אין חיבור לאינטרנט</span>
        {onRetry && <BannerRetryBtn onClick={onRetry}>נסה שוב</BannerRetryBtn>}
      </BannerWrap>
    )
  }

  // wasOffline — show reconnected briefly
  return (
    <BannerWrap $type="reconnected">
      <BannerDot $type="reconnected" />
      <span>החיבור חזר ✓</span>
    </BannerWrap>
  )
}

/* ── 9. ScrollToTop ── */
const scrollFadeIn = keyframes`from{opacity:0;transform:translateY(12px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}`

const STTBtn = styled.button<{ $visible: boolean }>`
  position:fixed;bottom:24px;left:24px;z-index:${t.z.filter};
  width:44px;height:44px;border-radius:${t.r.full};
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 20px rgba(212,168,75,0.35);
  transition:all 0.3s cubic-bezier(0.32,0.72,0,1);
  opacity:${({ $visible }) => $visible ? 1 : 0};
  pointer-events:${({ $visible }) => $visible ? 'auto' : 'none'};
  transform:${({ $visible }) => $visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.9)'};
  &:hover{transform:translateY(-2px) scale(1.08);box-shadow:0 8px 32px rgba(212,168,75,0.45);}
  &:active{transform:translateY(0) scale(0.95);}
  ${mobile}{bottom:76px;left:14px;width:40px;height:40px;}
`

export const ScrollToTop = ({ threshold = 400 }: { threshold?: number }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > threshold)
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [threshold])

  const scrollUp = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <STTBtn $visible={visible} onClick={scrollUp} aria-label="חזרה למעלה" title="חזרה למעלה">
      <ArrowUp size={20} />
    </STTBtn>
  )
}

/* ── 10. ExploreLoadingSkeleton — Premium shimmer loading state for Explore page ── */
const skeletonFadeIn = keyframes`from{opacity:0}to{opacity:1}`
const skeletonPulse = keyframes`0%,100%{opacity:0.6}50%{opacity:0.3}`

const SkWrap = styled.div`
  position:absolute;inset:0;z-index:2;background:${t.bg};
  animation:${skeletonFadeIn} 0.3s ease-out;display:flex;flex-direction:column;
`
const SkMap = styled.div`
  flex:1;position:relative;overflow:hidden;
  background:linear-gradient(180deg,${t.bg} 0%,#0d1526 50%,${t.bg} 100%);
`
const SkMapGrid = styled.div`
  position:absolute;inset:0;opacity:0.04;
  background-image:
    linear-gradient(rgba(212,168,75,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(212,168,75,0.3) 1px, transparent 1px);
  background-size:60px 60px;
`
const SkMapPlots = styled.div`
  position:absolute;inset:40px;display:flex;flex-wrap:wrap;gap:20px;
  align-items:center;justify-content:center;
`
const SkPlot = styled.div<{$w:number;$h:number;$delay:number}>`
  width:${pr=>pr.$w}px;height:${pr=>pr.$h}px;border-radius:4px;
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border:1px solid rgba(212,168,75,0.08);
  animation:${skeletonPulse} 2s ease-in-out ${pr=>pr.$delay}s infinite;
`
const SkFilter = styled.div`
  position:absolute;top:16px;left:50%;transform:translateX(-50%);
  width:min(520px,calc(100% - 32px));height:52px;
  background:${t.glass};backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.xl};
  display:flex;align-items:center;gap:10px;padding:0 16px;
  ${mobile}{top:8px;left:8px;right:8px;transform:none;width:auto;}
`
const SkStats = styled.div`
  position:absolute;bottom:0;left:0;right:0;height:36px;
  background:${t.glass};backdrop-filter:blur(12px);
  border-top:1px solid ${t.border};
  display:flex;align-items:center;justify-content:center;gap:24px;padding:0 16px;
  ${mobile}{bottom:56px;gap:10px;}
`
const SkControls = styled.div`
  position:absolute;bottom:24px;left:16px;display:flex;flex-direction:column;gap:10px;
`
const SkControlBtn = styled.div`
  width:40px;height:40px;border-radius:${t.r.md};
  background:${t.glass};border:1px solid ${t.glassBorder};
  animation:${skeletonPulse} 2s ease-in-out 0.2s infinite;
`
const SkMobileNav = styled.div`
  display:none;height:56px;
  background:${t.surface};border-top:1px solid ${t.border};
  align-items:center;justify-content:space-around;padding:0 16px;
  ${mobile}{display:flex;}
`
const SkMobileNavItem = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:4px;
`
const SkLoadingText = styled.div`
  position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  display:flex;flex-direction:column;align-items:center;gap:12px;
  z-index:3;
`
const SkLoadingDots = styled.div`
  display:flex;gap:6px;
`
const SkDot = styled.div<{$delay:number}>`
  width:8px;height:8px;border-radius:50%;
  background:${t.gold};
  animation:${skeletonPulse} 1.2s ease-in-out ${pr=>pr.$delay}s infinite;
`

export const ExploreLoadingSkeleton = () => (
  <SkWrap>
    <SkMap>
      <SkMapGrid />
      <SkMapPlots>
        <SkPlot $w={80} $h={60} $delay={0} />
        <SkPlot $w={120} $h={80} $delay={0.15} />
        <SkPlot $w={60} $h={50} $delay={0.3} />
        <SkPlot $w={100} $h={70} $delay={0.45} />
        <SkPlot $w={90} $h={55} $delay={0.6} />
        <SkPlot $w={70} $h={65} $delay={0.2} />
        <SkPlot $w={110} $h={75} $delay={0.4} />
      </SkMapPlots>

      {/* Search bar skeleton */}
      <SkFilter>
        <Skeleton $w="16px" $h="16px" $r="50%" />
        <Skeleton $w="60%" $h="14px" />
        <div style={{ flex: 1 }} />
        <Skeleton $w="40px" $h="40px" $r={t.r.md} />
      </SkFilter>

      {/* Map controls skeleton */}
      <SkControls>
        <SkControlBtn />
        <SkControlBtn />
        <div style={{ display: 'flex', flexDirection: 'column', borderRadius: t.r.md, overflow: 'hidden' }}>
          <SkControlBtn style={{ borderRadius: `${t.r.md} ${t.r.md} 0 0` }} />
          <SkControlBtn style={{ borderRadius: `0 0 ${t.r.md} ${t.r.md}` }} />
        </div>
        <SkControlBtn />
      </SkControls>

      {/* Center loading indicator */}
      <SkLoadingText>
        <Spinner size={32} />
        <span style={{ fontSize: 13, fontWeight: 600, color: t.textDim, letterSpacing: '0.5px' }}>
          טוען חלקות...
        </span>
        <SkLoadingDots>
          <SkDot $delay={0} />
          <SkDot $delay={0.2} />
          <SkDot $delay={0.4} />
        </SkLoadingDots>
      </SkLoadingText>

      {/* Stats bar skeleton */}
      <SkStats>
        <Skeleton $w="50px" $h="10px" />
        <Skeleton $w="70px" $h="10px" />
        <Skeleton $w="60px" $h="10px" />
        <Skeleton $w="55px" $h="10px" />
        <Skeleton $w="45px" $h="10px" />
      </SkStats>
    </SkMap>

    {/* Mobile nav skeleton */}
    <SkMobileNav>
      {[0, 1, 2, 3].map(i => (
        <SkMobileNavItem key={i}>
          <Skeleton $w="20px" $h="20px" $r="4px" />
          <Skeleton $w="28px" $h="8px" />
        </SkMobileNavItem>
      ))}
    </SkMobileNav>
  </SkWrap>
)

/* ── 11. PriceAlertButton — Subscribe to price changes for a plot ── */
const alertPop = keyframes`0%{transform:scale(0.8)}50%{transform:scale(1.1)}100%{transform:scale(1)}`

const AlertBtn = styled.button<{$active:boolean}>`
  display:flex;align-items:center;justify-content:center;gap:6px;
  width:40px;height:40px;border-radius:${t.r.md};
  border:1px solid ${pr=>pr.$active ? '#8B5CF6' : t.border};
  background:${pr=>pr.$active ? 'rgba(139,92,246,0.12)' : 'transparent'};
  color:${pr=>pr.$active ? '#8B5CF6' : t.textSec};
  cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${pr=>pr.$active ? '#8B5CF6' : t.goldBorder};
    color:${pr=>pr.$active ? '#A78BFA' : t.gold};
    background:${pr=>pr.$active ? 'rgba(139,92,246,0.15)' : t.goldDim};}
  ${pr=>pr.$active && `svg{animation:${alertPop} 0.3s ease-out;}`}
`

const AlertTooltip = styled.div<{$show:boolean}>`
  position:absolute;bottom:calc(100% + 8px);right:0;
  padding:8px 14px;background:${t.surface};border:1px solid #8B5CF6;
  border-radius:${t.r.md};box-shadow:${t.sh.lg};
  font-size:12px;font-weight:600;color:${t.text};white-space:nowrap;direction:rtl;
  opacity:${pr=>pr.$show?1:0};transform:translateY(${pr=>pr.$show?'0':'4px'});
  transition:all 0.2s;pointer-events:none;z-index:5;
  &::after{content:'';position:absolute;bottom:-5px;right:14px;
    width:10px;height:10px;background:${t.surface};border-right:1px solid #8B5CF6;
    border-bottom:1px solid #8B5CF6;transform:rotate(45deg);}
`

/* ── Price Alert Popover (with target price input) ── */
const alertPopIn = keyframes`from{opacity:0;transform:translateY(8px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}`
const AlertPopoverWrap = styled.div<{$show:boolean}>`
  position:absolute;bottom:calc(100% + 10px);right:0;z-index:10;
  width:240px;padding:14px;direction:rtl;
  background:${t.surface};border:1px solid ${t.goldBorder};
  border-radius:${t.r.lg};box-shadow:${t.sh.xl};
  animation:${alertPopIn} 0.2s cubic-bezier(0.32,0.72,0,1);
  &::after{content:'';position:absolute;bottom:-6px;right:12px;
    width:12px;height:12px;background:${t.surface};border-right:1px solid ${t.goldBorder};
    border-bottom:1px solid ${t.goldBorder};transform:rotate(45deg);}
`
const AlertPopTitle = styled.div`font-size:13px;font-weight:700;color:${t.text};margin-bottom:10px;display:flex;align-items:center;gap:6px;`
const AlertPopInput = styled.input`
  width:100%;padding:8px 12px;background:${t.surfaceLight};border:1px solid ${t.border};
  border-radius:${t.r.md};color:${t.text};font-size:14px;font-weight:700;font-family:${t.font};
  outline:none;direction:ltr;text-align:center;
  &:focus{border-color:${t.goldBorder};box-shadow:0 0 0 3px ${t.goldDim};}
  &::placeholder{color:${t.textDim};font-weight:400;}
`
const AlertPopHint = styled.div`font-size:10px;color:${t.textDim};margin-top:6px;text-align:center;`
const AlertPopSubmit = styled.button`
  width:100%;padding:8px;margin-top:8px;
  background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:#fff;
  border:none;border-radius:${t.r.md};font-weight:700;font-size:12px;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};
  &:hover{box-shadow:0 4px 16px rgba(139,92,246,0.35);transform:translateY(-1px);}
  &:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none;}
`

export function PriceAlertButton({ plotId, plotLabel, currentPrice, onToggle }: {
  plotId: string; plotLabel?: string; currentPrice?: number; onToggle?: (active: boolean) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [targetPrice, setTargetPrice] = useState('')
  const popRef = useRef<HTMLDivElement>(null)

  // Check if alert exists for this plot using the simple legacy storage
  const [alerts, setAlerts] = useState<Set<string>>(() => {
    try {
      // Support both old format (string[]) and new format (PriceAlert[])
      const raw = JSON.parse(localStorage.getItem('price_alerts') || '[]')
      if (raw.length > 0 && typeof raw[0] === 'string') return new Set(raw)
      // New format: extract plotIds
      return new Set((raw as Array<{plotId?:string}>).filter((a: any) => a.plotId && !a.triggered).map((a: any) => a.plotId))
    } catch { return new Set() }
  })
  const isActive = alerts.has(plotId)

  // Close popover on click outside
  useEffect(() => {
    if (!showPopover) return
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setShowPopover(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPopover])

  const handleClick = useCallback(() => {
    if (isActive) {
      // Remove alert
      setAlerts(prev => {
        const next = new Set(prev)
        next.delete(plotId)
        // Also clean from new format storage
        try {
          const raw = JSON.parse(localStorage.getItem('price_alerts') || '[]')
          if (Array.isArray(raw)) {
            const cleaned = raw.filter((a: any) => typeof a === 'string' ? a !== plotId : a.plotId !== plotId)
            localStorage.setItem('price_alerts', JSON.stringify(cleaned))
          }
        } catch {}
        onToggle?.(false)
        return next
      })
      setShowPopover(false)
    } else {
      // Show target price input
      if (currentPrice) setTargetPrice(String(Math.round(currentPrice * 0.9)))
      setShowPopover(true)
    }
  }, [plotId, isActive, currentPrice, onToggle])

  const submitAlert = useCallback(() => {
    const target = Number(targetPrice)
    if (!target || target <= 0) return
    setAlerts(prev => {
      const next = new Set(prev)
      next.add(plotId)
      // Store in new format
      try {
        const raw = JSON.parse(localStorage.getItem('price_alerts') || '[]')
        const alerts = Array.isArray(raw) ? raw.filter((a: any) => typeof a !== 'string') : []
        alerts.unshift({
          id: Date.now().toString(),
          plotId,
          plotLabel: plotLabel || plotId,
          targetPrice: target,
          currentPrice: currentPrice || 0,
          createdAt: Date.now(),
          triggered: false,
        })
        localStorage.setItem('price_alerts', JSON.stringify(alerts.slice(0, 20)))
      } catch {}
      return next
    })
    onToggle?.(true)
    setShowPopover(false)
  }, [plotId, plotLabel, currentPrice, targetPrice, onToggle])

  return (
    <div style={{ position: 'relative' }} ref={popRef}>
      <AlertBtn
        $active={isActive}
        onClick={handleClick}
        onMouseEnter={() => !showPopover && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={isActive ? 'בטל התראת מחיר' : 'הגדר התראת מחיר'}
        title={isActive ? 'בטל התראת מחיר' : 'הגדר התראת מחיר'}
      >
        {isActive ? <BellOff size={15} /> : <Bell size={15} />}
      </AlertBtn>
      {!showPopover && (
        <AlertTooltip $show={showTooltip} aria-hidden={!showTooltip}>
          {isActive ? '🔕 בטל התראת מחיר' : '🔔 הגדר התראת מחיר'}
        </AlertTooltip>
      )}
      {showPopover && (
        <AlertPopoverWrap $show={showPopover} role="dialog" aria-label="התראת מחיר">
          <AlertPopTitle><Bell size={14} color="#8B5CF6" /> התראת מחיר</AlertPopTitle>
          <AlertPopInput
            type="number"
            value={targetPrice}
            onChange={e => setTargetPrice(e.target.value)}
            placeholder="מחיר יעד ב-₪"
            onKeyDown={e => { if (e.key === 'Enter') submitAlert(); if (e.key === 'Escape') setShowPopover(false) }}
            autoFocus
          />
          {currentPrice && currentPrice > 0 && (
            <AlertPopHint>מחיר נוכחי: ₪{currentPrice.toLocaleString()}</AlertPopHint>
          )}
          <AlertPopSubmit onClick={submitAlert} disabled={!targetPrice || Number(targetPrice) <= 0}>
            🔔 הפעל התראה
          </AlertPopSubmit>
        </AlertPopoverWrap>
      )}
    </div>
  )
}

/* ── Lazy Suspense Fallbacks ── */
const lazyFadeIn = keyframes`from{opacity:0}to{opacity:1}`
const lazyPulse = keyframes`0%,100%{opacity:0.5}50%{opacity:0.25}`

const LazyFallbackWrap = styled.div<{$position?:'sidebar'|'bottom'|'overlay'}>`
  display:flex;align-items:center;justify-content:center;gap:10px;
  font-size:12px;color:${t.textDim};font-family:${t.font};
  animation:${lazyFadeIn} 0.2s ease-out;
  ${pr => pr.$position === 'sidebar' ? `
    position:fixed;top:0;right:0;bottom:0;width:420px;max-width:100vw;
    background:${t.surface};border-left:1px solid ${t.border};z-index:${t.z.sidebar};
    flex-direction:column;padding:32px;
    ${mobile}{width:100vw;}
  ` : pr.$position === 'bottom' ? `
    position:fixed;bottom:0;left:0;right:0;height:56px;
    background:${t.surface};border-top:1px solid ${t.border};z-index:40;
  ` : pr.$position === 'overlay' ? `
    position:fixed;inset:0;z-index:${t.z.modal};
    background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);flex-direction:column;
  ` : `
    padding:24px;
  `}
`
const LazyFallbackBar = styled.div`
  width:48px;height:3px;border-radius:2px;background:${t.gold};
  animation:${lazyPulse} 1.5s ease-in-out infinite;
`

/** Sidebar loading placeholder — shows while Sidebar.tsx lazy-loads */
export const SidebarFallback = () => (
  <LazyFallbackWrap $position="sidebar">
    <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent)`, width: '100%', borderRadius: 2, marginBottom: 16 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', padding: '0 4px' }}>
      <Skeleton $w="60%" $h="18px" />
      <Skeleton $w="40%" $h="12px" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Skeleton $w="100%" $h="64px" $r={t.r.md} />
        <Skeleton $w="100%" $h="64px" $r={t.r.md} />
        <Skeleton $w="100%" $h="64px" $r={t.r.md} />
        <Skeleton $w="100%" $h="64px" $r={t.r.md} />
      </div>
      <Skeleton $w="100%" $h="80px" $r={t.r.md} />
      <Skeleton $w="80%" $h="12px" />
      <Skeleton $w="100%" $h="120px" $r={t.r.md} />
    </div>
  </LazyFallbackWrap>
)

/** Compare drawer loading placeholder */
export const CompareDrawerFallback = () => (
  <LazyFallbackWrap $position="overlay">
    <LazyFallbackBar />
    <span style={{ marginTop: 8 }}>טוען השוואה...</span>
  </LazyFallbackWrap>
)

/** Generic inline loading fallback */
export const InlineFallback = () => (
  <LazyFallbackWrap>
    <LazyFallbackBar />
  </LazyFallbackWrap>
)

/* ── Cookie Consent Banner ── */
const cookieSlideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const CookieBanner = styled.div<{$show:boolean}>`
  position:fixed;bottom:0;left:0;right:0;z-index:${t.z.toast + 5};
  display:${pr=>pr.$show?'flex':'none'};align-items:center;justify-content:center;
  gap:16px;padding:14px 24px;direction:rtl;
  background:rgba(17,24,39,0.97);backdrop-filter:blur(16px);
  border-top:1px solid rgba(212,168,75,0.2);
  box-shadow:0 -8px 32px rgba(0,0,0,0.3);
  animation:${cookieSlideUp} 0.4s cubic-bezier(0.32,0.72,0,1);
  @media(max-width:640px){
    flex-direction:column;gap:10px;padding:14px 16px;text-align:center;
    bottom:56px; /* Account for mobile navigation height */
  }
`
const CookieText = styled.p`
  font-size:13px;color:rgba(255,255,255,0.8);margin:0;line-height:1.6;flex:1;
  a{color:#D4A84B;text-decoration:underline;text-underline-offset:2px;&:hover{color:#E6C06A;}}
`
const CookieActions = styled.div`display:flex;align-items:center;gap:8px;flex-shrink:0;`
const CookieAcceptBtn = styled.button`
  padding:8px 24px;background:linear-gradient(135deg,#D4A84B,#E6C06A);color:#050D1A;
  border:none;border-radius:20px;font-weight:700;font-size:13px;cursor:pointer;
  transition:all 0.2s;white-space:nowrap;
  &:hover{box-shadow:0 0 16px rgba(212,168,75,0.35);transform:translateY(-1px);}
`
const CookieDeclineBtn = styled.button`
  padding:8px 16px;background:transparent;color:rgba(255,255,255,0.5);
  border:1px solid rgba(255,255,255,0.15);border-radius:20px;font-weight:600;font-size:12px;
  cursor:pointer;transition:all 0.2s;white-space:nowrap;
  &:hover{border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.7);}
`

const COOKIE_KEY = 'landmap_cookie_consent'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Small delay to avoid layout shift on initial load
    const timer = setTimeout(() => {
      try {
        const consent = localStorage.getItem(COOKIE_KEY)
        if (!consent) setShow(true)
      } catch {
        setShow(true)
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const accept = useCallback(() => {
    try { localStorage.setItem(COOKIE_KEY, 'accepted') } catch {}
    setShow(false)
  }, [])

  const decline = useCallback(() => {
    try { localStorage.setItem(COOKIE_KEY, 'declined') } catch {}
    setShow(false)
  }, [])

  return (
    <CookieBanner $show={show} role="dialog" aria-label="הסכמה לעוגיות">
      <CookieText>
        🍪 אתר זה משתמש בעוגיות (Cookies) ואחסון מקומי כדי לשפר את חווית השימוש, לשמור העדפות ולספק ניתוח נתונים.
        בהמשך השימוש באתר אתם מסכימים ל<a href="/privacy">מדיניות הפרטיות</a> שלנו.
      </CookieText>
      <CookieActions>
        <CookieAcceptBtn onClick={accept}>אישור</CookieAcceptBtn>
        <CookieDeclineBtn onClick={decline}>דחה</CookieDeclineBtn>
      </CookieActions>
    </CookieBanner>
  )
}

/* ── 13. PWA Install Prompt ── */
const pwaSlide = keyframes`from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}`
const pwaPulse = keyframes`0%,100%{box-shadow:0 0 0 0 rgba(212,168,75,0.2)}50%{box-shadow:0 0 0 8px rgba(212,168,75,0)}`
const PWABanner = styled.div<{ $show: boolean }>`
  position:fixed;bottom:16px;left:16px;z-index:85;direction:rtl;
  display:${pr => pr.$show ? 'flex' : 'none'};align-items:center;gap:14px;
  padding:14px 18px;max-width:380px;width:calc(100vw - 32px);
  background:linear-gradient(135deg,rgba(11,17,32,0.95),rgba(17,24,39,0.95));
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid rgba(212,168,75,0.25);border-radius:16px;
  box-shadow:0 12px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.05);
  animation:${pwaSlide} 0.4s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{left:8px;right:8px;bottom:72px;width:auto;max-width:none;padding:12px 14px;gap:10px;}
`
const PWAIconWrap = styled.div`
  width:44px;height:44px;border-radius:12px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,rgba(212,168,75,0.15),rgba(212,168,75,0.05));
  border:1px solid rgba(212,168,75,0.2);
  animation:${pwaPulse} 3s ease-in-out infinite;
  ${mobile}{width:38px;height:38px;border-radius:10px;}
`
const PWAContent = styled.div`flex:1;min-width:0;`
const PWATitle = styled.div`
  font-size:14px;font-weight:700;color:${t.text};font-family:${t.font};
  display:flex;align-items:center;gap:6px;
  ${mobile}{font-size:13px;}
`
const PWADesc = styled.div`
  font-size:12px;color:${t.textSec};margin-top:2px;line-height:1.5;
  ${mobile}{font-size:11px;}
`
const PWAActions = styled.div`display:flex;align-items:center;gap:8px;flex-shrink:0;`
const PWAInstallBtn = styled.button`
  display:inline-flex;align-items:center;gap:6px;padding:8px 18px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border:none;border-radius:9999px;font-weight:700;font-size:13px;font-family:${t.font};
  cursor:pointer;transition:all 0.25s;white-space:nowrap;
  &:hover{box-shadow:0 0 20px rgba(212,168,75,0.35);transform:translateY(-1px);}
  ${mobile}{padding:7px 14px;font-size:12px;}
`
const PWADismissBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:28px;height:28px;
  border-radius:8px;background:transparent;border:1px solid ${t.border};
  color:${t.textDim};cursor:pointer;transition:all 0.2s;flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.textSec};}
`

export function PWAInstallPrompt() {
  const { canInstall, install, dismiss } = usePWAInstall()
  const [show, setShow] = useState(false)

  // Delay showing to avoid competing with cookie banner
  useEffect(() => {
    if (!canInstall) { setShow(false); return }
    const timer = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(timer)
  }, [canInstall])

  const handleInstall = useCallback(async () => {
    await install()
    setShow(false)
  }, [install])

  const handleDismiss = useCallback(() => {
    dismiss()
    setShow(false)
  }, [dismiss])

  return (
    <PWABanner $show={show} role="dialog" aria-label="התקנת אפליקציה">
      <PWAIconWrap>
        <Smartphone size={22} color={t.gold} />
      </PWAIconWrap>
      <PWAContent>
        <PWATitle>📲 התקינו את LandMap</PWATitle>
        <PWADesc>גישה מהירה מהמסך הראשי — עובד גם אופליין</PWADesc>
      </PWAContent>
      <PWAActions>
        <PWAInstallBtn onClick={handleInstall}>
          <Download size={14} /> התקן
        </PWAInstallBtn>
        <PWADismissBtn onClick={handleDismiss} aria-label="סגור">
          <X size={14} />
        </PWADismissBtn>
      </PWAActions>
    </PWABanner>
  )
}
