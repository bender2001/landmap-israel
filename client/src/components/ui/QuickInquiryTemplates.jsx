import { memo, useMemo } from 'react'
import { MessageCircle, Calendar, FileSearch, Banknote, MapPin, Handshake } from 'lucide-react'
import { formatCurrency, formatDunam, calcInvestmentScore, getScoreLabel } from '../../utils/formatters'
import { whatsappLink } from '../../utils/config'
import { useHapticFeedback } from '../../hooks/useHapticFeedback'

/**
 * QuickInquiryTemplates — pre-built investor questions that open WhatsApp with context.
 *
 * Conversion accelerator: reduces friction from "I'm interested" to "message sent"
 * from ~45 seconds (open WhatsApp → type message) to ~2 seconds (tap template).
 *
 * Like Madlan's "שאל שאלה" and Yad2's "שלח הודעה" — but with smart templates
 * that include plot-specific context so the agent knows exactly which plot and what
 * the investor is asking about.
 *
 * Templates are ranked by conversion probability: availability check (#1 question
 * investors ask), then pricing negotiation, then scheduling, then due diligence.
 */

const INQUIRY_TEMPLATES = [
  {
    id: 'availability',
    icon: MessageCircle,
    label: 'זמינות',
    emoji: '🟢',
    color: '#22C55E',
    buildMessage: (plot) => {
      const bn = plot.block_number ?? plot.blockNumber
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city}.\nהאם החלקה עדיין זמינה?`
    },
  },
  {
    id: 'price',
    icon: Banknote,
    label: 'מחיר סופי',
    emoji: '💰',
    color: '#F59E0B',
    buildMessage: (plot) => {
      const bn = plot.block_number ?? plot.blockNumber
      const price = plot.total_price ?? plot.totalPrice
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city}.\nהמחיר המפורסם הוא ${formatCurrency(price)}.\nמה המחיר הסופי? האם יש מקום למשא ומתן?`
    },
  },
  {
    id: 'visit',
    icon: Calendar,
    label: 'סיור בשטח',
    emoji: '📍',
    color: '#3B82F6',
    buildMessage: (plot) => {
      const bn = plot.block_number ?? plot.blockNumber
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city}.\nהאם ניתן לתאם סיור בשטח? אשמח לראות את החלקה.`
    },
  },
  {
    id: 'timeline',
    icon: FileSearch,
    label: 'לוח זמנים',
    emoji: '📋',
    color: '#8B5CF6',
    buildMessage: (plot) => {
      const bn = plot.block_number ?? plot.blockNumber
      const readiness = plot.readiness_estimate ?? plot.readinessEstimate
      return `שלום 👋\nלגבי גוש ${bn} חלקה ${plot.number} ב${plot.city}${readiness ? ` (מוכנות: ${readiness})` : ''}.\nמה לוח הזמנים הצפוי לאישור התב"ע והתקדמות התכנון?`
    },
  },
  {
    id: 'partner',
    icon: Handshake,
    label: 'שותפות',
    emoji: '🤝',
    color: '#06B6D4',
    buildMessage: (plot) => {
      const bn = plot.block_number ?? plot.blockNumber
      const price = plot.total_price ?? plot.totalPrice
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city} (${formatCurrency(price)}).\nהאם ניתן להצטרף כשותף/ה להשקעה? מחפש/ת אפשרות לרכישה משותפת.`
    },
  },
]

const QuickInquiryTemplates = memo(function QuickInquiryTemplates({ plot }) {
  const haptic = useHapticFeedback()

  if (!plot) return null

  return (
    <div className="mt-3 mb-1" dir="rtl">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] text-slate-500">💬</span>
        <span className="text-[10px] text-slate-500 font-medium">שאלות נפוצות — לחץ לשלוח</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {INQUIRY_TEMPLATES.map((tpl) => {
          const Icon = tpl.icon
          return (
            <a
              key={tpl.id}
              href={whatsappLink(tpl.buildMessage(plot))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptic.light()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `${tpl.color}08`,
                borderColor: `${tpl.color}20`,
                color: `${tpl.color}CC`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${tpl.color}15`
                e.currentTarget.style.borderColor = `${tpl.color}35`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${tpl.color}08`
                e.currentTarget.style.borderColor = `${tpl.color}20`
              }}
              title={tpl.buildMessage(plot)}
            >
              <span className="text-xs">{tpl.emoji}</span>
              <span>{tpl.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
})

export default QuickInquiryTemplates
