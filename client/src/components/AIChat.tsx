import { useState, useEffect, useRef, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  MessageCircle,
  X,
  Sparkles,
  Send,
  Zap,
  TrendingUp,
  Shield,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'
import { sendChatMessage } from '../api/chat'
import { aiChatMessages, defaultChatMessages } from '../data/mockData'
import { theme, media } from '../styles/theme'
import type { Plot } from '../types'

interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
}

interface Suggestion {
  icon: LucideIcon
  text: string
}

interface AIChatProps {
  isOpen: boolean
  onToggle: () => void
  selectedPlot?: Plot | null
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
`

const typingDot = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40% { transform: translateY(-4px); opacity: 1; }
`

const FabButton = styled.button`
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: ${theme.radii.full};
  background: ${theme.gradients.gold};
  border: none;
  color: ${theme.colors.navy};
  box-shadow: 0 10px 25px rgba(200, 148, 42, 0.25);
  transition: transform ${theme.transitions.normal}, box-shadow ${theme.transitions.normal};

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 14px 35px rgba(200, 148, 42, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }

  ${media.sm} {
    right: 24px;
    bottom: 24px;
    width: 56px;
    height: 56px;
  }
`

const NotificationDot = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.emerald};
  border: 2px solid ${theme.colors.navy};
  animation: ${fadeIn} 0.3s ease;
`

const Panel = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  background: rgba(10, 22, 40, 0.95);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: ${theme.shadows.popup};
  animation: ${scaleIn} 0.25s ease;

  ${media.sm} {
    inset: auto;
    right: 24px;
    bottom: 24px;
    width: 400px;
    max-width: calc(100vw - 3rem);
    border-radius: ${theme.radii.xl};
  }
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(270deg, rgba(200, 148, 42, 0.2), rgba(229, 185, 78, 0.1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  border-top-left-radius: ${theme.radii.xl};
  border-top-right-radius: ${theme.radii.xl};
`

const HeaderTitle = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.goldBright};
  line-height: 1.1;
`

const HeaderSub = styled.span`
  display: block;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const HeaderIconWrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const OfflineDot = styled.span`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.amber};
`

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${theme.radii.md};
  background: transparent;
  border: none;
  color: ${theme.colors.slate[400]};
  transition: background ${theme.transitions.fast}, color ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${theme.colors.slate[200]};
  }
`

const Messages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 24px;
  opacity: 0.6;
`

const MessageRow = styled.div<{ $fromUser?: boolean; $delay?: number }>`
  display: flex;
  gap: 10px;
  flex-direction: ${({ $fromUser }) => ($fromUser ? 'row-reverse' : 'row')};
  animation: ${fadeInUp} 0.25s ease;
  animation-delay: ${({ $delay }) => ($delay ? `${$delay}s` : '0s')};
  animation-fill-mode: both;
`

const Avatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  background: rgba(200, 148, 42, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
`

const Bubble = styled.div<{ $fromUser?: boolean }>`
  max-width: 82%;
  padding: 12px 16px;
  border-radius: ${theme.radii.lg};
  font-size: 13px;
  line-height: 1.5;
  color: ${({ $fromUser }) => ($fromUser ? theme.colors.slate[200] : theme.colors.slate[300])};
  background: ${({ $fromUser }) => ($fromUser ? 'rgba(200, 148, 42, 0.15)' : 'rgba(22, 42, 74, 0.6)')};
  border: 1px solid ${({ $fromUser }) => ($fromUser ? 'rgba(200, 148, 42, 0.2)' : 'rgba(255, 255, 255, 0.05)')};
`

const Strong = styled.strong`
  color: ${theme.colors.slate[100]};
  font-weight: 600;
`

const TypingWrap = styled.div`
  border-radius: ${theme.radii.lg};
  background: rgba(22, 42, 74, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 16px;
  animation: ${fadeIn} 0.2s ease;
`

const TypingDots = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`

const Dot = styled.span<{ $delay: number }>`
  width: 6px;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.slate[200]};
  animation: ${typingDot} 1.1s ease infinite;
  animation-delay: ${({ $delay }) => `${$delay}s`};
`

const Suggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  animation: ${fadeIn} 0.2s ease;
`

const SuggestionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: ${theme.radii.lg};
  background: rgba(200, 148, 42, 0.08);
  border: 1px solid rgba(200, 148, 42, 0.15);
  color: rgba(229, 185, 78, 0.8);
  font-size: 11px;
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(200, 148, 42, 0.15);
    color: ${theme.colors.gold};
    border-color: rgba(200, 148, 42, 0.3);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const Footer = styled.div`
  padding: 8px 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
`

const InputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: ${theme.radii.lg};
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 8px 12px;
  transition: border-color ${theme.transitions.fast};

  &:focus-within {
    border-color: rgba(200, 148, 42, 0.3);
  }
`

const Input = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${theme.colors.slate[200]};
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${theme.colors.slate[500]};
  }

  &:disabled {
    opacity: 0.5;
  }
`

const SendButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.md};
  background: rgba(200, 148, 42, 0.2);
  border: none;
  transition: ${theme.transitions.normal};
  flex-shrink: 0;

  &:hover {
    background: rgba(200, 148, 42, 0.3);
  }

  &:active {
    transform: scale(0.9);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
`

const FooterNote = styled.p`
  margin-top: 6px;
  text-align: center;
  font-size: 10px;
  color: ${theme.colors.slate[600]};
`

function TypingIndicator() {
  return (
    <TypingWrap>
      <TypingDots>
        <Dot $delay={0} />
        <Dot $delay={0.15} />
        <Dot $delay={0.3} />
      </TypingDots>
    </TypingWrap>
  )
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.*?\*\*|\n)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part === '\n') return <br key={i} />
        if (part.startsWith('**') && part.endsWith('**')) {
          return <Strong key={i}>{part.slice(2, -2)}</Strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

const defaultSuggestions: Suggestion[] = [
  { icon: TrendingUp, text: 'מה פוטנציאל התשואה?' },
  { icon: Shield, text: 'מה הסיכונים?' },
  { icon: HelpCircle, text: 'למי זה מתאים?' },
]

const plotSuggestions: Suggestion[] = [
  { icon: TrendingUp, text: 'ניתוח תשואה' },
  { icon: Shield, text: 'סיכונים ויתרונות' },
  { icon: Zap, text: 'לוח זמנים צפוי' },
  { icon: HelpCircle, text: 'השוואה לחלקות אחרות' },
]

function getSessionKey() {
  let key = sessionStorage.getItem('chat_session_key')
  if (!key) {
    key = crypto.randomUUID()
    sessionStorage.setItem('chat_session_key', key)
  }
  return key
}

export default function AIChat({ isOpen, onToggle, selectedPlot }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const prevPlotIdRef = useRef<string | number | null>(null)
  const sessionKey = useRef<string>(getSessionKey())

  const suggestions = selectedPlot ? plotSuggestions : defaultSuggestions
  const showSuggestions = messages.length <= 1 && !isTyping

  const getMockMessages = useCallback((plotId: string | number | null) => {
    return plotId ? (aiChatMessages as Record<string, ChatMessage[]>)[plotId] || defaultChatMessages : defaultChatMessages
  }, [])

  useEffect(() => {
    const plotId = selectedPlot?.id ?? null
    if (plotId !== prevPlotIdRef.current) {
      prevPlotIdRef.current = plotId
      setMessages([])
      if (plotId && isOpen) {
        sendInitialMessage(plotId)
      }
    }
  }, [selectedPlot, isOpen])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendInitialMessage(selectedPlot?.id ?? null)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const sendInitialMessage = useCallback(async (plotId: string | number | null) => {
    setIsTyping(true)
    try {
      const res = await sendChatMessage(sessionKey.current, plotId, '__init__')
      setMessages([{ role: 'assistant', content: res.reply }])
      setIsOffline(false)
    } catch {
      setIsOffline(true)
      const mockMsgs = getMockMessages(plotId)
      await new Promise((r) => setTimeout(r, 500))
      setMessages(mockMsgs.slice(0, 1))
    } finally {
      setIsTyping(false)
    }
  }, [getMockMessages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const handleSend = async (text?: string) => {
    const messageText = (text || input).trim()
    if (!messageText || isSending) return

    const plotId = selectedPlot?.id ?? null
    setMessages((prev) => [...prev, { role: 'user', content: messageText }])
    setInput('')
    setIsSending(true)
    setIsTyping(true)

    try {
      const res = await sendChatMessage(sessionKey.current, plotId, messageText)
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
      setIsOffline(false)
    } catch {
      setIsOffline(true)
      const mockMsgs = getMockMessages(plotId)
      const usedCount = messages.filter((m) => m.role === 'assistant').length
      const nextMsg = mockMsgs[Math.min(usedCount, mockMsgs.length - 1)]
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))
      setMessages((prev) => [
        ...prev,
        nextMsg || {
          role: 'assistant',
          content: 'מצטער, אין לי מידע נוסף כרגע. נסה לשאול שאלה אחרת.',
        },
      ])
    } finally {
      setIsSending(false)
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const blockNumber = selectedPlot?.block_number ?? selectedPlot?.blockNumber
  const headerText = selectedPlot ? `מנתח חלקה ${selectedPlot.number}...` : 'יועץ השקעות AI'

  if (!isOpen) {
    return (
      <FabButton onClick={onToggle} aria-label="פתח יועץ AI">
        <MessageCircle size={24} />
        {selectedPlot && <NotificationDot />}
      </FabButton>
    )
  }

  return (
    <Panel
      style={{
        height: typeof window !== 'undefined' && window.innerWidth < 640 ? '100dvh' : 520,
      }}
      dir="rtl"
    >
      <Header>
        <HeaderLeft>
          <HeaderIconWrap>
            <Sparkles size={20} color={theme.colors.goldBright} />
            {isOffline && <OfflineDot title="מצב לא מקוון" />}
          </HeaderIconWrap>
          <div>
            <HeaderTitle>{headerText}</HeaderTitle>
            <HeaderSub>
              {selectedPlot
                ? `גוש ${blockNumber} | ${selectedPlot.city}`
                : isOffline
                  ? 'מצב לא מקוון'
                  : 'מנוע AI פעיל'}
            </HeaderSub>
          </div>
        </HeaderLeft>
        <IconButton onClick={onToggle} aria-label="סגור צ׳אט">
          <X size={16} />
        </IconButton>
      </Header>

      <Messages ref={scrollRef}>
        {messages.length === 0 && !isTyping && (
          <EmptyState>
            <Sparkles size={40} color="rgba(200, 148, 42, 0.3)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 13, color: theme.colors.slate[500] }}>
              {selectedPlot ? 'מנתח את החלקה...' : 'בחרו חלקה במפה לקבלת ניתוח מפורט'}
            </p>
          </EmptyState>
        )}

        {messages.map((msg, i) => (
          <MessageRow
            key={`${msg.role}-${i}`}
            $fromUser={msg.role === 'user'}
            $delay={Math.min(i * 0.05, 0.3)}
          >
            {msg.role === 'assistant' && (
              <Avatar>
                <Sparkles size={14} color={theme.colors.gold} />
              </Avatar>
            )}
            <Bubble $fromUser={msg.role === 'user'}>
              <RichText text={msg.content} />
            </Bubble>
          </MessageRow>
        ))}

        {isTyping && (
          <MessageRow>
            <Avatar>
              <Sparkles size={14} color={theme.colors.gold} />
            </Avatar>
            <TypingIndicator />
          </MessageRow>
        )}

        {showSuggestions && (
          <Suggestions>
            {suggestions.map((s, i) => (
              <SuggestionButton key={`${s.text}-${i}`} onClick={() => handleSend(s.text)} disabled={isSending}>
                <s.icon size={12} />
                {s.text}
              </SuggestionButton>
            ))}
          </Suggestions>
        )}
      </Messages>

      <Footer
        style={{
          paddingBottom:
            typeof window !== 'undefined' && window.innerWidth < 640
              ? 'calc(12px + env(safe-area-inset-bottom, 0px))'
              : undefined,
        }}
      >
        <InputWrap>
          <Input
            ref={inputRef}
            type="text"
            placeholder="שאל את היועץ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            style={{ fontSize: 16 }}
          />
          <SendButton onClick={() => handleSend()} disabled={isSending || !input.trim()} aria-label="שלח">
            <Send size={16} color={theme.colors.gold} />
          </SendButton>
        </InputWrap>
        <FooterNote>
          {isOffline ? '⚡ מצב לא מקוון — תשובות מוכנות מראש' : 'AI יועץ השקעות — מידע כללי בלבד'}
        </FooterNote>
      </Footer>
    </Panel>
  )
}
