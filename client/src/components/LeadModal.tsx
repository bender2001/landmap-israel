import { useState, useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import { X, User, Phone, Mail, Lock } from 'lucide-react'
import { useCreateLead } from '../hooks/useLeads'
import { useToast } from './ui/ToastContainer'
import { theme, media } from '../styles/theme'
import type { Plot } from '../types'

const phoneRegex = /^0[2-9]\d{7,8}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Phase = 'hidden' | 'entering' | 'open' | 'leaving'

interface LeadModalProps {
  isOpen: boolean
  onClose: () => void
  plot?: Plot | null
}

interface FormData {
  name: string
  phone: string
  email: string
}

type FormErrors = Partial<Record<keyof FormData | 'form', string>>

const drawCheck = keyframes`
  to { stroke-dashoffset: 0; }
`

const Backdrop = styled.div<{ $phase: Phase }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  z-index: ${theme.zIndex.modal};
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: ${({ $phase }) => ($phase === 'entering' || $phase === 'leaving' ? 0 : 1)};
  transition: opacity 0.3s ease;

  ${media.sm} {
    align-items: center;
  }
`

const ModalCard = styled.div<{ $phase: Phase }>`
  width: 100%;
  margin: 0;
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.popup};
  overflow: hidden;
  transform: ${({ $phase }) =>
    $phase === 'entering'
      ? 'translateY(40px) scale(0.92)'
      : $phase === 'leaving'
        ? 'translateY(60px) scale(0.92)'
        : 'translateY(0) scale(1)'};
  opacity: ${({ $phase }) => ($phase === 'entering' || $phase === 'leaving' ? 0 : 1)};
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;

  ${media.sm} {
    max-width: 480px;
    margin: 0 16px;
  }
`

const GoldBar = styled.div`
  height: 3px;
  background: linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A);
`

const Header = styled.div`
  position: relative;
  padding: 20px 20px 12px;
  user-select: none;

  ${media.sm} {
    padding: 24px 24px 16px;
  }
`

const Title = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
  margin: 0;

  ${media.sm} {
    font-size: 22px;
  }
`

const SubTitle = styled.p`
  margin: 4px 0 0;
  font-size: 14px;
  color: ${theme.colors.slate[400]};
`

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: ${theme.transitions.fast};

  ${media.sm} {
    width: 32px;
    height: 32px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`

const Form = styled.form`
  padding: 8px 20px 20px;

  ${media.sm} {
    padding: 8px 24px 24px;
  }
`

const FormError = styled.p`
  margin: 0 0 12px;
  text-align: center;
  color: ${theme.colors.red};
  font-size: 14px;
`

const Field = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  font-size: 12px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 6px;
`

const InputWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`

const Input = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px;
  border-radius: ${theme.radii.lg};
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${theme.colors.slate[200]};
  font-size: 14px;
  transition: ${theme.transitions.fast};

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:focus {
    outline: none;
    border-color: rgba(200, 148, 42, 0.5);
  }
`

const IconWrap = styled.span`
  position: absolute;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`

const ErrorText = styled.p`
  margin: 6px 0 0;
  color: ${theme.colors.red};
  font-size: 12px;
`

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px 0;
  margin-top: 8px;
  border-radius: ${theme.radii.lg};
  background: ${theme.gradients.gold};
  color: ${theme.colors.navy};
  font-size: 16px;
  font-weight: 700;
  border: none;
  transition: ${theme.transitions.normal};

  &:disabled {
    opacity: 0.6;
  }

  &:hover {
    box-shadow: 0 12px 24px rgba(200, 148, 42, 0.3);
  }
`

const Trust = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 12px;
  color: ${theme.colors.slate[400]};
`

const SuccessWrap = styled.div`
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
`

const SuccessTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${theme.colors.emerald};
`

const SuccessText = styled.div`
  font-size: 14px;
  color: ${theme.colors.slate[400]};
`

const Honeypot = styled.div`
  position: absolute;
  left: -9999px;
  top: -9999px;
  opacity: 0;
  height: 0;
  width: 0;
  overflow: hidden;
`

const CheckCircle = styled.circle`
  stroke-dasharray: 157;
  stroke-dashoffset: 157;
  animation: ${drawCheck} 0.8s ease forwards;
`

const CheckPath = styled.path`
  stroke-dasharray: 50;
  stroke-dashoffset: 50;
  animation: ${drawCheck} 0.8s ease forwards;
  animation-delay: 0.1s;
`

export default function LeadModal({ isOpen, onClose, plot }: LeadModalProps) {
  const [formData, setFormData] = useState<FormData>({ name: '', phone: '', email: '' })
  const [isSuccess, setIsSuccess] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const createLead = useCreateLead()
  const { toast } = useToast()
  const honeypotRef = useRef<HTMLInputElement | null>(null)
  const [phase, setPhase] = useState<Phase>('hidden')

  useEffect(() => {
    if (isOpen && phase === 'hidden') {
      setPhase('entering')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('open')
        })
      })
    } else if (!isOpen && (phase === 'open' || phase === 'entering')) {
      setPhase('leaving')
    }
  }, [isOpen])

  useEffect(() => {
    if (phase === 'leaving') {
      const t = setTimeout(() => setPhase('hidden'), 300)
      return () => clearTimeout(t)
    }
  }, [phase])

  const handleClose = () => {
    setPhase('leaving')
    setTimeout(() => {
      onClose()
    }, 300)
  }

  if (phase === 'hidden') return null

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validate = () => {
    const newErrors: FormErrors = {}
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'נא להזין שם מלא (לפחות 2 תווים)'
    }
    if (!formData.phone || !phoneRegex.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = 'נא להזין מספר טלפון ישראלי תקין'
    }
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = 'נא להזין כתובת אימייל תקינה'
    }
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    try {
      await createLead.mutateAsync({
        plot_id: plot?.id,
        name: formData.name.trim(),
        phone: formData.phone.replace(/-/g, ''),
        email: formData.email.trim(),
        website: honeypotRef.current?.value || '',
      })
      setIsSuccess(true)
      toast('הפרטים נשלחו בהצלחה!', 'success')
      setTimeout(() => {
        setIsSuccess(false)
        setFormData({ name: '', phone: '', email: '' })
        setErrors({})
        createLead.reset()
        onClose()
      }, 2000)
    } catch {
      toast('שגיאה בשליחת הפרטים', 'error')
      setErrors({ form: 'אירעה שגיאה בשליחת הפרטים. נסה שוב.' })
    }
  }

  const blockNumber = plot?.block_number ?? plot?.blockNumber

  return (
    <Backdrop $phase={phase} onClick={handleClose}>
      <ModalCard
        $phase={phase}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <GoldBar />

        {isSuccess ? (
          <SuccessWrap>
            <svg width="80" height="80" viewBox="0 0 52 52">
              <CheckCircle cx="26" cy="26" r="25" fill="none" stroke={theme.colors.emerald} strokeWidth="2" />
              <CheckPath
                fill="none"
                stroke={theme.colors.emerald}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
            <SuccessTitle>הפרטים נשלחו בהצלחה!</SuccessTitle>
            <SuccessText>ניצור אתך קשר בהקדם</SuccessText>
          </SuccessWrap>
        ) : (
          <>
            <Header>
              <Title>צור קשר</Title>
              {plot && (
                <SubTitle>גוש {blockNumber} | חלקה {plot.number}</SubTitle>
              )}
              <CloseButton onClick={handleClose} aria-label="סגור">
                <X size={16} color={theme.colors.slate[400]} />
              </CloseButton>
            </Header>

            <Form onSubmit={handleSubmit}>
              {errors.form && <FormError>{errors.form}</FormError>}

              <Honeypot aria-hidden="true">
                <label htmlFor="lead-website">Website</label>
                <input ref={honeypotRef} id="lead-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
              </Honeypot>

              <Field>
                <Label htmlFor="lead-name">שם מלא</Label>
                <InputWrap>
                  <IconWrap>
                    <User size={16} color={theme.colors.slate[400]} />
                  </IconWrap>
                  <Input
                    id="lead-name"
                    type="text"
                    autoComplete="name"
                    aria-required="true"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'lead-name-error' : undefined}
                    placeholder="הכנס שם מלא"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                </InputWrap>
                {errors.name && <ErrorText id="lead-name-error" role="alert">{errors.name}</ErrorText>}
              </Field>

              <Field>
                <Label htmlFor="lead-phone">טלפון</Label>
                <InputWrap>
                  <IconWrap>
                    <Phone size={16} color={theme.colors.slate[400]} />
                  </IconWrap>
                  <Input
                    id="lead-phone"
                    type="tel"
                    autoComplete="tel"
                    aria-required="true"
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'lead-phone-error' : undefined}
                    placeholder="050-0000000"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    style={{ textAlign: 'right' }}
                  />
                </InputWrap>
                {errors.phone && <ErrorText id="lead-phone-error" role="alert">{errors.phone}</ErrorText>}
              </Field>

              <Field>
                <Label htmlFor="lead-email">אימייל</Label>
                <InputWrap>
                  <IconWrap>
                    <Mail size={16} color={theme.colors.slate[400]} />
                  </IconWrap>
                  <Input
                    id="lead-email"
                    type="email"
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'lead-email-error' : undefined}
                    placeholder="email@example.com"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    style={{ textAlign: 'right' }}
                  />
                </InputWrap>
                {errors.email && <ErrorText id="lead-email-error" role="alert">{errors.email}</ErrorText>}
              </Field>

              <SubmitButton type="submit" disabled={createLead.isPending}>
                {createLead.isPending ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity={0.25} />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity={0.75} />
                    </svg>
                    שולח...
                  </span>
                ) : (
                  'שלח פרטים'
                )}
              </SubmitButton>

              <Trust>
                <Lock size={14} color={theme.colors.emerald} />
                <span>המידע שלך מאובטח</span>
              </Trust>
            </Form>
          </>
        )}
      </ModalCard>
    </Backdrop>
  )
}
