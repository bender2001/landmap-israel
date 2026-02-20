import { useState, useRef, useEffect, memo } from 'react'
import styled, { keyframes } from 'styled-components'
import { MessageCircle, X, Send, Bot, ChevronDown } from 'lucide-react'
import { t, media } from '../theme'
import { chatMessages, defaultChat } from '../data'
import type { Plot, ChatMessage } from '../types'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`
const slideUp = keyframes`from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); }`

const Fab = styled.button<{ $open: boolean }>`
  position: fixed; bottom: 20px; left: 20px; z-index: ${t.z.sidebar};
  width: 52px; height: 52px; border-radius: 50%;
  border: 1px solid ${t.colors.goldBorder};
  background: linear-gradient(135deg, ${t.colors.gold}, ${t.colors.goldBright});
  color: ${t.colors.bg}; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: ${t.shadow.lg}, ${t.shadow.glow};
  transition: all ${t.transition};
  transform: ${({ $open }) => $open ? 'scale(0)' : 'scale(1)'};
  &:hover { transform: ${({ $open }) => $open ? 'scale(0)' : 'scale(1.08)'}; }

  ${media.mobile} { bottom: 76px; }
`

const Panel = styled.div<{ $open: boolean }>`
  position: fixed; bottom: 20px; left: 20px; z-index: ${t.z.sidebar};
  width: 360px; height: 480px;
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.xl}; box-shadow: ${t.shadow.xl};
  display: ${({ $open }) => $open ? 'flex' : 'none'};
  flex-direction: column; overflow: hidden;
  animation: ${slideUp} 0.3s ease;

  ${media.mobile} {
    left: 8px; right: 8px; bottom: 8px; width: auto;
    height: calc(100vh - 16px); border-radius: ${t.radius.lg};
  }
`

const PanelHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid ${t.colors.border};
`
const HeaderTitle = styled.div`
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700; color: ${t.colors.text};
`
const BotBadge = styled.div`
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, ${t.colors.gold}20, ${t.colors.goldBright}10);
  border: 1px solid ${t.colors.goldBorder};
  display: flex; align-items: center; justify-content: center;
`
const CloseBtn = styled.button`
  width: 28px; height: 28px; border-radius: ${t.radius.sm};
  border: none; background: ${t.colors.surfaceHover}; color: ${t.colors.textDim};
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all ${t.transition};
  &:hover { background: ${t.colors.surfaceLight}; color: ${t.colors.text}; }
`

const Messages = styled.div`
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: ${t.colors.surfaceLight}; border-radius: 2px; }
`

const Bubble = styled.div<{ $role: 'assistant' | 'user' }>`
  max-width: 85%; padding: 10px 14px;
  border-radius: ${t.radius.md};
  font-size: 13px; line-height: 1.6;
  animation: ${fadeIn} 0.3s ease;
  ${({ $role }) => $role === 'assistant' ? `
    align-self: flex-start;
    background: ${t.colors.surfaceHover};
    color: ${t.colors.text};
    border: 1px solid ${t.colors.border};
    border-bottom-right: 4px;
  ` : `
    align-self: flex-end;
    background: linear-gradient(135deg, ${t.colors.gold}20, ${t.colors.goldBright}10);
    color: ${t.colors.text};
    border: 1px solid ${t.colors.goldBorder};
  `}
`

const InputBar = styled.form`
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-top: 1px solid ${t.colors.border};
`
const ChatInput = styled.input`
  flex: 1; border: none; background: ${t.colors.surfaceHover};
  border-radius: ${t.radius.sm}; padding: 8px 12px;
  font-size: 13px; color: ${t.colors.text}; font-family: ${t.font}; outline: none;
  &::placeholder { color: ${t.colors.textDim}; }
`
const SendBtn = styled.button`
  width: 34px; height: 34px; border-radius: ${t.radius.sm}; border: none;
  background: linear-gradient(135deg, ${t.colors.gold}, ${t.colors.goldBright});
  color: ${t.colors.bg}; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all ${t.transition}; flex-shrink: 0;
  &:hover { box-shadow: ${t.shadow.glow}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`

interface ChatProps { plotId: string | null }

function Chat({ plotId }: ChatProps) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages(plotId && chatMessages[plotId] ? chatMessages[plotId] : defaultChat)
  }, [plotId])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setMessages(prev => [...prev, { role: 'user', content: input.trim() }])
    setInput('')
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'תודה על השאלה! בקרוב נשיק את הצ\'אט האינטראקטיבי המלא. בינתיים, תוכלו לקבל מידע באמצעות טופס יצירת קשר.' }])
    }, 800)
  }

  return (
    <>
      <Fab $open={open} onClick={() => setOpen(true)} aria-label="פתח צ'אט">
        <MessageCircle size={22} />
      </Fab>

      <Panel $open={open}>
        <PanelHeader>
          <HeaderTitle>
            <BotBadge><Bot size={15} color={t.colors.gold} /></BotBadge>
            יועץ השקעות AI
          </HeaderTitle>
          <CloseBtn onClick={() => setOpen(false)}><X size={16} /></CloseBtn>
        </PanelHeader>

        <Messages ref={scrollRef}>
          {messages.map((msg, i) => (
            <Bubble key={i} $role={msg.role}>{msg.content}</Bubble>
          ))}
        </Messages>

        <InputBar onSubmit={send}>
          <ChatInput value={input} onChange={e => setInput(e.target.value)} placeholder="שאל שאלה..." />
          <SendBtn type="submit" disabled={!input.trim()}><Send size={15} /></SendBtn>
        </InputBar>
      </Panel>
    </>
  )
}

export default memo(Chat)
