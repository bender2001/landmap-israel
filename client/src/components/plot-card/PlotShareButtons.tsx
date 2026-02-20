import { useState, useCallback, memo } from 'react'
import styled, { css } from 'styled-components'
import { Share2, Clipboard, Check } from 'lucide-react'
import { whatsappShareLink, useNativeShare, buildPlotShareData } from '../../utils/config'
import { formatPriceShort } from '../../utils/format'

// ─── Types ───────────────────────────────────────────────────────────────

export interface PlotShareButtonsProps {
  plot: any
  blockNum: string | number
  price: number
  roi: number
}

export interface QuickCopyButtonProps {
  plot: any
}

// ─── Styled Components ───────────────────────────────────────────────────

const ShareGroup = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 10;
  display: flex;
  gap: 4px;
`

const ActionBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  box-shadow: ${({ theme }) => theme.shadows.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.bgSecondary};
    color: ${({ theme }) => theme.colors.text};
  }

  svg {
    width: 12px;
    height: 12px;
  }
`

const CopyBtn = styled(ActionBtn)<{ $copied?: boolean }>`
  position: absolute;
  top: 32px;
  left: 6px;
  z-index: 10;

  ${({ $copied, theme }) => $copied && css`
    background: ${theme.colors.emerald[500]};
    border-color: ${theme.colors.emerald[500]};
    color: #fff;
  `}
`

// ─── PlotShareButtons ────────────────────────────────────────────────────

export const PlotShareButtons = memo(function PlotShareButtons({ plot, blockNum, price, roi }: PlotShareButtonsProps) {
  const { isSupported, share } = useNativeShare()

  if (isSupported) {
    return (
      <ShareGroup>
        <ActionBtn
          onClick={async (e) => {
            e.stopPropagation()
            const data = buildPlotShareData(plot)
            const shared = await share(data)
            if (!shared) {
              try { await navigator.clipboard.writeText(data.url) } catch {}
            }
          }}
          title="\u05E9\u05EA\u05E3 \u05D7\u05DC\u05E7\u05D4"
        >
          <Share2 />
        </ActionBtn>
      </ShareGroup>
    )
  }

  return (
    <ShareGroup>
      <ActionBtn
        onClick={(e) => {
          e.stopPropagation()
          const data = buildPlotShareData(plot)
          window.open(whatsappShareLink(data.text), '_blank')
        }}
        title="\u05E9\u05EA\u05E3 \u05D1-WhatsApp"
      >
        <Share2 />
      </ActionBtn>
      <ActionBtn
        onClick={(e) => {
          e.stopPropagation()
          const data = buildPlotShareData(plot)
          window.open(`https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`, '_blank')
        }}
        title="\u05E9\u05EA\u05E3 \u05D1\u05D8\u05DC\u05D2\u05E8\u05DD"
      >
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
      </ActionBtn>
    </ShareGroup>
  )
})

// ─── QuickCopyButton ─────────────────────────────────────────────────────

export const QuickCopyButton = memo(function QuickCopyButton({ plot }: QuickCopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback((e: any) => {
    e.stopPropagation()
    const blockNum = plot.block_number ?? plot.blockNumber
    const price = plot.total_price ?? plot.totalPrice ?? 0
    const proj = plot.projected_value ?? plot.projectedValue ?? 0
    const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    const sizeSqM = plot.size_sqm ?? plot.sizeSqM ?? 0
    const dunam = sizeSqM > 0 ? (sizeSqM / 1000).toFixed(1) : '?'

    const lines = [`\uD83D\uDCCD \u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${plot.number} \u00B7 ${plot.city}`]
    lines.push(`\uD83D\uDCB0 ${formatPriceShort(price)} \u00B7 ${dunam} \u05D3\u05D5\u05E0\u05DD \u00B7 +${roi}% ROI`)

    const extras: string[] = []
    if (plot._netRoi != null) extras.push(`\u05E0\u05D8\u05D5 +${plot._netRoi}%`)
    if (plot._paybackYears != null) extras.push(`\u05D4\u05D7\u05D6\u05E8 ${plot._paybackYears} \u05E9\u05E0\u05F3`)
    if (plot._grade) extras.push(`\u05D3\u05D9\u05E8\u05D5\u05D2 ${plot._grade}`)
    if (extras.length > 0) lines.push(`\uD83D\uDCCA ${extras.join(' \u00B7 ')}`)

    const signals: string[] = []
    if (plot._buySignal) signals.push(plot._buySignal.label)
    if (plot._cagr) signals.push(`${plot._cagr}%/\u05E9\u05E0\u05D4`)
    if (plot._monthlyPayment) signals.push(`~\u20AA${plot._monthlyPayment.toLocaleString()}/\u05D7\u05D5\u05D3\u05E9`)
    if (signals.length > 0) lines.push(signals.join(' \u00B7 '))

    lines.push(`\uD83D\uDD17 ${window.location.origin}/plot/${plot.id}`)

    const text = lines.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }, [plot])

  return (
    <CopyBtn
      onClick={handleCopy}
      $copied={copied}
      title={copied ? '\u05D4\u05D5\u05E2\u05EA\u05E7!' : '\u05D4\u05E2\u05EA\u05E7 \u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05E9\u05E7\u05E2\u05D4'}
      aria-label={copied ? '\u05D4\u05D5\u05E2\u05EA\u05E7 \u05DC\u05DC\u05D5\u05D7' : '\u05D4\u05E2\u05EA\u05E7 \u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05E9\u05E7\u05E2\u05D4 \u05DC\u05DC\u05D5\u05D7'}
    >
      {copied ? <Check /> : <Clipboard />}
    </CopyBtn>
  )
})
