import React, { useState, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { X, Phone, Mail, User, CheckCircle2 } from 'lucide-react'
import { t, sm } from '../theme'
import { useCreateLead } from '../hooks'
import { useToast, GoldButton } from './UI'
import type { Plot } from '../types'
import { p } from '../utils'

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`
const scaleIn = keyframes`from{opacity:0;transform:scale(0.92) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}`
const scaleOut = keyframes`from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(0.92) translateY(20px)}`
const drawCheck = keyframes`from{stroke-dashoffset:48}to{stroke-dashoffset:0}`
const popCircle = keyframes`0%{transform:scale(0);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}`
const confetti = keyframes`0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(-40px) rotate(180deg);opacity:0}`

/* ── Styled ── */
const Backdrop = styled.div<{ $open: boolean; $closing: boolean }>`
  position:fixed;inset:0;z-index:${t.z.modal};background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
  display:${p => p.$open ? 'flex' : 'none'};align-items:center;justify-content:center;padding:16px;
  animation:${fadeIn} 0.25s ease-out;
`
const Card = styled.div<{ $closing: boolean }>`
  position:relative;width:100%;max-width:420px;background:${t.surface};border:1px solid ${t.border};
  border-radius:${t.r.xl};box-shadow:${t.sh.xl};overflow:hidden;direction:rtl;
  animation:${p => p.$closing ? scaleOut : scaleIn} ${p => p.$closing ? '0.2s' : '0.35s'} cubic-bezier(0.32,0.72,0,1) forwards;
`
const GoldBar = styled.div`height:3px;background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);`
const Header = styled.div`display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;`
const Title = styled.h2`font-size:18px;font-weight:800;color:${t.text};margin:0;`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:${t.r.sm};
  background:none;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
const Subtitle = styled.p`font-size:13px;color:${t.textSec};padding:6px 20px 0;margin:0;`
const Form = styled.form`padding:20px;display:flex;flex-direction:column;gap:16px;`
const FieldWrap = styled.div`display:flex;flex-direction:column;gap:4px;`
const Label = styled.label`font-size:12px;font-weight:600;color:${t.textSec};display:flex;align-items:center;gap:4px;`
const InputRow = styled.div<{ $error?: boolean }>`
  display:flex;align-items:center;gap:8px;padding:10px 12px;
  background:${t.surfaceLight};border:1px solid ${p => p.$error ? t.err : t.border};border-radius:${t.r.md};
  transition:border ${t.tr};&:focus-within{border-color:${p => p.$error ? t.err : t.gold};}
`
const Input = styled.input`
  flex:1;background:none;border:none;outline:none;font-size:14px;font-family:${t.font};
  color:${t.text};direction:rtl;
  &::placeholder{color:${t.textDim};}
`
const Error = styled.span`font-size:11px;color:${t.err};font-weight:500;min-height:15px;`
const Optional = styled.span`font-size:10px;color:${t.textDim};font-weight:400;`

/* ── Success ── */
const SuccessWrap = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;gap:16px;text-align:center;
`
const CheckCircle = styled.div`
  width:72px;height:72px;border-radius:50%;background:${t.ok}20;
  display:flex;align-items:center;justify-content:center;animation:${popCircle} 0.5s cubic-bezier(0.32,0.72,0,1);
`
const CheckSvg = styled.svg`animation:${drawCheck} 0.4s 0.3s ease-out both;`
const SuccessTitle = styled.h3`font-size:20px;font-weight:800;color:${t.text};margin:0;`
const SuccessText = styled.p`font-size:14px;color:${t.textSec};margin:0;line-height:1.6;`
const Sparkle = styled.span<{ $i: number }>`
  position:absolute;font-size:14px;animation:${confetti} 0.8s ${p => p.$i * 0.1}s ease-out both;
  top:${p => 30 + p.$i * 5}%;left:${p => 20 + p.$i * 12}%;
`

/* ── Validation ── */
const PHONE_RE = /^0[2-9]\d{7,8}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type Errors = { name?: string; phone?: string; email?: string }

function validate(name: string, phone: string, email: string): Errors {
  const e: Errors = {}
  if (!name.trim()) e.name = 'נא להזין שם'
  if (!phone.trim()) e.phone = 'נא להזין טלפון'
  else if (!PHONE_RE.test(phone.replace(/[-\s]/g, ''))) e.phone = 'מספר טלפון לא תקין'
  if (email && !EMAIL_RE.test(email)) e.email = 'אימייל לא תקין'
  return e
}

/* ── Component ── */
interface Props { plot: Plot | null; open: boolean; onClose: () => void }

export default function LeadModal({ plot, open, onClose }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [success, setSuccess] = useState(false)
  const [closing, setClosing] = useState(false)
  const { toast } = useToast()
  const mutation = useCreateLead()

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(() => { setClosing(false); setSuccess(false); setName(''); setPhone(''); setEmail(''); setErrors({}); onClose() }, 220)
  }, [onClose])

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(name, phone, email)
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await mutation.mutateAsync({ plot_id: plot?.id || '', name, phone: phone.replace(/[-\s]/g, ''), email: email || undefined })
      setSuccess(true)
    } catch {
      toast('שגיאה בשליחת הטופס, נסה שוב', 'error')
    }
  }, [name, phone, email, plot, mutation, toast])

  if (!open && !closing) return null
  const d = plot ? p(plot) : null

  return (
    <Backdrop $open={open || closing} $closing={closing} onClick={close}>
      <Card $closing={closing} onClick={e => e.stopPropagation()}>
        <GoldBar />
        {success ? (
          <SuccessWrap>
            {['✨', '🎉', '⭐', '💫'].map((s, i) => <Sparkle key={i} $i={i}>{s}</Sparkle>)}
            <CheckCircle>
              <CheckSvg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={t.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" strokeDasharray="48" strokeDashoffset="0" />
              </CheckSvg>
            </CheckCircle>
            <SuccessTitle>הפרטים נשלחו בהצלחה!</SuccessTitle>
            <SuccessText>נציג יצור איתך קשר בהקדם לגבי חלקה {plot?.number} ב{plot?.city}.</SuccessText>
            <GoldButton onClick={close} style={{ marginTop: 8, width: '100%' }}>סגור</GoldButton>
          </SuccessWrap>
        ) : (
          <>
            <Header>
              <Title>קבלת פרטים</Title>
              <CloseBtn onClick={close}><X size={16} /></CloseBtn>
            </Header>
            <Subtitle>חלקה {plot?.number} · {plot?.city}{d ? ` · ${(d.price / 1e6).toFixed(1)}M ₪` : ''}</Subtitle>

            <Form onSubmit={submit}>
              <FieldWrap>
                <Label><User size={13} />שם מלא</Label>
                <InputRow $error={!!errors.name}>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="ישראל ישראלי" autoFocus />
                </InputRow>
                <Error>{errors.name || ''}</Error>
              </FieldWrap>

              <FieldWrap>
                <Label><Phone size={13} />טלפון</Label>
                <InputRow $error={!!errors.phone}>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" type="tel" dir="ltr" style={{ textAlign: 'left' }} />
                </InputRow>
                <Error>{errors.phone || ''}</Error>
              </FieldWrap>

              <FieldWrap>
                <Label><Mail size={13} />אימייל <Optional>(אופציונלי)</Optional></Label>
                <InputRow $error={!!errors.email}>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" dir="ltr" style={{ textAlign: 'left' }} />
                </InputRow>
                <Error>{errors.email || ''}</Error>
              </FieldWrap>

              <GoldButton type="submit" disabled={mutation.isPending} style={{ width: '100%', marginTop: 4 }}>
                {mutation.isPending ? 'שולח...' : <><Phone size={16} />שלח פרטים</>}
              </GoldButton>
            </Form>
          </>
        )}
      </Card>
    </Backdrop>
  )
}
