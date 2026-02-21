import { useState, useRef, useEffect, useCallback, memo } from 'react'
import styled, { keyframes } from 'styled-components'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { t, mobile, fadeInUp } from '../theme'
import { chatMessages, defaultChat } from '../data'
import type { ChatMessage } from '../types'

/* ── animations ── */
const bubbleIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`
const fabPop = keyframes`from{transform:scale(0)}to{transform:scale(1)}`

/* ── styled ── */
const Fab = styled.button`
  position:fixed;bottom:24px;right:24px;z-index:${t.z.controls};width:48px;height:48px;border-radius:${t.r.lg};
  background:linear-gradient(135deg,${t.gold},${t.goldBright});border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;color:${t.bg};
  box-shadow:${t.sh.lg},${t.sh.glow};transition:all ${t.tr};animation:${fabPop} 0.3s ease-out;
  &:hover{transform:translateY(-2px);box-shadow:${t.sh.xl},0 0 32px rgba(212,168,75,0.35);}
  &:active{transform:translateY(0);}
  ${mobile}{bottom:140px;right:14px;width:44px;height:44px;}
`

const Panel = styled.div<{$open:boolean}>`
  position:fixed;bottom:84px;right:24px;z-index:${t.z.controls};width:360px;max-height:520px;
  background:${t.surface};border:1px solid ${t.goldBorder};border-radius:${t.r.lg};
  box-shadow:${t.sh.xl};display:${p=>p.$open?'flex':'none'};flex-direction:column;overflow:hidden;
  animation:${fadeInUp} 0.3s ease-out;
  ${mobile}{position:fixed;inset:0;width:100%;max-height:100%;border-radius:0;border:none;}
`

const Header = styled.div`
  display:flex;align-items:center;gap:10px;padding:14px 16px;
  background:linear-gradient(135deg,rgba(212,168,75,0.08),transparent);
  border-bottom:1px solid ${t.border};flex-shrink:0;
`
const Avatar = styled.div`
  width:36px;height:36px;border-radius:50%;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});
  display:flex;align-items:center;justify-content:center;color:${t.bg};flex-shrink:0;
`
const HeaderTitle = styled.div`flex:1;`
const Name = styled.div`font-size:14px;font-weight:700;color:${t.text};font-family:${t.font};`
const Status = styled.div`font-size:11px;color:${t.ok};display:flex;align-items:center;gap:4px;
  &::before{content:'';width:6px;height:6px;border-radius:50%;background:${t.ok};display:inline-block;}
`
const CloseBtn = styled.button`
  background:none;border:none;color:${t.textSec};cursor:pointer;padding:4px;
  border-radius:${t.r.sm};transition:all ${t.tr};
  &:hover{color:${t.text};background:${t.hover};}
`

const Messages = styled.div`
  flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;
  direction:rtl;
`
const Bubble = styled.div<{$user:boolean;$delay:number}>`
  max-width:82%;padding:10px 14px;font-size:13px;line-height:1.6;font-family:${t.font};
  border-radius:${p=>p.$user?`${t.r.lg} ${t.r.sm} ${t.r.lg} ${t.r.lg}`:`${t.r.sm} ${t.r.lg} ${t.r.lg} ${t.r.lg}`};
  align-self:${p=>p.$user?'flex-start':'flex-end'};
  background:${p=>p.$user?'linear-gradient(135deg,rgba(212,168,75,0.15),rgba(212,168,75,0.08))':t.surfaceLight};
  color:${p=>p.$user?t.goldBright:t.text};
  border:1px solid ${p=>p.$user?t.goldBorder:t.border};
  animation:${bubbleIn} 0.3s ease-out both;animation-delay:${p=>p.$delay}s;
`
const TypingDots = styled.div`
  display:flex;gap:4px;padding:10px 14px;align-self:flex-end;
  background:${t.surfaceLight};border-radius:${t.r.sm} ${t.r.lg} ${t.r.lg} ${t.r.lg};
  border:1px solid ${t.border};animation:${bubbleIn} 0.2s ease-out;
`
const Dot = styled.span<{$i:number}>`
  width:6px;height:6px;border-radius:50%;background:${t.textSec};
  animation:dotPulse 1.2s ease-in-out infinite;animation-delay:${p=>p.$i*0.15}s;
  @keyframes dotPulse{0%,60%,100%{opacity:0.3;transform:scale(1)}30%{opacity:1;transform:scale(1.3)}}
`

const InputBar = styled.form`
  display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid ${t.border};
  background:rgba(17,24,39,0.6);flex-shrink:0;
`
const Input = styled.input`
  flex:1;background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.full};
  padding:9px 16px;font-size:13px;font-family:${t.font};color:${t.text};outline:none;
  transition:border-color ${t.tr};direction:rtl;
  &::placeholder{color:${t.textDim};}
  &:focus{border-color:${t.gold};}
`
const SendBtn = styled.button`
  width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  display:flex;align-items:center;justify-content:center;transition:all ${t.tr};flex-shrink:0;
  &:hover{box-shadow:${t.sh.glow};transform:scale(1.05);}
  &:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none;}
`

/* ── component ── */
function Chat({ plotId }: { plotId: string | null }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load messages when plotId changes or chat opens
  useEffect(() => {
    const base = plotId && chatMessages[plotId] ? chatMessages[plotId] : defaultChat
    setMsgs([...base])
  }, [plotId])

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, typing])

  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || typing) return
    setMsgs(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMsgs(prev => [
        ...prev,
        { role: 'assistant', content: 'תודה על השאלה! אני מנתח את הנתונים. לפרטים נוספים, השאירו פנייה ונחזור אליכם.' },
      ])
    }, 800)
  }, [input, typing])

  return (
    <>
      <Fab onClick={() => setOpen(p => !p)} aria-label={open ? 'סגור צ\'אט' : 'פתח צ\'אט'}>
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </Fab>

      <Panel $open={open}>
        <Header>
          <Avatar><Bot size={20} /></Avatar>
          <HeaderTitle>
            <Name>יועץ AI</Name>
            <Status>מחובר</Status>
          </HeaderTitle>
          <CloseBtn onClick={() => setOpen(false)} aria-label="סגור"><X size={18} /></CloseBtn>
        </Header>

        <Messages ref={scrollRef}>
          {msgs.map((m, i) => (
            <Bubble key={i} $user={m.role === 'user'} $delay={i * 0.05}>
              {m.content}
            </Bubble>
          ))}
          {typing && (
            <TypingDots>
              <Dot $i={0} /><Dot $i={1} /><Dot $i={2} />
            </TypingDots>
          )}
        </Messages>

        <InputBar onSubmit={handleSend}>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="שאלו על החלקה..."
            disabled={typing}
          />
          <SendBtn type="submit" disabled={!input.trim() || typing} aria-label="שלח">
            <Send size={16} />
          </SendBtn>
        </InputBar>
      </Panel>
    </>
  )
}

export default memo(Chat)
