import { useCallback, useEffect, useState } from 'react'
import { Bell, BellRing, X, Check, Mail, Phone, ChevronDown } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { theme, media } from '../styles/theme'

const STORAGE_KEY = 'landmap_alert_email'
const API_BASE = import.meta.env.VITE_API_URL || ''

type Filters = {
  city?: string
  priceMin?: string | number
  priceMax?: string | number
  sizeMin?: string | number
  sizeMax?: string | number
  minRoi?: string | number
}

type AlertSubscriptionProps = {
  filters: Filters
  statusFilter: string[]
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function AlertSubscription({ filters, statusFilter }: AlertSubscriptionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [phone, setPhone] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setIsSubscribed(true)
  }, [])

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email || status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    try {
      const criteria: Record<string, string | number> = {}
      if (filters.city && filters.city !== 'all') criteria.city = filters.city
      if (filters.priceMin) criteria.priceMin = filters.priceMin
      if (filters.priceMax) criteria.priceMax = filters.priceMax
      if (filters.sizeMin) criteria.sizeMin = filters.sizeMin
      if (filters.sizeMax) criteria.sizeMax = filters.sizeMax
      if (filters.minRoi && filters.minRoi !== 'all') criteria.minRoi = filters.minRoi
      if (statusFilter && statusFilter.length > 0) criteria.status = statusFilter.join(',')

      const res = await fetch(`${API_BASE}/api/alerts/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone: phone || undefined, criteria, frequency }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'שגיאה בהרשמה')
      }

      localStorage.setItem(STORAGE_KEY, email)
      setIsSubscribed(true)
      setStatus('success')
      window.setTimeout(() => {
        setIsOpen(false)
        setStatus('idle')
      }, 2500)
    } catch (err) {
      setStatus('error')
      const message = err instanceof Error ? err.message : 'שגיאה, נסה שוב'
      setErrorMsg(message)
    }
  }, [email, phone, frequency, filters, statusFilter, status])

  const handleUnsubscribe = useCallback(async () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return

    try {
      await fetch(`${API_BASE}/api/alerts/unsubscribe?email=${encodeURIComponent(saved)}`, {
        method: 'DELETE',
      })
    } catch {
      // ignore
    }

    localStorage.removeItem(STORAGE_KEY)
    setIsSubscribed(false)
    setEmail('')
  }, [])

  const criteriaLabel = (() => {
    const parts: string[] = []
    if (filters.city && filters.city !== 'all') parts.push(filters.city)
    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin ? `₪${(Number(filters.priceMin) / 1000).toFixed(0)}K` : ''
      const max = filters.priceMax ? `₪${(Number(filters.priceMax) / 1000).toFixed(0)}K` : ''
      parts.push(min && max ? `${min}–${max}` : min || `עד ${max}`)
    }
    if (statusFilter && statusFilter.length > 0) parts.push(`${statusFilter.length} סטטוסים`)
    return parts.length > 0 ? parts.join(' · ') : 'כל החלקות'
  })()

  return (
    <Wrapper dir="rtl">
      <ToggleButton
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        $active={isOpen}
        $subscribed={isSubscribed}
        title={isSubscribed ? 'התראות פעילות — לחץ לניהול' : 'קבל התראה על חלקות חדשות'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {isSubscribed ? <BellRing aria-hidden /> : <Bell aria-hidden />}
        <span>{isSubscribed ? 'התראות פעילות' : 'קבל התראות'}</span>
      </ToggleButton>

      {isOpen && (
        <Panel role="dialog" aria-label="הרשמה להתראות">
          <PanelHeader>
            <PanelTitle>
              <PanelIcon>
                <BellRing aria-hidden />
              </PanelIcon>
              <div>
                <h3>התראות חלקות</h3>
                <p>קבל עדכון כשנוספת חלקה חדשה</p>
              </div>
            </PanelTitle>
            <IconButton type="button" onClick={() => setIsOpen(false)}>
              <X aria-hidden />
            </IconButton>
          </PanelHeader>

          <CriteriaBox>
            <span>קריטריונים נוכחיים:</span>
            <strong>{criteriaLabel}</strong>
          </CriteriaBox>

          {status === 'success' ? (
            <SuccessState>
              <SuccessIcon>
                <Check aria-hidden />
              </SuccessIcon>
              <strong>נרשמת בהצלחה!</strong>
              <span>נעדכן אותך על חלקות חדשות</span>
            </SuccessState>
          ) : (
            <Form onSubmit={handleSubmit}>
              <Field>
                <Mail aria-hidden />
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="כתובת אימייל"
                  required
                  dir="ltr"
                />
              </Field>

              <Field>
                <Phone aria-hidden />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="טלפון (אופציונלי)"
                  dir="ltr"
                />
              </Field>

              <SelectField>
                <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
                  <option value="instant">מיידי — בכל חלקה חדשה</option>
                  <option value="daily">יומי — סיכום יומי</option>
                  <option value="weekly">שבועי — סיכום שבועי</option>
                </select>
                <ChevronDown aria-hidden />
              </SelectField>

              {errorMsg && <ErrorText>{errorMsg}</ErrorText>}

              <SubmitButton type="submit" disabled={status === 'loading' || !email}>
                {status === 'loading' ? (
                  <span>
                    <Spinner />
                    נרשם...
                  </span>
                ) : (
                  <span>
                    <BellRing aria-hidden />
                    הרשם להתראות
                  </span>
                )}
              </SubmitButton>

              {isSubscribed && (
                <TextButton type="button" onClick={handleUnsubscribe}>
                  ביטול הרשמה
                </TextButton>
              )}

              <Footnote>ניתן לבטל בכל עת. לא נשלח ספאם.</Footnote>
            </Form>
          )}
        </Panel>
      )}
    </Wrapper>
  )
}

const bellRing = keyframes`
  0%, 100% { transform: rotate(0); }
  20% { transform: rotate(-10deg); }
  40% { transform: rotate(10deg); }
  60% { transform: rotate(-6deg); }
  80% { transform: rotate(6deg); }
`

const Wrapper = styled.div`
  position: relative;
`

const ToggleButton = styled.button<{ $active: boolean; $subscribed: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.radii.lg};
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: ${({ $subscribed }) => ($subscribed ? 'rgba(200, 148, 42, 0.12)' : 'rgba(255, 255, 255, 0.04)')};
  color: ${({ $subscribed }) => ($subscribed ? theme.colors.gold : theme.colors.slate[400])};
  transition: ${theme.transitions.fast};

  svg {
    width: 16px;
    height: 16px;
  }

  ${({ $subscribed }) => $subscribed && `svg { animation: ${bellRing} 1.2s ease-in-out infinite; }`}

  span {
    display: none;
    font-size: 12px;
  }

  ${media.sm} {
    span { display: inline; }
  }

  &:hover,
  &:focus-visible {
    background: ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.2)' : 'rgba(255, 255, 255, 0.08)')};
    color: ${theme.colors.slate[200]};
  }
`

const Panel = styled.div`
  position: absolute;
  top: 3rem;
  right: 0;
  z-index: 60;
  width: 320px;
  padding: 1rem;
  background: rgba(10, 22, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.popup};
  backdrop-filter: blur(20px);
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: ${theme.colors.slate[100]};
  }

  p {
    margin: 0;
    font-size: 10px;
    color: ${theme.colors.slate[500]};
  }
`

const PanelIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${theme.radii.md};
  background: rgba(200, 148, 42, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 16px;
    height: 16px;
    color: ${theme.colors.gold};
  }
`

const IconButton = styled.button`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  border: none;
  background: transparent;
  color: ${theme.colors.slate[500]};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: ${theme.transitions.fast};

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.05);
    color: ${theme.colors.slate[300]};
  }
`

const CriteriaBox = styled.div`
  padding: 0.5rem 0.75rem;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 0.75rem;
  display: grid;
  gap: 2px;

  span {
    font-size: 10px;
    color: ${theme.colors.slate[500]};
  }

  strong {
    font-size: 12px;
    color: ${theme.colors.slate[300]};
  }
`

const SuccessState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0;

  strong {
    font-size: 0.875rem;
    color: ${theme.colors.emerald};
  }

  span {
    font-size: 10px;
    color: ${theme.colors.slate[500]};
  }
`

const SuccessIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.full};
  background: rgba(34, 197, 94, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 20px;
    height: 20px;
    color: ${theme.colors.emerald};
  }
`

const Form = styled.form`
  display: grid;
  gap: 0.625rem;
`

const Field = styled.label`
  position: relative;
  display: flex;
  align-items: center;

  svg {
    position: absolute;
    right: 0.75rem;
    width: 14px;
    height: 14px;
    color: ${theme.colors.slate[500]};
    pointer-events: none;
  }
`

const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2.25rem;
  border-radius: ${theme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: ${theme.colors.slate[200]};
  font-size: 12px;

  &:focus {
    outline: none;
    border-color: rgba(200, 148, 42, 0.4);
  }
`

const SelectField = styled.div`
  position: relative;

  select {
    width: 100%;
    appearance: none;
    padding: 0.5rem 2.25rem 0.5rem 0.75rem;
    border-radius: ${theme.radii.md};
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: ${theme.colors.slate[200]};
    font-size: 12px;
  }

  svg {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: ${theme.colors.slate[500]};
    pointer-events: none;
  }
`

const ErrorText = styled.div`
  font-size: 11px;
  color: #f87171;
  padding: 0 0.25rem;
`

const SubmitButton = styled.button`
  width: 100%;
  border: none;
  border-radius: ${theme.radii.md};
  padding: 0.5rem 0.75rem;
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.navy};
  background: ${theme.gradients.gold};
  transition: ${theme.transitions.normal};
  display: inline-flex;
  align-items: center;
  justify-content: center;

  span {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  svg {
    width: 14px;
    height: 14px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border-radius: ${theme.radii.full};
  border: 2px solid rgba(10, 22, 40, 0.3);
  border-top-color: ${theme.colors.navy};
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

const TextButton = styled.button`
  width: 100%;
  border: none;
  background: transparent;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  padding: 0.25rem 0;
  transition: ${theme.transitions.fast};

  &:hover,
  &:focus-visible {
    color: #f87171;
  }
`

const Footnote = styled.p`
  margin: 0;
  text-align: center;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`
