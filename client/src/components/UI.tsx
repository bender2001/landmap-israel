import { Component, useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import styled, { keyframes } from 'styled-components'
import { t } from '../theme'
import { X, AlertTriangle } from 'lucide-react'

// ── Spinner ──
const spin = keyframes`to { transform: rotate(360deg); }`
const SpinnerSvg = styled.svg`animation: ${spin} 0.8s linear infinite;`

export function Spinner({ size = 24, color = t.colors.gold }: { size?: number; color?: string }) {
  return (
    <SpinnerSvg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </SpinnerSvg>
  )
}

// ── Page Loader ──
const LoaderWrap = styled.div`
  height: var(--vh, 100vh); width: 100vw;
  display: flex; align-items: center; justify-content: center;
  background: ${t.colors.bg};
`
export function PageLoader() {
  return <LoaderWrap data-page-loader><Spinner size={40} /></LoaderWrap>
}

// ── Toast System ──
type ToastVariant = 'success' | 'warning' | 'error' | 'info'
type Toast = { id: number; message: string; variant: ToastVariant }
type ToastCtx = { toast: (message: string, variant?: ToastVariant) => void }

const ToastCtx = createContext<ToastCtx>({ toast: () => {} })
export const useToast = () => useContext(ToastCtx)

const ToastWrap = styled.div`
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  z-index: ${t.z.toast}; display: flex; flex-direction: column; gap: 8px; align-items: center;
  pointer-events: none;
`
const fadeSlide = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`
const variantColors: Record<ToastVariant, string> = {
  success: t.colors.success, warning: t.colors.warning, error: t.colors.danger, info: t.colors.info,
}
const ToastItem = styled.div<{ $variant: ToastVariant }>`
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  background: ${t.colors.surface}; border: 1px solid ${({ $variant }) => variantColors[$variant]}30;
  border-radius: ${t.radius.md}; box-shadow: ${t.shadow.lg};
  font-size: 13px; color: ${t.colors.text}; pointer-events: auto;
  animation: ${fadeSlide} 0.3s ease;
  &::before {
    content: ''; width: 3px; height: 16px; border-radius: 2px;
    background: ${({ $variant }) => variantColors[$variant]};
    flex-shrink: 0;
  }
`

let nextId = 0
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <ToastWrap>
        {toasts.map(t => <ToastItem key={t.id} $variant={t.variant}>{t.message}</ToastItem>)}
      </ToastWrap>
    </ToastCtx.Provider>
  )
}

// ── Error Boundary ──
interface EBState { hasError: boolean; error?: Error }
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, EBState> {
  state: EBState = { hasError: false }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorBox>
          <AlertTriangle size={32} color={t.colors.warning} />
          <p>משהו השתבש. נסו לרענן את הדף.</p>
          <ErrorBtn onClick={() => window.location.reload()}>רענן</ErrorBtn>
        </ErrorBox>
      )
    }
    return this.props.children
  }
}

const ErrorBox = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px; text-align: center; color: ${t.colors.textSec}; font-size: 14px;
`
const ErrorBtn = styled.button`
  padding: 8px 20px; background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.sm}; color: ${t.colors.text}; font-size: 13px;
  cursor: pointer; font-family: inherit; transition: all ${t.transition};
  &:hover { background: ${t.colors.surfaceLight}; }
`

// ── Glass Card ──
export const Glass = styled.div<{ $hover?: boolean }>`
  background: ${t.colors.glass};
  backdrop-filter: blur(24px) saturate(1.3);
  -webkit-backdrop-filter: blur(24px) saturate(1.3);
  border: 1px solid ${t.colors.glassBorder};
  border-radius: ${t.radius.lg};
  box-shadow: ${t.shadow.lg};
  transition: border-color ${t.transition}, box-shadow ${t.transition};
  ${({ $hover }) => $hover && `
    &:hover {
      border-color: ${t.colors.goldBorder};
      box-shadow: ${t.shadow.lg}, ${t.shadow.glow};
    }
  `}
`

// ── Gold Button ──
export const GoldButton = styled.button`
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 24px; border: none; border-radius: ${t.radius.sm};
  background: linear-gradient(135deg, ${t.colors.gold}, ${t.colors.goldBright});
  color: ${t.colors.bg}; font-weight: 700; font-size: 13px;
  cursor: pointer; font-family: inherit; transition: all ${t.transition};
  &:hover { transform: translateY(-1px); box-shadow: ${t.shadow.glow}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`

// ── Ghost Button ──
export const GhostButton = styled.button`
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 16px; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.sm}; background: transparent;
  color: ${t.colors.textSec}; font-size: 12px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: all ${t.transition};
  &:hover { background: ${t.colors.surfaceHover}; border-color: ${t.colors.goldBorder}; color: ${t.colors.text}; }
`

// ── Badge ──
export const Badge = styled.span<{ $color?: string }>`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: ${t.radius.full};
  font-size: 10px; font-weight: 600;
  background: ${({ $color }) => `${$color || t.colors.gold}18`};
  color: ${({ $color }) => $color || t.colors.gold};
  border: 1px solid ${({ $color }) => `${$color || t.colors.gold}30`};
`

// ── Section Title ──
export const SectionTitle = styled.h3`
  font-size: 15px; font-weight: 700; color: ${t.colors.text}; margin-bottom: 12px;
`

// ── Close Button ──
export function CloseBtn({ onClick, size = 20 }: { onClick: () => void; size?: number }) {
  return (
    <CloseBtnStyled onClick={onClick} aria-label="סגור">
      <X size={size} />
    </CloseBtnStyled>
  )
}
const CloseBtnStyled = styled.button`
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: ${t.radius.sm};
  border: none; background: ${t.colors.surfaceHover};
  color: ${t.colors.textDim}; cursor: pointer; transition: all ${t.transition};
  &:hover { background: ${t.colors.surfaceLight}; color: ${t.colors.text}; }
`
