import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import styled, { keyframes } from 'styled-components'
import { ChevronLeft, ChevronRight, Lightbulb, X } from 'lucide-react'
import { formatPriceShort } from '../utils/format'
import { calcCAGR, calcInvestmentScore } from '../utils/investment'
import { theme } from '../styles/theme'

type Plot = {
  id?: number | string
  total_price?: number
  totalPrice?: number
  size_sqm?: number
  sizeSqM?: number
  projected_value?: number
  projectedValue?: number
  readiness_estimate?: string
  readinessEstimate?: string
  created_at?: string
  createdAt?: string
  city?: string
  block_number?: number | string
  blockNumber?: number | string
  _investmentScore?: number
}

type Insight = {
  emoji: string
  text: string
  type: string
}

interface SmartInsightsProps {
  plots?: Plot[]
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
`

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  pointer-events: auto;
`

const InsightRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex: 1;
  min-width: 0;
`

const BulbIcon = styled(Lightbulb)`
  width: 12px;
  height: 12px;
  color: ${theme.colors.gold};
  opacity: 0.6;
  flex-shrink: 0;
`

const TextRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  overflow: hidden;
`

const Label = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${theme.colors.gold};
  opacity: 0.5;
  flex-shrink: 0;
`

const InsightText = styled.span`
  font-size: 10px;
  color: ${theme.colors.slate[400]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: ${fadeIn} ${theme.transitions.normal};
`

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
`

const ControlButton = styled.button`
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radii.sm};
  color: ${theme.colors.slate[500]};
  transition: color ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.gold};
    opacity: 0.7;
  }
`

const ControlCounter = styled.span`
  font-size: 8px;
  color: ${theme.colors.slate[600]};
  width: 20px;
  text-align: center;
  font-variant-numeric: tabular-nums;
`

const CloseButton = styled.button`
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.radii.sm};
  color: ${theme.colors.slate[600]};
  transition: color ${theme.transitions.fast};
  flex-shrink: 0;

  &:hover {
    color: ${theme.colors.slate[400]};
  }
`

const SmartInsights = memo(function SmartInsights({ plots }: SmartInsightsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

  const insights = useMemo<Insight[]>(() => {
    if (!plots || plots.length < 3) return []
    const result: Insight[] = []

    const getPrice = (p: Plot) => p.total_price ?? p.totalPrice ?? 0
    const getSize = (p: Plot) => p.size_sqm ?? p.sizeSqM ?? 0
    const getProj = (p: Plot) => p.projected_value ?? p.projectedValue ?? 0
    const getRoi = (p: Plot) => {
      const price = getPrice(p)
      const proj = getProj(p)
      return price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    }
    const getPsm = (p: Plot) => {
      const price = getPrice(p)
      const size = getSize(p)
      return price > 0 && size > 0 ? price / size : 0
    }

    const rois = plots.map(getRoi).filter(r => r > 0)
    if (rois.length >= 2) {
      const minRoi = Math.min(...rois)
      const maxRoi = Math.max(...rois)
      const spread = maxRoi - minRoi
      if (spread > 50) {
        result.push({
          emoji: '📊',
          text: `מרווח תשואות: ${minRoi}%–${maxRoi}% — פער ${spread}% בין החלקות`,
          type: 'analysis',
        })
      }
    }

    const cityRois: Record<string, number[]> = {}
    for (const p of plots) {
      const city = p.city
      if (!city) continue
      if (!cityRois[city]) cityRois[city] = []
      const roi = getRoi(p)
      if (roi > 0) cityRois[city].push(roi)
    }
    const cityEntries = Object.entries(cityRois).filter(([, arr]) => arr.length >= 2)
    if (cityEntries.length >= 2) {
      const cityAvgs = cityEntries
        .map(([city, arr]) => ({
          city,
          avgRoi: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        }))
        .sort((a, b) => b.avgRoi - a.avgRoi)
      const best = cityAvgs[0]
      const worst = cityAvgs[cityAvgs.length - 1]
      if (best.avgRoi - worst.avgRoi >= 15) {
        result.push({
          emoji: '🏙️',
          text: `${best.city} מציעה תשואה ממוצעת +${best.avgRoi}% — גבוהה ב-${best.avgRoi - worst.avgRoi}% מ${worst.city}`,
          type: 'comparison',
        })
      }
    }

    const validPsm = plots.map(p => ({ plot: p, psm: getPsm(p) })).filter(x => x.psm > 0)
    if (validPsm.length >= 3) {
      const avgPsm = validPsm.reduce((s, x) => s + x.psm, 0) / validPsm.length
      const undervalued = validPsm.filter(x => x.psm < avgPsm * 0.85)
      if (undervalued.length > 0 && undervalued.length <= 5) {
        result.push({
          emoji: '💎',
          text: `${undervalued.length} חלקות מתומחרות 15%+ מתחת לממוצע — הזדמנות פוטנציאלית`,
          type: 'opportunity',
        })
      }
    }

    const grades = plots.map(p => ({
      plot: p,
      score: p._investmentScore ?? calcInvestmentScore(p),
    }))
    const topGrade = grades.filter(g => g.score >= 8)
    if (topGrade.length > 0 && topGrade.length <= plots.length * 0.4) {
      result.push({
        emoji: '⭐',
        text: `${topGrade.length} חלקות בדירוג A+ (8+/10) — ההשקעות החזקות ביותר בסינון הנוכחי`,
        type: 'highlight',
      })
    }

    const cagrEntries = plots
      .map(p => {
        const roi = getRoi(p)
        const readiness = p.readiness_estimate ?? p.readinessEstimate ?? ''
        const cagrData = calcCAGR(roi, readiness)
        return cagrData ? { plot: p, cagr: cagrData.cagr, years: cagrData.years } : null
      })
      .filter((entry): entry is { plot: Plot; cagr: number; years: number } => Boolean(entry))
      .sort((a, b) => b.cagr - a.cagr)

    if (cagrEntries.length >= 2) {
      const best = cagrEntries[0]
      const bn = best.plot.block_number ?? best.plot.blockNumber
      result.push({
        emoji: '🚀',
        text: `התשואה השנתית הגבוהה ביותר: גוש ${bn} עם ${best.cagr}%/שנה (${best.years} שנים)`,
        type: 'highlight',
      })
    }

    const totalValue = plots.reduce((s, p) => s + getPrice(p), 0)
    const totalProjected = plots.reduce((s, p) => s + getProj(p), 0)
    const totalProfit = totalProjected - totalValue
    if (totalProfit > 0 && totalValue > 0) {
      const portfolioRoi = Math.round((totalProfit / totalValue) * 100)
      result.push({
        emoji: '💰',
        text: `שווי תיק: ${formatPriceShort(totalValue)} → ${formatPriceShort(totalProjected)} — רווח פוטנציאלי +${portfolioRoi}%`,
        type: 'portfolio',
      })
    }

    const now = Date.now()
    const newPlots = plots.filter(p => {
      const created = p.created_at ?? p.createdAt
      return created && now - new Date(created).getTime() < 7 * 86400000
    })
    if (newPlots.length > 0) {
      result.push({
        emoji: '🆕',
        text: `${newPlots.length} חלקות חדשות השבוע — השוק פעיל, כדאי לעקוב`,
        type: 'momentum',
      })
    }

    const prices = plots.map(getPrice).filter(p => p > 0)
    if (prices.length >= 3) {
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      if (maxPrice > minPrice * 3) {
        result.push({
          emoji: '📈',
          text: `טווח מחירים: ${formatPriceShort(minPrice)}–${formatPriceShort(maxPrice)} — מתאים לכל תקציב`,
          type: 'diversity',
        })
      }
    }

    return result
  }, [plots])

  useEffect(() => {
    if (insights.length <= 1 || isPaused) return
    const timer = window.setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % insights.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [insights.length, isPaused])

  useEffect(() => {
    setCurrentIndex(0)
  }, [insights.length])

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % insights.length)
  }, [insights.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + insights.length) % insights.length)
  }, [insights.length])

  if (dismissed || insights.length === 0) return null

  const current = insights[currentIndex]

  return (
    <Wrap
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="status"
      aria-live="polite"
      aria-label="תובנות השקעה"
    >
      <InsightRow>
        <BulbIcon />
        <TextRow>
          <Label>תובנה:</Label>
          <InsightText key={currentIndex}>
            {current.emoji} {current.text}
          </InsightText>
        </TextRow>
      </InsightRow>

      {insights.length > 1 && (
        <Controls>
          <ControlButton onClick={goPrev} aria-label="תובנה קודמת">
            <ChevronRight size={10} />
          </ControlButton>
          <ControlCounter>
            {currentIndex + 1}/{insights.length}
          </ControlCounter>
          <ControlButton onClick={goNext} aria-label="תובנה הבאה">
            <ChevronLeft size={10} />
          </ControlButton>
        </Controls>
      )}

      <CloseButton onClick={() => setDismissed(true)} aria-label="סגור תובנות">
        <X size={10} />
      </CloseButton>
    </Wrap>
  )
})

export default SmartInsights
