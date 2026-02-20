/**
 * InvestmentSection - Score breakdown, risk, verdict, below-market, percentile badges
 */
import { useMemo } from 'react'
import styled from 'styled-components'
import { DollarSign, TrendingUp, BarChart3, Ruler } from 'lucide-react'
import { calcInvestmentVerdict, calcRiskLevel, calcPlotPercentiles } from '../../utils/investment'
import { formatCurrency } from '../../utils/format'
import { theme as themeTokens } from '../../styles/theme'
import { StaggerIn, AlertCard, AlertIconBox, SmallAlertIconBox, RiskSegment } from './shared'

/* ── PlotPercentileBadges ──────────────────────────────────── */

const PPB_Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const PPB_Badge = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: ${themeTokens.radii.md};
  font-size: 10px;
  font-weight: 600;
  border: 1px solid ${({ $color }) => `${$color}40`};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}1a`};
  transition: transform ${themeTokens.transitions.normal};
  &:hover { transform: scale(1.02); }
  svg { width: 12px; height: 12px; flex-shrink: 0; }
`

function PlotPercentileBadges({ plot, allPlots }: { plot: any; allPlots: any[] }) {
  const percentiles = useMemo(() => calcPlotPercentiles(plot, allPlots), [plot?.id, allPlots?.length])
  if (!percentiles) return null

  const badges = [
    percentiles.price?.cheaperThan >= 30 && { icon: DollarSign, text: `זול מ-${percentiles.price.cheaperThan}% מהחלקות`, color: percentiles.price.cheaperThan >= 70 ? themeTokens.colors.emerald : percentiles.price.cheaperThan >= 50 ? '#84CC16' : themeTokens.colors.amber, priority: percentiles.price.cheaperThan },
    percentiles.roi?.betterThan >= 40 && { icon: TrendingUp, text: `תשואה גבוהה מ-${percentiles.roi.betterThan}%`, color: percentiles.roi.betterThan >= 70 ? themeTokens.colors.emerald : percentiles.roi.betterThan >= 50 ? '#84CC16' : themeTokens.colors.amber, priority: percentiles.roi.betterThan },
    percentiles.size?.biggerThan >= 50 && { icon: Ruler, text: `גדול מ-${percentiles.size.biggerThan}% מהחלקות`, color: percentiles.size.biggerThan >= 70 ? themeTokens.colors.blue : '#60A5FA', priority: percentiles.size.biggerThan - 10 },
    percentiles.priceSqm?.cheaperThan >= 40 && { icon: BarChart3, text: `מחיר/מ״ר נמוך מ-${percentiles.priceSqm.cheaperThan}%`, color: percentiles.priceSqm.cheaperThan >= 70 ? themeTokens.colors.emerald : '#84CC16', priority: percentiles.priceSqm.cheaperThan - 5 },
  ].filter(Boolean).sort((a, b) => (b?.priority || 0) - (a?.priority || 0)).slice(0, 3)

  if (badges.length === 0) return null

  return (
    <PPB_Wrap>
      {badges.map((badge, i) => { const Icon = badge.icon; return <PPB_Badge key={i} $color={badge.color}><Icon /><span>{badge.text}</span></PPB_Badge> })}
    </PPB_Wrap>
  )
}

/* ── Main export ───────────────────────────────────────────── */

interface InvestmentSectionProps {
  plot: any
  allPlots: any[]
  totalPrice: number
  sizeSqM: number
  priceChange?: any
}

export default function InvestmentSection({ plot, allPlots, totalPrice, sizeSqM, priceChange }: InvestmentSectionProps) {
  return (
    <>
      {/* Below Market Price Indicator */}
      {(() => {
        if (!allPlots || allPlots.length < 3 || sizeSqM <= 0) return null
        const cityPlots = allPlots.filter((p: any) => p.city === plot.city && p.id !== plot.id)
        if (cityPlots.length < 2) return null
        let totalPsm = 0, count = 0
        for (const p of cityPlots) { const pp = p.total_price ?? p.totalPrice ?? 0; const ps = p.size_sqm ?? p.sizeSqM ?? 0; if (pp > 0 && ps > 0) { totalPsm += pp / ps; count++ } }
        if (count < 2) return null
        const avgPsm = totalPsm / count
        const plotPsm = totalPrice / sizeSqM
        const diffPct = Math.round(((plotPsm - avgPsm) / avgPsm) * 100)
        if (Math.abs(diffPct) < 5) return null
        const isBelow = diffPct < 0
        return (
          <StaggerIn $delay={1}>
            <AlertCard $bg={isBelow ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)'} $border={isBelow ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'} style={{ marginBottom: 12 }}>
              <SmallAlertIconBox $bg={isBelow ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}>{isBelow ? '📉' : '📈'}</SmallAlertIconBox>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isBelow ? '#34D399' : '#FBBF24' }}>{isBelow ? `${Math.abs(diffPct)}% מתחת לממוצע ב${plot.city}` : `${diffPct}% מעל הממוצע ב${plot.city}`}</div>
                <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>ממוצע אזורי: {formatCurrency(Math.round(avgPsm))}/מ״ר &#183; חלקה זו: {formatCurrency(Math.round(plotPsm))}/מ״ר</div>
              </div>
            </AlertCard>
          </StaggerIn>
        )
      })()}

      {/* Investment Verdict */}
      {(() => {
        const verdict = calcInvestmentVerdict(plot, allPlots)
        if (!verdict) return null
        return (
          <StaggerIn $delay={1}>
            <AlertCard $bg={`${verdict.color}18`} $border={`${verdict.color}33`} style={{ marginBottom: 16 }}>
              <AlertIconBox $bg={`${verdict.color}18`}>{verdict.emoji}</AlertIconBox>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: verdict.color }}>{verdict.label}</div>
                <div style={{ fontSize: 11, color: themeTokens.colors.slate[400], lineHeight: 1.4 }}>{verdict.description}</div>
              </div>
            </AlertCard>
          </StaggerIn>
        )
      })()}

      {/* Investment Risk Level */}
      {(() => {
        const risk = calcRiskLevel(plot, allPlots)
        if (!risk) return null
        return (
          <StaggerIn $delay={1}>
            <AlertCard $bg="rgba(10,22,40,0.3)" $border="rgba(255,255,255,0.05)" style={{ marginBottom: 12 }}>
              <SmallAlertIconBox $bg={`${risk.color}15`}>{risk.emoji}</SmallAlertIconBox>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: risk.color }}>{risk.label}</span>
                  <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>{risk.level}/5</span>
                </div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map(s => <RiskSegment key={s} $active={s <= risk.level} $level={s} />)}
                </div>
                {risk.factors.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {risk.factors.map((factor: string, i: number) => <span key={i} style={{ fontSize: 8, color: themeTokens.colors.slate[500], background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: 4 }}>{factor}</span>)}
                  </div>
                )}
              </div>
            </AlertCard>
          </StaggerIn>
        )
      })()}

      {/* Price Change Alert */}
      {priceChange && (
        <AlertCard $bg={priceChange.direction === 'down' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'} $border={priceChange.direction === 'down' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'} style={{ marginTop: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: priceChange.direction === 'down' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}>
            <span style={{ fontSize: 16 }}>{priceChange.direction === 'down' ? '📉' : '📈'}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: priceChange.direction === 'down' ? '#4ADE80' : '#F87171' }}>{priceChange.direction === 'down' ? 'המחיר ירד!' : 'המחיר עלה'} {priceChange.pctChange}%</div>
            <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>מחיר קודם: {formatCurrency(priceChange.previousPrice)}</div>
          </div>
        </AlertCard>
      )}

      {/* Percentile badges */}
      {allPlots.length >= 2 && (
        <div style={{ marginTop: 16 }}>
          <PlotPercentileBadges plot={plot} allPlots={allPlots} />
        </div>
      )}
    </>
  )
}
