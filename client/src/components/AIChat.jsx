import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Sparkles, Send } from 'lucide-react'
import { sendChatMessage } from '../api/chat.js'

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

// Generate or retrieve a persistent session key
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
  const scrollRef = useRef(null)
  const prevPlotIdRef = useRef(null)
  const sessionKey = useRef(getSessionKey())

  // Reset messages when plot changes
  useEffect(() => {
    const plotId = selectedPlot?.id ?? null
    if (plotId !== prevPlotIdRef.current) {
      prevPlotIdRef.current = plotId
      setMessages([])
      // Send initial greeting when a plot is selected
      if (plotId && isOpen) {
        sendInitialMessage(plotId)
      }
    }
  }, [selectedPlot, isOpen])

  // Send initial analysis when chat opens with a selected plot
  useEffect(() => {
    if (isOpen && selectedPlot && messages.length === 0) {
      sendInitialMessage(selectedPlot.id)
    }
  }, [isOpen])

  const sendInitialMessage = useCallback(async (plotId) => {
    setIsTyping(true)
    try {
      const res = await sendChatMessage(sessionKey.current, plotId, '__init__')
      setMessages([{ role: 'assistant', content: res.reply }])
    } catch {
      setMessages([{
        role: 'assistant',
        content: 'שלום! אני יועץ ההשקעות שלך. כרגע אין חיבור לשרת. נסה שוב מאוחר יותר.',
      }])
    } finally {
      setIsTyping(false)
    }
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isSending) return

    const plotId = selectedPlot?.id ?? null
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setInput('')
    setIsSending(true)
    setIsTyping(true)

    try {
      const res = await sendChatMessage(sessionKey.current, plotId, text)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'מצטער, אירעה שגיאה. נסה שוב.',
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
        className="fixed right-6 bottom-6 z-[40] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-bright shadow-lg animate-pulse-gold hover:scale-110 transition-transform duration-200"
        aria-label="פתח יועץ AI"
      >
        <MessageCircle className="h-6 w-6 text-navy" />
      </button>
    )
  }

  // ── Expanded: chat panel ──
  return (
    <div
      className="fixed right-6 bottom-6 z-[40] flex flex-col w-[400px] max-w-[calc(100vw-3rem)] bg-navy/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-scale-in"
      style={{ height: 500 }}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl bg-gradient-to-l from-gold/20 to-gold-bright/10 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gold-bright" />
          <div>
            <span className="text-sm font-bold text-gold-bright block leading-tight">
              {headerText}
            </span>
            {selectedPlot && (
              <span className="text-[10px] text-slate-400">
                גוש {blockNumber} | {selectedPlot.city}
              </span>
            )}
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
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 animate-fade-in-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {/* Avatar */}
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-gold" />
              </div>
            )}
            {/* Message bubble */}
            <div
              className={`rounded-xl px-4 py-3 text-sm leading-relaxed max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-gold/15 border border-gold/20 text-slate-200'
                  : 'bg-navy-light/60 border border-white/5 text-slate-300'
              }`}
            >
              {msg.content}
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
      </div>

      {/* Input */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 rounded-xl bg-navy-light/40 border border-white/5 px-3 py-2">
          <input
            type="text"
            placeholder="שאל את היועץ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 hover:bg-gold/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="שלח"
          >
            <Send className="h-4 w-4 text-gold" />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          AI יועץ השקעות &ndash; מידע כללי בלבד
        </p>
      </div>
    </div>
  )
}
