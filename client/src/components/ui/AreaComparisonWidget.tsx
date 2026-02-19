import { useMemo } from 'react'
import styled from 'styled-components'
import { TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react'
import { theme } from '../../styles/theme'

type Plot = {
  id?: string | number
  city?: string
  total_price?: number
  totalPrice?: number
  size_sqm?: number
  sizeSqM?: number
  projected_value?: number
  projectedValue?: number
  _investmentScore?: number
}

interface ComparisonBarProps {
  label: string
  plotValue: number
  avgValue: number
  unit?: string
  formatter?: (value: number) => string
  lowerIsBetter?: boolean
}

interface AreaComparisonWidgetProps {
  plot?: Plot | null
  allPlots?: Plot[] | null
}

type DiffVariant = 'neutral' | 'good' | 'bad'

const Card = styled.div`
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(168, 85, 247, 0.05));
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: ${theme.radii.xxl};
  padding: 16px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
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
  display: flex;
  align-items: center;
  justify-content: center;
`

const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const Title = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const Subtitle = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const VerdictBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: ${theme.radii.md};
  font-size: 10px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}30`};
`

const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ComparisonBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const RowHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const RowLabel = styled.span`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const RowValues = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const ValueText = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: ${theme.colors.slate[200]};
`

const UnitText = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const DiffBadge = styled.span<{ $variant: DiffVariant }>`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 9px;
  font-weight: 700;
  color: ${({ $variant }) => {
    if ($variant === 'good') return theme.colors.emerald
    if ($variant === 'bad') return theme.colors.red
    return theme.colors.slate[400]
  }};
`

const BarTrack = styled.div`
  position: relative;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const BarMarker = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: ${theme.colors.slate[600]};
  z-index: 1;
`

const BarFill = styled.div<{ $variant: DiffVariant }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: ${theme.radii.full};
  transition: ${theme.transitions.smooth};
  background: ${({ $variant }) => {
    if ($variant === 'good') return 'rgba(34, 197, 94, 0.5)'
    if ($variant === 'bad') return 'rgba(239, 68, 68, 0.5)'
    return 'rgba(100, 116, 139, 0.4)'
  }};
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 8px;
  color: ${theme.colors.slate[600]};
`

const ComparisonBar = ({
  label,
  plotValue,
  avgValue,
  unit,
  formatter,
  lowerIsBetter = false,
}: ComparisonBarProps) => {
  if (avgValue <= 0 || plotValue == null) return null

  const diff = plotValue - avgValue
  const diffPct = Math.round((diff / avgValue) * 100)
  const absDiffPct = Math.abs(diffPct)
  const isGood = lowerIsBetter ? diff < 0 : diff > 0
  const isNeutral = absDiffPct <= 3
  const variant: DiffVariant = isNeutral ? 'neutral' : isGood ? 'good' : 'bad'
  const Icon = isNeutral ? Minus : diff > 0 ? TrendingUp : TrendingDown
  const barPct = Math.min(100, Math.max(0, 50 + diffPct / 2))

  return (
    <ComparisonBlock>
      <RowHeader>
        <RowLabel>{label}</RowLabel>
        <RowValues>
          <ValueText>
            {formatter ? formatter(plotValue) : plotValue}
            {unit && <UnitText> {unit}</UnitText>}
          </ValueText>
          {!isNeutral && (
            <DiffBadge $variant={variant}>
              <Icon size={10} />
              {absDiffPct}%
            </DiffBadge>
          )}
        </RowValues>
      </RowHeader>

      <BarTrack>
        <BarMarker />
        <BarFill
          $variant={variant}
          style={{
            left: diffPct >= 0 ? '50%' : `${barPct}%`,
            width: `${Math.min(50, absDiffPct / 2)}%`,
          }}
        />
      </BarTrack>

      <Legend>
        <span>{lowerIsBetter ? 'יקר' : 'נמוך'}</span>
        <span>
          ממוצע {formatter ? formatter(avgValue) : avgValue}
          {unit ? ` ${unit}` : ''}
        </span>
        <span>{lowerIsBetter ? 'זול' : 'גבוה'}</span>
      </Legend>
    </ComparisonBlock>
  )
}

export default function AreaComparisonWidget({ plot, allPlots }: AreaComparisonWidgetProps) {
  const cityStats = useMemo(() => {
    if (!plot || !allPlots || allPlots.length < 3) return null

    const city = plot.city
    const cityPlots = allPlots.filter(p => p.city === city && p.id !== plot.id)
    if (cityPlots.length < 2) return null

    let totalPsm = 0
    let totalRoi = 0
    let totalScore = 0
    let totalSize = 0
    let psmCount = 0
    let roiCount = 0
    let scoreCount = 0
    let sizeCount = 0

    for (const p of cityPlots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const proj = p.projected_value ?? p.projectedValue ?? 0
      const score = p._investmentScore ?? 0

      if (price > 0 && size > 0) {
        totalPsm += price / size
        psmCount += 1
      }
      if (price > 0 && proj > 0) {
        totalRoi += ((proj - price) / price) * 100
        roiCount += 1
      }
      if (score > 0) {
        totalScore += score
        scoreCount += 1
      }
      if (size > 0) {
        totalSize += size
        sizeCount += 1
      }
    }

    if (psmCount === 0) return null

    return {
      city,
      count: cityPlots.length,
      avgPsm: Math.round(totalPsm / psmCount),
      avgRoi: roiCount > 0 ? Math.round(totalRoi / roiCount) : 0,
      avgScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : 0,
      avgSize: sizeCount > 0 ? Math.round(totalSize / sizeCount) : 0,
    }
  }, [plot?.id, plot?.city, allPlots])

  const plotMetrics = useMemo(() => {
    if (!plot) return null
    const price = plot.total_price ?? plot.totalPrice ?? 0
    const size = plot.size_sqm ?? plot.sizeSqM ?? 0
    const proj = plot.projected_value ?? plot.projectedValue ?? 0
    const score = plot._investmentScore ?? 0
    return {
      psm: size > 0 ? Math.round(price / size) : 0,
      roi: price > 0 ? Math.round(((proj - price) / price) * 100) : 0,
      score,
      size,
    }
  }, [plot])

  if (!cityStats || !plotMetrics) return null

  const metrics = [
    {
      diff: cityStats.avgPsm > 0 ? (plotMetrics.psm - cityStats.avgPsm) / cityStats.avgPsm : 0,
      lowerIsBetter: true,
    },
    {
      diff: cityStats.avgRoi > 0 ? (plotMetrics.roi - cityStats.avgRoi) / cityStats.avgRoi : 0,
      lowerIsBetter: false,
    },
    {
      diff: cityStats.avgScore > 0 ? (plotMetrics.score - cityStats.avgScore) / cityStats.avgScore : 0,
      lowerIsBetter: false,
    },
  ]

  const goodCount = metrics.filter(m => {
    const isGood = m.lowerIsBetter ? m.diff < -0.03 : m.diff > 0.03
    return isGood
  }).length

  const verdict = goodCount >= 2
    ? { label: 'עסקה מעל הממוצע', color: theme.colors.emerald, emoji: '🔥' }
    : goodCount >= 1
      ? { label: 'בטווח הממוצע', color: theme.colors.amber, emoji: '📊' }
      : { label: 'מתחת לממוצע', color: theme.colors.red, emoji: '⚠️' }

  const formatILS = (value: number) => `₪${value.toLocaleString()}`
  const formatSqm = (value: number) => `${(value / 1000).toFixed(1)} דונם`

  return (
    <Card>
      <Header>
        <HeaderLeft>
          <IconBadge>
            <MapPin size={14} color={theme.colors.purple} />
          </IconBadge>
          <TitleBlock>
            <Title>ביחס לאזור — {cityStats.city}</Title>
            <Subtitle>בהשוואה ל-{cityStats.count} חלקות באזור</Subtitle>
          </TitleBlock>
        </HeaderLeft>
        <VerdictBadge $color={verdict.color}>
          <span>{verdict.emoji}</span>
          <span>{verdict.label}</span>
        </VerdictBadge>
      </Header>

      <Bars>
        <ComparisonBar
          label="מחיר/מ״ר"
          plotValue={plotMetrics.psm}
          avgValue={cityStats.avgPsm}
          unit="/מ״ר"
          formatter={formatILS}
          lowerIsBetter={true}
        />
        <ComparisonBar
          label="תשואה צפויה"
          plotValue={plotMetrics.roi}
          avgValue={cityStats.avgRoi}
          unit="%"
          lowerIsBetter={false}
        />
        <ComparisonBar
          label="ציון השקעה"
          plotValue={plotMetrics.score}
          avgValue={cityStats.avgScore}
          unit="/10"
          lowerIsBetter={false}
        />
        <ComparisonBar
          label="שטח"
          plotValue={plotMetrics.size}
          avgValue={cityStats.avgSize}
          formatter={formatSqm}
          lowerIsBetter={false}
        />
      </Bars>
    </Card>
  )
}
