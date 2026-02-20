// ── FeaturedDeals ────────────────────────────────────────────
import { useState, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  MapPin,
  Flame,
} from 'lucide-react'
import { useFeaturedPlots } from '../../hooks/usePlots'
import { formatPriceShort } from '../../utils/format'
import { statusColors } from '../../utils/constants'
import { theme, media } from '../../styles/theme'
import type { Plot } from '../../types'

/* ── Types ─────────────────────────────────────────────────── */

interface FeaturedDealsProps {
  onSelectPlot?: (plot: Plot) => void
  selectedPlot?: Plot | null
}

/* ── Styled ────────────────────────────────────────────────── */

const FD_dropIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const FD_Wrap = styled.div`
  position: fixed;
  z-index: 28;
  left: 16px;
  bottom: 336px;
  display: none;

  ${media.sm} {
    display: block;
  }
`

const FD_ToggleButton = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${theme.radii.lg};
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(12px);
  border: 1px solid ${({ $expanded }) => ($expanded ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  background: ${({ $expanded }) => ($expanded ? 'rgba(249, 115, 22, 0.15)' : 'rgba(10, 22, 40, 0.8)')};
  color: ${({ $expanded }) => ($expanded ? theme.colors.orange : theme.colors.slate[400])};
  transition: ${theme.transitions.normal};

  &:hover {
    transform: scale(1.05);
    color: ${theme.colors.orange};
    border-color: rgba(249, 115, 22, 0.2);
  }
`

const FD_CountBadge = styled.span`
  width: 20px;
  height: 20px;
  border-radius: ${theme.radii.full};
  background: rgba(249, 115, 22, 0.2);
  color: ${theme.colors.orange};
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const FD_Panel = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 256px;
  background: rgba(10, 22, 40, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(249, 115, 22, 0.15);
  border-radius: ${theme.radii.xl};
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: ${FD_dropIn} 0.2s ease;
`

const FD_PanelHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(249, 115, 22, 0.7);
`

const FD_List = styled.div`
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FD_CardButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: ${theme.radii.lg};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.2)' : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.1)' : 'rgba(255, 255, 255, 0.02)')};
  text-align: right;
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.05);
  }
`

const FD_Rank = styled.div<{ $index: number }>`
  width: 24px;
  height: 24px;
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: ${({ $index }) => ($index === 0 ? theme.colors.orange : $index === 1 ? theme.colors.amber : theme.colors.slate[400])};
  background: ${({ $index }) =>
    $index === 0
      ? 'rgba(249, 115, 22, 0.2)'
      : $index === 1
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(148, 163, 184, 0.15)'};
  flex-shrink: 0;
`

const FD_CardInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const FD_CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FD_CardSub = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const FD_PriceBlock = styled.div`
  text-align: left;
  flex-shrink: 0;
`

const FD_PriceText = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.gold};
`

const FD_RoiText = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  font-size: 9px;
  font-weight: 600;
  color: ${theme.colors.emerald};
`

const FD_Footer = styled.div`
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`

/* ── Component ─────────────────────────────────────────────── */

export function FeaturedDeals({ onSelectPlot, selectedPlot }: FeaturedDealsProps) {
  const { data: featured = [] } = useFeaturedPlots(3)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelect = useCallback((plot: Plot) => {
    if (onSelectPlot) onSelectPlot(plot)
    setIsExpanded(false)
  }, [onSelectPlot])

  if (!featured || featured.length === 0) return null

  return (
    <FD_Wrap dir="rtl">
      <FD_ToggleButton
        onClick={() => setIsExpanded((prev) => !prev)}
        $expanded={isExpanded}
        aria-expanded={isExpanded}
        aria-label={'\u05D4\u05D6\u05D3\u05DE\u05E0\u05D5\u05D9\u05D5\u05EA \u05D7\u05DE\u05D5\u05EA'}
        title={'\u05D4\u05D6\u05D3\u05DE\u05E0\u05D5\u05D9\u05D5\u05EA \u05D4\u05E9\u05E7\u05E2\u05D4 \u05DE\u05D5\u05DE\u05DC\u05E6\u05D5\u05EA'}
      >
        <Flame size={14} color={isExpanded ? theme.colors.orange : theme.colors.slate[400]} />
        <span>{'\u05D4\u05D6\u05D3\u05DE\u05E0\u05D5\u05D9\u05D5\u05EA \u05D7\u05DE\u05D5\u05EA'}</span>
        <FD_CountBadge>{featured.length}</FD_CountBadge>
        {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </FD_ToggleButton>

      {isExpanded && (
        <FD_Panel>
          <FD_PanelHeader>
            <Flame size={12} />
            <span>{'\u05DE\u05D3\u05D5\u05E8\u05D2\u05D5\u05EA \u05DC\u05E4\u05D9 \u05E6\u05D9\u05D5\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4'}</span>
          </FD_PanelHeader>

          <FD_List>
            {featured.map((plot, i) => {
              const bn = plot.block_number ?? plot.blockNumber
              const price = plot.total_price ?? plot.totalPrice
              const roi = plot._roi ?? 0
              const dealPct = plot._dealPct ?? 0
              const color = statusColors[plot.status]
              const isSelected = selectedPlot?.id === plot.id

              return (
                <FD_CardButton key={plot.id} onClick={() => handleSelect(plot)} $active={isSelected}>
                  <FD_Rank $index={i}>{i + 1}</FD_Rank>
                  <FD_CardInfo>
                    <FD_CardTitle>
                      <span style={{ width: 6, height: 6, borderRadius: theme.radii.full, background: color }} />
                      {'\u05D2\u05D5\u05E9'} {bn} | {'\u05D7\u05DC\u05E7\u05D4'} {plot.number}
                    </FD_CardTitle>
                    <FD_CardSub>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} />
                        {plot.city}
                      </span>
                      {dealPct < -3 && (
                        <span style={{ color: theme.colors.emerald, fontWeight: 600 }}>{Math.abs(dealPct)}%{'\u2193'}</span>
                      )}
                    </FD_CardSub>
                  </FD_CardInfo>
                  <FD_PriceBlock>
                    <FD_PriceText>{formatPriceShort(price)}</FD_PriceText>
                    <FD_RoiText>
                      <TrendingUp size={10} />
                      +{roi}%
                    </FD_RoiText>
                  </FD_PriceBlock>
                </FD_CardButton>
              )
            })}
          </FD_List>

          <FD_Footer>{'\u05DE\u05E2\u05D5\u05D3\u05DB\u05DF \u05DB\u05DC 5 \u05D3\u05E7\u05D5\u05EA \u00B7 \u05DE\u05D1\u05D5\u05E1\u05E1 ROI, \u05DE\u05D7\u05D9\u05E8 \u05D0\u05D6\u05D5\u05E8\u05D9, \u05D8\u05E8\u05D9\u05D5\u05EA'}</FD_Footer>
        </FD_Panel>
      )}
    </FD_Wrap>
  )
}
