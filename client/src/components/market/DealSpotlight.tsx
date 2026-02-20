// ── DealSpotlight ────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  ChevronLeft,
  MapPin,
  Trophy,
  Sparkles,
  X,
} from 'lucide-react'
import { calcInvestmentScore, getScoreLabel, calcCAGR } from '../../utils/investment'
import { formatPriceShort } from '../../utils/format'
import { theme } from '../../styles/theme'

/* ── Types ─────────────────────────────────────────────────── */

type DS_PlotRecord = {
  status?: string
  total_price?: number
  totalPrice?: number
  size_sqm?: number
  sizeSqM?: number
  projected_value?: number
  projectedValue?: number
  created_at?: string
  createdAt?: string
  block_number?: number | string
  blockNumber?: number | string
  readiness_estimate?: number | string
  readinessEstimate?: number | string
  number?: number | string
  city?: string
}

type DS_SpotlightPlot = DS_PlotRecord & {
  _spotlightScore: number
  _roi: number
  _dealPct: number
}

type DealSpotlightProps = {
  plots?: DS_PlotRecord[]
  onSelectPlot?: (plot: DS_PlotRecord) => void
}

type DS_ScoreLabel = { color: string }
type DS_CAGRResult = { cagr: number } | null

const DS_prefetchMinPlots = 3

/* ── Styled ────────────────────────────────────────────────── */

const DS_slideInRight = keyframes`
  from {
    transform: translateX(24px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`

const DS_CtaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 10px;
  color: rgba(200, 148, 42, 0.8);
  transition: ${theme.transitions.fast};

  svg {
    width: 12px;
    height: 12px;
  }
`

const DS_DismissButton = styled.button`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: ${theme.radii.full};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.slate[400]};
  transition: ${theme.transitions.fast};
  opacity: 0;

  svg {
    width: 12px;
    height: 12px;
  }

  &:hover,
  &:focus-visible {
    background: rgba(255, 255, 255, 0.1);
  }
`

const DS_SpotlightWrap = styled.div`
  position: fixed;
  right: 1rem;
  bottom: 200px;
  z-index: 25;
  max-width: 280px;
  display: none;
  animation: ${DS_slideInRight} 0.4s ease;

  @media (min-width: 640px) {
    display: block;
    bottom: 14rem;
  }
`

const DS_SpotlightCard = styled.div`
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border-radius: ${theme.radii.lg};
  border: 1px solid rgba(200, 148, 42, 0.18);
  background: ${theme.glass.bg};
  backdrop-filter: ${theme.glass.blur};
  box-shadow: ${theme.shadows.glass};
  transition: ${theme.transitions.normal};

  &:hover {
    border-color: rgba(200, 148, 42, 0.4);
  }

  &:hover ${DS_CtaRow} {
    color: rgba(200, 148, 42, 1);
  }

  &:hover ${DS_DismissButton} {
    opacity: 1;
  }
`

const DS_Shimmer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: ${theme.gradients.goldBar};
  opacity: 0.6;
`

const DS_CardBody = styled.div`
  padding: 0.75rem;
`

const DS_HeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`

const DS_HeaderIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(140deg, rgba(200, 148, 42, 0.2), rgba(245, 158, 11, 0.2));
  border: 1px solid rgba(200, 148, 42, 0.3);

  svg {
    width: 14px;
    height: 14px;
    color: ${theme.colors.gold};
  }
`

const DS_HeaderText = styled.div`
  display: grid;
  gap: 2px;
`

const DS_HeaderTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 10px;
  font-weight: 700;
  color: ${theme.colors.gold};

  svg {
    width: 12px;
    height: 12px;
  }
`

const DS_HeaderSubtitle = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const DS_PlotRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
`

const DS_PlotTitle = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const DS_ScoreTag = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: ${theme.radii.sm};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
`

const DS_LocationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 10px;
  color: ${theme.colors.slate[400]};
  margin-bottom: 0.5rem;

  svg {
    width: 10px;
    height: 10px;
  }
`

const DS_StatsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.625rem;
  border-radius: ${theme.radii.md};
  background: rgba(255, 255, 255, 0.03);
`

const DS_StatCell = styled.div`
  text-align: center;
`

const DS_StatLabel = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const DS_StatValue = styled.div<{ $tone: 'gold' | 'green' | 'blue' }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $tone }) => {
    if ($tone === 'gold') return theme.colors.gold
    if ($tone === 'green') return theme.colors.emerald
    return theme.colors.blue
  }};
`

const DS_Divider = styled.div`
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
`

/* ── Component ─────────────────────────────────────────────── */

export function DealSpotlight({ plots, onSelectPlot }: DealSpotlightProps) {
  const [isDismissed, setIsDismissed] = useState(false)

  const spotlight = useMemo<DS_SpotlightPlot | null>(() => {
    if (!plots || plots.length < DS_prefetchMinPlots) return null

    const avgPriceSqm = (() => {
      let total = 0
      let count = 0
      for (const plot of plots) {
        const price = plot.total_price ?? plot.totalPrice ?? 0
        const size = plot.size_sqm ?? plot.sizeSqM ?? 0
        if (price > 0 && size > 0) {
          total += price / size
          count += 1
        }
      }
      return count > 0 ? total / count : 0
    })()

    const scored = plots
      .filter((plot) => plot.status === 'AVAILABLE' && (plot.total_price ?? plot.totalPrice ?? 0) > 0)
      .map<DS_SpotlightPlot>((plot) => {
        const price = plot.total_price ?? plot.totalPrice ?? 0
        const size = plot.size_sqm ?? plot.sizeSqM ?? 0
        const projected = plot.projected_value ?? plot.projectedValue ?? 0
        const roi = price > 0 ? ((projected - price) / price) * 100 : 0
        const priceSqm = size > 0 ? price / size : Number.POSITIVE_INFINITY
        const investScore = calcInvestmentScore(plot)

        const dealFactor = avgPriceSqm > 0
          ? Math.max(0, Math.min(3, ((avgPriceSqm - priceSqm) / avgPriceSqm) * 10))
          : 0
        const createdAt = plot.created_at ?? plot.createdAt
        const daysOld = createdAt
          ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
          : 999
        const freshBonus = daysOld <= 7 ? 1 : daysOld <= 14 ? 0.5 : 0
        const roiBonus = Math.min(3, roi / 80)

        const totalScore = investScore + dealFactor + freshBonus + roiBonus
        return {
          ...plot,
          _spotlightScore: totalScore,
          _roi: roi,
          _dealPct: Math.round(((avgPriceSqm - priceSqm) / avgPriceSqm) * 100),
        }
      })
      .sort((a, b) => b._spotlightScore - a._spotlightScore)

    return scored[0] ?? null
  }, [plots])

  const handleClick = useCallback(() => {
    if (spotlight && onSelectPlot) onSelectPlot(spotlight)
  }, [spotlight, onSelectPlot])

  if (!spotlight || isDismissed || spotlight._dealPct < 5) return null

  const price = spotlight.total_price ?? spotlight.totalPrice
  const blockNum = spotlight.block_number ?? spotlight.blockNumber
  const readiness = spotlight.readiness_estimate ?? spotlight.readinessEstimate
  const cagrData = calcCAGR(spotlight._roi, readiness) as DS_CAGRResult
  const score = calcInvestmentScore(spotlight)
  const { color: scoreColor } = getScoreLabel(score) as DS_ScoreLabel

  return (
    <DS_SpotlightWrap>
      <DS_SpotlightCard onClick={handleClick}>
        <DS_Shimmer />
        <DS_DismissButton
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setIsDismissed(true)
          }}
        >
          <X aria-hidden />
        </DS_DismissButton>

        <DS_CardBody>
          <DS_HeaderRow>
            <DS_HeaderIcon>
              <Trophy aria-hidden />
            </DS_HeaderIcon>
            <DS_HeaderText>
              <DS_HeaderTitle>
                <Sparkles aria-hidden />
                {'\u05D4\u05D6\u05D3\u05DE\u05E0\u05D5\u05EA \u05D4\u05E9\u05D1\u05D5\u05E2'}
              </DS_HeaderTitle>
              <DS_HeaderSubtitle>{spotlight._dealPct}% {'\u05DE\u05EA\u05D7\u05EA \u05DC\u05DE\u05DE\u05D5\u05E6\u05E2'}</DS_HeaderSubtitle>
            </DS_HeaderText>
          </DS_HeaderRow>

          <DS_PlotRow>
            <DS_PlotTitle>{'\u05D2\u05D5\u05E9'} {blockNum} | {'\u05D7\u05DC\u05E7\u05D4'} {spotlight.number}</DS_PlotTitle>
            <DS_ScoreTag $color={scoreColor}>{score}/10</DS_ScoreTag>
          </DS_PlotRow>

          <DS_LocationRow>
            <MapPin aria-hidden />
            <span>{spotlight.city}</span>
          </DS_LocationRow>

          <DS_StatsRow>
            <DS_StatCell>
              <DS_StatLabel>{'\u05DE\u05D7\u05D9\u05E8'}</DS_StatLabel>
              <DS_StatValue $tone="gold">{formatPriceShort(price)}</DS_StatValue>
            </DS_StatCell>
            <DS_Divider />
            <DS_StatCell>
              <DS_StatLabel>{'\u05EA\u05E9\u05D5\u05D0\u05D4'}</DS_StatLabel>
              <DS_StatValue $tone="green">+{Math.round(spotlight._roi)}%</DS_StatValue>
            </DS_StatCell>
            {cagrData && (
              <>
                <DS_Divider />
                <DS_StatCell>
                  <DS_StatLabel>CAGR</DS_StatLabel>
                  <DS_StatValue $tone="blue">{cagrData.cagr}%</DS_StatValue>
                </DS_StatCell>
              </>
            )}
          </DS_StatsRow>

          <DS_CtaRow>
            <span>{'\u05E6\u05E4\u05D4 \u05D1\u05E4\u05E8\u05D8\u05D9\u05DD'}</span>
            <ChevronLeft aria-hidden />
          </DS_CtaRow>
        </DS_CardBody>
      </DS_SpotlightCard>
    </DS_SpotlightWrap>
  )
}
