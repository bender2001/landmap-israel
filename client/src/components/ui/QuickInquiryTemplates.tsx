import { memo } from 'react'
import { MessageCircle, Calendar, FileSearch, Banknote, Handshake } from 'lucide-react'
import styled from 'styled-components'
import { formatCurrency } from '../../utils/format'
import { whatsappLink } from '../../utils/config'
import { useHapticFeedback } from '../../hooks/useInfra'
import { theme } from '../../styles/theme'

const Wrapper = styled.div`
  margin: 12px 0 4px;
  direction: rtl;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const List = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const Template = styled.a<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: ${theme.radii.lg};
  font-size: 11px;
  font-weight: 500;
  border: 1px solid ${({ $color }) => `${$color}33`};
  color: ${({ $color }) => `${$color}cc`};
  background: ${({ $color }) => `${$color}14`};
  transition: transform ${theme.transitions.fast}, background ${theme.transitions.fast}, border ${theme.transitions.fast};

  &:hover {
    background: ${({ $color }) => `${$color}26`};
    border-color: ${({ $color }) => `${$color}4d`};
    transform: scale(1.02);
  }

  &:active {
    transform: scale(0.98);
  }
`

interface PlotSummary {
  id: string | number
  block_number?: string | number
  blockNumber?: string | number
  number?: string | number
  city?: string
  total_price?: number
  totalPrice?: number
  readiness_estimate?: string
  readinessEstimate?: string
}

interface QuickInquiryTemplatesProps {
  plot?: PlotSummary | null
}

const INQUIRY_TEMPLATES = [
  {
    id: 'availability',
    icon: MessageCircle,
    label: 'זמינות',
    emoji: '🟢',
    color: theme.colors.emerald,
    buildMessage: (plot: PlotSummary) => {
      const bn = plot.block_number ?? plot.blockNumber
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city}.\nהאם החלקה עדיין זמינה?`
    },
  },
  {
    id: 'price',
    icon: Banknote,
    label: 'מחיר סופי',
    emoji: '💰',
    color: theme.colors.amber,
    buildMessage: (plot: PlotSummary) => {
      const bn = plot.block_number ?? plot.blockNumber
      const price = plot.total_price ?? plot.totalPrice
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city}.\nהמחיר המפורסם הוא ${formatCurrency(price || 0)}.\nמה המחיר הסופי? האם יש מקום למשא ומתן?`
    },
  },
  {
    id: 'visit',
    icon: Calendar,
    label: 'סיור בשטח',
    emoji: '📍',
    color: theme.colors.blue,
    buildMessage: (plot: PlotSummary) => {
      const bn = plot.block_number ?? plot.blockNumber
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city}.\nהאם ניתן לתאם סיור בשטח? אשמח לראות את החלקה.`
    },
  },
  {
    id: 'timeline',
    icon: FileSearch,
    label: 'לוח זמנים',
    emoji: '📋',
    color: theme.colors.purple,
    buildMessage: (plot: PlotSummary) => {
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
    color: theme.colors.cyan,
    buildMessage: (plot: PlotSummary) => {
      const bn = plot.block_number ?? plot.blockNumber
      const price = plot.total_price ?? plot.totalPrice
      return `שלום 👋\nאני מתעניין/ת בגוש ${bn} חלקה ${plot.number} ב${plot.city} (${formatCurrency(price || 0)}).\nהאם ניתן להצטרף כשותף/ה להשקעה? מחפש/ת אפשרות לרכישה משותפת.`
    },
  },
]

const QuickInquiryTemplates = memo(function QuickInquiryTemplates({ plot }: QuickInquiryTemplatesProps) {
  const haptic = useHapticFeedback()

  if (!plot) return null

  return (
    <Wrapper>
      <Header>
        <span>💬</span>
        <span>שאלות נפוצות — לחץ לשלוח</span>
      </Header>
      <List>
        {INQUIRY_TEMPLATES.map(tpl => {
          const Icon = tpl.icon
          return (
            <Template
              key={tpl.id}
              href={whatsappLink(tpl.buildMessage(plot))}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => haptic.light()}
              $color={tpl.color}
              title={tpl.buildMessage(plot)}
            >
              <span>{tpl.emoji}</span>
              <span>{tpl.label}</span>
              <Icon size={14} />
            </Template>
          )
        })}
      </List>
    </Wrapper>
  )
})

export default QuickInquiryTemplates
