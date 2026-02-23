/**
 * ExploreOverlays.tsx — Extracted market overlay widgets from Explore.tsx
 *
 * Components: CityStatsOverlay, MarketPulseOverlay, InsightsTickerOverlay,
 *             RecentlyViewedStrip, TopPickOverlay
 */
import { memo, useMemo, useState, useEffect, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { Building2, X, PieChart, Zap, Clock, ChevronLeft } from 'lucide-react'
import { t, mobile } from '../theme'
import { p, roi, fmt, calcScore, getGrade, pricePerSqm, pricePerDunam, zoningLabels, calcMarketTemperature } from '../utils'
import type { Plot } from '../types'

/* ════════════════════ SHARED ANIMATIONS ════════════════════ */
const chipPop = keyframes`from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}`

/* ════════════════════ MARKET TEMPERATURE GAUGE ════════════════════ */
const TempGauge = styled.div<{$c:string}>`display:flex;align-items:center;gap:4px;`
const TempBar = styled.div<{$pct:number;$c:string}>`
  width:40px;height:5px;border-radius:3px;background:${t.bg};overflow:hidden;position:relative;
  &::after{content:'';position:absolute;top:0;left:0;height:100%;
    width:${pr=>pr.$pct}%;background:${pr=>pr.$c};border-radius:3px;
    transition:width 0.8s ease;}
`

/* ════════════════════ CITY STATS CARD ════════════════════ */
const cityCardSlide = keyframes`from{opacity:0;transform:translateY(-16px) translateX(-50%)}to{opacity:1;transform:translateY(0) translateX(-50%)}`
const cityCardSlideMobile = keyframes`from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}`
const CityStatsCard = styled.div`
  position:absolute;top:80px;left:50%;transform:translateX(-50%);z-index:${t.z.filter - 1};
  display:flex;align-items:stretch;gap:0;direction:rtl;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.lg};box-shadow:${t.sh.lg};
  overflow:hidden;min-width:480px;max-width:min(680px,calc(100vw - 32px));
  animation:${cityCardSlide} 0.35s cubic-bezier(0.32,0.72,0,1);
  ${mobile}{top:56px;left:8px;right:8px;transform:none;min-width:0;
    flex-wrap:wrap;animation:${cityCardSlideMobile} 0.35s cubic-bezier(0.32,0.72,0,1);}
`
const CityStatsHeader = styled.div`
  display:flex;align-items:center;gap:8px;padding:10px 16px;
  background:linear-gradient(135deg,rgba(212,168,75,0.12),rgba(212,168,75,0.04));
  border-left:1px solid ${t.border};min-width:120px;
  ${mobile}{width:100%;border-left:none;border-bottom:1px solid ${t.border};padding:8px 12px;}
`
const CityStatsName = styled.div`font-size:14px;font-weight:800;color:${t.text};white-space:nowrap;`
const CityStatsCount = styled.div`font-size:11px;color:${t.textSec};font-weight:600;`
const CityStatsCells = styled.div`display:flex;align-items:stretch;gap:0;flex:1;${mobile}{width:100%;}`
const CityStatCell = styled.div`
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  padding:10px 12px;border-left:1px solid ${t.border};
  &:last-child{border-left:none;}
  ${mobile}{padding:8px 6px;}
`
const CityStatVal = styled.div<{$c?:string}>`
  font-size:13px;font-weight:800;color:${pr=>pr.$c||t.gold};white-space:nowrap;font-family:${t.font};
  ${mobile}{font-size:12px;}
`
const CityStatLabel = styled.div`font-size:9px;font-weight:600;color:${t.textDim};text-transform:uppercase;white-space:nowrap;letter-spacing:0.3px;`
const CityStatsClose = styled.button`
  display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};color:${t.textDim};cursor:pointer;flex-shrink:0;
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};color:${t.gold};}
`

interface CityStatsData {
  count: number; avgPrice: number; minPrice: number; maxPrice: number
  avgPps: number; avgRoi: number; totalArea: number; dominantZoning: string
}

export const CityStatsOverlay = memo(function CityStatsOverlay({
  cityName, stats, marketTemp, onDismiss,
}: {
  cityName: string; stats: CityStatsData
  marketTemp: { color: string; pct: number; label: string; emoji: string; score: number }
  onDismiss: () => void
}) {
  return (
    <CityStatsCard>
      <CityStatsHeader>
        <Building2 size={16} color={t.gold} />
        <div>
          <CityStatsName>{cityName}</CityStatsName>
          <CityStatsCount>{stats.count} חלקות · {fmt.dunam(stats.totalArea)} דונם</CityStatsCount>
        </div>
        <CityStatsClose onClick={onDismiss} aria-label="סגור"><X size={12} /></CityStatsClose>
      </CityStatsHeader>
      <CityStatsCells>
        <CityStatCell>
          <CityStatVal>{fmt.compact(stats.avgPrice)}</CityStatVal>
          <CityStatLabel>מחיר ממוצע</CityStatLabel>
        </CityStatCell>
        <CityStatCell>
          <CityStatVal>{fmt.num(stats.avgPps)}</CityStatVal>
          <CityStatLabel>₪/דונם</CityStatLabel>
        </CityStatCell>
        <CityStatCell>
          <CityStatVal $c={stats.avgRoi > 0 ? t.ok : t.textSec}>
            {stats.avgRoi > 0 ? <>+{stats.avgRoi}%</> : '—'}
          </CityStatVal>
          <CityStatLabel>תשואה ממוצעת</CityStatLabel>
        </CityStatCell>
        <CityStatCell>
          <CityStatVal $c={t.text}>{fmt.compact(stats.minPrice)}–{fmt.compact(stats.maxPrice)}</CityStatVal>
          <CityStatLabel>טווח מחירים</CityStatLabel>
        </CityStatCell>
        {marketTemp && (
          <CityStatCell title={`טמפרטורת שוק: ${marketTemp.label}`}>
            <TempGauge $c={marketTemp.color}>
              <TempBar $pct={marketTemp.pct} $c={marketTemp.color} />
              <CityStatVal $c={marketTemp.color} style={{fontSize:11}}>{marketTemp.emoji}</CityStatVal>
            </TempGauge>
            <CityStatLabel>{marketTemp.label}</CityStatLabel>
          </CityStatCell>
        )}
        {stats.dominantZoning && (
          <CityStatCell>
            <CityStatVal style={{fontSize:11}}>{stats.dominantZoning}</CityStatVal>
            <CityStatLabel>שלב נפוץ</CityStatLabel>
          </CityStatCell>
        )}
      </CityStatsCells>
    </CityStatsCard>
  )
})

/* ════════════════════ MARKET PULSE WIDGET ════════════════════ */
const pulseGlow = keyframes`0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.15)}50%{box-shadow:0 0 0 6px rgba(16,185,129,0.08)}`
const MarketPulseWrap = styled.div`
  position:absolute;top:80px;right:80px;z-index:${t.z.filter - 1};direction:rtl;
  display:flex;align-items:stretch;gap:0;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.lg};box-shadow:${t.sh.lg};
  overflow:hidden;animation:${chipPop} 0.35s cubic-bezier(0.32,0.72,0,1);
  @media(max-width:900px){top:auto;bottom:42px;right:auto;left:50%;transform:translateX(-50%);
    max-width:calc(100vw - 32px);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;
    &::-webkit-scrollbar{display:none;}}
  ${mobile}{display:none;}
`
const PulseCell = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  padding:10px 16px;border-left:1px solid ${t.border};&:last-child{border-left:none;}
  ${mobile}{padding:8px 12px;min-width:0;flex-shrink:0;}
`
const PulseVal = styled.div<{$c?:string}>`font-size:14px;font-weight:800;color:${pr=>pr.$c||t.gold};white-space:nowrap;${mobile}{font-size:12px;}`
const PulseLabel = styled.div`font-size:9px;font-weight:600;color:${t.textDim};white-space:nowrap;letter-spacing:0.3px;${mobile}{font-size:8px;}`
const PulseDot = styled.span<{$c:string}>`
  display:inline-block;width:6px;height:6px;border-radius:50%;background:${pr=>pr.$c};
  animation:${pulseGlow} 2s ease-in-out infinite;flex-shrink:0;
`

export interface MarketPulseData { totalValue: number; hotDeals: number; belowAvgCount: number; avgRoi: number }

export const MarketPulseOverlay = memo(function MarketPulseOverlay({
  pulse, marketTemp,
}: {
  pulse: MarketPulseData
  marketTemp: { color: string; pct: number; label: string; emoji: string; score: number }
}) {
  return (
    <MarketPulseWrap>
      {marketTemp.score > 0 && (
        <PulseCell>
          <PulseVal $c={marketTemp.color}>
            <TempGauge $c={marketTemp.color}>
              <span>{marketTemp.emoji}</span>
              <TempBar $pct={marketTemp.score} $c={marketTemp.color} />
            </TempGauge>
          </PulseVal>
          <PulseLabel>{marketTemp.label}</PulseLabel>
        </PulseCell>
      )}
      <PulseCell>
        <PulseVal>{fmt.compact(pulse.totalValue)}</PulseVal>
        <PulseLabel><PieChart size={8} style={{marginLeft:3}} /> שווי כולל</PulseLabel>
      </PulseCell>
      {pulse.hotDeals > 0 && (
        <PulseCell>
          <PulseVal $c={t.ok}><PulseDot $c={t.ok} /> {pulse.hotDeals}</PulseVal>
          <PulseLabel>עסקאות A/A+</PulseLabel>
        </PulseCell>
      )}
      {pulse.belowAvgCount > 0 && (
        <PulseCell>
          <PulseVal $c="#3B82F6">{pulse.belowAvgCount}</PulseVal>
          <PulseLabel>מתחת לממוצע</PulseLabel>
        </PulseCell>
      )}
      {pulse.avgRoi > 0 && (
        <PulseCell>
          <PulseVal $c={pulse.avgRoi > 30 ? t.ok : t.warn}>+{pulse.avgRoi}%</PulseVal>
          <PulseLabel>תשואה ממוצעת</PulseLabel>
        </PulseCell>
      )}
    </MarketPulseWrap>
  )
})

/* ════════════════════ INSIGHTS TICKER ════════════════════ */
const tickerFade = keyframes`0%{opacity:0;transform:translateY(6px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-6px)}`
const InsightsTickerWrap = styled.div`
  position:absolute;top:56px;left:50%;transform:translateX(-50%);z-index:${t.z.filter - 1};
  display:flex;align-items:center;gap:8px;padding:5px 16px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.full};box-shadow:${t.sh.sm};
  font-size:12px;font-weight:600;color:${t.textSec};white-space:nowrap;
  max-width:min(520px,calc(100vw - 32px));overflow:hidden;
  ${mobile}{top:46px;left:8px;right:8px;transform:none;font-size:11px;padding:4px 12px;}
`
const InsightText = styled.span`animation:${tickerFade} 5s ease-in-out infinite;display:flex;align-items:center;gap:6px;`
const InsightIcon = styled.span`font-size:14px;flex-shrink:0;`
const InsightVal = styled.span`color:${t.goldBright};font-weight:800;`

export interface InsightItem { icon: string; text: string; val: string }

export const InsightsTickerOverlay = memo(function InsightsTickerOverlay({
  insights, tabVisible,
}: {
  insights: InsightItem[]; tabVisible: boolean
}) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (insights.length <= 1 || !tabVisible) return
    const id = setInterval(() => setIdx(i => (i + 1) % insights.length), 5000)
    return () => clearInterval(id)
  }, [insights.length, tabVisible])

  if (!insights.length) return null
  const item = insights[idx % insights.length]
  if (!item) return null

  return (
    <InsightsTickerWrap>
      <InsightText key={idx}>
        <InsightIcon>{item.icon}</InsightIcon>
        {item.text}
        <InsightVal>{item.val}</InsightVal>
      </InsightText>
    </InsightsTickerWrap>
  )
})

/* ════════════════════ RECENTLY VIEWED STRIP ════════════════════ */
const RecentStrip = styled.div`
  position:absolute;top:80px;left:50%;transform:translateX(-50%);z-index:${t.z.filter - 1};
  display:flex;align-items:center;gap:8px;padding:6px 14px;direction:rtl;
  background:${t.glass};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border:1px solid ${t.glassBorder};border-radius:${t.r.full};box-shadow:${t.sh.md};
  max-width:calc(100vw - 32px);overflow-x:auto;scrollbar-width:none;&::-webkit-scrollbar{display:none;}
  ${mobile}{top:100px;left:8px;right:8px;transform:none;}
`
const RecentLabel = styled.span`font-size:11px;font-weight:600;color:${t.textDim};white-space:nowrap;display:flex;align-items:center;gap:4px;flex-shrink:0;`
const RecentChip = styled.button`
  display:inline-flex;align-items:center;gap:4px;padding:4px 12px;
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.full};
  font-size:11px;font-weight:600;color:${t.textSec};font-family:${t.font};
  cursor:pointer;white-space:nowrap;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`

export const RecentlyViewedStrip = memo(function RecentlyViewedStrip({
  plots, onSelect,
}: {
  plots: Plot[]; onSelect: (plot: Plot) => void
}) {
  if (!plots.length) return null
  return (
    <RecentStrip>
      <RecentLabel><Clock size={12} /> ראיתם לאחרונה</RecentLabel>
      {plots.map(pl => (
        <RecentChip key={pl.id} onClick={() => onSelect(pl)}>
          {pl.city} · {pl.number}
        </RecentChip>
      ))}
    </RecentStrip>
  )
})

/* ════════════════════ TOP PICK CARD ════════════════════ */
const topPickEnter = keyframes`from{opacity:0;transform:translateY(12px) scale(0.95)}to{opacity:1;transform:translateY(0) scale(1)}`
const topPickFloat = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}`
const TopPickWrap = styled.div`
  position:absolute;bottom:48px;left:16px;z-index:${t.z.filter - 1};direction:rtl;
  display:flex;align-items:stretch;gap:0;
  background:${t.glass};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid ${t.goldBorder};border-radius:${t.r.lg};box-shadow:${t.sh.lg};
  overflow:hidden;max-width:320px;cursor:pointer;
  animation:${topPickEnter} 0.4s cubic-bezier(0.32,0.72,0,1);transition:all ${t.tr};
  &:hover{box-shadow:${t.sh.glow};border-color:${t.gold};transform:translateY(-2px);}
  ${mobile}{bottom:62px;left:8px;right:auto;max-width:calc(100vw - 64px);}
  @media(max-width:400px){display:none;}
`
const TopPickBadge = styled.div`
  display:flex;align-items:center;justify-content:center;padding:8px 10px;
  background:linear-gradient(135deg,rgba(212,168,75,0.12),rgba(212,168,75,0.04));
  border-left:1px solid ${t.border};flex-shrink:0;animation:${topPickFloat} 3s ease-in-out infinite;
`
const TopPickBody = styled.div`display:flex;flex-direction:column;gap:2px;padding:8px 12px;min-width:0;flex:1;`
const TopPickTitle = styled.div`font-size:10px;font-weight:700;color:${t.gold};text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:4px;`
const TopPickName = styled.div`font-size:13px;font-weight:800;color:${t.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const TopPickMeta = styled.div`display:flex;align-items:center;gap:8px;font-size:11px;color:${t.textSec};`
const TopPickCloseBtn = styled.button`
  position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:${t.r.full};
  background:transparent;border:1px solid ${t.border};color:${t.textDim};
  display:flex;align-items:center;justify-content:center;cursor:pointer;
  transition:all ${t.tr};font-size:10px;padding:0;
  &:hover{border-color:${t.goldBorder};color:${t.gold};}
`

export const TopPickOverlay = memo(function TopPickOverlay({
  plot, onSelect, onDismiss,
}: {
  plot: Plot; onSelect: (plot: Plot) => void; onDismiss: () => void
}) {
  const d = p(plot), score = calcScore(plot), grade = getGrade(score), r = roi(plot)
  return (
    <TopPickWrap onClick={() => onSelect(plot)} title={`חלקה ${plot.number} — לחץ לפרטים`}>
      <TopPickBadge><span style={{ fontSize: 20 }}>🏆</span></TopPickBadge>
      <TopPickBody>
        <TopPickTitle><Zap size={10} /> TOP PICK <span style={{ color: grade.color, fontWeight: 900 }}>{grade.grade}</span></TopPickTitle>
        <TopPickName>{plot.city} · גוש {d.block} · חלקה {plot.number}</TopPickName>
        <TopPickMeta>
          <span style={{ fontWeight: 800, color: t.gold }}>{fmt.compact(d.price)}</span>
          {r > 0 && <span style={{ color: t.ok, fontWeight: 700 }}>+{Math.round(r)}% ROI</span>}
          <span>{fmt.dunam(d.size)} דונם</span>
        </TopPickMeta>
      </TopPickBody>
      <TopPickCloseBtn onClick={(e) => { e.stopPropagation(); onDismiss() }} aria-label="סגור"><X size={10} /></TopPickCloseBtn>
    </TopPickWrap>
  )
})
