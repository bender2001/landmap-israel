// ── MarketTicker ─────────────────────────────────────────────
import { useState, useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { Zap, TrendingUp, MapPin, Clock } from 'lucide-react'
import { useVisibilityInterval } from '../../hooks/useInfra'
import { formatPriceShort } from '../../utils/format'
import { theme, media } from '../../styles/theme'
import type { Plot } from '../../types'

/* ── Types ─────────────────────────────────────────────────── */

interface MarketTickerProps {
  plots: Plot[]
}

interface MT_TickerItem {
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  text: string
  highlight?: boolean
}

/* ── Styled ────────────────────────────────────────────────── */

const MT_tickerIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const MT_Wrap = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  transition: transform ${theme.transitions.smooth};
  transform: ${({ $visible }) => ($visible ? 'translateY(0)' : 'translateY(-100%)')};
  display: none;

  ${media.sm} {
    display: block;
  }
`

const MT_Bar = styled.div`
  background: rgba(22, 42, 74, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const MT_Inner = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 16px;
`

const MT_Dots = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
`

const MT_Dot = styled.button<{ $active?: boolean }>`
  width: ${({ $active }) => ($active ? '12px' : '4px')};
  height: 4px;
  border-radius: ${theme.radii.full};
  border: none;
  background: ${({ $active }) => ($active ? theme.colors.gold : 'rgba(255, 255, 255, 0.2)')};
  transition: ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`

const MT_Content = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${MT_tickerIn} 0.4s ease;
`

const MT_IconWrap = styled.div<{ $color: string }>`
  width: 20px;
  height: 20px;
  border-radius: ${theme.radii.sm};
  background: ${({ $color }) => `${$color}20`};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const MT_Text = styled.span<{ $highlight?: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: ${({ $highlight }) => ($highlight ? theme.colors.emerald : theme.colors.slate[300])};
`

const MT_CloseButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  background: transparent;
  border: none;
  color: ${theme.colors.slate[500]};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.slate[300]};
  }
`

/* ── Component ─────────────────────────────────────────────── */

export function MarketTicker({ plots }: MarketTickerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const items = useMemo<MT_TickerItem[]>(() => {
    if (!plots || plots.length === 0) return []

    const now = Date.now()
    const result: MT_TickerItem[] = []

    const newThisWeek = plots.filter((p) => {
      const created = p.created_at ?? p.createdAt
      return created && (now - new Date(created).getTime()) < 7 * 24 * 60 * 60 * 1000
    })
    if (newThisWeek.length > 0) {
      result.push({
        icon: Zap,
        color: theme.colors.emerald,
        text: `${newThisWeek.length} \u05D7\u05DC\u05E7\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA \u05D4\u05E9\u05D1\u05D5\u05E2`,
        highlight: true,
      })
    }

    const available = plots.filter((p) => p.status === 'AVAILABLE')
    if (available.length > 0) {
      const bestRoi = available.reduce((best, p) => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        const roi = price > 0 ? ((proj - price) / price) * 100 : 0
        return roi > best.roi ? { plot: p, roi } : best
      }, { plot: null as Plot | null, roi: 0 })

      if (bestRoi.plot) {
        const bn = bestRoi.plot.block_number ?? bestRoi.plot.blockNumber
        result.push({
          icon: TrendingUp,
          color: '#4ADE80',
          text: `\u05EA\u05E9\u05D5\u05D0\u05D4 \u05DE\u05D5\u05D1\u05D9\u05DC\u05D4: +${Math.round(bestRoi.roi)}% \u2014 \u05D2\u05D5\u05E9 ${bn} \u05D1${bestRoi.plot.city}`,
        })
      }
    }

    if (available.length > 0) {
      const cheapest = available.reduce((best, p) => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 1
        const priceDunam = size > 0 ? (price / size) * 1000 : Infinity
        return priceDunam < best.price ? { plot: p, price: priceDunam } : best
      }, { plot: null as Plot | null, price: Infinity })

      if (cheapest.plot && cheapest.price < Infinity) {
        result.push({
          icon: MapPin,
          color: theme.colors.blue,
          text: `\u05DE\u05D7\u05D9\u05E8 \u05E0\u05DE\u05D5\u05DA \u05D1\u05D9\u05D5\u05EA\u05E8: ${formatPriceShort(Math.round(cheapest.price))}/\u05D3\u05D5\u05E0\u05DD \u05D1${cheapest.plot.city}`,
        })
      }
    }

    const totalValue = plots.reduce((s, p) => s + (p.total_price ?? p.totalPrice ?? 0), 0)
    const totalArea = plots.reduce((s, p) => s + (p.size_sqm ?? p.sizeSqM ?? 0), 0)
    if (totalValue > 0) {
      result.push({
        icon: TrendingUp,
        color: theme.colors.goldBright,
        text: `\u05E9\u05D5\u05D5\u05D9 \u05E9\u05D5\u05E7 \u05DB\u05D5\u05DC\u05DC: ${formatPriceShort(totalValue)} \u00B7 ${(totalArea / 1000).toFixed(0)} \u05D3\u05D5\u05E0\u05DD`,
      })
    }

    const cities: Record<string, { count: number; available: number }> = {}
    plots.forEach((p) => {
      const city = p.city || '\u05D0\u05D7\u05E8'
      if (!cities[city]) cities[city] = { count: 0, available: 0 }
      cities[city].count++
      if (p.status === 'AVAILABLE') cities[city].available++
    })
    const cityEntries = Object.entries(cities).filter(([, v]) => v.available > 0)
    if (cityEntries.length > 1) {
      const cityText = cityEntries.map(([city, v]) => `${city}: ${v.available} \u05D6\u05DE\u05D9\u05E0\u05D5\u05EA`).join(' \u00B7 ')
      result.push({
        icon: MapPin,
        color: theme.colors.purple,
        text: cityText,
      })
    }

    const recentlyUpdated = plots.filter((p) => {
      const updated = p.updated_at ?? p.updatedAt
      return updated && (now - new Date(updated).getTime()) < 24 * 60 * 60 * 1000
    })
    if (recentlyUpdated.length > 0) {
      result.push({
        icon: Clock,
        color: theme.colors.amber,
        text: `${recentlyUpdated.length} \u05D7\u05DC\u05E7\u05D5\u05EA \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5 \u05D1-24 \u05E9\u05E2\u05D5\u05EA \u05D4\u05D0\u05D7\u05E8\u05D5\u05E0\u05D5\u05EA`,
      })
    }

    return result
  }, [plots])

  useVisibilityInterval(
    () => setActiveIndex((prev) => (prev + 1) % items.length),
    5000,
    { enabled: items.length > 1, catchUp: false }
  )

  if (items.length === 0) return null

  const currentItem = items[activeIndex % items.length]
  const Icon = currentItem.icon

  return (
    <MT_Wrap $visible={isVisible} dir="rtl">
      <MT_Bar>
        <MT_Inner>
          {items.length > 1 && (
            <MT_Dots>
              {items.map((_, i) => (
                <MT_Dot key={i} $active={i === activeIndex % items.length} onClick={() => setActiveIndex(i)} />
              ))}
            </MT_Dots>
          )}

          <MT_Content key={activeIndex}>
            <MT_IconWrap $color={currentItem.color}>
              <Icon size={12} color={currentItem.color} />
            </MT_IconWrap>
            <MT_Text $highlight={currentItem.highlight}>{currentItem.text}</MT_Text>
          </MT_Content>

          <MT_CloseButton onClick={() => setIsVisible(false)} aria-label={'\u05E1\u05D2\u05D5\u05E8'}>
            <span style={{ fontSize: 12 }}>{'\u2715'}</span>
          </MT_CloseButton>
        </MT_Inner>
      </MT_Bar>
    </MT_Wrap>
  )
}
