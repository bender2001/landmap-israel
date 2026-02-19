import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { TrendingUp, Calendar, Target } from 'lucide-react'
import { formatCurrency, formatPriceShort } from '../../utils/format'
import { theme, media } from '../../styles/theme'

interface InvestmentProjectionProps {
  totalPrice?: number
  projectedValue?: number
  readinessEstimate?: string | null
  zoningStage?: string | null
}

type ProjectionPoint = {
  year: number
  value: number
  roi: number
  yearlyGrowth: number
  aboveCost: boolean
}

type Projection = {
  points: ProjectionPoint[]
  years: number
  totalCost: number
  breakEvenYear: number
}

const Wrapper = styled.div`
  margin-top: 12px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const IconBadge = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Title = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const Subtitle = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const BreakEven = styled.span`
  font-size: 9px;
  color: ${theme.colors.emerald};
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.15);
  padding: 2px 8px;
  border-radius: ${theme.radii.sm};
`

const Tooltip = styled.div`
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.md};
  padding: 6px 12px;
  transition: ${theme.transitions.normal};
`

const TooltipLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const TooltipRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const TooltipTitle = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${theme.colors.slate[300]};
`

const TooltipValue = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

const TooltipRoi = styled.span<{ $positive: boolean }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? theme.colors.emerald : theme.colors.red)};
`

const TooltipGrowth = styled.span`
  font-size: 9px;
  color: ${theme.colors.purple};
`

const Chart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 3px;
  ${media.sm} {
    gap: 4px;
  }
`

const BarColumn = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  position: relative;
  cursor: pointer;
`

const Bar = styled.div<{ $active: boolean }>`
  width: 100%;
  border-radius: 4px 4px 0 0;
  transition: ${theme.transitions.fast};
  opacity: ${({ $active }) => ($active ? 1 : 0.75)};

  &:hover {
    opacity: 0.9;
  }
`

const YearLabel = styled.span<{ $highlight: boolean }>`
  margin-top: 4px;
  font-size: 8px;
  color: ${({ $highlight }) => ($highlight ? theme.colors.slate[400] : theme.colors.slate[600])};
  font-weight: ${({ $highlight }) => ($highlight ? 500 : 400)};
`

const CostLineWrapper = styled.div`
  position: relative;
  margin-top: 4px;
  height: 12px;
`

const CostLine = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  border-top: 1px dashed rgba(249, 115, 22, 0.3);
`

const CostLabel = styled.span`
  position: absolute;
  right: 0;
  top: 0;
  font-size: 7px;
  color: rgba(249, 115, 22, 0.6);
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
  font-size: 8px;
  color: ${theme.colors.slate[500]};
`

const LegendItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const LegendSwatch = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: ${({ $color }) => $color};
`

export default function InvestmentProjection({
  totalPrice,
  projectedValue,
  readinessEstimate,
}: InvestmentProjectionProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null)

  const projection = useMemo<Projection | null>(() => {
    if (!totalPrice || !projectedValue || totalPrice <= 0) return null
    if (projectedValue <= totalPrice) return null

    let years = 5
    if (readinessEstimate) {
      if (readinessEstimate.includes('1-3')) years = 3
      else if (readinessEstimate.includes('3-5')) years = 5
      else if (readinessEstimate.includes('5+') || readinessEstimate.includes('5-')) years = 7
      else {
        const match = readinessEstimate.match(/(\d+)/)
        if (match) years = Math.max(2, Math.min(15, parseInt(match[1], 10)))
      }
    }

    const purchaseTax = Math.round(totalPrice * 0.06)
    const attorneyFees = Math.round(totalPrice * 0.0175)
    const totalCost = totalPrice + purchaseTax + attorneyFees

    const points: ProjectionPoint[] = []
    const midpoint = years * 0.55
    const steepness = 6 / years

    for (let y = 0; y <= years; y += 1) {
      const sigmoid = 1 / (1 + Math.exp(-steepness * (y - midpoint)))
      const sigmoidStart = 1 / (1 + Math.exp(-steepness * (0 - midpoint)))
      const sigmoidEnd = 1 / (1 + Math.exp(-steepness * (years - midpoint)))
      const normalized = (sigmoid - sigmoidStart) / (sigmoidEnd - sigmoidStart)

      const value = Math.round(totalPrice + (projectedValue - totalPrice) * normalized)
      const roi = Math.round(((value - totalPrice) / totalPrice) * 100)
      const yearlyGrowth =
        y > 0
          ? Math.round(((value - points[y - 1].value) / points[y - 1].value) * 100 * 10) / 10
          : 0

      points.push({
        year: y,
        value,
        roi,
        yearlyGrowth,
        aboveCost: value >= totalCost,
      })
    }

    const breakEvenYear = points.findIndex(p => p.aboveCost)

    return { points, years, totalCost, breakEvenYear }
  }, [totalPrice, projectedValue, readinessEstimate])

  if (!projection || !projectedValue || !totalPrice) return null

  const { points, years, totalCost, breakEvenYear } = projection
  const maxValue = projectedValue * 1.05
  const barHeight = 120
  const activePoint = hoveredYear !== null ? points[hoveredYear] : null

  return (
    <Wrapper>
      <Header>
        <HeaderLeft>
          <IconBadge>
            <TrendingUp size={14} color={theme.colors.purple} />
          </IconBadge>
          <TitleBlock>
            <Title>תחזית צמיחה שנתית</Title>
            <Subtitle>מודל S-Curve · {years} שנים</Subtitle>
          </TitleBlock>
        </HeaderLeft>
        {breakEvenYear > 0 && <BreakEven>✅ עובר עלות בשנה {breakEvenYear}</BreakEven>}
      </Header>

      {activePoint && (
        <Tooltip>
          <TooltipLeft>
            <Calendar size={12} color={theme.colors.purple} />
            <TooltipTitle>שנה {activePoint.year}</TooltipTitle>
          </TooltipLeft>
          <TooltipRight>
            <TooltipValue>{formatCurrency(activePoint.value)}</TooltipValue>
            <TooltipRoi $positive={activePoint.roi >= 0}>
              {activePoint.roi >= 0 ? '+' : ''}
              {activePoint.roi}%
            </TooltipRoi>
            {activePoint.yearlyGrowth > 0 && (
              <TooltipGrowth>+{activePoint.yearlyGrowth}%/שנה</TooltipGrowth>
            )}
          </TooltipRight>
        </Tooltip>
      )}

      <Chart
        style={{ height: `${barHeight}px` }}
        onMouseLeave={() => setHoveredYear(null)}
        role="img"
        aria-label={`תחזית צמיחה: מ-${formatPriceShort(totalPrice)} ל-${formatPriceShort(projectedValue)} ב-${years} שנים`}
      >
        {points.map((point, i) => {
          const height = Math.max(8, (point.value / maxValue) * barHeight)
          const isFirst = i === 0
          const isLast = i === years
          const isBreakEven = i === breakEvenYear
          const isHovered = hoveredYear === i
          const isAboveCost = point.aboveCost

          let barColor = theme.colors.purple
          if (isFirst) barColor = theme.colors.blue
          else if (isLast) barColor = theme.colors.emerald
          else if (!isAboveCost) barColor = theme.colors.purple
          else barColor = `hsl(${140 + (i / years) * 20}, 70%, 55%)`

          return (
            <BarColumn
              key={i}
              style={{ height: '100%' }}
              onMouseEnter={() => setHoveredYear(i)}
              onClick={() => setHoveredYear(i === hoveredYear ? null : i)}
            >
              {isBreakEven && !isFirst && (
                <div style={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}>
                  <Target size={12} color={theme.colors.emerald} />
                </div>
              )}
              <Bar
                $active={isHovered}
                style={{
                  height: `${height}px`,
                  background: barColor,
                  minHeight: '8px',
                  boxShadow: isHovered ? '0 0 0 1px rgba(255,255,255,0.2)' : 'none',
                }}
              />
              <YearLabel $highlight={isFirst || isLast || isHovered}>
                {isFirst ? 'היום' : isLast ? 'יעד' : i}
              </YearLabel>
            </BarColumn>
          )
        })}
      </Chart>

      {totalCost < projectedValue && (
        <CostLineWrapper>
          <CostLine style={{ bottom: `${(totalCost / maxValue) * 100}%` }} />
          <CostLabel>עלות כוללת: {formatPriceShort(totalCost)}</CostLabel>
        </CostLineWrapper>
      )}

      <Legend>
        <LegendItem>
          <LegendSwatch $color={theme.colors.blue} /> מחיר רכישה
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color={theme.colors.purple} /> צמיחה צפויה
        </LegendItem>
        <LegendItem>
          <LegendSwatch $color={theme.colors.emerald} /> שווי יעד
        </LegendItem>
      </Legend>
    </Wrapper>
  )
}
