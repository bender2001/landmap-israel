/**
 * SidebarHeader - Map preview, title, status badges, quick actions, plot navigation
 */
import { useState, useMemo, useEffect } from 'react'
import styled from 'styled-components'
import { X, MapPin, Heart, Copy, Check, ChevronLeft, ChevronRight, Maximize2, Navigation, Hourglass, Eye, BarChart, ExternalLink, FileText } from 'lucide-react'
import { IconBox } from '../ds'
import { statusColors, statusLabels, zoningLabels } from '../../utils/constants'
import { formatDunam, formatCurrency } from '../../utils/format'
import { calcInvestmentScore, getScoreLabel, calcDaysOnMarket, calcDemandVelocity } from '../../utils/investment'
import { calcPlotPerimeter } from '../../utils/geo'
import { plotCenter } from '../../utils/geo'
import { govMapUrl, tabuCheckUrl } from '../../utils/config'
import { usePrefetchPlot } from '../../hooks/usePlots'
import MiniMap from '../ui/MiniMap'
import { theme as themeTokens, media } from '../../styles/theme'
import { InfoBadge, StatusDot, BadgeRow, pulseAnim, pulseGoldAnim } from './shared'
import type { PlotNavigationProps } from './types'

/* ── Styled ────────────────────────────────────────────────── */

const MapPreview = styled.div`
  height: 144px;
  position: relative;
  overflow: hidden;
`

const MapFallback = styled.div`
  height: 144px;
  background: rgba(10, 22, 40, 0.6);
  position: relative;
  overflow: hidden;
`

const MapFallbackCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const MapFallbackDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.colors.gold};
  animation: ${pulseGoldAnim} 2s ease infinite;
`

const MapFallbackLabel = styled.span`
  font-size: 12px;
  color: rgba(200, 148, 42, 0.8);
  margin-top: 8px;
`

const MapGradientBottom = styled.div`
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 48px;
  background: linear-gradient(to top, ${({ theme }) => theme.colors.navy}, transparent);
`

const NavOverlay = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0.8;
  transition: opacity 0.2s;
  ${media.sm} { opacity: 0; }
`

const NavBtn = styled.a<{ $bg: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 700;
  color: white;
  background: ${({ $bg }) => $bg};
  backdrop-filter: blur(4px);
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  transition: background 0.2s;
  &:hover { filter: brightness(1.1); }
`

const HeaderWrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 20px 12px;
  gap: 12px;
`

const HeaderLeft = styled.div`
  min-width: 0;
  flex: 1;
`

const PlotTitle = styled.h2`
  font-size: 24px;
  font-weight: 900;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.slate[100]};
`

const GoldGradientText = styled.span`
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const CopyBtn = styled.button<{ $copied?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $copied }) => $copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'};
  background: ${({ $copied }) => $copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)'};
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  &:hover {
    background: ${({ $copied }) => $copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.1)'};
    border-color: ${({ $copied }) => $copied ? 'rgba(34,197,94,0.3)' : 'rgba(200,148,42,0.2)'};
  }
`

const ActionBtn = styled.button<{ $active?: boolean; $activeColor?: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ $active, $activeColor }) => $active ? ($activeColor || 'rgba(255,255,255,0.1)') + '4D' : 'rgba(255,255,255,0.1)'};
  background: ${({ $active, $activeColor }) => $active ? ($activeColor || 'rgba(255,255,255,0.05)') + '26' : 'rgba(255,255,255,0.05)'};
  cursor: pointer;
  transition: all 0.3s;
  &:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(200, 148, 42, 0.2); }
`

const ActionLink = styled.a`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;
  &:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(200, 148, 42, 0.2); }
`

const CloseBtn = styled(ActionBtn)`
  &:hover { transform: rotate(90deg); }
`

const NavBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 22, 40, 0.2);
`

const NavArrow = styled.button`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(200, 148, 42, 0.2); }
  &:hover svg { color: ${({ theme }) => theme.colors.gold}; }
  svg { width: 16px; height: 16px; color: ${({ theme }) => theme.colors.slate[400]}; transition: color 0.2s; }
`

const NavCounter = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.slate[500]};
  flex: 1;
  text-align: center;
  font-variant-numeric: tabular-nums;
`

const OfficialBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  direction: rtl;
`

const OfficialLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.slate[400]};
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none;
  transition: all 0.2s;
  &:hover { background: rgba(200, 148, 42, 0.1); color: ${({ theme }) => theme.colors.gold}; border-color: rgba(200, 148, 42, 0.2); }
  svg { width: 10px; height: 10px; }
`

/* ── PlotNavigation ────────────────────────────────────────── */

function PlotNavigation({ currentPlot, allPlots, onSelectPlot }: PlotNavigationProps) {
  const prefetchPlot = usePrefetchPlot()
  const { currentIndex, total, prevPlot, nextPlot } = useMemo(() => {
    if (!currentPlot || !allPlots || allPlots.length < 2) return { currentIndex: -1, total: 0, prevPlot: null, nextPlot: null }
    const idx = allPlots.findIndex((p: any) => p.id === currentPlot.id)
    if (idx < 0) return { currentIndex: -1, total: 0, prevPlot: null, nextPlot: null }
    const prevIdx = idx > 0 ? idx - 1 : allPlots.length - 1
    const nextIdx = idx < allPlots.length - 1 ? idx + 1 : 0
    return { currentIndex: idx, total: allPlots.length, prevPlot: allPlots[prevIdx], nextPlot: allPlots[nextIdx] }
  }, [currentPlot?.id, allPlots])

  useEffect(() => {
    if (prevPlot?.id) prefetchPlot(prevPlot.id)
    if (nextPlot?.id) prefetchPlot(nextPlot.id)
  }, [prevPlot?.id, nextPlot?.id, prefetchPlot])

  if (total < 2 || currentIndex < 0) return null

  const prevBn = prevPlot ? (prevPlot.block_number ?? prevPlot.blockNumber) : ''
  const nextBn = nextPlot ? (nextPlot.block_number ?? nextPlot.blockNumber) : ''

  return (
    <NavBar>
      <NavArrow onClick={() => nextPlot && onSelectPlot(nextPlot)} onMouseEnter={() => nextPlot && prefetchPlot(nextPlot.id)} title={nextPlot ? `הבא: גוש ${nextBn} חלקה ${nextPlot.number}` : 'חלקה הבאה'}>
        <ChevronRight />
      </NavArrow>
      <NavCounter>{currentIndex + 1} / {total}</NavCounter>
      <NavArrow onClick={() => prevPlot && onSelectPlot(prevPlot)} onMouseEnter={() => prevPlot && prefetchPlot(prevPlot.id)} title={prevPlot ? `הקודם: גוש ${prevBn} חלקה ${prevPlot.number}` : 'חלקה קודמת'}>
        <ChevronLeft />
      </NavArrow>
    </NavBar>
  )
}

/* ── Main export ───────────────────────────────────────────── */

interface SidebarHeaderProps {
  plot: any
  onClose: () => void
  favorites?: any
  allPlots: any[]
  onSelectPlot?: (plot: any) => void
  gushCopied: boolean
  setGushCopied: (v: boolean) => void
}

export default function SidebarHeader({ plot, onClose, favorites, allPlots, onSelectPlot, gushCopied, setGushCopied }: SidebarHeaderProps) {
  const blockNumber = plot.block_number ?? plot.blockNumber
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM
  const zoningStage = plot.zoning_stage ?? plot.zoningStage
  const densityUnitsPerDunam = plot.density_units_per_dunam ?? plot.densityUnitsPerDunam
  const statusColor = statusColors[plot.status]

  return (
    <>
      {/* Map preview */}
      {plot.coordinates && plot.coordinates.length >= 3 ? (
        <MapPreview>
          <MiniMap coordinates={plot.coordinates} status={plot.status} city={plot.city} height="144px" style={{ borderRadius: 0, border: 0 }} showStreetViewToggle />
          {(() => {
            const center = plotCenter(plot.coordinates)
            if (!center) return null
            return (
              <NavOverlay>
                <NavBtn $bg="rgba(51,204,255,0.9)" href={`https://www.waze.com/ul?ll=${center.lat},${center.lng}&navigate=yes&zoom=17`} target="_blank" rel="noopener noreferrer" title="נווט ב-Waze" onClick={(e: any) => e.stopPropagation()}>
                  <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 6.63c.23.7.38 1.43.43 2.19.05.84-.01 1.63-.19 2.39-.18.76-.47 1.47-.85 2.11a7.88 7.88 0 01-1.47 1.8c.1.13.19.26.27.4.36.66.55 1.38.55 2.17 0 .83-.21 1.6-.63 2.3a4.54 4.54 0 01-1.7 1.7 4.54 4.54 0 01-2.3.63c-.75 0-1.44-.17-2.08-.51a4.32 4.32 0 01-1.28-.99 8.2 8.2 0 01-2.37.35c-1.39 0-2.69-.33-3.89-.99a7.8 7.8 0 01-2.92-2.77A7.47 7.47 0 011 13.39c0-1.39.33-2.69.99-3.89A7.8 7.8 0 014.76 6.58a7.47 7.47 0 013.83-1.08h.2c.37-1.07 1.02-1.93 1.95-2.58A5.34 5.34 0 0113.85 2c1.07 0 2.06.3 2.96.89.9.6 1.55 1.38 1.96 2.35a7.6 7.6 0 011.77 1.39zm-5.85-2.3a2.89 2.89 0 00-2.13.86 2.92 2.92 0 00-.86 2.14c0 .17.01.34.04.5a7.7 7.7 0 012.14-.61c.34-.06.68-.1 1.03-.11a3.02 3.02 0 00-.09-1.65 2.93 2.93 0 00-2.13-1.13zm-3.96 5.72c-.48 0-.89.17-1.23.51-.34.34-.51.75-.51 1.23s.17.89.51 1.23c.34.34.75.51 1.23.51s.89-.17 1.23-.51c.34-.34.51-.75.51-1.23s-.17-.89-.51-1.23a1.68 1.68 0 00-1.23-.51zm5.07 0c-.48 0-.89.17-1.23.51-.34.34-.51.75-.51 1.23s.17.89.51 1.23c.34.34.75.51 1.23.51s.89-.17 1.23-.51c.34-.34.51-.75.51-1.23s-.17-.89-.51-1.23a1.68 1.68 0 00-1.23-.51z"/></svg>
                  Waze
                </NavBtn>
                <NavBtn $bg="rgba(66,133,244,0.9)" href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer" title="נווט ב-Google Maps" onClick={(e: any) => e.stopPropagation()}>
                  <Navigation style={{ width: 12, height: 12 }} />
                  Maps
                </NavBtn>
              </NavOverlay>
            )
          })()}
        </MapPreview>
      ) : (
        <MapFallback>
          <MapFallbackCenter>
            <MapFallbackDot />
            <MapFallbackLabel>גוש {blockNumber} | {plot.city}</MapFallbackLabel>
          </MapFallbackCenter>
          <MapGradientBottom />
        </MapFallback>
      )}

      {/* Header */}
      <HeaderWrap>
        <HeaderLeft>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlotTitle>
              <GoldGradientText>גוש</GoldGradientText>{' '}{blockNumber}{' | '}<GoldGradientText>חלקה</GoldGradientText>{' '}{plot.number}
            </PlotTitle>
            <CopyBtn $copied={gushCopied} onClick={() => { navigator.clipboard.writeText(`גוש ${blockNumber} חלקה ${plot.number}`).then(() => { setGushCopied(true); setTimeout(() => setGushCopied(false), 2000) }) }} title="העתק גוש/חלקה (לחיפוש בטאבו, מנהל מקרקעין)">
              {gushCopied ? <Check style={{ width: 12, height: 12, color: '#4ADE80' }} /> : <Copy style={{ width: 12, height: 12, color: themeTokens.colors.slate[400] }} />}
            </CopyBtn>
          </div>
          {/* Mobile compact */}
          <BadgeRow $mobile>
            <span style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>{formatDunam(sizeSqM)} דונם</span>
            <span style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>&#8226;</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: statusColor }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: statusColor }} />{statusLabels[plot.status]}
            </span>
            <span style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>&#8226;</span>
            {(() => { const score = calcInvestmentScore(plot); const { color } = getScoreLabel(score); return <span style={{ fontSize: 12, fontWeight: 700, color }}>&#11088; {score}/10</span> })()}
          </BadgeRow>
          {/* Desktop full badges */}
          <BadgeRow>
            <InfoBadge>{formatDunam(sizeSqM)} דונם ({sizeSqM.toLocaleString()} מ&quot;ר)</InfoBadge>
            {(() => { const perimeter = calcPlotPerimeter(plot.coordinates); if (!perimeter || perimeter < 10) return null; const fmt = perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} ק״מ` : `${Math.round(perimeter)} מ׳`; return <InfoBadge $color="rgba(96,165,250,0.8)" $bg="rgba(59,130,246,0.08)" title={`היקף החלקה: ${Math.round(perimeter)} מטר`}>&#128207; היקף: {fmt}</InfoBadge> })()}
            <InfoBadge $color={themeTokens.colors.slate[300]}>{zoningLabels[zoningStage]}</InfoBadge>
            {densityUnitsPerDunam && <InfoBadge $color={themeTokens.colors.gold} $bg="rgba(200,148,42,0.1)">{densityUnitsPerDunam} יח&quot;ד/דונם</InfoBadge>}
            <InfoBadge $bg={statusColor + '14'} $border={statusColor + '35'} $color={statusColor} style={{ borderRadius: 9999, fontWeight: 500 }}>
              <StatusDot $color={statusColor} $size={8} />{statusLabels[plot.status]}
            </InfoBadge>
            {(() => { const score = calcInvestmentScore(plot); const { label, color } = getScoreLabel(score); return <InfoBadge $bg={`${color}14`} $border={`${color}35`} $color={color} style={{ borderRadius: 9999, fontWeight: 700 }} title={`ציון השקעה: ${score}/10 — ${label}`}>&#11088; {score}/10</InfoBadge> })()}
            {plot._buySignal && <InfoBadge $bg={plot._buySignal.signal === 'BUY' ? 'rgba(16,185,129,0.12)' : plot._buySignal.signal === 'HOLD' ? 'rgba(245,158,11,0.12)' : 'rgba(100,116,139,0.12)'} $border={plot._buySignal.signal === 'BUY' ? 'rgba(16,185,129,0.3)' : plot._buySignal.signal === 'HOLD' ? 'rgba(245,158,11,0.3)' : 'rgba(100,116,139,0.3)'} $color={plot._buySignal.signal === 'BUY' ? '#34D399' : plot._buySignal.signal === 'HOLD' ? '#FBBF24' : '#94A3B8'} style={{ borderRadius: 9999, fontWeight: 700 }}>{plot._buySignal.label}{plot._paybackYears != null && plot._paybackYears > 0 && <span style={{ fontSize: 9, opacity: 0.7 }}>&#183; {plot._paybackYears}שנ׳</span>}</InfoBadge>}
            {plot._investmentRank && plot._totalRanked && plot._investmentRank <= 5 && <InfoBadge $bg={plot._investmentRank === 1 ? 'rgba(200,148,42,0.15)' : 'rgba(99,102,241,0.12)'} $border={plot._investmentRank === 1 ? 'rgba(200,148,42,0.35)' : 'rgba(99,102,241,0.25)'} $color={plot._investmentRank === 1 ? '#E5B84B' : '#A5B4FC'} $size="sm" style={{ borderRadius: 9999, fontWeight: 700 }}>{plot._investmentRank === 1 ? '🥇' : plot._investmentRank === 2 ? '🥈' : plot._investmentRank === 3 ? '🥉' : '🏅'}#{plot._investmentRank}/{plot._totalRanked}</InfoBadge>}
            {plot.views > 0 && <InfoBadge $bg="rgba(99,102,241,0.12)" $border="rgba(99,102,241,0.25)" $color="#A5B4FC" $size="sm" style={{ borderRadius: 9999 }}><Eye style={{ width: 10, height: 10 }} />{plot.views} צפו</InfoBadge>}
            {(() => { const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt); if (!dom) return null; return <InfoBadge $bg={`${dom.color}14`} $border={`${dom.color}35`} $color={dom.color} $size="sm" style={{ borderRadius: 9999 }}><Hourglass style={{ width: 10, height: 10 }} />{dom.label}</InfoBadge> })()}
            {(() => { const dv = calcDemandVelocity(plot); if (!dv || dv.tier === 'low') return null; return <InfoBadge $bg={`${dv.color}14`} $border={`${dv.color}35`} $color={dv.color} $size="sm" style={{ borderRadius: 9999 }}>{dv.emoji} {dv.label}</InfoBadge> })()}
            {plot._marketTrend && plot._marketTrend.direction !== 'stable' && <InfoBadge $bg={plot._marketTrend.direction === 'up' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'} $border={plot._marketTrend.direction === 'up' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'} $color={plot._marketTrend.direction === 'up' ? '#34D399' : '#F87171'} $size="sm" style={{ borderRadius: 9999, fontWeight: 700 }}>{plot._marketTrend.direction === 'up' ? '📈' : '📉'} {plot.city} {plot._marketTrend.changePct > 0 ? '+' : ''}{plot._marketTrend.changePct}%</InfoBadge>}
          </BadgeRow>
        </HeaderLeft>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {favorites && (
            <ActionBtn $active={favorites.isFavorite(plot.id)} $activeColor="rgba(239,68,68,1)" onClick={() => favorites.toggle(plot.id)}>
              <Heart style={{ width: 16, height: 16, color: favorites.isFavorite(plot.id) ? '#F87171' : themeTokens.colors.slate[400], fill: favorites.isFavorite(plot.id) ? '#F87171' : 'none', transform: favorites.isFavorite(plot.id) ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s' }} />
            </ActionBtn>
          )}
          <ActionLink href={`/plot/${plot.id}`} target="_blank" rel="noopener noreferrer" aria-label="פתח בדף מלא" title="פתח בדף מלא">
            <Maximize2 style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />
          </ActionLink>
          <CloseBtn onClick={onClose} aria-label="סגור פרטי חלקה">
            <X style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />
          </CloseBtn>
        </div>
      </HeaderWrap>

      {/* Plot navigation */}
      {onSelectPlot && <PlotNavigation currentPlot={plot} allPlots={allPlots} onSelectPlot={onSelectPlot} />}

      {/* Official sources */}
      <OfficialBar dir="rtl">
        <span style={{ fontSize: 10, color: themeTokens.colors.slate[500], fontWeight: 500 }}>🏛️ מקורות רשמיים:</span>
        {govMapUrl(plot) && <OfficialLink href={govMapUrl(plot)} target="_blank" rel="noopener noreferrer" title={`פתח גוש ${blockNumber} חלקה ${plot.number} ב-GovMap`}><ExternalLink />GovMap</OfficialLink>}
        {tabuCheckUrl(plot) && <OfficialLink href={tabuCheckUrl(plot)} target="_blank" rel="noopener noreferrer" title="בדיקת נסח טאבו"><FileText style={{ width: 10, height: 10 }} />נסח טאבו</OfficialLink>}
        <OfficialLink href={`https://www.nadlan.gov.il/?search=${encodeURIComponent(plot.city)}`} target="_blank" rel="noopener noreferrer" title="עסקאות נדל״ן באזור"><BarChart style={{ width: 10, height: 10 }} />נדל״ן ממשלתי</OfficialLink>
      </OfficialBar>
    </>
  )
}
