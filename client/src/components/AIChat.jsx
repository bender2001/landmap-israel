import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MessageCircle, X, Sparkles, Send, Zap, TrendingUp, Shield, HelpCircle } from 'lucide-react'
import { sendChatMessage } from '../api/chat.js'
import { aiChatMessages, defaultChatMessages } from '../data/mockData.js'

function TypingIndicator() {
  return (
    <div className="rounded-xl bg-navy-light/60 border border-white/5 px-4 py-3 animate-fade-in">
      <div className="typing-indicator">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

// Simple markdown-like rendering (bold, line breaks)
function RichText({ text }) {
  const parts = text.split(/(\*\*.*?\*\*|\n)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part === '\n') return <br key={i} />
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="text-slate-100 font-semibold">{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

// Quick suggestion chips
const defaultSuggestions = [
  { icon: TrendingUp, text: 'מה פוטנציאל התשואה?' },
  { icon: Shield, text: 'מה הסיכונים?' },
  { icon: HelpCircle, text: 'למי זה מתאים?' },
]

const plotSuggestions = [
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

export default function AIChat({ isOpen, onToggle, selectedPlot }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const prevPlotIdRef = useRef(null)
  const sessionKey = useRef(getSessionKey())

  const suggestions = selectedPlot ? plotSuggestions : defaultSuggestions
  const showSuggestions = messages.length <= 1 && !isTyping

  // Get offline mock messages for current plot
  const getMockMessages = useCallback((plotId) => {
    return plotId
      ? (aiChatMessages[plotId] || defaultChatMessages)
      : defaultChatMessages
  }, [])

  // Simulate typing delay for offline messages
  const typeOfflineMessages = useCallback(async (msgs) => {
    setIsTyping(true)
    // Type first message with delay
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
    setIsTyping(false)
    // Show first 2 messages
    const toShow = msgs.slice(0, 2)
    setMessages(toShow)
  }, [])

  // Reset messages when plot changes
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

  // Send initial analysis when chat opens with a selected plot
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendInitialMessage(selectedPlot?.id ?? null)
    }
  }, [isOpen])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const sendInitialMessage = useCallback(async (plotId) => {
    setIsTyping(true)
    try {
      const res = await sendChatMessage(sessionKey.current, plotId, '__init__')
      setMessages([{ role: 'assistant', content: res.reply }])
      setIsOffline(false)
    } catch {
      // Offline fallback: use mock messages
      setIsOffline(true)
      const mockMsgs = getMockMessages(plotId)
      await new Promise(r => setTimeout(r, 500))
      setMessages(mockMsgs.slice(0, 1))
    } finally {
      setIsTyping(false)
    }
  }, [getMockMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isTyping])

  const handleSend = async (text) => {
    text = (text || input).trim()
    if (!text || isSending) return

    const plotId = selectedPlot?.id ?? null
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setIsSending(true)
    setIsTyping(true)

    try {
      const res = await sendChatMessage(sessionKey.current, plotId, text)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
      setIsOffline(false)
    } catch {
      // Offline: pick next mock message
      setIsOffline(true)
      const mockMsgs = getMockMessages(plotId)
      const usedCount = messages.filter(m => m.role === 'assistant').length
      const nextMsg = mockMsgs[Math.min(usedCount, mockMsgs.length - 1)]
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600))
      setMessages(prev => [...prev, nextMsg || {
        role: 'assistant',
        content: 'מצטער, אין לי מידע נוסף כרגע. נסה לשאול שאלה אחרת.',
      }])
    } finally {
      setIsSending(false)
      setIsTyping(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const blockNumber = selectedPlot?.block_number ?? selectedPlot?.blockNumber
  const headerText = selectedPlot
    ? `מנתח חלקה ${selectedPlot.number}...`
    : 'יועץ השקעות AI'

  // ── Collapsed: floating gold button ──
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="ai-chat-fab fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-[40] flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-bright shadow-lg shadow-gold/25 hover:shadow-xl hover:shadow-gold/40 hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label="פתח יועץ AI"
      >
        <MessageCircle className="h-6 w-6 text-navy" />
        {/* Notification dot when plot selected */}
        {selectedPlot && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-navy animate-pulse" />
        )}
      </button>
    )
  }

  // ── Expanded: chat panel ──
  return (
    <div
      className="fixed z-[40] flex flex-col bg-navy/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-scale-in inset-0 sm:inset-auto sm:right-6 sm:bottom-6 sm:w-[400px] sm:max-w-[calc(100vw-3rem)] sm:rounded-2xl"
      style={{ height: typeof window !== 'undefined' && window.innerWidth < 640 ? '100dvh' : 520 }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl bg-gradient-to-l from-gold/20 to-gold-bright/10 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-gold-bright" />
            {isOffline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" title="מצב לא מקוון" />
            )}
          </div>
          <div>
            <span className="text-sm font-bold text-gold-bright block leading-tight">
              {headerText}
            </span>
            <span className="text-[10px] text-slate-400">
              {selectedPlot
                ? `גוש ${blockNumber} | ${selectedPlot.city}`
                : isOffline ? 'מצב לא מקוון' : 'מנוע AI פעיל'}
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          aria-label="סגור צ׳אט"
        >
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 opacity-60">
            <Sparkles className="w-10 h-10 text-gold/30 mb-3" />
            <p className="text-sm text-slate-400">
              {selectedPlot ? 'מנתח את החלקה...' : 'בחרו חלקה במפה לקבלת ניתוח מפורט'}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
          >
            {/* Avatar */}
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
              </div>
            )}
            {/* Message bubble */}
            <div
              className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[82%] ${
                msg.role === 'user'
                  ? 'bg-gold/15 border border-gold/20 text-slate-200'
                  : 'bg-navy-light/60 border border-white/5 text-slate-300'
              }`}
            >
              <RichText text={msg.content} />
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
            </div>
            <TypingIndicator />
          </div>
        )}

        {/* Suggestion chips */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 mt-2 animate-fade-in">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s.text)}
                disabled={isSending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/8 border border-gold/15 text-xs text-gold/80 hover:bg-gold/15 hover:text-gold hover:border-gold/30 transition-all disabled:opacity-40"
              >
                <s.icon className="w-3 h-3" />
                {s.text}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 pb-3 pt-1 flex-shrink-0 border-t border-white/5">
        <div className="flex items-center gap-2 rounded-xl bg-navy-light/40 border border-white/5 px-3 py-2 focus-within:border-gold/30 transition-colors">
          <input
            ref={inputRef}
            type="text"
            placeholder="שאל את היועץ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 hover:bg-gold/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
            aria-label="שלח"
          >
            <Send className="h-4 w-4 text-gold" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-slate-600">
          {isOffline ? '⚡ מצב לא מקוון — תשובות מוכנות מראש' : 'AI יועץ השקעות — מידע כללי בלבד'}
        </p>
      </div>
    </div>
  )
}
