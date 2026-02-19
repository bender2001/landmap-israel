// ── MarketWidgets.tsx ──────────────────────────────────────────
// Merged from: MarketPulse, MarketVelocity, MarketTicker,
//              PriceMovers, DealSpotlight, FeaturedDeals
// Prefixes: MP_ / MV_ / MT_ / PM_ / DS_ / FD_
// ───────────────────────────────────────────────────────────────

import { useState, useMemo, memo, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  Zap,
  Target,
  Gauge,
  MapPin,
  Flame,
  Trophy,
  Sparkles,
  X,
} from 'lucide-react'
import { calcInvestmentScore, getScoreLabel, calcCAGR } from '../utils/investment'
import { useMarketMomentum, usePriceChanges } from '../hooks/useMarket'
import { useFeaturedPlots } from '../hooks/usePlots'
import { useVisibilityInterval } from '../hooks/useInfra'
import { formatPriceShort } from '../utils/format'
import { statusColors } from '../utils/constants'
import { theme, media } from '../styles/theme'
import type { Plot } from '../types'

/* ================================================================
   MarketPulse
   ================================================================ */

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
    if (marketHeat >= 70) { heatLabel = 'שוק רותח'; heatColor = theme.colors.red; heatEmoji = '🔥' }
    else if (marketHeat >= 45) { heatLabel = 'שוק פעיל'; heatColor = theme.colors.amber; heatEmoji = '📈' }
    else if (marketHeat >= 20) { heatLabel = 'שוק יציב'; heatColor = theme.colors.emerald; heatEmoji = '✅' }
    else { heatLabel = 'שוק שקט'; heatColor = theme.colors.slate[500]; heatEmoji = '😴' }

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
        <MP_HeaderButton onClick={toggle} aria-expanded={isExpanded} aria-label="מדד פעילות השוק">
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
                <span>חום השוק</span>
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
                  <span>זמינות</span>
                </MP_StatLabel>
                <MP_StatValue>{metrics.available}/{metrics.total}</MP_StatValue>
              </MP_StatCard>

              <MP_StatCard>
                <MP_StatLabel>
                  <Zap size={10} color={theme.colors.gold} />
                  <span>חדשות השבוע</span>
                </MP_StatLabel>
                <MP_StatValue $color={theme.colors.gold}>{metrics.newThisWeek}</MP_StatValue>
              </MP_StatCard>

              <MP_StatCard>
                <MP_StatLabel>
                  <TrendingUp size={10} color={theme.colors.blue} />
                  <span>ממוצע מ״ר</span>
                </MP_StatLabel>
                <MP_StatValue>₪{metrics.avgPriceSqm.toLocaleString()}</MP_StatValue>
              </MP_StatCard>

              <MP_StatCard>
                <MP_StatLabel>
                  <Clock size={10} color={theme.colors.purple} />
                  <span>נמכרו</span>
                </MP_StatLabel>
                <MP_StatValue>{metrics.soldPct}%</MP_StatValue>
              </MP_StatCard>
            </MP_StatsGrid>

            {momentumMap.size > 0 && (
              <MP_MomentumList>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Gauge size={10} color={theme.colors.slate[500]} />
                  <span style={{ fontSize: 8, color: theme.colors.slate[500], fontWeight: 600 }}>מומנטום מחירים</span>
                </div>
                {Array.from(momentumMap.entries()).slice(0, 3).map(([city, m]) => {
                  if (!m.signal) return null
                  const wowColor = m.wow > 0 ? theme.colors.emerald : m.wow < 0 ? theme.colors.red : theme.colors.slate[400]
                  return (
                    <MP_MomentumItem key={city}>
                      <span style={{ color: theme.colors.slate[300], fontWeight: 600 }}>{city}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {m.wow != null && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: wowColor }} title="שינוי שבועי">
                            {m.wow > 0 ? '+' : ''}{m.wow}%
                          </span>
                        )}
                        <span style={{ fontSize: 8 }} title={`מגמה: ${m.signal}`}>
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
                <span>💎</span>
                <span>{metrics.hotDeals} הזדמנויות השקעה חמות</span>
              </MP_HotDeal>
            )}
          </MP_Expanded>
        )}
      </MP_Panel>
    </MP_Wrap>
  )
})

/* ================================================================
   MarketVelocity
   ================================================================ */

interface MarketVelocityProps {
  plots: Plot[]
}

const MV_fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const MV_Wrap = styled.div`
  position: fixed;
  top: 64px;
  right: 16px;
  z-index: 20;
  pointer-events: none;

  ${media.sm} {
    top: auto;
    right: auto;
    bottom: 88px;
    left: 72px;
  }
`

const MV_Card = styled.div`
  pointer-events: auto;
`

const MV_Toggle = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: ${theme.radii.lg};
  font-size: 10px;
  backdrop-filter: blur(12px);
  border: 1px solid ${({ $expanded }) => ($expanded ? 'rgba(200, 148, 42, 0.2)' : 'rgba(255, 255, 255, 0.1)')};
  background: ${({ $expanded }) => ($expanded ? 'rgba(10, 22, 40, 0.9)' : 'rgba(255, 255, 255, 0.05)')};
  transition: ${theme.transitions.normal};

  &:hover {
    transform: scale(1.05);
  }
`

const MV_Panel = styled.div`
  margin-top: 6px;
  background: rgba(10, 22, 40, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(200, 148, 42, 0.15);
  border-radius: ${theme.radii.xl};
  padding: 12px;
  box-shadow: ${theme.shadows.elevated};
  min-width: 200px;
  animation: ${MV_fadeIn} 0.2s ease;
`

const MV_PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const MV_HeaderLabel = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const MV_Badge = styled.span<{ $color: string }>`
  margin-inline-start: auto;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: ${theme.radii.sm};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}30`};
`

const MV_Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MV_Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: ${theme.colors.slate[400]};
`

const MV_RowValue = styled.span<{ $color?: string }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ $color }) => $color || theme.colors.slate[300]};
`

const MV_VelocityBar = styled.div`
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const MV_BarTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const MV_BarFill = styled.div<{ $width: number; $color: string }>`
  height: 100%;
  width: ${({ $width }) => `${$width}%`};
  border-radius: ${theme.radii.full};
  background: ${({ $color }) => `linear-gradient(90deg, ${$color}80, ${$color})`};
  transition: width 0.7s ease;
`

function getVelocityLabel(avgDays: number) {
  if (avgDays <= 14) return { text: 'שוק מהיר מאוד', color: theme.colors.emerald, emoji: '🚀' }
  if (avgDays <= 30) return { text: 'שוק מהיר', color: '#4ADE80', emoji: '⚡' }
  if (avgDays <= 60) return { text: 'שוק ממוצע', color: theme.colors.amber, emoji: '📊' }
  if (avgDays <= 90) return { text: 'שוק איטי', color: theme.colors.orange, emoji: '🐌' }
  return { text: 'שוק קפוא', color: theme.colors.red, emoji: '❄️' }
}

function getAbsorptionLabel(rate: number) {
  if (rate >= 20) return { text: 'ביקוש חזק', color: theme.colors.emerald }
  if (rate >= 10) return { text: 'ביקוש בריא', color: '#4ADE80' }
  if (rate >= 5) return { text: 'ביקוש מתון', color: theme.colors.amber }
  return { text: 'ביקוש נמוך', color: theme.colors.orange }
}

function MarketVelocityInner({ plots }: MarketVelocityProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const metrics = useMemo(() => {
    if (!plots || plots.length < 3) return null

    const now = Date.now()
    const available: Plot[] = []
    const sold: Plot[] = []
    let totalViews = 0
    let totalDaysOnMarket = 0
    let daysOnMarketCount = 0
    let newLast7Days = 0
    let newLast30Days = 0

    for (const p of plots) {
      const createdAt = p.created_at ?? p.createdAt
      const createdTs = createdAt ? new Date(createdAt).getTime() : 0
      const daysOnMarket = createdTs > 0 ? Math.floor((now - createdTs) / 86400000) : null

      if (p.status === 'AVAILABLE') {
        available.push(p)
        if (daysOnMarket !== null && daysOnMarket >= 0) {
          totalDaysOnMarket += daysOnMarket
          daysOnMarketCount++
        }
      } else if (p.status === 'SOLD') {
        sold.push(p)
      }

      totalViews += p.views ?? 0

      if (createdTs > 0) {
        const daysSince = (now - createdTs) / 86400000
        if (daysSince <= 7) newLast7Days++
        if (daysSince <= 30) newLast30Days++
      }
    }

    const totalPlots = plots.length
    const avgDaysOnMarket = daysOnMarketCount > 0 ? Math.round(totalDaysOnMarket / daysOnMarketCount) : null

    const absorptionRate = totalPlots > 0 ? Math.round((sold.length / totalPlots) * 100) : 0

    const avgViewsPerPlot = totalPlots > 0 ? Math.round(totalViews / totalPlots) : 0

    const weeklyPace = newLast7Days
    const monthlyPace = Math.round(newLast30Days / 4.3)
    const momentumDirection = weeklyPace > monthlyPace ? 'up' : weeklyPace < monthlyPace ? 'down' : 'flat'

    const velocityLabel = avgDaysOnMarket !== null ? getVelocityLabel(avgDaysOnMarket) : null
    const absorptionLabel = getAbsorptionLabel(absorptionRate)

    return {
      avgDaysOnMarket,
      absorptionRate,
      avgViewsPerPlot,
      newLast7Days,
      newLast30Days,
      weeklyPace,
      monthlyPace,
      momentumDirection,
      velocityLabel,
      absorptionLabel,
      availableCount: available.length,
      soldCount: sold.length,
    }
  }, [plots])

  if (!metrics || metrics.avgDaysOnMarket === null) return null

  return (
    <MV_Wrap dir="rtl">
      <MV_Card>
        <MV_Toggle
          onClick={() => setIsExpanded((prev) => !prev)}
          $expanded={isExpanded}
          title="מהירות שוק — לחץ לפרטים"
          aria-expanded={isExpanded}
          aria-label="מדד מהירות השוק"
        >
          <Activity size={12} color={theme.colors.gold} />
          <span style={{ fontWeight: 600, color: metrics.velocityLabel?.color }}>
            {metrics.velocityLabel?.emoji} {metrics.avgDaysOnMarket} ימים
          </span>
          {isExpanded ? <ChevronUp size={12} color={theme.colors.slate[500]} /> : <ChevronDown size={12} color={theme.colors.slate[500]} />}
        </MV_Toggle>

        {isExpanded && (
          <MV_Panel>
            <MV_PanelHeader>
              <Activity size={14} color={theme.colors.gold} />
              <MV_HeaderLabel>מהירות השוק</MV_HeaderLabel>
              {metrics.velocityLabel && (
                <MV_Badge $color={metrics.velocityLabel.color}>{metrics.velocityLabel.text}</MV_Badge>
              )}
            </MV_PanelHeader>

            <MV_Rows>
              <MV_Row>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} />
                  ימים ממוצעים בשוק
                </span>
                <MV_RowValue $color={metrics.velocityLabel?.color}>{metrics.avgDaysOnMarket}</MV_RowValue>
              </MV_Row>

              <MV_Row>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={12} />
                  שיעור מכירה
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MV_RowValue $color={metrics.absorptionLabel.color}>{metrics.absorptionRate}%</MV_RowValue>
                  <span style={{ fontSize: 8, color: theme.colors.slate[600] }}>
                    ({metrics.soldCount}/{metrics.soldCount + metrics.availableCount})
                  </span>
                </span>
              </MV_Row>

              <MV_Row>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Eye size={12} />
                  צפיות ממוצעות
                </span>
                <MV_RowValue>{metrics.avgViewsPerPlot}/חלקה</MV_RowValue>
              </MV_Row>

              <MV_Row>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {metrics.momentumDirection === 'up' ? (
                    <TrendingUp size={12} color={theme.colors.emerald} />
                  ) : metrics.momentumDirection === 'down' ? (
                    <TrendingDown size={12} color={theme.colors.red} />
                  ) : (
                    <Activity size={12} color={theme.colors.slate[400]} />
                  )}
                  חלקות חדשות (7 ימים)
                </span>
                <MV_RowValue
                  $color={metrics.momentumDirection === 'up'
                    ? theme.colors.emerald
                    : metrics.momentumDirection === 'down'
                      ? theme.colors.red
                      : theme.colors.slate[300]}
                >
                  {metrics.newLast7Days}
                </MV_RowValue>
              </MV_Row>

              <MV_VelocityBar>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 8, color: theme.colors.slate[600] }}>איטי</span>
                  <MV_BarTrack>
                    <MV_BarFill
                      $width={Math.max(5, Math.min(100, 100 - (metrics.avgDaysOnMarket / 120 * 100)))}
                      $color={metrics.velocityLabel?.color || theme.colors.gold}
                    />
                  </MV_BarTrack>
                  <span style={{ fontSize: 8, color: theme.colors.slate[600] }}>מהיר</span>
                </div>
              </MV_VelocityBar>
            </MV_Rows>
          </MV_Panel>
        )}
      </MV_Card>
    </MV_Wrap>
  )
}

export const MarketVelocity = memo(MarketVelocityInner)

/* ================================================================
   MarketTicker
   ================================================================ */

interface MarketTickerProps {
  plots: Plot[]
}

interface MT_TickerItem {
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  text: string
  highlight?: boolean
}

const MT_tickerIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const MT_Wrap = styled.div<{ $visible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  transition: transform ${theme.transitions.smooth};
  transform: ${({ $visible }) => ($visible ? 'translateY(0)' : 'translateY(-100%)')};
  display: none;

  ${media.sm} {
    display: block;
  }
`

const MT_Bar = styled.div`
  background: rgba(22, 42, 74, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const MT_Inner = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 16px;
`

const MT_Dots = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 4px;
`

const MT_Dot = styled.button<{ $active?: boolean }>`
  width: ${({ $active }) => ($active ? '12px' : '4px')};
  height: 4px;
  border-radius: ${theme.radii.full};
  border: none;
  background: ${({ $active }) => ($active ? theme.colors.gold : 'rgba(255, 255, 255, 0.2)')};
  transition: ${theme.transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`

const MT_Content = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${MT_tickerIn} 0.4s ease;
`

const MT_IconWrap = styled.div<{ $color: string }>`
  width: 20px;
  height: 20px;
  border-radius: ${theme.radii.sm};
  background: ${({ $color }) => `${$color}20`};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`

const MT_Text = styled.span<{ $highlight?: boolean }>`
  font-size: 11px;
  font-weight: 500;
  color: ${({ $highlight }) => ($highlight ? theme.colors.emerald : theme.colors.slate[300])};
`

const MT_CloseButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  padding: 4px;
  background: transparent;
  border: none;
  color: ${theme.colors.slate[500]};
  transition: ${theme.transitions.fast};

  &:hover {
    color: ${theme.colors.slate[300]};
  }
`

export function MarketTicker({ plots }: MarketTickerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const items = useMemo<MT_TickerItem[]>(() => {
    if (!plots || plots.length === 0) return []

    const now = Date.now()
    const result: MT_TickerItem[] = []

    const newThisWeek = plots.filter((p) => {
      const created = p.created_at ?? p.createdAt
      return created && (now - new Date(created).getTime()) < 7 * 24 * 60 * 60 * 1000
    })
    if (newThisWeek.length > 0) {
      result.push({
        icon: Zap,
        color: theme.colors.emerald,
        text: `${newThisWeek.length} חלקות חדשות השבוע`,
        highlight: true,
      })
    }

    const available = plots.filter((p) => p.status === 'AVAILABLE')
    if (available.length > 0) {
      const bestRoi = available.reduce((best, p) => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const proj = p.projected_value ?? p.projectedValue ?? 0
        const roi = price > 0 ? ((proj - price) / price) * 100 : 0
        return roi > best.roi ? { plot: p, roi } : best
      }, { plot: null as Plot | null, roi: 0 })

      if (bestRoi.plot) {
        const bn = bestRoi.plot.block_number ?? bestRoi.plot.blockNumber
        result.push({
          icon: TrendingUp,
          color: '#4ADE80',
          text: `תשואה מובילה: +${Math.round(bestRoi.roi)}% — גוש ${bn} ב${bestRoi.plot.city}`,
        })
      }
    }

    if (available.length > 0) {
      const cheapest = available.reduce((best, p) => {
        const price = p.total_price ?? p.totalPrice ?? 0
        const size = p.size_sqm ?? p.sizeSqM ?? 1
        const priceDunam = size > 0 ? (price / size) * 1000 : Infinity
        return priceDunam < best.price ? { plot: p, price: priceDunam } : best
      }, { plot: null as Plot | null, price: Infinity })

      if (cheapest.plot && cheapest.price < Infinity) {
        result.push({
          icon: MapPin,
          color: theme.colors.blue,
          text: `מחיר נמוך ביותר: ${formatPriceShort(Math.round(cheapest.price))}/דונם ב${cheapest.plot.city}`,
        })
      }
    }

    const totalValue = plots.reduce((s, p) => s + (p.total_price ?? p.totalPrice ?? 0), 0)
    const totalArea = plots.reduce((s, p) => s + (p.size_sqm ?? p.sizeSqM ?? 0), 0)
    if (totalValue > 0) {
      result.push({
        icon: TrendingUp,
        color: theme.colors.goldBright,
        text: `שווי שוק כולל: ${formatPriceShort(totalValue)} · ${(totalArea / 1000).toFixed(0)} דונם`,
      })
    }

    const cities: Record<string, { count: number; available: number }> = {}
    plots.forEach((p) => {
      const city = p.city || 'אחר'
      if (!cities[city]) cities[city] = { count: 0, available: 0 }
      cities[city].count++
      if (p.status === 'AVAILABLE') cities[city].available++
    })
    const cityEntries = Object.entries(cities).filter(([, v]) => v.available > 0)
    if (cityEntries.length > 1) {
      const cityText = cityEntries.map(([city, v]) => `${city}: ${v.available} זמינות`).join(' · ')
      result.push({
        icon: MapPin,
        color: theme.colors.purple,
        text: cityText,
      })
    }

    const recentlyUpdated = plots.filter((p) => {
      const updated = p.updated_at ?? p.updatedAt
      return updated && (now - new Date(updated).getTime()) < 24 * 60 * 60 * 1000
    })
    if (recentlyUpdated.length > 0) {
      result.push({
        icon: Clock,
        color: theme.colors.amber,
        text: `${recentlyUpdated.length} חלקות עודכנו ב-24 שעות האחרונות`,
      })
    }

    return result
  }, [plots])

  useVisibilityInterval(
    () => setActiveIndex((prev) => (prev + 1) % items.length),
    5000,
    { enabled: items.length > 1, catchUp: false }
  )

  if (items.length === 0) return null

  const currentItem = items[activeIndex % items.length]
  const Icon = currentItem.icon

  return (
    <MT_Wrap $visible={isVisible} dir="rtl">
      <MT_Bar>
        <MT_Inner>
          {items.length > 1 && (
            <MT_Dots>
              {items.map((_, i) => (
                <MT_Dot key={i} $active={i === activeIndex % items.length} onClick={() => setActiveIndex(i)} />
              ))}
            </MT_Dots>
          )}

          <MT_Content key={activeIndex}>
            <MT_IconWrap $color={currentItem.color}>
              <Icon size={12} color={currentItem.color} />
            </MT_IconWrap>
            <MT_Text $highlight={currentItem.highlight}>{currentItem.text}</MT_Text>
          </MT_Content>

          <MT_CloseButton onClick={() => setIsVisible(false)} aria-label="סגור">
            <span style={{ fontSize: 12 }}>✕</span>
          </MT_CloseButton>
        </MT_Inner>
      </MT_Bar>
    </MT_Wrap>
  )
}

/* ================================================================
   PriceMovers
   ================================================================ */

type PM_Plot = {
  id: string | number
}

type PM_PriceChange = {
  plotId: string
  direction: 'down' | 'up' | string
  pctChange: number
  oldPrice: number
  currentPrice: number
  status?: string
  blockNumber?: string | number
  number?: string | number
  city?: string
}

type PriceMoversProps = {
  onSelectPlot?: (plot: PM_Plot) => void
  plots?: PM_Plot[]
}

const PM_Root = styled.div`
  position: fixed;
  z-index: 28;
  bottom: 24rem;
  left: 1rem;
  display: none;

  ${media.sm} {
    display: block;
  }
`

const PM_ToggleButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${theme.radii.lg};
  font-size: 12px;
  font-weight: 700;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  color: ${({ $active }) => ($active ? '#60A5FA' : theme.colors.slate[400])};
  background: ${({ $active }) => ($active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(10, 22, 40, 0.8)')};
  box-shadow: ${({ $active }) => ($active ? '0 12px 24px rgba(59, 130, 246, 0.08)' : 'none')};
  backdrop-filter: blur(14px);
  transition: ${theme.transitions.normal};
  cursor: pointer;

  &:hover {
    transform: scale(1.05);
    color: #60A5FA;
    border-color: rgba(59, 130, 246, 0.2);
  }

  svg {
    color: ${({ $active }) => ($active ? '#60A5FA' : theme.colors.slate[400])};
  }
`

const PM_CountGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const PM_CountBadge = styled.span<{ $variant: 'down' | 'up' }>`
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  background: ${({ $variant }) => ($variant === 'down' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)')};
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_Panel = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  width: 18rem;
  background: rgba(10, 22, 40, 0.95);
  border: 1px solid rgba(59, 130, 246, 0.15);
  border-radius: ${theme.radii.xl};
  box-shadow: ${theme.shadows.popup};
  overflow: hidden;
  backdrop-filter: blur(22px);
  animation: filter-dropdown-in 0.2s ease-out;
`

const PM_PanelHeader = styled.div`
  padding: 12px 12px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const PM_HeaderInfo = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: rgba(96, 165, 250, 0.7);
  font-weight: 600;
`

const PM_HeaderCounts = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
`

const PM_HeaderCount = styled.span<{ $variant: 'down' | 'up' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_ChangeList = styled.div`
  padding: 8px;
  display: grid;
  gap: 4px;
  max-height: 280px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 999px;
  }
`

const PM_ChangeRow = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: ${theme.radii.lg};
  text-align: right;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid transparent;
  color: ${theme.colors.slate[200]};
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.05);
  }
`

const PM_DirectionBadge = styled.div<{ $variant: 'down' | 'up' }>`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $variant }) => ($variant === 'down' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)')};
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_ChangeInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const PM_ChangeTitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PM_StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
`

const PM_ChangeCity = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  margin-top: 2px;
`

const PM_ChangeValue = styled.div`
  text-align: left;
  flex-shrink: 0;
`

const PM_ChangePct = styled.div<{ $variant: 'down' | 'up' }>`
  font-size: 11px;
  font-weight: 800;
  color: ${({ $variant }) => ($variant === 'down' ? theme.colors.emerald : theme.colors.red)};
`

const PM_ChangePrices = styled.div`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;

  .old {
    text-decoration: line-through;
    opacity: 0.5;
  }

  .new {
    font-weight: 600;
    color: ${theme.colors.slate[400]};
  }
`

const PM_PanelFooter = styled.div`
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`

export function PriceMovers({ onSelectPlot, plots = [] }: PriceMoversProps) {
  const { raw } = usePriceChanges({ days: 30, minPct: 2 })
  const priceChanges = raw as PM_PriceChange[]
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelect = useCallback(
    (plotId: string) => {
      if (!onSelectPlot || !plots.length) return
      const plot = plots.find((p) => String(p.id) === String(plotId))
      if (plot) {
        onSelectPlot(plot)
        setIsExpanded(false)
      }
    },
    [onSelectPlot, plots]
  )

  if (!priceChanges || priceChanges.length === 0) return null

  const drops = priceChanges.filter((change) => change.direction === 'down')
  const rises = priceChanges.filter((change) => change.direction === 'up')

  return (
    <PM_Root dir="rtl">
      <PM_ToggleButton type="button" onClick={() => setIsExpanded((prev) => !prev)} $active={isExpanded}>
        <Activity size={14} />
        <span>שינויי מחיר</span>
        <PM_CountGroup>
          {drops.length > 0 && <PM_CountBadge $variant="down">{drops.length}</PM_CountBadge>}
          {rises.length > 0 && <PM_CountBadge $variant="up">{rises.length}</PM_CountBadge>}
        </PM_CountGroup>
        {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </PM_ToggleButton>

      {isExpanded && (
        <PM_Panel>
          <PM_PanelHeader>
            <PM_HeaderInfo>
              <Activity size={12} />
              <span>שינויי מחיר — 30 ימים אחרונים</span>
            </PM_HeaderInfo>
            <PM_HeaderCounts>
              {drops.length > 0 && (
                <PM_HeaderCount $variant="down">
                  <TrendingDown size={10} />
                  {drops.length} ירידות
                </PM_HeaderCount>
              )}
              {rises.length > 0 && (
                <PM_HeaderCount $variant="up">
                  <TrendingUp size={10} />
                  {rises.length} עליות
                </PM_HeaderCount>
              )}
            </PM_HeaderCounts>
          </PM_PanelHeader>

          <PM_ChangeList>
            {[...drops, ...rises].slice(0, 8).map((change) => {
              const color = statusColors[change.status || 'available'] || theme.colors.slate[400]
              const isDown = change.direction === 'down'

              return (
                <PM_ChangeRow key={change.plotId} type="button" onClick={() => handleSelect(change.plotId)}>
                  <PM_DirectionBadge $variant={isDown ? 'down' : 'up'}>
                    {isDown ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  </PM_DirectionBadge>

                  <PM_ChangeInfo>
                    <PM_ChangeTitle>
                      <PM_StatusDot style={{ background: color }} />
                      גוש {change.blockNumber} | חלקה {change.number}
                    </PM_ChangeTitle>
                    <PM_ChangeCity>{change.city}</PM_ChangeCity>
                  </PM_ChangeInfo>

                  <PM_ChangeValue>
                    <PM_ChangePct $variant={isDown ? 'down' : 'up'}>
                      {isDown ? '↓' : '↑'} {change.pctChange}%
                    </PM_ChangePct>
                    <PM_ChangePrices>
                      <span className="old">{formatPriceShort(change.oldPrice)}</span>
                      <span>→</span>
                      <span className="new">{formatPriceShort(change.currentPrice)}</span>
                    </PM_ChangePrices>
                  </PM_ChangeValue>
                </PM_ChangeRow>
              )
            })}
          </PM_ChangeList>

          <PM_PanelFooter>
            מעקב מחירים מבוסס צילומי מחיר יומיים · {priceChanges.length} שינויים
          </PM_PanelFooter>
        </PM_Panel>
      )}
    </PM_Root>
  )
}

/* ================================================================
   DealSpotlight
   ================================================================ */

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
                הזדמנות השבוע
              </DS_HeaderTitle>
              <DS_HeaderSubtitle>{spotlight._dealPct}% מתחת לממוצע</DS_HeaderSubtitle>
            </DS_HeaderText>
          </DS_HeaderRow>

          <DS_PlotRow>
            <DS_PlotTitle>גוש {blockNum} | חלקה {spotlight.number}</DS_PlotTitle>
            <DS_ScoreTag $color={scoreColor}>{score}/10</DS_ScoreTag>
          </DS_PlotRow>

          <DS_LocationRow>
            <MapPin aria-hidden />
            <span>{spotlight.city}</span>
          </DS_LocationRow>

          <DS_StatsRow>
            <DS_StatCell>
              <DS_StatLabel>מחיר</DS_StatLabel>
              <DS_StatValue $tone="gold">{formatPriceShort(price)}</DS_StatValue>
            </DS_StatCell>
            <DS_Divider />
            <DS_StatCell>
              <DS_StatLabel>תשואה</DS_StatLabel>
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
            <span>צפה בפרטים</span>
            <ChevronLeft aria-hidden />
          </DS_CtaRow>
        </DS_CardBody>
      </DS_SpotlightCard>
    </DS_SpotlightWrap>
  )
}

/* ================================================================
   FeaturedDeals
   ================================================================ */

interface FeaturedDealsProps {
  onSelectPlot?: (plot: Plot) => void
  selectedPlot?: Plot | null
}

const FD_dropIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

const FD_Wrap = styled.div`
  position: fixed;
  z-index: 28;
  left: 16px;
  bottom: 336px;
  display: none;

  ${media.sm} {
    display: block;
  }
`

const FD_ToggleButton = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${theme.radii.lg};
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(12px);
  border: 1px solid ${({ $expanded }) => ($expanded ? 'rgba(249, 115, 22, 0.3)' : 'rgba(255, 255, 255, 0.1)')};
  background: ${({ $expanded }) => ($expanded ? 'rgba(249, 115, 22, 0.15)' : 'rgba(10, 22, 40, 0.8)')};
  color: ${({ $expanded }) => ($expanded ? theme.colors.orange : theme.colors.slate[400])};
  transition: ${theme.transitions.normal};

  &:hover {
    transform: scale(1.05);
    color: ${theme.colors.orange};
    border-color: rgba(249, 115, 22, 0.2);
  }
`

const FD_CountBadge = styled.span`
  width: 20px;
  height: 20px;
  border-radius: ${theme.radii.full};
  background: rgba(249, 115, 22, 0.2);
  color: ${theme.colors.orange};
  font-size: 10px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const FD_Panel = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 256px;
  background: rgba(10, 22, 40, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(249, 115, 22, 0.15);
  border-radius: ${theme.radii.xl};
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  animation: ${FD_dropIn} 0.2s ease;
`

const FD_PanelHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 500;
  color: rgba(249, 115, 22, 0.7);
`

const FD_List = styled.div`
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FD_CardButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: ${theme.radii.lg};
  border: 1px solid ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.2)' : 'transparent')};
  background: ${({ $active }) => ($active ? 'rgba(200, 148, 42, 0.1)' : 'rgba(255, 255, 255, 0.02)')};
  text-align: right;
  transition: ${theme.transitions.normal};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.05);
  }
`

const FD_Rank = styled.div<{ $index: number }>`
  width: 24px;
  height: 24px;
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: ${({ $index }) => ($index === 0 ? theme.colors.orange : $index === 1 ? theme.colors.amber : theme.colors.slate[400])};
  background: ${({ $index }) =>
    $index === 0
      ? 'rgba(249, 115, 22, 0.2)'
      : $index === 1
        ? 'rgba(245, 158, 11, 0.15)'
        : 'rgba(148, 163, 184, 0.15)'};
  flex-shrink: 0;
`

const FD_CardInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const FD_CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FD_CardSub = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
  font-size: 9px;
  color: ${theme.colors.slate[500]};
`

const FD_PriceBlock = styled.div`
  text-align: left;
  flex-shrink: 0;
`

const FD_PriceText = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${theme.colors.gold};
`

const FD_RoiText = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
  font-size: 9px;
  font-weight: 600;
  color: ${theme.colors.emerald};
`

const FD_Footer = styled.div`
  padding: 8px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  text-align: center;
  font-size: 9px;
  color: ${theme.colors.slate[600]};
`

export function FeaturedDeals({ onSelectPlot, selectedPlot }: FeaturedDealsProps) {
  const { data: featured = [] } = useFeaturedPlots(3)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSelect = useCallback((plot: Plot) => {
    if (onSelectPlot) onSelectPlot(plot)
    setIsExpanded(false)
  }, [onSelectPlot])

  if (!featured || featured.length === 0) return null

  return (
    <FD_Wrap dir="rtl">
      <FD_ToggleButton
        onClick={() => setIsExpanded((prev) => !prev)}
        $expanded={isExpanded}
        aria-expanded={isExpanded}
        aria-label="הזדמנויות חמות"
        title="הזדמנויות השקעה מומלצות"
      >
        <Flame size={14} color={isExpanded ? theme.colors.orange : theme.colors.slate[400]} />
        <span>הזדמנויות חמות</span>
        <FD_CountBadge>{featured.length}</FD_CountBadge>
        {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </FD_ToggleButton>

      {isExpanded && (
        <FD_Panel>
          <FD_PanelHeader>
            <Flame size={12} />
            <span>מדורגות לפי ציון השקעה</span>
          </FD_PanelHeader>

          <FD_List>
            {featured.map((plot, i) => {
              const bn = plot.block_number ?? plot.blockNumber
              const price = plot.total_price ?? plot.totalPrice
              const roi = plot._roi ?? 0
              const dealPct = plot._dealPct ?? 0
              const color = statusColors[plot.status]
              const isSelected = selectedPlot?.id === plot.id

              return (
                <FD_CardButton key={plot.id} onClick={() => handleSelect(plot)} $active={isSelected}>
                  <FD_Rank $index={i}>{i + 1}</FD_Rank>
                  <FD_CardInfo>
                    <FD_CardTitle>
                      <span style={{ width: 6, height: 6, borderRadius: theme.radii.full, background: color }} />
                      גוש {bn} | חלקה {plot.number}
                    </FD_CardTitle>
                    <FD_CardSub>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} />
                        {plot.city}
                      </span>
                      {dealPct < -3 && (
                        <span style={{ color: theme.colors.emerald, fontWeight: 600 }}>{Math.abs(dealPct)}%↓</span>
                      )}
                    </FD_CardSub>
                  </FD_CardInfo>
                  <FD_PriceBlock>
                    <FD_PriceText>{formatPriceShort(price)}</FD_PriceText>
                    <FD_RoiText>
                      <TrendingUp size={10} />
                      +{roi}%
                    </FD_RoiText>
                  </FD_PriceBlock>
                </FD_CardButton>
              )
            })}
          </FD_List>

          <FD_Footer>מעודכן כל 5 דקות · מבוסס ROI, מחיר אזורי, טריות</FD_Footer>
        </FD_Panel>
      )}
    </FD_Wrap>
  )
}
