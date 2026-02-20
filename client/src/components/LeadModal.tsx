import { useState, useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { X, User, Phone, Mail, Check } from 'lucide-react'
import { t, media } from '../theme'
import { useCreateLead } from '../hooks'
import { useToast } from './UI'
import { GoldButton } from './UI'
import type { Plot } from '../types'
import { p } from '../utils'

const phoneRegex = /^0[2-9]\d{7,8}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const Backdrop = styled.div<{ $visible: boolean }>`
  position: fixed; inset: 0; z-index: ${t.z.modal};
  background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
  display: flex; align-items: flex-end; justify-content: center;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  pointer-events: ${({ $visible }) => $visible ? 'auto' : 'none'};
  transition: opacity 0.3s ease;
  ${media.sm} { align-items: center; }
`

const Card = styled.div<{ $visible: boolean }>`
  width: 100%; max-width: 460px; margin: 0 16px;
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.xl}; box-shadow: ${t.shadow.xl};
  overflow: hidden;
  transform: ${({ $visible }) => $visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)'};
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease;
`

const GoldBar = styled.div`
  height: 2px;
  background: linear-gradient(90deg, ${t.colors.gold}, ${t.colors.goldBright}, ${t.colors.gold});
`

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 20px 20px 8px;
`
const Title = styled.h2`font-size: 18px; font-weight: 700; color: ${t.colors.text};`
const Sub = styled.p`font-size: 12px; color: ${t.colors.textDim}; margin-top: 2px;`

const Form = styled.form`padding: 12px 20px 20px; display: flex; flex-direction: column; gap: 12px;`

const InputWrap = styled.div<{ $error?: boolean }>`
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: ${t.radius.md};
  border: 1px solid ${({ $error }) => $error ? t.colors.danger : t.colors.border};
  background: ${t.colors.surfaceHover};
  transition: border-color ${t.transition};
  &:focus-within { border-color: ${({ $error }) => $error ? t.colors.danger : t.colors.gold}; }
`
const Input = styled.input`
  flex: 1; border: none; background: none; outline: none;
  font-size: 14px; color: ${t.colors.text}; font-family: ${t.font};
  &::placeholder { color: ${t.colors.textDim}; }
`
const ErrorText = styled.span`font-size: 11px; color: ${t.colors.danger}; padding-right: 4px;`

const drawCheck = keyframes`to { stroke-dashoffset: 0; }`
const SuccessWrap = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px 20px; text-align: center;
`
const CheckCircle = styled.div`
  width: 64px; height: 64px; border-radius: 50%;
  background: ${t.colors.success}15; border: 2px solid ${t.colors.success};
  display: flex; align-items: center; justify-content: center;
`
const SuccessTitle = styled.h3`font-size: 18px; font-weight: 700; color: ${t.colors.text};`
const SuccessSub = styled.p`font-size: 13px; color: ${t.colors.textSec};`

const LockNote = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: ${t.colors.textDim}; padding: 0 4px;
`

interface LeadModalProps {
  open: boolean
  onClose: () => void
  plot?: Plot | null
}

export default function LeadModal({ open, onClose, plot }: LeadModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [visible, setVisible] = useState(false)
  const mutation = useCreateLead()
  const { toast } = useToast()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setVisible(true)
      setSuccess(false)
      setErrors({})
      setTimeout(() => nameRef.current?.focus(), 300)
    } else {
      setVisible(false)
    }
  }, [open])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'שם נדרש'
    if (!phoneRegex.test(phone.replace(/[-\s]/g, ''))) e.phone = 'מספר טלפון לא תקין'
    if (email && !emailRegex.test(email)) e.email = 'אימייל לא תקין'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !plot) return
    mutation.mutate(
      { plot_id: plot.id, name: name.trim(), phone: phone.replace(/[-\s]/g, ''), email: email || undefined },
      {
        onSuccess: () => setSuccess(true),
        onError: () => toast('שגיאה בשליחה — נסו שוב', 'error'),
      }
    )
  }

  if (!open && !visible) return null

  const d = plot ? p(plot) : null

  return (
    <Backdrop $visible={open} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <Card $visible={open}>
        <GoldBar />
        {success ? (
          <SuccessWrap>
            <CheckCircle><Check size={28} color={t.colors.success} /></CheckCircle>
            <SuccessTitle>הפרטים נשלחו בהצלחה!</SuccessTitle>
            <SuccessSub>נחזור אליך בהקדם עם מידע נוסף על החלקה.</SuccessSub>
            <GoldButton onClick={onClose} style={{ marginTop: 8 }}>סגור</GoldButton>
          </SuccessWrap>
        ) : (
          <>
            <Header>
              <div>
                <Title>קבל פרטים נוספים</Title>
                {plot && <Sub>גוש {d?.block} | חלקה {plot.number} · {plot.city}</Sub>}
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color={t.colors.textDim} />
              </button>
            </Header>
            <Form onSubmit={submit}>
              <div>
                <InputWrap $error={!!errors.name}>
                  <User size={16} color={t.colors.textDim} />
                  <Input ref={nameRef} placeholder="שם מלא" value={name} onChange={e => setName(e.target.value)} />
                </InputWrap>
                {errors.name && <ErrorText>{errors.name}</ErrorText>}
              </div>
              <div>
                <InputWrap $error={!!errors.phone}>
                  <Phone size={16} color={t.colors.textDim} />
                  <Input placeholder="טלפון" type="tel" value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
                </InputWrap>
                {errors.phone && <ErrorText>{errors.phone}</ErrorText>}
              </div>
              <div>
                <InputWrap $error={!!errors.email}>
                  <Mail size={16} color={t.colors.textDim} />
                  <Input placeholder="אימייל (אופציונלי)" type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
                </InputWrap>
                {errors.email && <ErrorText>{errors.email}</ErrorText>}
              </div>
              <LockNote>🔒 פרטיך מאובטחים ולא יועברו לצד שלישי</LockNote>
              <GoldButton type="submit" disabled={mutation.isPending} style={{ width: '100%', padding: 12 }}>
                {mutation.isPending ? 'שולח...' : 'שלח פרטים'}
              </GoldButton>
            </Form>
          </>
        )}
      </Card>
    </Backdrop>
  )
}
