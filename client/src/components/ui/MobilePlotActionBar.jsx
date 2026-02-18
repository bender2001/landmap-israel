import { memo, useState, useCallback } from 'react'
import { Phone, MessageCircle, Share2, Heart, Check } from 'lucide-react'
import { plotInquiryLink, whatsappShareLink } from '../../utils/config'
import { formatPriceShort } from '../../utils/formatters'

/**
 * MobilePlotActionBar — Floating bottom CTA bar shown on mobile when a plot is selected.
 * Both Madlan and Yad2 use prominent bottom action bars with call/WhatsApp/share buttons.
 * This dramatically improves mobile conversion by keeping CTAs visible during scrolling.
 *
 * Sticky positioned above the PlotCardStrip, visible only on mobile (sm:hidden).
 * Shows price summary + 3-4 action buttons.
 */
const MobilePlotActionBar = memo(function MobilePlotActionBar({ plot, isFavorite, onToggleFavorite }) {
  const [shareConfirm, setShareConfirm] = useState(false)

  const handleShare = useCallback(async () => {
    const blockNum = plot.block_number ?? plot.blockNumber
    const price = plot.total_price ?? plot.totalPrice
    const projValue = plot.projected_value ?? plot.projectedValue
    const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
    const url = `${window.location.origin}/plot/${plot.id}`
    const text = `🏗️ גוש ${blockNum} חלקה ${plot.number} | ${plot.city}\n💰 ${formatPriceShort(price)} · +${roi}% ROI\n🔗 ${url}`

    // Use native share API if available (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({ title: `גוש ${blockNum} חלקה ${plot.number}`, text, url })
        return
      } catch {
        // User cancelled or API error — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text)
      setShareConfirm(true)
      setTimeout(() => setShareConfirm(false), 2000)
    } catch {
      // Last resort: open WhatsApp share
      window.open(whatsappShareLink(text), '_blank')
    }
  }, [plot])

  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice
  const blockNum = plot.block_number ?? plot.blockNumber

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[45] sm:hidden animate-slide-up"
      dir="rtl"
    >
      {/* Glass background with top gradient fade */}
      <div className="absolute inset-0 bg-navy/90 backdrop-blur-xl border-t border-white/10" />

      <div className="relative px-4 py-3 safe-area-pb">
        {/* Price summary row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="min-w-0">
            <div className="text-sm font-bold text-gold truncate">
              {formatPriceShort(price)}
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              גוש {blockNum} | חלקה {plot.number} · {plot.city}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          {/* WhatsApp inquiry — primary CTA */}
          <a
            href={plotInquiryLink(plot)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366] rounded-xl text-white font-bold text-sm hover:bg-[#20BD5A] transition-colors active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          {/* Phone call */}
          <a
            href="tel:+972500000000"
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-gold/20 transition-all active:scale-95"
            title="התקשר"
          >
            <Phone className="w-4 h-4 text-slate-300" />
          </a>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:border-gold/20 transition-all active:scale-95"
            title={shareConfirm ? 'הועתק!' : 'שתף'}
          >
            {shareConfirm
              ? <Check className="w-4 h-4 text-green-400" />
              : <Share2 className="w-4 h-4 text-slate-300" />
            }
          </button>

          {/* Favorite toggle */}
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(plot.id)}
              className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                isFavorite
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-white/5 border-white/10 hover:border-gold/20 text-slate-300'
              }`}
              title={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

export default MobilePlotActionBar
