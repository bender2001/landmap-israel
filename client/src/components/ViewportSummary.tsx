import { memo, useMemo, useState } from 'react'
import { BarChart3, TrendingUp, Ruler, DollarSign, ChevronDown, ChevronUp } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { formatPriceShort, formatCurrency } from '../utils/format'
import { calcMonthlyPayment } from '../utils/investment'
import { theme, media } from '../styles/theme'

type PlotRecord = {
  total_price?: number
  totalPrice?: number
  size_sqm?: number
  sizeSqM?: number
  projected_value?: number
  projectedValue?: number
  status?: string
}

type ViewportSummaryProps = {
  plots?: PlotRecord[]
}

type Stats = {
  count: number
  available: number
  totalValue: number
  avgPrice: number
  avgPriceSqm: number
  avgRoi: number
  avgMonthly: number
  totalArea: number
  priceRange: { min: number; max: number }
}

const ViewportSummary = memo(function ViewportSummary({ plots }: ViewportSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const stats = useMemo<Stats | null>(() => {
    if (!plots || plots.length === 0) return null

    let totalValue = 0
    let totalProjected = 0
    let totalArea = 0
    let priceCount = 0
    let availableCount = 0
    let monthlySum = 0
    let monthlyCount = 0
    let minPrice = Number.POSITIVE_INFINITY
    let maxPrice = 0

    for (const plot of plots) {
      const price = plot.total_price ?? plot.totalPrice ?? 0
      const size = plot.size_sqm ?? plot.sizeSqM ?? 0
      const projected = plot.projected_value ?? plot.projectedValue ?? 0

      if (price > 0) {
        totalValue += price
        priceCount += 1
        if (price < minPrice) minPrice = price
        if (price > maxPrice) maxPrice = price
      }
      if (projected > 0) totalProjected += projected
      if (size > 0) totalArea += size
      if (plot.status === 'AVAILABLE') availableCount += 1

      if (price > 0) {
        const payment = calcMonthlyPayment(price)
        if (payment) {
          monthlySum += payment.monthly
          monthlyCount += 1
        }
      }
    }

    const avgPriceSqm = totalArea > 0 ? Math.round(totalValue / totalArea) : 0
    const avgRoi = totalValue > 0 ? Math.round(((totalProjected - totalValue) / totalValue) * 100) : 0
    const avgMonthly = monthlyCount > 0 ? Math.round(monthlySum / monthlyCount) : 0
    const avgPrice = priceCount > 0 ? Math.round(totalValue / priceCount) : 0

    return {
      count: plots.length,
      available: availableCount,
      totalValue,
      avgPrice,
      avgPriceSqm,
      avgRoi,
      avgMonthly,
      totalArea,
      priceRange: { min: minPrice === Number.POSITIVE_INFINITY ? 0 : minPrice, max: maxPrice },
    }
  }, [plots])

  if (!stats || stats.count === 0) return null

  const roiTone = stats.avgRoi >= 100 ? 'high' : stats.avgRoi >= 50 ? 'mid' : 'low'

  return (
    <Wrapper dir="rtl">
      <Panel>
        <HeaderButton
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label="סיכום תיק השקעות"
        >
          <BarChart3 aria-hidden />
          <HeaderStats>
            <CountText>{stats.count}</CountText>
            <LabelText>חלקות</LabelText>
            <Dot>·</Dot>
            <ValueText>{formatPriceShort(stats.totalValue)}</ValueText>
            <Dot>·</Dot>
            <RoiText $tone={roiTone}>+{stats.avgRoi}%</RoiText>
          </HeaderStats>
          {isExpanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
        </HeaderButton>

        {isExpanded && (
          <ExpandedPanel>
            <StatGrid>
              <StatRow
                icon={<DollarSign aria-hidden />}
                label="שווי כולל"
                value={formatCurrency(stats.totalValue)}
                tone="gold"
              />
              <StatRow
                icon={<TrendingUp aria-hidden />}
                label="תשואה ממוצעת"
                value={`+${stats.avgRoi}%`}
                tone={stats.avgRoi >= 100 ? 'green' : 'gold'}
              />
              <StatRow
                icon={<Ruler aria-hidden />}
                label="מחיר/מ״ר ממוצע"
                value={`₪${stats.avgPriceSqm.toLocaleString()}`}
                tone="blue"
              />
              <StatRow
                icon={<BarChart3 aria-hidden />}
                label="תשלום חודשי ממ׳"
                value={stats.avgMonthly > 0 ? `₪${stats.avgMonthly.toLocaleString()}` : '—'}
                tone="purple"
              />
            </StatGrid>

            <RangeRow>
              <RangeLabel>טווח:</RangeLabel>
              <RangeValue>{formatPriceShort(stats.priceRange.min)}</RangeValue>
              <RangeBar>
                <RangeFill />
              </RangeBar>
              <RangeValue>{formatPriceShort(stats.priceRange.max)}</RangeValue>
            </RangeRow>

            <AvailabilityRow>
              <AvailabilityDot />
              <AvailabilityText>
                {stats.available} זמינות מתוך {stats.count}
              </AvailabilityText>
              <TotalAreaText>{(stats.totalArea / 1000).toFixed(1)} דונם סה״כ</TotalAreaText>
            </AvailabilityRow>
          </ExpandedPanel>
        )}
      </Panel>
    </Wrapper>
  )
})

type StatRowProps = {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'gold' | 'green' | 'blue' | 'purple'
}

function StatRow({ icon, label, value, tone }: StatRowProps) {
  return (
    <StatRowWrap>
      <StatIcon $tone={tone}>{icon}</StatIcon>
      <StatText>
        <StatLabel>{label}</StatLabel>
        <StatValue>{value}</StatValue>
      </StatText>
    </StatRowWrap>
  )
}

export default ViewportSummary

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const Wrapper = styled.div`
  position: fixed;
  top: 3.2rem;
  left: 0.75rem;
  z-index: 20;
  animation: ${fadeIn} 0.25s ease;

  ${media.sm} {
    top: 3.5rem;
    left: 1rem;
  }
`

const Panel = styled.div`
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.lg};
  box-shadow: ${theme.shadows.elevated};
  overflow: hidden;
  max-width: 280px;
`

const HeaderButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border: none;
  background: transparent;
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};

  svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  svg:first-child {
    color: ${theme.colors.gold};
  }

  svg:last-child {
    color: ${theme.colors.slate[500]};
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.05);
  }
`

const HeaderStats = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  font-size: 10px;
`

const CountText = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.gold};
`

const LabelText = styled.span`
  color: ${theme.colors.slate[400]};
`

const Dot = styled.span`
  color: ${theme.colors.slate[600]};
`

const ValueText = styled.span`
  color: ${theme.colors.slate[300]};
  font-weight: 600;
`

const RoiText = styled.span<{ $tone: 'high' | 'mid' | 'low' }>`
  font-weight: 600;
  color: ${({ $tone }) => {
    if ($tone === 'high') return theme.colors.emerald
    if ($tone === 'mid') return theme.colors.gold
    return theme.colors.slate[400]
  }};
`

const ExpandedPanel = styled.div`
  padding: 0.25rem 0.75rem 0.625rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: grid;
  gap: 0.5rem;
  animation: ${fadeIn} 0.25s ease;
`

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.25rem 1rem;
`

const StatRowWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`

const StatIcon = styled.span<{ $tone: 'gold' | 'green' | 'blue' | 'purple' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 12px;
    height: 12px;
    color: ${({ $tone }) => {
      if ($tone === 'green') return 'rgba(34, 197, 94, 0.6)'
      if ($tone === 'blue') return 'rgba(59, 130, 246, 0.6)'
      if ($tone === 'purple') return 'rgba(168, 85, 247, 0.6)'
      return 'rgba(200, 148, 42, 0.6)'
    }};
  }
`

const StatText = styled.div`
  display: flex;
  flex-direction: column;
`

const StatLabel = styled.span`
  font-size: 8px;
  color: ${theme.colors.slate[500]};
  line-height: 1.1;
`

const StatValue = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
`

const RangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
`

const RangeLabel = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const RangeValue = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[400]};
  font-variant-numeric: tabular-nums;
`

const RangeBar = styled.div`
  flex: 1;
  height: 4px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const RangeFill = styled.div`
  height: 100%;
  border-radius: ${theme.radii.full};
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.4), rgba(200, 148, 42, 0.4), rgba(239, 68, 68, 0.4));
`

const AvailabilityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
`

const AvailabilityDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: ${theme.colors.emerald};
  flex-shrink: 0;
`

const AvailabilityText = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const TotalAreaText = styled.span`
  margin-right: auto;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`
