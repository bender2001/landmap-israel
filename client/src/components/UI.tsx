import { Component, useState, useEffect, useCallback, useRef, useMemo, createContext, useContext, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { t, fadeInUp, popIn, countUp, mobile } from '../theme'
import { X, AlertTriangle, Check, ChevronDown, Search as SearchIcon, Heart, Eye, TrendingUp, TrendingDown, MessageCircle, ArrowUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Plot } from '../types'
import { p, roi, calcScore, getGrade, fmt, statusColors, statusLabels, daysOnMarket } from '../utils'

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

/* ── 8. ScrollToTop ── */
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
