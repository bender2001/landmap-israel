import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Clock, ChevronDown } from 'lucide-react'
import { statusColors } from '../utils/constants'
import { formatPriceShort } from '../utils/format'
import { theme, media } from '../styles/theme'

type Plot = {
  id: string | number
  status?: string
  total_price?: number
  totalPrice?: number
  block_number?: string | number
  blockNumber?: string | number
  number?: string | number
  city?: string
  projected_value?: number
  projectedValue?: number
}

type RecentlyViewedProps = {
  plots: Plot[]
  selectedPlot?: Plot | null
  onSelectPlot: (plot: Plot) => void
}

export default function RecentlyViewed({ plots, selectedPlot, onSelectPlot }: RecentlyViewedProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  const recentPlots = useMemo(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('landmap_recently_viewed') || '[]') as Array<string | number>
      if (ids.length === 0) return []
      const plotMap = new Map(plots.map((plot) => [plot.id, plot]))
      return ids
        .map((id) => plotMap.get(id))
        .filter(Boolean)
        .slice(0, 5) as Plot[]
    } catch {
      return []
    }
  }, [plots, selectedPlot?.id])

  if (recentPlots.length === 0) return null

  const handleSelect = useCallback(
    (plot: Plot) => {
      onSelectPlot(plot)
      setIsOpen(false)
    },
    [onSelectPlot]
  )

  return (
    <Root dir="rtl">
      <Panel ref={panelRef}>
        <ToggleButton type="button" onClick={() => setIsOpen((prev) => !prev)}>
          <Clock size={14} />
          <span>נצפו לאחרונה</span>
          <CountBadge>{recentPlots.length}</CountBadge>
          <ChevronIcon $active={isOpen}>
            <ChevronDown size={12} />
          </ChevronIcon>
        </ToggleButton>

        {isOpen && (
          <Dropdown>
            {recentPlots.map((plot) => {
              const color = statusColors[plot.status || 'available']
              const price = plot.total_price ?? plot.totalPrice ?? 0
              const blockNum = plot.block_number ?? plot.blockNumber
              const isSelected = selectedPlot?.id === plot.id
              const projValue = plot.projected_value ?? plot.projectedValue ?? 0
              const roi = price > 0 ? Math.round(((projValue - price) / price) * 100) : 0

              return (
                <PlotRow
                  key={plot.id}
                  type="button"
                  $active={isSelected}
                  onClick={() => handleSelect(plot)}
                >
                  <PlotAccent style={{ background: color }} />
                  <PlotInfo>
                    <PlotTitle>
                      גוש {blockNum} | חלקה {plot.number}
                    </PlotTitle>
                    <PlotMeta>{plot.city}</PlotMeta>
                  </PlotInfo>
                  <PlotPrice>
                    <PriceValue>{formatPriceShort(price)}</PriceValue>
                    <RoiValue>+{roi}%</RoiValue>
                  </PlotPrice>
                </PlotRow>
              )
            })}
          </Dropdown>
        )}
      </Panel>
    </Root>
  )
}

const Root = styled.div`
  position: fixed;
  top: 11rem;
  right: 1rem;
  z-index: 25;
  pointer-events: none;
  display: none;

  ${media.sm} {
    display: block;
  }
`

const Panel = styled.div`
  pointer-events: auto;
`

const ToggleButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  -webkit-backdrop-filter: ${theme.glass.blur};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
  color: ${theme.colors.slate[300]};
  font-size: 12px;
  transition: ${theme.transitions.normal};
  cursor: pointer;

  svg {
    color: ${theme.colors.gold};
  }

  &:hover {
    border-color: rgba(200, 148, 42, 0.2);
  }
`

const CountBadge = styled.span`
  font-size: 10px;
  color: ${theme.colors.gold};
  background: rgba(200, 148, 42, 0.1);
  padding: 2px 6px;
  border-radius: 999px;
`

const ChevronIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.normal};
  transform: ${({ $active }) => ($active ? 'rotate(180deg)' : 'rotate(0deg)')};
`

const Dropdown = styled.div`
  margin-top: 4px;
  padding: 8px;
  min-width: 220px;
  max-width: 280px;
  display: grid;
  gap: 4px;
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  -webkit-backdrop-filter: ${theme.glass.blur};
  border: ${theme.glass.border};
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.glass};
`

const PlotRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: ${theme.radii.lg};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.2)' : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.1)' : 'transparent')};
  color: ${theme.colors.slate[200]};
  text-align: right;
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`

const PlotAccent = styled.div`
  width: 4px;
  height: 28px;
  border-radius: 999px;
  flex-shrink: 0;
`

const PlotInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const PlotTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PlotMeta = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const PlotPrice = styled.div`
  text-align: left;
  flex-shrink: 0;
`

const PriceValue = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.gold};
`

const RoiValue = styled.div`
  font-size: 10px;
  color: ${theme.colors.emerald};
`
