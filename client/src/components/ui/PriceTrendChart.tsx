import { useMemo } from 'react'
import styled from 'styled-components'
import { TrendingUp, TrendingDown, Database } from 'lucide-react'
import { usePlotPriceHistory } from '../../hooks/useMarket'
import { theme } from '../../styles/theme'

type TrendPoint = {
  month: string
  price: number
}

interface PriceTrendChartProps {
  totalPrice: number
  sizeSqM: number
  city?: string
  plotId?: string | number
}

const Wrapper = styled.div`
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
  gap: 12px;
  margin-bottom: 8px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const Title = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${theme.colors.slate[200]};
`

const DataBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: ${theme.radii.sm};
  font-size: 8px;
  font-weight: 700;
  color: ${theme.colors.emerald};
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.2);
`

const Change = styled.span<{ $up: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $up }) => ($up ? theme.colors.emerald : theme.colors.red)};
`

const ChartSvg = styled.svg`
  width: 100%;
  display: block;
`

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const RangeText = styled.span`
  color: ${theme.colors.slate[400]};
`

const Note = styled.div`
  font-size: 8px;
  color: ${theme.colors.slate[600]};
  text-align: center;
  margin-top: 4px;
`

const generateSyntheticTrend = (currentPricePerSqm: number, city?: string, months = 12): TrendPoint[] => {
  const cityGrowthRates: Record<string, number> = {
    'חדרה': 0.012,
    'נתניה': 0.015,
    'קיסריה': 0.018,
  }
  const baseGrowth = (city && cityGrowthRates[city]) || 0.01
  const dataPoints: number[] = []
  let price = currentPricePerSqm

  for (let i = 0; i < months; i += 1) {
    dataPoints.unshift(price)
    const noise = Math.sin(i * 0.7 + (price % 7)) * 0.008 + Math.cos(i * 1.3) * 0.005
    price = price / (1 + baseGrowth + noise)
  }

  const now = new Date()
  return dataPoints.map((p, i) => {
    const date = new Date(now)
    date.setMonth(date.getMonth() - (months - 1 - i))
    return {
      month: date.toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
      price: Math.round(p),
    }
  })
}

export default function PriceTrendChart({ totalPrice, sizeSqM, city, plotId }: PriceTrendChartProps) {
  const pricePerSqm = sizeSqM > 0 ? totalPrice / sizeSqM : 0
  const { data: realHistory } = usePlotPriceHistory(plotId)

  const { trend, isRealData } = useMemo(() => {
    if (pricePerSqm <= 0) return { trend: null, isRealData: false }

    if (realHistory && realHistory.length >= 2) {
      const points = realHistory.map(h => ({
        month: new Date(h.snapshot_date).toLocaleDateString('he-IL', { month: 'short', year: '2-digit' }),
        price: Math.round(h.price_per_sqm),
      }))
      return { trend: points, isRealData: true }
    }

    return { trend: generateSyntheticTrend(pricePerSqm, city, 12), isRealData: false }
  }, [pricePerSqm, city, realHistory])

  if (!trend || trend.length < 2) return null

  const prices = trend.map(t => t.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice || 1

  const firstPrice = prices[0]
  const lastPrice = prices[prices.length - 1]
  const changePct = Math.round(((lastPrice - firstPrice) / firstPrice) * 100)
  const isUp = changePct >= 0

  const width = 280
  const height = 60
  const padding = { top: 4, bottom: 4, left: 2, right: 2 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = prices.map((p, i) => {
    const x = padding.left + (i / (prices.length - 1)) * chartW
    const y = padding.top + chartH - ((p - minPrice) / range) * chartH
    return { x, y }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const fillPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`
  const gradientId = `trend-grad-${city}-${Math.round(pricePerSqm)}`

  return (
    <Wrapper>
      <Header>
        <HeaderLeft>
          {isUp ? <TrendingUp size={14} color={theme.colors.emerald} /> : <TrendingDown size={14} color={theme.colors.red} />}
          <Title>
            מגמת מחירים ({trend.length} {trend.length <= 12 ? 'חודשים' : 'נקודות'})
          </Title>
          {isRealData && (
            <DataBadge>
              <Database size={10} /> נתונים אמיתיים
            </DataBadge>
          )}
        </HeaderLeft>
        <Change $up={isUp}>
          {isUp ? '+' : ''}
          {changePct}%
        </Change>
      </Header>

      <ChartSvg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isUp ? theme.colors.emerald : theme.colors.red} stopOpacity="0.2" />
            <stop offset="100%" stopColor={isUp ? theme.colors.emerald : theme.colors.red} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(pct => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + chartH * (1 - pct)}
            x2={width - padding.right}
            y2={padding.top + chartH * (1 - pct)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        ))}

        <path d={fillPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={isUp ? theme.colors.emerald : theme.colors.red}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill={isUp ? theme.colors.emerald : theme.colors.red}
          stroke={theme.colors.navy}
          strokeWidth="1.5"
        />
      </ChartSvg>

      <Footer>
        <span>{trend[0].month}</span>
        <RangeText>
          ₪{Math.round(minPrice).toLocaleString()} - ₪{Math.round(maxPrice).toLocaleString()} / מ״ר
        </RangeText>
        <span>{trend[trend.length - 1].month}</span>
      </Footer>

      {!isRealData && <Note>* הערכה על בסיס מגמות אזוריות</Note>}
    </Wrapper>
  )
}
