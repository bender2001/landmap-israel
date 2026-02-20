// ── MarketPulse ──────────────────────────────────────────────
import { useState, useMemo, memo, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  Zap,
  Clock,
  Gauge,
} from 'lucide-react'
import { calcInvestmentScore } from '../../utils/investment'
import { useMarketMomentum } from '../../hooks/useMarket'
import { theme, media } from '../../styles/theme'
import type { Plot } from '../../types'

/* ── Types ─────────────────────────────────────────────────── */

interface MarketPulseProps {
  plots: Plot[]
}

interface MP_Metrics {
  total: number
  available: number
  sold: number
  soldPct: number
  newThisWeek: number
  newThisMonth: number
  avgPrice: number
  avgPriceSqm: number
  totalViews: number
  hotDeals: number
  marketHeat: number
  heatLabel: string
  heatColor: string
  heatEmoji: string
}

/* ── Styled ────────────────────────────────────────────────── */

const MP_fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const MP_Wrap = styled.div`
  position: fixed;
  top: 67px;
  left: 72px;
  z-index: 25;

  ${media.sm} {
    top: auto;
    left: 16px;
    bottom: 88px;
  }
`

const MP_Panel = styled.div<{ $expanded: boolean }>`
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.elevated};
  overflow: hidden;
  transition: ${theme.transitions.normal};
  width: ${({ $expanded }) => ($expanded ? '220px' : 'auto')};
`

const MP_HeaderButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  transition: ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`

const MP_PulseDot = styled.span<{ $color: string }>`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: ${theme.radii.full};
  background: ${({ $color }) => $color};
  animation: ${MP_fadeIn} 0.4s ease;
`

const MP_Expanded = styled.div`
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${MP_fadeIn} 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MP_HeatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const MP_HeatTrack = styled.div`
  height: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.full};
  overflow: hidden;
`

const MP_HeatFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => `${$width}%`};
  border-radius: ${theme.radii.full};
  background: ${({ $color }) => `linear-gradient(90deg, ${theme.colors.emerald}, ${$color})`};
  transition: width 0.7s ease;
`

const MP_StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
`

const MP_StatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border-radius: ${theme.radii.md};
  padding: 6px 8px;
`

const MP_StatLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 8px;
  color: ${theme.colors.slate[500]};
  margin-bottom: 2px;
`

const MP_StatValue = styled.div<{ $color?: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.colors.slate[200]};
`

const MP_MomentumList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const MP_MomentumItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.02);
  border-radius: ${theme.radii.sm};
  padding: 4px 8px;
  font-size: 9px;
`

const MP_HotDeal = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(200, 148, 42, 0.06);
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: ${theme.radii.md};
  padding: 6px 8px;
  font-size: 10px;
  color: ${theme.colors.gold};
`

/* ── Component ─────────────────────────────────────────────── */

export const MarketPulse = memo(function MarketPulse({ plots }: MarketPulseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { momentum: momentumMap } = useMarketMomentum()

  const metrics = useMemo<MP_Metrics | null>(() => {
    if (!plots || plots.length === 0) return null

    const now = Date.now()
    const oneWeekAgo = now - 7 * 86400000
    const oneMonthAgo = now - 30 * 86400000

    let totalPrice = 0
    let totalSize = 0
    let availableCount = 0
    let soldCount = 0
    let newThisWeek = 0
    let newThisMonth = 0
    let totalViews = 0
    let hotDeals = 0
    let priceSum = 0
    let priceCount = 0

    for (const p of plots) {
      const price = p.total_price ?? p.totalPrice ?? 0
      const size = p.size_sqm ?? p.sizeSqM ?? 0
      const created = new Date(p.created_at ?? p.createdAt ?? 0).getTime()
      const views = p.views ?? 0

      if (price > 0) {
        priceSum += price
        priceCount++
      }
      totalPrice += price
      totalSize += size
      totalViews += views

      if (p.status === 'AVAILABLE') availableCount++
      if (p.status === 'SOLD') soldCount++
      if (created >= oneWeekAgo) newThisWeek++
      if (created >= oneMonthAgo) newThisMonth++

      const score = p._investmentScore ?? calcInvestmentScore(p)
      if (score >= 8) hotDeals++
    }

    const avgPrice = priceCount > 0 ? Math.round(priceSum / priceCount) : 0
    const avgPriceSqm = totalSize > 0 ? Math.round(totalPrice / totalSize) : 0
    const soldPct = plots.length > 0 ? Math.round((soldCount / plots.length) * 100) : 0

    const velocityScore = Math.min(100, (newThisWeek / Math.max(plots.length, 1)) * 500)
    const demandScore = Math.min(100, (totalViews / Math.max(plots.length, 1)) * 10)
    const opportunityScore = Math.min(100, (hotDeals / Math.max(plots.length, 1)) * 200)
    const marketHeat = Math.round((velocityScore * 0.4 + demandScore * 0.3 + opportunityScore * 0.3))

    let heatLabel
    let heatColor
    let heatEmoji
    if (marketHeat >= 70) { heatLabel = '\u05E9\u05D5\u05E7 \u05E8\u05D5\u05EA\u05D7'; heatColor = theme.colors.red; heatEmoji = '\uD83D\uDD25' }
    else if (marketHeat >= 45) { heatLabel = '\u05E9\u05D5\u05E7 \u05E4\u05E2\u05D9\u05DC'; heatColor = theme.colors.amber; heatEmoji = '\uD83D\uDCC8' }
    else if (marketHeat >= 20) { heatLabel = '\u05E9\u05D5\u05E7 \u05D9\u05E6\u05D9\u05D1'; heatColor = theme.colors.emerald; heatEmoji = '\u2705' }
    else { heatLabel = '\u05E9\u05D5\u05E7 \u05E9\u05E7\u05D8'; heatColor = theme.colors.slate[500]; heatEmoji = '\uD83D\uDE34' }

    return {
      total: plots.length,
      available: availableCount,
      sold: soldCount,
      soldPct,
      newThisWeek,
      newThisMonth,
      avgPrice,
      avgPriceSqm,
      totalViews,
      hotDeals,
      marketHeat,
      heatLabel,
      heatColor,
      heatEmoji,
    }
  }, [plots])

  const toggle = useCallback(() => setIsExpanded((prev) => !prev), [])

  if (!metrics || metrics.total === 0) return null

  return (
    <MP_Wrap dir="rtl">
      <MP_Panel $expanded={isExpanded}>
        <MP_HeaderButton onClick={toggle} aria-expanded={isExpanded} aria-label="\u05DE\u05D3\u05D3 \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA \u05D4\u05E9\u05D5\u05E7">
          <div style={{ position: 'relative' }}>
            <Activity size={16} color={metrics.heatColor} />
            {metrics.marketHeat >= 45 && <MP_PulseDot $color={metrics.heatColor} />}
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: metrics.heatColor }}>
            {metrics.heatEmoji} {metrics.heatLabel}
          </span>
          {isExpanded
            ? <ChevronUp size={12} color={theme.colors.slate[500]} style={{ marginInlineStart: 'auto' }} />
            : <ChevronDown size={12} color={theme.colors.slate[500]} style={{ marginInlineStart: 'auto' }} />
          }
        </MP_HeaderButton>

        {isExpanded && (
          <MP_Expanded>
            <div>
              <MP_HeatRow>
                <span>{'\u05D7\u05D5\u05DD \u05D4\u05E9\u05D5\u05E7'}</span>
                <span style={{ fontWeight: 700, color: metrics.heatColor }}>{metrics.marketHeat}%</span>
              </MP_HeatRow>
              <MP_HeatTrack>
                <MP_HeatFill $width={metrics.marketHeat} $color={metrics.heatColor} />
              </MP_HeatTrack>
            </div>

            <MP_StatsGrid>
              <MP_StatCard>
                <MP_StatLabel>
                  <Target size={10} color={theme.colors.emerald} />
                  <span>{'\u05D6\u05DE\u05D9\u05E0\u05D5\u05EA'}</span>
                </MP_StatLabel>
                <MP_StatValue>{metrics.available}/{metrics.total}</MP_StatValue>
              </MP_StatCard>

              <MP_StatCard>
                <MP_StatLabel>
                  <Zap size={10} color={theme.colors.gold} />
                  <span>{'\u05D7\u05D3\u05E9\u05D5\u05EA \u05D4\u05E9\u05D1\u05D5\u05E2'}</span>
                </MP_StatLabel>
                <MP_StatValue $color={theme.colors.gold}>{metrics.newThisWeek}</MP_StatValue>
              </MP_StatCard>

              <MP_StatCard>
                <MP_StatLabel>
                  <TrendingUp size={10} color={theme.colors.blue} />
                  <span>{'\u05DE\u05DE\u05D5\u05E6\u05E2 \u05DE\u05F4\u05E8'}</span>
                </MP_StatLabel>
                <MP_StatValue>{'\u20AA'}{metrics.avgPriceSqm.toLocaleString()}</MP_StatValue>
              </MP_StatCard>

              <MP_StatCard>
                <MP_StatLabel>
                  <Clock size={10} color={theme.colors.purple} />
                  <span>{'\u05E0\u05DE\u05DB\u05E8\u05D5'}</span>
                </MP_StatLabel>
                <MP_StatValue>{metrics.soldPct}%</MP_StatValue>
              </MP_StatCard>
            </MP_StatsGrid>

            {momentumMap.size > 0 && (
              <MP_MomentumList>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Gauge size={10} color={theme.colors.slate[500]} />
                  <span style={{ fontSize: 8, color: theme.colors.slate[500], fontWeight: 600 }}>{'\u05DE\u05D5\u05DE\u05E0\u05D8\u05D5\u05DD \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD'}</span>
                </div>
                {Array.from(momentumMap.entries()).slice(0, 3).map(([city, m]) => {
                  if (!m.signal) return null
                  const wowColor = m.wow > 0 ? theme.colors.emerald : m.wow < 0 ? theme.colors.red : theme.colors.slate[400]
                  return (
                    <MP_MomentumItem key={city}>
                      <span style={{ color: theme.colors.slate[300], fontWeight: 600 }}>{city}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.wow != null && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: wowColor }} title={'\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E9\u05D1\u05D5\u05E2\u05D9'}>
                            {m.wow > 0 ? '+' : ''}{m.wow}%
                          </span>
                        )}
                        <span style={{ fontSize: 8 }} title={`\u05DE\u05D2\u05DE\u05D4: ${m.signal}`}>
                          {m.signal?.split(' ')[0]}
                        </span>
                      </div>
                    </MP_MomentumItem>
                  )
                })}
              </MP_MomentumList>
            )}

            {metrics.hotDeals > 0 && (
              <MP_HotDeal>
                <span>{'\uD83D\uDC8E'}</span>
                <span>{metrics.hotDeals} {'\u05D4\u05D6\u05D3\u05DE\u05E0\u05D5\u05D9\u05D5\u05EA \u05D4\u05E9\u05E7\u05E2\u05D4 \u05D7\u05DE\u05D5\u05EA'}</span>
              </MP_HotDeal>
            )}
          </MP_Expanded>
        )}
      </MP_Panel>
    </MP_Wrap>
  )
})
