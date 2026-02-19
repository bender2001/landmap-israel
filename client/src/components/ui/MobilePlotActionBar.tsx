import { memo, useState, useCallback } from 'react'
import { Phone, MessageCircle, Share2, Heart, Check } from 'lucide-react'
import styled from 'styled-components'
import { plotInquiryLink, whatsappShareLink } from '../../utils/config'
import { formatPriceShort } from '../../utils/format'
import { theme, media } from '../../styles/theme'

const Wrapper = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 45;
  direction: rtl;

  ${media.sm} {
    display: none;
  }
`

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(10, 22, 40, 0.9);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`

const Content = styled.div`
  position: relative;
  padding: 12px 16px;
`

const Summary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`

const Price = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${theme.colors.gold};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Meta = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const WhatsApp = styled.a`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: #25d366;
  color: #ffffff;
  border-radius: ${theme.radii.lg};
  font-weight: 700;
  font-size: 14px;
  text-decoration: none;
  transition: background ${theme.transitions.normal}, transform ${theme.transitions.fast};

  &:active {
    transform: scale(0.95);
  }

  &:hover {
    background: #20bd5a;
  }
`

const IconButton = styled.button<{ $active?: boolean }>`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radii.lg};
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: ${({ $active }) => ($active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)')};
  color: ${({ $active }) => ($active ? theme.colors.red : theme.colors.slate[300])};
  transition: transform ${theme.transitions.fast}, border ${theme.transitions.fast};

  &:active {
    transform: scale(0.95);
  }

  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
  }
`

interface PlotRef {
  id: string | number
  number?: string | number
  city?: string
  block_number?: string | number
  blockNumber?: string | number
  total_price?: number
  totalPrice?: number
  projected_value?: number
  projectedValue?: number
}

interface MobilePlotActionBarProps {
  plot?: PlotRef | null
  isFavorite?: boolean
  onToggleFavorite?: (plotId: string | number) => void
}

const MobilePlotActionBar = memo(function MobilePlotActionBar({ plot, isFavorite, onToggleFavorite }: MobilePlotActionBarProps) {
  const [shareConfirm, setShareConfirm] = useState(false)

  const handleShare = useCallback(async () => {
    if (!plot) return
    const blockNum = plot.block_number ?? plot.blockNumber
    const price = plot.total_price ?? plot.totalPrice
    const projValue = plot.projected_value ?? plot.projectedValue
    const roi = price && projValue ? Math.round((projValue - price) / price * 100) : 0
    const url = `${window.location.origin}/plot/${plot.id}`
    const text = `🏗️ גוש ${blockNum} חלקה ${plot.number} | ${plot.city}\n💰 ${formatPriceShort(price || 0)} · +${roi}% ROI\n🔗 ${url}`

    if (navigator.share) {
      try {
        await navigator.share({ title: `גוש ${blockNum} חלקה ${plot.number}`, text, url })
        return
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(text)
      setShareConfirm(true)
      setTimeout(() => setShareConfirm(false), 2000)
    } catch {
      window.open(whatsappShareLink(text), '_blank')
    }
  }, [plot])

  if (!plot) return null

  const price = plot.total_price ?? plot.totalPrice
  const blockNum = plot.block_number ?? plot.blockNumber

  return (
    <Wrapper>
      <Backdrop />
      <Content>
        <Summary>
          <div style={{ minWidth: 0 }}>
            <Price>{formatPriceShort(price || 0)}</Price>
            <Meta>גוש {blockNum} | חלקה {plot.number} · {plot.city}</Meta>
          </div>
        </Summary>
        <Actions>
          <WhatsApp href={plotInquiryLink(plot)} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </WhatsApp>
          <IconButton as="a" href="tel:+972500000000" title="התקשר">
            <Phone size={16} />
          </IconButton>
          <IconButton onClick={handleShare} title={shareConfirm ? 'הועתק!' : 'שתף'}>
            {shareConfirm ? <Check size={16} color={theme.colors.emerald} /> : <Share2 size={16} />}
          </IconButton>
          {onToggleFavorite && (
            <IconButton $active={!!isFavorite} onClick={() => onToggleFavorite(plot.id)} title={isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}>
              <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </IconButton>
          )}
        </Actions>
      </Content>
    </Wrapper>
  )
})

export default MobilePlotActionBar
