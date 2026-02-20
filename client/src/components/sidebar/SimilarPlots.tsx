/**
 * SimilarPlots - Similar plots, nearby plots, cross-city alternatives
 */
import { useMemo } from 'react'
import styled from 'styled-components'
import { useSimilarPlots, useNearbyPlots } from '../../hooks/usePlots'
import { statusColors } from '../../utils/constants'
import { formatCurrency } from '../../utils/format'
import { theme as themeTokens } from '../../styles/theme'
import { CardLift } from '../../styles/shared'
import type { SimilarPlotsProps } from './types'

const PlotRowBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 10px 12px;
  text-align: right;
  cursor: pointer;
  transition: all 0.2s;
  ${CardLift}
  &:hover { border-color: rgba(200, 148, 42, 0.2); }
`

const PlotRowIndicator = styled.div<{ $color: string }>`
  width: 4px;
  height: 32px;
  border-radius: 9999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`

export default function SimilarPlots({ currentPlot, allPlots, onSelectPlot }: SimilarPlotsProps) {
  const { data: similarPlots } = useSimilarPlots(currentPlot?.id)
  const { data: nearbyPlots } = useNearbyPlots(currentPlot?.id)

  const nearbyFiltered = useMemo(() => {
    if (!nearbyPlots || nearbyPlots.length === 0) return []
    const similarIds = new Set((similarPlots || []).map((p: any) => p.id))
    return nearbyPlots.filter((p: any) => !similarIds.has(p.id)).slice(0, 3)
  }, [nearbyPlots, similarPlots])

  const fallbackSimilar = useMemo(() => {
    if ((similarPlots && similarPlots.length > 0) || (nearbyPlots && nearbyPlots.length > 0)) return []
    if (!currentPlot || !allPlots || allPlots.length < 2) return []
    const price = currentPlot.total_price ?? currentPlot.totalPrice ?? 0
    const size = currentPlot.size_sqm ?? currentPlot.sizeSqM ?? 0
    return allPlots
      .filter((p: any) => p.id !== currentPlot.id)
      .map((p: any) => {
        const pPrice = p.total_price ?? p.totalPrice ?? 0
        const pSize = p.size_sqm ?? p.sizeSqM ?? 0
        const priceDiff = price > 0 ? Math.abs(pPrice - price) / price : 1
        const sizeDiff = size > 0 ? Math.abs(pSize - size) / size : 1
        const cityBonus = p.city === currentPlot.city ? 0 : 0.3
        return { ...p, _similarityScore: 10 - (priceDiff + sizeDiff + cityBonus) * 3 }
      })
      .sort((a: any, b: any) => b._similarityScore - a._similarityScore)
      .slice(0, 3)
  }, [currentPlot?.id, allPlots, similarPlots, nearbyPlots])

  const crossCityAlternatives = useMemo(() => {
    if (!currentPlot || !allPlots || allPlots.length < 4) return []
    const currentCity = currentPlot.city
    const currentRoi = (() => {
      const price = currentPlot.total_price ?? currentPlot.totalPrice ?? 0
      const proj = currentPlot.projected_value ?? currentPlot.projectedValue ?? 0
      return price > 0 ? ((proj - price) / price) * 100 : 0
    })()
    return allPlots
      .filter((p: any) => { if (p.id === currentPlot.id || p.city === currentCity) return false; if (p.status !== 'AVAILABLE') return false; const price = p.total_price ?? p.totalPrice ?? 0; const proj = p.projected_value ?? p.projectedValue ?? 0; if (price <= 0) return false; const roi = ((proj - price) / price) * 100; return Math.abs(roi - currentRoi) <= 30 })
      .map((p: any) => { const price = p.total_price ?? p.totalPrice ?? 0; const proj = p.projected_value ?? p.projectedValue ?? 0; const roi = price > 0 ? ((proj - price) / price) * 100 : 0; return { ...p, _matchReasons: [`ROI דומה +${Math.round(roi)}%`, p.city], _crossScore: 1 - Math.abs(roi - currentRoi) / 100 } })
      .sort((a: any, b: any) => b._crossScore - a._crossScore)
      .slice(0, 3)
  }, [currentPlot?.id, allPlots])

  const hasSimilar = (similarPlots && similarPlots.length > 0) || fallbackSimilar.length > 0
  const hasNearby = nearbyFiltered.length > 0
  const hasCrossCity = crossCityAlternatives.length > 0
  if (!hasSimilar && !hasNearby && !hasCrossCity) return null

  const renderPlotRow = (p: any, showDistance = false, showReasons = false) => {
    const bn = p.block_number ?? p.blockNumber
    const price = p.total_price ?? p.totalPrice
    const projValue = p.projected_value ?? p.projectedValue
    const roi = price > 0 ? Math.round((projValue - price) / price * 100) : 0
    const color = statusColors[p.status]
    return (
      <PlotRowBtn key={p.id} onClick={() => onSelectPlot(p)}>
        <PlotRowIndicator $color={color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>גוש {bn} | חלקה {p.number}</div>
          <div style={{ fontSize: 10, color: themeTokens.colors.slate[500], display: 'flex', alignItems: 'center', gap: 4 }}>
            {p.city}
            {showDistance && p.distance_km != null && <span style={{ color: '#60A5FA' }}>\u00B7 {p.distance_km < 1 ? `${Math.round(p.distance_km * 1000)}\u05DE\u05F3` : `${p.distance_km} \u05E7\u05F4\u05DE`}</span>}
            {!showDistance && p._distanceKm != null && <span style={{ color: 'rgba(96,165,250,0.7)' }}>\u00B7 {p._distanceKm < 1 ? `${Math.round(p._distanceKm * 1000)}\u05DE\u05F3` : `${p._distanceKm} \u05E7\u05F4\u05DE`}</span>}
          </div>
          {showReasons && p._matchReasons && p._matchReasons.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {p._matchReasons.slice(0, 2).map((reason: string, i: number) => <span key={i} style={{ fontSize: 8, color: 'rgba(200,148,42,0.7)', background: 'rgba(200,148,42,0.08)', padding: '2px 6px', borderRadius: 4 }}>{reason}</span>)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'left', flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.gold }}>{formatCurrency(price)}</div>
          <div style={{ fontSize: 10, color: '#34D399' }}>+{roi}%</div>
        </div>
      </PlotRowBtn>
    )
  }

  return (
    <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {hasSimilar && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[400], marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎯</span>
            חלקות דומות
            <span style={{ fontSize: 9, color: themeTokens.colors.slate[600], fontWeight: 400 }}>מחיר, תכנון ותשואה</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(similarPlots && similarPlots.length > 0 ? similarPlots : fallbackSimilar).map((p: any) => renderPlotRow(p, false, true))}
          </div>
        </div>
      )}
      {hasNearby && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[400], marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>📍</span>
            חלקות בסביבה
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{nearbyFiltered.map((p: any) => renderPlotRow(p, true, false))}</div>
        </div>
      )}
      {hasCrossCity && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[400], marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(200,148,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🌍</span>
            חלופות בערים אחרות
            <span style={{ fontSize: 9, color: themeTokens.colors.slate[600], fontWeight: 400 }}>ROI דומה, עיר שונה</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{crossCityAlternatives.map((p: any) => renderPlotRow(p, false, true))}</div>
        </div>
      )}
    </div>
  )
}
