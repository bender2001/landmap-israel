import { useMemo } from 'react'
import styled from 'styled-components'
import { formatCurrency } from '../../utils/format'
import { theme } from '../../styles/theme'

const Panel = styled.div`
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.lg};
  padding: 12px;
  margin: 12px 0;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: ${theme.colors.slate[200]};
`

const Roi = styled.span<{ $positive: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? theme.colors.emerald : theme.colors.red)};
`

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Label = styled.span`
  width: 80px;
  flex-shrink: 0;
  font-size: 10px;
  color: ${theme.colors.slate[400]};
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Track = styled.div`
  flex: 1;
  height: 16px;
  border-radius: ${theme.radii.sm};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const Fill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => `${$width}%`};
  border-radius: ${theme.radii.sm};
  background: ${({ $color }) => `linear-gradient(90deg, ${$color}cc, ${$color}88)`};
  transition: width ${theme.transitions.smooth};
`

const Value = styled.span<{ $tone: 'base' | 'cost' | 'profit' }>`
  width: 65px;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 500;
  text-align: left;
  color: ${({ $tone }) => {
    if ($tone === 'profit') return theme.colors.emerald
    if ($tone === 'cost') return theme.colors.orange
    return theme.colors.slate[300]
  }};
`

const Summary = styled.div`
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

interface ProfitWaterfallProps {
  totalPrice: number
  projectedValue: number
  sizeSqM?: number
}

export default function ProfitWaterfall({ totalPrice, projectedValue }: ProfitWaterfallProps) {
  const breakdown = useMemo(() => {
    if (!totalPrice || !projectedValue || totalPrice <= 0) return null

    const purchaseTax = Math.round(totalPrice * 0.06)
    const legalFees = Math.round(totalPrice * 0.0175)
    const totalCost = totalPrice + purchaseTax + legalFees
    const grossProfit = projectedValue - totalPrice
    const bettermentLevy = Math.round(Math.max(0, grossProfit) * 0.5)
    const netProfit = projectedValue - totalCost - bettermentLevy
    const netRoi = Math.round((netProfit / totalCost) * 100)

    return {
      steps: [
        { label: 'מחיר רכישה', value: totalPrice, type: 'base', color: theme.colors.blue },
        { label: 'מס רכישה (6%)', value: purchaseTax, type: 'cost', color: theme.colors.red },
        { label: 'שכ"ט עו"ד', value: legalFees, type: 'cost', color: theme.colors.amber },
        { label: 'היטל השבחה', value: bettermentLevy, type: 'cost', color: theme.colors.orange },
        { label: 'רווח נקי', value: netProfit, type: 'profit', color: netProfit >= 0 ? theme.colors.emerald : theme.colors.red },
      ],
      totalCost,
      netProfit,
      netRoi,
    }
  }, [totalPrice, projectedValue])

  if (!breakdown) return null

  const { steps, totalCost, netProfit, netRoi } = breakdown
  const maxVal = Math.max(totalPrice, projectedValue, totalCost)

  return (
    <Panel>
      <Header>
        <Title>
          <span>📊</span>
          <span>פירוט רווחיות</span>
        </Title>
        <Roi $positive={netProfit >= 0}>ROI נקי: {netRoi > 0 ? '+' : ''}{netRoi}%</Roi>
      </Header>

      <Rows>
        {steps.map((step, i) => {
          const barWidth = Math.max(5, (Math.abs(step.value) / maxVal) * 100)
          return (
            <Row key={i}>
              <Label title={step.label}>{step.label}</Label>
              <Track>
                <Fill $width={barWidth} $color={step.color} />
              </Track>
              <Value $tone={step.type === 'profit' ? 'profit' : step.type === 'cost' ? 'cost' : 'base'}>
                {step.type === 'cost' ? '-' : ''}{formatCurrency(Math.abs(step.value))}
              </Value>
            </Row>
          )
        })}
      </Rows>

      <Summary>
        <span>עלות כוללת: {formatCurrency(totalCost)}</span>
        <span>שווי צפוי: {formatCurrency(projectedValue)}</span>
      </Summary>
    </Panel>
  )
}
