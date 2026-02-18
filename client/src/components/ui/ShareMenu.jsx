import { useState, useRef, useEffect } from 'react'
import { Share2, MessageCircle, Send, Copy, Check, Mail, X } from 'lucide-react'

export default function ShareMenu({ plotTitle, plotPrice, plotUrl, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const shareText = `${plotTitle}\n${plotPrice}\n${plotUrl}`

  const handleCopy = () => {
    navigator.clipboard.writeText(plotUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // Use native Web Share API on mobile when available — provides a native share sheet
  // with all installed apps (WhatsApp, Telegram, Messages, etc.)
  const handleNativeShare = async () => {
    if (!navigator.share) return false
    try {
      await navigator.share({
        title: plotTitle,
        text: `${plotTitle}\n${plotPrice}`,
        url: plotUrl,
      })
      setIsOpen(false)
      return true
    } catch {
      // User cancelled or share failed — fall through to menu
      return false
    }
  }

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10 hover:bg-green-500/20',
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: 'Telegram',
      icon: Send,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 hover:bg-blue-500/20',
      href: `https://t.me/share/url?url=${encodeURIComponent(plotUrl)}&text=${encodeURIComponent(plotTitle)}`,
    },
    {
      label: 'אימייל',
      icon: Mail,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 hover:bg-purple-500/20',
      href: `mailto:?subject=${encodeURIComponent(plotTitle)}&body=${encodeURIComponent(shareText)}`,
    },
  ]

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={async () => {
          // On mobile: try native share sheet first (covers WhatsApp, Telegram, all apps)
          if (canNativeShare) {
            const shared = await handleNativeShare()
            if (shared) return
          }
          // Fall back to custom dropdown menu
          setIsOpen((prev) => !prev)
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:bg-white/10 transition"
      >
        <Share2 className="w-4 h-4" />
        <span className="hidden sm:inline">שתף</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-30 min-w-[180px] bg-navy-mid border border-white/10 rounded-xl shadow-xl overflow-hidden animate-fade-in" dir="rtl">
          {shareOptions.map((opt) => (
            <a
              key={opt.label}
              href={opt.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${opt.bg} ${opt.color}`}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </a>
          ))}

          {/* Native share — available on some desktop browsers too */}
          {canNativeShare && (
            <button
              onClick={() => { handleNativeShare() }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gold bg-gold/5 hover:bg-gold/15 transition-colors border-t border-white/5"
            >
              <Share2 className="w-4 h-4" />
              שתף באפליקציה...
            </button>
          )}

          {/* Copy link */}
          <button
            onClick={() => { handleCopy(); setIsOpen(false) }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-300 bg-white/5 hover:bg-white/10 transition-colors border-t border-white/5"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'הועתק!' : 'העתק קישור'}
          </button>
        </div>
      )}
    </div>
  )
}
