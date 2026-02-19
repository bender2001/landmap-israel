import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, MapPin, Wifi } from 'lucide-react'
import styled from 'styled-components'
import { theme } from '../../styles/theme'

/* ═══════════════════════════════════════════════════════════
   Shared styled-components
   ═══════════════════════════════════════════════════════════ */

const ErrorActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`

const GoldBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  color: ${theme.colors.navy};
  font-weight: 700;
  font-size: 14px;
  border-radius: ${theme.radii.lg};
  border: none;
  cursor: pointer;
  transition: box-shadow ${theme.transitions.normal};
  &:hover { box-shadow: 0 10px 24px rgba(200, 148, 42, 0.3); }
`

const GhostBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[300]};
  font-weight: 500;
  font-size: 14px;
  border-radius: ${theme.radii.lg};
  cursor: pointer;
  transition: background ${theme.transitions.normal};
  &:hover { background: rgba(255, 255, 255, 0.1); }
`

/* ═══════════════════════════════════════════════════════════
   ErrorBoundary — full-page error screen
   ═══════════════════════════════════════════════════════════ */

const EBPage = styled.div`
  min-height: 100vh;
  background: ${theme.colors.navy};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  direction: rtl;
`

const EBCard = styled.div`
  max-width: 420px;
  width: 100%;
  text-align: center;
`

const EBIconBox = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 24px;
  border-radius: ${theme.radii.xl};
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(239, 68, 68, 0.2));
  border: 1px solid rgba(249, 115, 22, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
`

const EBTitle = styled.h2`
  font-size: 24px;
  font-weight: 800;
  color: ${theme.colors.slate[100]};
  margin-bottom: 8px;
`

const EBAccent = styled.span`
  background: linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const EBDesc = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 24px;
  line-height: 1.6;
`

const EBDetails = styled.details`
  text-align: right;
  margin-bottom: 24px;
`

const EBSummary = styled.summary`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
  cursor: pointer;
  transition: color ${theme.transitions.normal};
  &:hover { color: ${theme.colors.slate[400]}; }
`

const EBPre = styled.pre`
  margin-top: 8px;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.lg};
  padding: 12px;
  overflow: auto;
  max-height: 128px;
  text-align: left;
  font-family: ${theme.fonts.mono};
`

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; errorInfo: { componentStack?: string } | null }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary]', error, errorInfo)
    try {
      fetch('/api/health/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || String(error),
          stack: error?.stack || '',
          componentStack: errorInfo?.componentStack || '',
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {})
    } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <EBPage>
          <EBCard>
            <EBIconBox>
              <AlertTriangle size={40} color={theme.colors.orange[500]} />
            </EBIconBox>
            <EBTitle><EBAccent>אופס!</EBAccent> משהו השתבש</EBTitle>
            <EBDesc>
              אירעה שגיאה בלתי צפויה. הצוות שלנו קיבל התראה.<br />
              נסה לרענן את הדף או לחזור לעמוד הראשי.
            </EBDesc>
            {this.state.error?.message && (
              <EBDetails>
                <EBSummary>פרטים טכניים</EBSummary>
                <EBPre>{this.state.error.message}</EBPre>
              </EBDetails>
            )}
            <ErrorActions>
              <GoldBtn onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}>
                <RefreshCw size={16} /> נסה שוב
              </GoldBtn>
              <GhostBtn onClick={() => { window.location.href = '/' }}>
                <Home size={16} /> עמוד ראשי
              </GhostBtn>
            </ErrorActions>
          </EBCard>
        </EBPage>
      )
    }
    return this.props.children
  }
}

/* ═══════════════════════════════════════════════════════════
   MapErrorBoundary — map-specific with offline detection
   ═══════════════════════════════════════════════════════════ */

const MapWrap = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${theme.colors.navy};
  position: relative;
  direction: rtl;
`

const MapGrid = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.05;
  pointer-events: none;
  background-image:
    linear-gradient(${theme.colors.gold}4d 1px, transparent 1px),
    linear-gradient(90deg, ${theme.colors.gold}4d 1px, transparent 1px);
  background-size: 40px 40px;
`

const MapCard = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 360px;
  text-align: center;
  padding: 0 24px;
`

const MapIconBox = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${theme.radii.xl};
  background: ${theme.colors.gold}1a;
  border: 1px solid ${theme.colors.gold}33;
  display: flex;
  align-items: center;
  justify-content: center;
`

const MapTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const MapDesc = styled.p`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
  line-height: 1.6;
`

const MapHint = styled.p`
  font-size: 12px;
  color: ${theme.colors.slate[500]};
`

const MapSecondary = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[300]};
  font-weight: 500;
  font-size: 14px;
  border-radius: ${theme.radii.lg};
  text-decoration: none;
  transition: background ${theme.transitions.normal};
  &:hover { background: rgba(255, 255, 255, 0.1); }
`

const OfflineStatus = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.red[500]}1a;
  border: 1px solid ${theme.colors.red[500]}33;
  color: ${theme.colors.red[500]};
  font-size: 12px;
`

const PulseDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${theme.colors.red[500]};
  animation: pulse 1.5s ease-in-out infinite;
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`

interface MapErrorBoundaryProps { children: ReactNode }
interface MapErrorBoundaryState { hasError: boolean; error: Error | null; retryCount: number; isOffline: boolean }

export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  private _handleOnline: () => void
  private _handleOffline: () => void

  constructor(props: MapErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0, isOffline: !navigator.onLine }
    this._handleOnline = () => this.setState({ isOffline: false })
    this._handleOffline = () => this.setState({ isOffline: true })
  }

  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }

  componentDidMount() {
    window.addEventListener('online', this._handleOnline)
    window.addEventListener('offline', this._handleOffline)
  }

  componentWillUnmount() {
    window.removeEventListener('online', this._handleOnline)
    window.removeEventListener('offline', this._handleOffline)
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    console.error('[MapErrorBoundary]', error.message, errorInfo?.componentStack?.slice(0, 300))
  }

  handleRetry = () => {
    this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }))
  }

  render() {
    const { hasError, error, isOffline, retryCount } = this.state
    if (hasError) {
      const isNetworkError = isOffline
        || error?.message?.includes('fetch')
        || error?.message?.includes('network')
        || error?.message?.includes('Failed to load')

      return (
        <MapWrap>
          <MapGrid />
          <MapCard>
            <MapIconBox>
              {isNetworkError
                ? <Wifi size={28} color={`${theme.colors.gold}aa`} />
                : <MapPin size={28} color={`${theme.colors.gold}aa`} />}
            </MapIconBox>
            <MapTitle>{isNetworkError ? 'בעיית תקשורת' : 'שגיאה בטעינת המפה'}</MapTitle>
            <MapDesc>
              {isNetworkError
                ? 'לא הצלחנו לטעון את המפה. בדוק את חיבור האינטרנט ונסה שוב.'
                : 'אירעה שגיאה בטעינת המפה. ייתכן שמדובר בבעיה זמנית.'}
            </MapDesc>
            {retryCount >= 2 && <MapHint>{'💡 נסה לרענן את הדף (Ctrl+Shift+R) או לנסות מדפדפן אחר'}</MapHint>}
            <ErrorActions>
              <GoldBtn onClick={this.handleRetry}><RefreshCw size={16} /> נסה שוב</GoldBtn>
              <MapSecondary href="https://www.google.com/maps/place/Hadera,+Israel" target="_blank" rel="noopener noreferrer">
                Google Maps
              </MapSecondary>
            </ErrorActions>
            {isOffline && (
              <OfflineStatus><PulseDot /> אופליין — ממתין לחיבור...</OfflineStatus>
            )}
          </MapCard>
        </MapWrap>
      )
    }
    return this.props.children
  }
}

/* ═══════════════════════════════════════════════════════════
   WidgetErrorBoundary — inline widget error with auto-retry
   ═══════════════════════════════════════════════════════════ */

const WBInline = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${theme.radii.lg};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 11px;
  color: ${theme.colors.slate[500]};
  direction: rtl;
`

const WBWarn = styled.span`
  color: ${theme.colors.orange[500]};
`

const WBName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const WBRetry = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: ${theme.radii.sm};
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[400]};
  border: none;
  cursor: pointer;
  transition: color ${theme.transitions.normal}, background ${theme.transitions.normal};
  &:hover {
    color: ${theme.colors.slate[300]};
    background: rgba(255, 255, 255, 0.1);
  }
`

interface WidgetErrorBoundaryProps {
  children: ReactNode
  name?: string
  silent?: boolean
  maxRetries?: number
  className?: string
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  error: Error | null
  retryCount: number
}

export class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  private _retryTimer: number | null = null

  constructor(props: WidgetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string }) {
    const { name = 'unknown', silent, maxRetries = 3 } = this.props
    const { retryCount } = this.state
    console.warn(`[WidgetError:${name}] attempt ${retryCount + 1}`, error.message, errorInfo?.componentStack?.slice(0, 200))
    if (silent && retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 8000)
      this._retryTimer = window.setTimeout(() => {
        this.setState(prev => ({ hasError: false, error: null, retryCount: prev.retryCount + 1 }))
      }, delay)
    }
  }

  componentWillUnmount() {
    if (this._retryTimer) { window.clearTimeout(this._retryTimer); this._retryTimer = null }
  }

  handleRetry = () => {
    if (this._retryTimer) { window.clearTimeout(this._retryTimer); this._retryTimer = null }
    this.setState({ hasError: false, error: null, retryCount: 0 })
  }

  render() {
    if (this.state.hasError) {
      const { silent, maxRetries = 3, className } = this.props
      const { retryCount } = this.state
      if (silent) return retryCount < maxRetries ? null : null
      return (
        <WBInline className={className}>
          <WBWarn>{'⚠'}</WBWarn>
          <WBName>
            {this.props.name || 'רכיב'} — שגיאה בטעינה
            {retryCount > 0 && <span> (ניסיון {retryCount + 1})</span>}
          </WBName>
          <WBRetry onClick={this.handleRetry}>
            <RefreshCw size={12} />
            <span>נסה שוב</span>
          </WBRetry>
        </WBInline>
      )
    }
    return this.props.children
  }
}
