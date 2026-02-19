import { useMemo } from 'react'
import styled from 'styled-components'
import { TrendingUp, Landmark, BarChart3, Building2, Coins } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import { calcCAGR } from '../../utils/investment'
import { theme } from '../../styles/theme'

type Benchmark = {
  id: string
  label: string
  rate: number
  icon: LucideIcon
  color: string
  emoji: string
}

interface InvestmentBenchmarkProps {
  totalPrice?: number
  projectedValue?: number
  readinessEstimate?: string | null
  className?: string
}

type Comparison = Benchmark & {
  altProfit: number
  advantage: number
  advantagePct: number
  isBetter: boolean
}

type Analysis = {
  cagr: number
  years: number
  comparisons: Comparison[]
  maxRate: number
  verdict: string
  verdictColor: string
  plotProfit: number
  betterCount: number
}

const BENCHMARKS: Benchmark[] = [
  { id: 'deposit', label: 'פיקדון בנקאי', rate: 4.5, icon: Landmark, color: '#94A3B8', emoji: '🏦' },
  { id: 'bonds', label: 'אג״ח ממשלתי', rate: 5.0, icon: Coins, color: '#818CF8', emoji: '📜' },
  { id: 'realestate', label: 'נדל״ן ממוצע', rate: 7.0, icon: Building2, color: '#60A5FA', emoji: '🏠' },
  { id: 'sp500', label: 'S&P 500', rate: 10.0, icon: BarChart3, color: '#A78BFA', emoji: '📊' },
]

const Card = styled.div`
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.lg};
  padding: 12px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 500;
  color: ${theme.colors.slate[200]};
`

const Verdict = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: ${theme.radii.full};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}30`};
`

const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const BarLabel = styled.span`
  width: 96px;
  flex-shrink: 0;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const HighlightLabel = styled(BarLabel)`
  color: ${theme.colors.gold};
  font-weight: 700;
`

const BarTrack = styled.div`
  flex: 1;
  height: 12px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const PlotFill = styled.div`
  height: 100%;
  border-radius: ${theme.radii.full};
  background: ${theme.gradients.gold};
  transition: ${theme.transitions.smooth};
`

const BenchmarkFill = styled.div<{ $color: string; $muted: boolean }>`
  height: 100%;
  border-radius: ${theme.radii.full};
  transition: ${theme.transitions.smooth};
  background: ${({ $color, $muted }) => ($muted ? `${$color}40` : $color)};
  opacity: ${({ $muted }) => ($muted ? 0.5 : 0.8)};
`

const BarValue = styled.span<{ $muted?: boolean }>`
  width: 56px;
  flex-shrink: 0;
  font-size: 10px;
  text-align: left;
  color: ${({ $muted }) => ($muted ? theme.colors.slate[500] : theme.colors.slate[300])};
  font-weight: ${({ $muted }) => ($muted ? 400 : 500)};
`

const Footer = styled.div`
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const FooterRow = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const AdvantageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 6px;
`

const AdvantageCard = styled.div<{ $highlight?: boolean }>`
  text-align: center;
  border-radius: ${theme.radii.md};
  padding: 6px 8px;
  background: ${({ $highlight }) => ($highlight ? 'rgba(200,148,42,0.05)' : 'rgba(255,255,255,0.03)')};
`

const AdvantageLabel = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const AdvantageValue = styled.div<{ $highlight?: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $highlight }) => ($highlight ? theme.colors.gold : theme.colors.slate[400])};
`

const AdvantageNote = styled.div`
  margin-top: 6px;
  font-size: 9px;
  color: ${theme.colors.emerald};
  text-align: center;
`

const Footnote = styled.p`
  margin-top: 8px;
  font-size: 8px;
  color: ${theme.colors.slate[600]};
`

export default function InvestmentBenchmark({
  totalPrice,
  projectedValue,
  readinessEstimate,
  className = '',
}: InvestmentBenchmarkProps) {
  const analysis = useMemo<Analysis | null>(() => {
    if (!totalPrice || totalPrice <= 0 || !projectedValue || projectedValue <= totalPrice) return null

    const roi = ((projectedValue - totalPrice) / totalPrice) * 100
    const cagrData = calcCAGR(roi, readinessEstimate)
    if (!cagrData || cagrData.cagr <= 0) return null

    const { cagr, years } = cagrData

    const plotFinal = totalPrice * Math.pow(1 + cagr / 100, years)
    const plotProfit = plotFinal - totalPrice

    const comparisons: Comparison[] = BENCHMARKS.map(b => {
      const altFinal = totalPrice * Math.pow(1 + b.rate / 100, years)
      const altProfit = altFinal - totalPrice
      const advantage = plotProfit - altProfit
      const advantagePct = altProfit > 0 ? Math.round((advantage / altProfit) * 100) : 999
      return {
        ...b,
        altProfit,
        advantage,
        advantagePct,
        isBetter: cagr > b.rate,
      }
    })

    const maxRate = Math.max(cagr, ...BENCHMARKS.map(b => b.rate))

    let verdict = 'תשואה נמוכה ביחס לאלטרנטיבות'
    let verdictColor = theme.colors.red
    const betterCount = comparisons.filter(c => c.isBetter).length

    if (betterCount === 4) {
      verdict = 'עדיף על כל האלטרנטיבות'
      verdictColor = theme.colors.emerald
    } else if (betterCount >= 3) {
      verdict = 'עדיף על רוב האלטרנטיבות'
      verdictColor = '#84CC16'
    } else if (betterCount >= 2) {
      verdict = 'עדיף על חלק מהאלטרנטיבות'
      verdictColor = theme.colors.amber
    }

    return { cagr, years, comparisons, maxRate, verdict, verdictColor, plotProfit, betterCount }
  }, [totalPrice, projectedValue, readinessEstimate])

  if (!analysis) return null

  return (
    <Card className={className}>
      <Header>
        <TitleRow>
          <TrendingUp size={14} color={theme.colors.gold} />
          <span>השוואה להשקעות חלופיות</span>
        </TitleRow>
        <Verdict $color={analysis.verdictColor}>{analysis.verdict}</Verdict>
      </Header>

      <Bars>
        <BarRow>
          <HighlightLabel>🏗️ חלקה זו</HighlightLabel>
          <BarTrack>
            <PlotFill
              style={{ width: `${Math.min(100, (analysis.cagr / analysis.maxRate) * 100)}%` }}
            />
          </BarTrack>
          <BarValue $muted={false}>{analysis.cagr}%/שנה</BarValue>
        </BarRow>

        {analysis.comparisons.map(c => (
          <BarRow key={c.id}>
            <BarLabel>
              {c.emoji} {c.label}
            </BarLabel>
            <BarTrack>
              <BenchmarkFill
                $color={c.color}
                $muted={c.isBetter}
                style={{ width: `${Math.min(100, (c.rate / analysis.maxRate) * 100)}%` }}
              />
            </BarTrack>
            <BarValue $muted={c.isBetter}>{c.rate}%/שנה</BarValue>
          </BarRow>
        ))}
      </Bars>

      <Footer>
        <FooterRow>
          על השקעה של {formatCurrency(totalPrice)} לתקופה של {analysis.years} שנים:
        </FooterRow>
        <AdvantageGrid>
          <AdvantageCard $highlight>
            <AdvantageLabel>רווח מהחלקה</AdvantageLabel>
            <AdvantageValue $highlight>
              {formatCurrency(Math.round(analysis.plotProfit))}
            </AdvantageValue>
          </AdvantageCard>
          <AdvantageCard>
            <AdvantageLabel>רווח מפיקדון</AdvantageLabel>
            <AdvantageValue>
              {formatCurrency(Math.round(analysis.comparisons[0].altProfit))}
            </AdvantageValue>
          </AdvantageCard>
        </AdvantageGrid>
        {analysis.comparisons[0].advantage > 0 && (
          <AdvantageNote>
            ✨ עודף רווח של {formatCurrency(Math.round(analysis.comparisons[0].advantage))} מעל פיקדון בנקאי
          </AdvantageNote>
        )}
      </Footer>

      <Footnote>* ריביות משוערות, לפני מיסוי. תשואת החלקה מבוססת על הערכת שווי צפוי.</Footnote>
    </Card>
  )
}
