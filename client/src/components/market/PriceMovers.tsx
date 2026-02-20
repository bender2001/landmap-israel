// ── PriceMovers ──────────────────────────────────────────────
import { useState, useCallback } from 'react'
import styled from 'styled-components'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { usePriceChanges } from '../../hooks/useMarket'
import { formatPriceShort } from '../../utils/format'
import { statusColors } from '../../utils/constants'
import { theme, media } from '../../styles/theme'

/* ── Types ─────────────────────────────────────────────────── */

type PM_Plot = {
  id: string | number
}

type PM_PriceChange = {
  plotId: string
  direction: 'down' | 'up' | string
  pctChange: number
  oldPrice: number
  currentPrice: number
  status?: string
  blockNumber?: string | number
  number?: string | number
  city?: string
}

type PriceMoversProps = {
  onSelectPlot?: (plot: PM_Plot) => void
  plots?: PM_Plot[]
}

/* ── Styled ────────────────────────────────────────────────── */

const PM_Root = styled.div`
  position: fixed;
  z-index: 28;
  bottom: 24rem;
  left: 1rem;
  display: none;

  ${media.sm} {
    display: block;
  }
`

const PM_ToggleButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${theme.radii.lg};
  font-size: 12px;
  font-weight: 700;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  color: ${({ $active }) => ($active ? '#60A5FA' : theme.colors.slate[400])};
  background: ${({ $active }) => ($active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(10, 22, 40, 0.8)')};
  box-shadow: ${({ $active }) => ($active ? '0 12px 24px rgba(59, 130, 246, 0.08)' : 'none')};
  backdrop-filter: blur(14px);
  transition: ${theme.transitions.normal};
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
    color: #60A5FA;
    border-color: rgba(59, 130, 246, 0.2);
  }

  svg {
    color: ${({ $active }) => ($active ? '#60A5FA' : theme.colors.slate[400])};
  }
`

const PM_CountGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const PM_CountBadge = styled.span<{ $variant: 'down' | 'up' }>`
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  background: ${({ $variant }) => ($variant === 'down' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)')};
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_Panel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  width: 18rem;
  background: rgba(10, 22, 40, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.popup};
  overflow: hidden;
  backdrop-filter: blur(22px);
  animation: filter-dropdown-in 0.2s ease-out;
`

const PM_PanelHeader = styled.div`
  padding: 12px 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const PM_HeaderInfo = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: rgba(96, 165, 250, 0.7);
  font-weight: 600;
`

const PM_HeaderCounts = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
`

const PM_HeaderCount = styled.span<{ $variant: 'down' | 'up' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_ChangeList = styled.div`
  padding: 8px;
  display: grid;
  gap: 4px;
  max-height: 280px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
  }
`

const PM_ChangeRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: ${theme.radii.lg};
  text-align: right;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  color: ${theme.colors.slate[200]};
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.05);
  }
`

const PM_DirectionBadge = styled.div<{ $variant: 'down' | 'up' }>`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $variant }) => ($variant === 'down' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)')};
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_ChangeInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const PM_ChangeTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PM_StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
`

const PM_ChangeCity = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  margin-top: 2px;
`

const PM_ChangeValue = styled.div`
  text-align: left;
  flex-shrink: 0;
`

const PM_ChangePct = styled.div<{ $variant: 'down' | 'up' }>`
  font-size: 11px;
  font-weight: 800;
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_ChangePrices = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;

  .old {
    text-decoration: line-through;
    opacity: 0.5;
  }

  .new {
    font-weight: 600;
    color: ${theme.colors.slate[400]};
  }
`

const PM_PanelFooter = styled.div`
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`

/* ── Component ─────────────────────────────────────────────── */

export function PriceMovers({ onSelectPlot, plots = [] }: PriceMoversProps) {
  const { raw } = usePriceChanges({ days: 30, minPct: 2 })
  const priceChanges = raw as PM_PriceChange[]
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelect = useCallback(
    (plotId: string) => {
      if (!onSelectPlot || !plots.length) return
      const plot = plots.find((p) => String(p.id) === String(plotId))
      if (plot) {
        onSelectPlot(plot)
        setIsExpanded(false)
      }
    },
    [onSelectPlot, plots]
  )

  if (!priceChanges || priceChanges.length === 0) return null

  const drops = priceChanges.filter((change) => change.direction === 'down')
  const rises = priceChanges.filter((change) => change.direction === 'up')

  return (
    <PM_Root dir="rtl">
      <PM_ToggleButton type="button" onClick={() => setIsExpanded((prev) => !prev)} $active={isExpanded}>
        <Activity size={14} />
        <span>{'\u05E9\u05D9\u05E0\u05D5\u05D9\u05D9 \u05DE\u05D7\u05D9\u05E8'}</span>
        <PM_CountGroup>
          {drops.length > 0 && <PM_CountBadge $variant="down">{drops.length}</PM_CountBadge>}
          {rises.length > 0 && <PM_CountBadge $variant="up">{rises.length}</PM_CountBadge>}
        </PM_CountGroup>
        {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </PM_ToggleButton>

      {isExpanded && (
        <PM_Panel>
          <PM_PanelHeader>
            <PM_HeaderInfo>
              <Activity size={12} />
              <span>{'\u05E9\u05D9\u05E0\u05D5\u05D9\u05D9 \u05DE\u05D7\u05D9\u05E8 \u2014 30 \u05D9\u05DE\u05D9\u05DD \u05D0\u05D7\u05E8\u05D5\u05E0\u05D9\u05DD'}</span>
            </PM_HeaderInfo>
            <PM_HeaderCounts>
              {drops.length > 0 && (
                <PM_HeaderCount $variant="down">
                  <TrendingDown size={10} />
                  {drops.length} {'\u05D9\u05E8\u05D9\u05D3\u05D5\u05EA'}
                </PM_HeaderCount>
              )}
              {rises.length > 0 && (
                <PM_HeaderCount $variant="up">
                  <TrendingUp size={10} />
                  {rises.length} {'\u05E2\u05DC\u05D9\u05D5\u05EA'}
                </PM_HeaderCount>
              )}
            </PM_HeaderCounts>
          </PM_PanelHeader>

          <PM_ChangeList>
            {[...drops, ...rises].slice(0, 8).map((change) => {
              const color = statusColors[change.status || 'available'] || theme.colors.slate[400]
              const isDown = change.direction === 'down'

              return (
                <PM_ChangeRow key={change.plotId} type="button" onClick={() => handleSelect(change.plotId)}>
                  <PM_DirectionBadge $variant={isDown ? 'down' : 'up'}>
                    {isDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  </PM_DirectionBadge>

                  <PM_ChangeInfo>
                    <PM_ChangeTitle>
                      <PM_StatusDot style={{ background: color }} />
                      {'\u05D2\u05D5\u05E9'} {change.blockNumber} | {'\u05D7\u05DC\u05E7\u05D4'} {change.number}
                    </PM_ChangeTitle>
                    <PM_ChangeCity>{change.city}</PM_ChangeCity>
                  </PM_ChangeInfo>

                  <PM_ChangeValue>
                    <PM_ChangePct $variant={isDown ? 'down' : 'up'}>
                      {isDown ? '\u2193' : '\u2191'} {change.pctChange}%
                    </PM_ChangePct>
                    <PM_ChangePrices>
                      <span className="old">{formatPriceShort(change.oldPrice)}</span>
                      <span>{'\u2192'}</span>
                      <span className="new">{formatPriceShort(change.currentPrice)}</span>
                    </PM_ChangePrices>
                  </PM_ChangeValue>
                </PM_ChangeRow>
              )
            })}
          </PM_ChangeList>

          <PM_PanelFooter>
            {'\u05DE\u05E2\u05E7\u05D1 \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05DE\u05D1\u05D5\u05E1\u05E1 \u05E6\u05D9\u05DC\u05D5\u05DE\u05D9 \u05DE\u05D7\u05D9\u05E8 \u05D9\u05D5\u05DE\u05D9\u05D9\u05DD'} {'\u00B7'} {priceChanges.length} {'\u05E9\u05D9\u05E0\u05D5\u05D9\u05D9\u05DD'}
          </PM_PanelFooter>
        </PM_Panel>
      )}
    </PM_Root>
  )
}
