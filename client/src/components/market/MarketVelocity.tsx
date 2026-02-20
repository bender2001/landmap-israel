// ── MarketVelocity ───────────────────────────────────────────
import { useState, useMemo, memo } from 'react'
import styled, { keyframes } from 'styled-components'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  Zap,
} from 'lucide-react'
import { theme, media } from '../../styles/theme'
import type { Plot } from '../../types'

/* ── Types ─────────────────────────────────────────────────── */

interface MarketVelocityProps {
  plots: Plot[]
}

/* ── Styled ────────────────────────────────────────────────── */

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

/* ── Helpers ───────────────────────────────────────────────── */

function getVelocityLabel(avgDays: number) {
  if (avgDays <= 14) return { text: '\u05E9\u05D5\u05E7 \u05DE\u05D4\u05D9\u05E8 \u05DE\u05D0\u05D5\u05D3', color: theme.colors.emerald, emoji: '\uD83D\uDE80' }
  if (avgDays <= 30) return { text: '\u05E9\u05D5\u05E7 \u05DE\u05D4\u05D9\u05E8', color: '#4ADE80', emoji: '\u26A1' }
  if (avgDays <= 60) return { text: '\u05E9\u05D5\u05E7 \u05DE\u05DE\u05D5\u05E6\u05E2', color: theme.colors.amber, emoji: '\uD83D\uDCCA' }
  if (avgDays <= 90) return { text: '\u05E9\u05D5\u05E7 \u05D0\u05D9\u05D8\u05D9', color: theme.colors.orange, emoji: '\uD83D\uDC0C' }
  return { text: '\u05E9\u05D5\u05E7 \u05E7\u05E4\u05D5\u05D0', color: theme.colors.red, emoji: '\u2744\uFE0F' }
}

function getAbsorptionLabel(rate: number) {
  if (rate >= 20) return { text: '\u05D1\u05D9\u05E7\u05D5\u05E9 \u05D7\u05D6\u05E7', color: theme.colors.emerald }
  if (rate >= 10) return { text: '\u05D1\u05D9\u05E7\u05D5\u05E9 \u05D1\u05E8\u05D9\u05D0', color: '#4ADE80' }
  if (rate >= 5) return { text: '\u05D1\u05D9\u05E7\u05D5\u05E9 \u05DE\u05EA\u05D5\u05DF', color: theme.colors.amber }
  return { text: '\u05D1\u05D9\u05E7\u05D5\u05E9 \u05E0\u05DE\u05D5\u05DA', color: theme.colors.orange }
}

/* ── Component ─────────────────────────────────────────────── */

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
          title={'\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05E9\u05D5\u05E7 \u2014 \u05DC\u05D7\u05E5 \u05DC\u05E4\u05E8\u05D8\u05D9\u05DD'}
          aria-expanded={isExpanded}
          aria-label={'\u05DE\u05D3\u05D3 \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D4\u05E9\u05D5\u05E7'}
        >
          <Activity size={12} color={theme.colors.gold} />
          <span style={{ fontWeight: 600, color: metrics.velocityLabel?.color }}>
            {metrics.velocityLabel?.emoji} {metrics.avgDaysOnMarket} {'\u05D9\u05DE\u05D9\u05DD'}
          </span>
          {isExpanded ? <ChevronUp size={12} color={theme.colors.slate[500]} /> : <ChevronDown size={12} color={theme.colors.slate[500]} />}
        </MV_Toggle>

        {isExpanded && (
          <MV_Panel>
            <MV_PanelHeader>
              <Activity size={14} color={theme.colors.gold} />
              <MV_HeaderLabel>{'\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D4\u05E9\u05D5\u05E7'}</MV_HeaderLabel>
              {metrics.velocityLabel && (
                <MV_Badge $color={metrics.velocityLabel.color}>{metrics.velocityLabel.text}</MV_Badge>
              )}
            </MV_PanelHeader>

            <MV_Rows>
              <MV_Row>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} />
                  {'\u05D9\u05DE\u05D9\u05DD \u05DE\u05DE\u05D5\u05E6\u05E2\u05D9\u05DD \u05D1\u05E9\u05D5\u05E7'}
                </span>
                <MV_RowValue $color={metrics.velocityLabel?.color}>{metrics.avgDaysOnMarket}</MV_RowValue>
              </MV_Row>

              <MV_Row>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={12} />
                  {'\u05E9\u05D9\u05E2\u05D5\u05E8 \u05DE\u05DB\u05D9\u05E8\u05D4'}
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
                  {'\u05E6\u05E4\u05D9\u05D5\u05EA \u05DE\u05DE\u05D5\u05E6\u05E2\u05D5\u05EA'}
                </span>
                <MV_RowValue>{metrics.avgViewsPerPlot}/{'\u05D7\u05DC\u05E7\u05D4'}</MV_RowValue>
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
                  {'\u05D7\u05DC\u05E7\u05D5\u05EA \u05D7\u05D3\u05E9\u05D5\u05EA (7 \u05D9\u05DE\u05D9\u05DD)'}
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
                  <span style={{ fontSize: 8, color: theme.colors.slate[600] }}>{'\u05D0\u05D9\u05D8\u05D9'}</span>
                  <MV_BarTrack>
                    <MV_BarFill
                      $width={Math.max(5, Math.min(100, 100 - (metrics.avgDaysOnMarket / 120 * 100)))}
                      $color={metrics.velocityLabel?.color || theme.colors.gold}
                    />
                  </MV_BarTrack>
                  <span style={{ fontSize: 8, color: theme.colors.slate[600] }}>{'\u05DE\u05D4\u05D9\u05E8'}</span>
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
