import { useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { media } from '../../../styles/theme'
import { useSimilarPlots, useNearbyPlots } from '../../../hooks/usePlots'
import { statusColors } from '../../../utils/constants'
import { formatDunam, formatPriceShort } from '../../../utils/format'
import type { Plot } from '../../../types'

/* ── Styled ── */
const SimilarWrap = styled.div`display: flex; flex-direction: column; gap: 32px; margin-bottom: 32px;`
const SimilarHeading = styled.h2`
  font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[100]};
  margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
`
const SimilarGrid = styled.div`
  display: grid; grid-template-columns: 1fr; gap: 12px;
  ${media.sm} { grid-template-columns: repeat(2, 1fr); }
  ${media.lg} { grid-template-columns: repeat(4, 1fr); }
`
const IconBadge = styled.span<{ $bg: string }>`
  width: 28px; height: 28px; border-radius: 8px; background: ${({ $bg }) => $bg};
  display: flex; align-items: center; justify-content: center; font-size: 14px;
`
const SubLabel = styled.span`font-size: 12px; color: ${({ theme }) => theme.colors.slate[500]}; font-weight: 400;`
const PlotCardLink = styled(Link)`
  display: block; background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 16px; padding: 16px; transition: all 0.2s ease; text-decoration: none;
  &:hover { border-color: rgba(200,148,42,0.2); }
`
const PlotCardHeader = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 8px;`
const StatusBar = styled.div<{ $color: string }>`width: 6px; height: 32px; border-radius: 9999px; flex-shrink: 0; background: ${({ $color }) => $color};`
const PlotCardTitle = styled.div`font-size: 14px; font-weight: 500; color: ${({ theme }) => theme.colors.slate[200]}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const PlotCardSubtitle = styled.div`font-size: 12px; color: ${({ theme }) => theme.colors.slate[500]};`
const DistanceSpan = styled.span`color: ${({ theme }) => theme.colors.blue[400]};`
const MatchReasonTag = styled.span`font-size: 9px; color: rgba(200,148,42,0.7); background: rgba(200,148,42,0.08); padding: 2px 6px; border-radius: 4px;`
const PlotCardFooter = styled.div`display: flex; justify-content: space-between; align-items: flex-end;`
const PlotCardPrice = styled.div`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.gold};`
const PlotCardRoi = styled.div`font-size: 12px; font-weight: 700; color: ${({ theme }) => theme.colors.emerald[400]};`
const MiniProgressTrack = styled.div`margin-top: 8px; height: 4px; border-radius: 9999px; background: rgba(255,255,255,0.05); overflow: hidden;`

function PlotCard({ p }: { p: Plot }) {
  const bn = p.block_number ?? p.blockNumber
  const price = (p.total_price ?? p.totalPrice) as number
  const projValue = (p.projected_value ?? p.projectedValue) as number
  const sizeSqM = (p.size_sqm ?? p.sizeSqM) as number
  const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
  const color = statusColors[p.status as string] || '#94A3B8'
  const distLabel = (p as any).distance_km != null
    ? (p as any).distance_km < 1 ? `${Math.round((p as any).distance_km * 1000)}\u05DE\u05F3` : `${(p as any).distance_km} \u05E7\u05F4\u05DE`
    : null
  const matchReasons: string[] = (p as any)._matchReasons || []

  return (
    <PlotCardLink to={`/plot/${p.id}`}>
      <PlotCardHeader>
        <StatusBar $color={color} />
        <div style={{ minWidth: 0 }}>
          <PlotCardTitle>\u05D2\u05D5\u05E9 {bn} | \u05D7\u05DC\u05E7\u05D4 {p.number}</PlotCardTitle>
          <PlotCardSubtitle>{p.city} \u00B7 {formatDunam(sizeSqM)} \u05D3\u05D5\u05E0\u05DD{distLabel && <DistanceSpan> \u00B7 {distLabel}</DistanceSpan>}</PlotCardSubtitle>
        </div>
      </PlotCardHeader>
      {matchReasons.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {matchReasons.slice(0, 2).map((reason, i) => <MatchReasonTag key={i}>{reason}</MatchReasonTag>)}
        </div>
      )}
      <PlotCardFooter>
        <PlotCardPrice>{formatPriceShort(price)}</PlotCardPrice>
        <PlotCardRoi>+{roi}%</PlotCardRoi>
      </PlotCardFooter>
      <MiniProgressTrack>
        <div style={{ height: '100%', borderRadius: 9999, width: `${Math.min(100, Math.max(8, (price / (projValue || 1)) * 100))}%`, background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
      </MiniProgressTrack>
    </PlotCardLink>
  )
}

interface SimilarPlotsProps { plotId: string; onNearbyLoaded?: (plots: Plot[]) => void }

export default function SimilarPlots({ plotId, onNearbyLoaded }: SimilarPlotsProps) {
  const { data: similar = [], isLoading: simLoading } = useSimilarPlots(plotId)
  const { data: nearby = [], isLoading: nearLoading } = useNearbyPlots(plotId)

  useEffect(() => {
    const combined = [...(nearby || []), ...(similar || [])]
    if (combined.length > 0 && onNearbyLoaded) onNearbyLoaded(combined)
  }, [nearby, similar, onNearbyLoaded])

  const nearbyFiltered = useMemo(() => {
    if (!nearby || nearby.length === 0) return []
    const simIds = new Set((similar || []).map((p: Plot) => p.id))
    return nearby.filter((p: Plot) => !simIds.has(p.id)).slice(0, 4)
  }, [nearby, similar])

  const hasSimilar = similar && similar.length > 0
  const hasNearby = nearbyFiltered.length > 0
  const isLoading = simLoading && nearLoading

  if (isLoading || (!hasSimilar && !hasNearby)) return null

  return (
    <SimilarWrap>
      {hasSimilar && (
        <div>
          <SimilarHeading>
            <IconBadge $bg="rgba(139,92,246,0.15)">&#127919;</IconBadge>
            \u05D7\u05DC\u05E7\u05D5\u05EA \u05D3\u05D5\u05DE\u05D5\u05EA
            <SubLabel>\u05DE\u05D7\u05D9\u05E8, \u05E9\u05DC\u05D1 \u05EA\u05DB\u05E0\u05D5\u05E0\u05D9 \u05D5\u05EA\u05E9\u05D5\u05D0\u05D4</SubLabel>
          </SimilarHeading>
          <SimilarGrid>{similar.map((p: Plot) => <PlotCard key={p.id} p={p} />)}</SimilarGrid>
        </div>
      )}
      {hasNearby && (
        <div>
          <SimilarHeading>
            <IconBadge $bg="rgba(59,130,246,0.15)">&#128205;</IconBadge>
            \u05D7\u05DC\u05E7\u05D5\u05EA \u05D1\u05E1\u05D1\u05D9\u05D1\u05D4
          </SimilarHeading>
          <SimilarGrid>{nearbyFiltered.map((p: Plot) => <PlotCard key={p.id} p={p} />)}</SimilarGrid>
        </div>
      )}
    </SimilarWrap>
  )
}
