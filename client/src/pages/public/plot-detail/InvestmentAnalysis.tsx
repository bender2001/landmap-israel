import { Suspense, lazy, useMemo } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { FileText, BarChart, Clock, CheckCircle2 } from 'lucide-react'
import { media } from '../../../styles/theme'
import { formatCurrency, formatDunam } from '../../../utils/format'
import { calcInvestmentScore, getScoreLabel, calcCAGR, calcInvestmentVerdict, calcInvestmentTimeline } from '../../../utils/investment'
import { zoningLabels, statusLabels } from '../../../utils/constants'
import { WidgetErrorBoundary } from '../../../components/ui/ErrorBoundaries'
import type { Plot, InvestmentTimeline as InvestmentTimelineType, TimelineStage, InvestmentVerdict as InvestmentVerdictType, CAGRResult } from '../../../types'

const PriceTrendChart = lazy(() => import('../../../components/ui/PriceTrendChart'))
const InvestmentProjection = lazy(() => import('../../../components/ui/InvestmentProjection'))

/* ── Animations ── */
const pulseAnim = keyframes`0%,100%{opacity:1}50%{opacity:0.6}`
const spinAnim = keyframes`to{transform:rotate(360deg)}`

/* ── Skeleton ── */
const SkeletonWrap = styled.div<{ $height?: string }>`
  height: ${({ $height }) => $height || '128px'}; border-radius: 16px;
  background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite; position: relative; overflow: hidden;
`
const SkeletonSpinner = styled.div`position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;`
const SpinnerCircle = styled.div`
  width: 20px; height: 20px; border-radius: 50%;
  border: 2px solid rgba(200,148,42,0.3); border-top-color: ${({ theme }) => theme.colors.gold};
  animation: ${spinAnim} 0.8s linear infinite;
`
function SectionSkeleton({ height }: { height?: string }) {
  return <SkeletonWrap $height={height}><SkeletonSpinner><SpinnerCircle /></SkeletonSpinner></SkeletonWrap>
}

/* ── Styled ── */
const DetailSection = styled.div`
  background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;
`
const TimelineWrap = styled(DetailSection)`margin-bottom: 32px;`

const VerdictBanner = styled.div<{ $tier: string }>`
  display: flex; align-items: center; gap: 16px; border-radius: 16px; padding: 16px; margin-bottom: 24px; border: 1px solid;
  ${({ $tier }) =>
    $tier === 'hot' ? css`background: rgba(249,115,22,0.1); border-color: rgba(249,115,22,0.2);`
    : $tier === 'excellent' ? css`background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2);`
    : $tier === 'good' ? css`background: rgba(132,204,22,0.1); border-color: rgba(132,204,22,0.2);`
    : $tier === 'fair' ? css`background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.2);`
    : css`background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2);`}
`
const VerdictIcon = styled.div<{ $color: string }>`
  width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; font-size: 20px; background: ${({ $color }) => `${$color}18`};
`
const VerdictLabel = styled.div<{ $color: string }>`font-size: 16px; font-weight: 700; color: ${({ $color }) => $color};`
const VerdictDesc = styled.div`font-size: 14px; color: ${({ theme }) => theme.colors.slate[400]};`

const PriceIndicatorBanner = styled.div<{ $isBelow: boolean }>`
  display: flex; align-items: center; gap: 16px; border-radius: 16px; padding: 16px; margin-bottom: 24px; border: 1px solid;
  ${({ $isBelow }) => $isBelow
    ? css`background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.15);`
    : css`background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.15);`}
`
const PriceIndicatorIcon = styled.div<{ $isBelow: boolean }>`
  width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 18px;
  ${({ $isBelow }) => $isBelow ? css`background: rgba(16,185,129,0.15);` : css`background: rgba(245,158,11,0.15);`}
`
const PriceIndicatorTitle = styled.div<{ $isBelow: boolean }>`
  font-size: 14px; font-weight: 700;
  ${({ $isBelow, theme }) => $isBelow ? css`color: ${theme.colors.emerald[400]};` : css`color: ${theme.colors.amber[400]};`}
`
const PriceIndicatorSub = styled.div`font-size: 12px; color: ${({ theme }) => theme.colors.slate[500]};`

const ComparePanel = styled.div`
  background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 24px;
`
const CompareHeading = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 16px;`
const CompareTitle = styled.h2`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[200]};`
const CompareStack = styled.div`display: flex; flex-direction: column; gap: 12px;`
const CompareRow = styled.div`display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;`
const CompareLabel = styled.span`color: ${({ theme }) => theme.colors.slate[400]};`
const CompareBarTrack = styled.div`height: 12px; border-radius: 9999px; background: rgba(255,255,255,0.05); overflow: hidden;`
const CompareNote = styled.div`font-size: 10px; color: ${({ theme }) => theme.colors.slate[600]}; margin-top: 8px;`

const NarrativePanel = styled.div`
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px; margin-bottom: 24px;
`
const NarrativeHeading = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 12px;`
const NarrativeIconBox = styled.div`
  width: 28px; height: 28px; border-radius: 8px; background: rgba(200,148,42,0.15);
  display: flex; align-items: center; justify-content: center;
`
const NarrativeTitle = styled.h2`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[200]};`
const NarrativeText = styled.p`font-size: 14px; color: ${({ theme }) => theme.colors.slate[300]}; line-height: 1.6;`
const NarrativeSecondary = styled.p`font-size: 14px; color: ${({ theme }) => theme.colors.slate[400]}; line-height: 1.6; margin-top: 8px;`
const NarrativeDesc = styled.p`font-size: 14px; color: ${({ theme }) => theme.colors.slate[400]}; line-height: 1.6; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px;`

const TimelineHeader = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`
const TimelineHeaderLeft = styled.div`display: flex; align-items: center; gap: 8px;`
const TimelineIconBox = styled.div`
  width: 32px; height: 32px; border-radius: 8px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.2);
  display: flex; align-items: center; justify-content: center;
`
const TimelineTitle = styled.h2`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[100]};`
const TimelineSubtitle = styled.p`font-size: 10px; color: ${({ theme }) => theme.colors.slate[500]};`
const TimelineHeaderRight = styled.div`display: flex; align-items: center; gap: 12px;`
const TimelineRemaining = styled.div`text-align: left;`
const TimelineRemainingLabel = styled.div`font-size: 10px; color: ${({ theme }) => theme.colors.slate[500]};`
const TimelineRemainingValue = styled.div`font-size: 14px; font-weight: 700; color: #818CF8;`
const TimelineProgressBig = styled.div`
  width: 56px; height: 56px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
  border: 1px solid rgba(99,102,241,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center;
`
const TimelineProgressPct = styled.span`font-size: 18px; font-weight: 900; color: #818CF8;`
const TimelineProgressLabel = styled.span`font-size: 8px; color: ${({ theme }) => theme.colors.slate[500]};`
const TimelineBarTrack = styled.div`height: 10px; border-radius: 9999px; background: rgba(255,255,255,0.05); overflow: hidden; position: relative; margin-bottom: 24px;`
const TimelineMilestones = styled.div`position: relative;`
const TimelineConnector = styled.div`
  position: absolute; right: 15px; top: 16px; bottom: 16px; width: 1px;
  background: linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(200,148,42,0.2), rgba(16,185,129,0.3));
`
const TimelineStageRow = styled.div<{ $isCurrent: boolean; $isFuture: boolean }>`
  position: relative; display: flex; align-items: center; gap: 12px; padding: 10px 4px; transition: all 0.2s ease;
  ${({ $isCurrent }) => $isCurrent && css`background: rgba(200,148,42,0.05); margin: 0 -8px; padding: 10px 12px; border-radius: 12px;`}
  ${({ $isFuture }) => $isFuture && css`opacity: 0.4;`}
`
const StageDot = styled.div<{ $status: 'completed' | 'current' | 'future' }>`
  width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; z-index: 10; border: 2px solid; transition: all 0.2s ease;
  ${({ $status, theme }) =>
    $status === 'completed' ? css`background: rgba(16,185,129,0.2); border-color: rgba(16,185,129,0.4);`
    : $status === 'current' ? css`background: rgba(200,148,42,0.2); border-color: rgba(200,148,42,0.5); box-shadow: 0 4px 6px rgba(200,148,42,0.2); transform: scale(1.1);`
    : css`background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);`}
`
const StageLabel = styled.span<{ $status: 'completed' | 'current' | 'future' }>`
  font-size: 14px; font-weight: ${({ $status }) => $status === 'current' ? 700 : 500};
  ${({ $status, theme }) =>
    $status === 'completed' ? css`color: rgba(52,211,153,0.8);`
    : $status === 'current' ? css`color: ${theme.colors.gold};`
    : css`color: ${theme.colors.slate[500]};`}
`
const CurrentPill = styled.span`
  font-size: 9px; color: ${({ theme }) => theme.colors.gold}; background: rgba(200,148,42,0.1);
  padding: 2px 8px; border-radius: 9999px; font-weight: 700; animation: ${pulseAnim} 2s ease-in-out infinite;
`
const CompletedCheck = styled.span`font-size: 9px; color: rgba(52,211,153,0.6);`
const StageDuration = styled.span`font-size: 10px; color: ${({ theme }) => theme.colors.slate[600]};`
const TimelineEstimate = styled.div`
  margin-top: 16px; display: flex; align-items: center; gap: 12px;
  background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 12px 16px;
`
const TimelineEstimateIcon = styled.div`
  width: 32px; height: 32px; border-radius: 8px; background: rgba(99,102,241,0.15);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px;
`
const TimelineEstimateLabel = styled.div`font-size: 12px; color: ${({ theme }) => theme.colors.slate[400]};`
const TimelineEstimateValue = styled.div`font-size: 14px; font-weight: 700; color: #a5b4fc;`
const Disclaimer = styled.p`font-size: 9px; color: ${({ theme }) => theme.colors.slate[600]}; margin-top: 12px;`

/* ── Props ── */
interface InvestmentAnalysisProps {
  plot: Plot
  totalPrice: number
  projectedValue: number
  sizeSqM: number
  blockNumber: string
  roi: number
  readiness: string | undefined
  zoningStage: string
  nearbyPlots: Plot[]
  marketData: any
  cityAvgPriceSqm?: number
}

/* ── Component ── */
export default function InvestmentAnalysis({
  plot, totalPrice, projectedValue, sizeSqM, blockNumber, roi,
  readiness, zoningStage, nearbyPlots, marketData, cityAvgPriceSqm,
}: InvestmentAnalysisProps) {
  return (
    <>
      {/* Investment Verdict */}
      {(() => {
        const verdict = calcInvestmentVerdict(plot, nearbyPlots.length > 0 ? [plot, ...nearbyPlots] : []) as InvestmentVerdictType | null
        if (!verdict) return null
        return (
          <VerdictBanner $tier={verdict.tier}>
            <VerdictIcon $color={verdict.color}>{verdict.emoji}</VerdictIcon>
            <div style={{ minWidth: 0 }}>
              <VerdictLabel $color={verdict.color}>{verdict.label}</VerdictLabel>
              <VerdictDesc>{verdict.description}</VerdictDesc>
            </div>
          </VerdictBanner>
        )
      })()}

      {/* Below Market Price Indicator */}
      {(() => {
        if (sizeSqM <= 0) return null
        const serverAvg = cityAvgPriceSqm
        const marketCityData = marketData?.cities?.find((c: any) => c.city === plot.city)
        const avgPsm = serverAvg || marketCityData?.avgPricePerSqm
        if (!avgPsm) return null
        if (!serverAvg && marketCityData && marketCityData.count < 3) return null
        const plotPsm = totalPrice / sizeSqM
        const diffPct = Math.round(((plotPsm - avgPsm) / avgPsm) * 100)
        if (Math.abs(diffPct) < 5) return null
        const isBelow = diffPct < 0
        return (
          <PriceIndicatorBanner $isBelow={isBelow}>
            <PriceIndicatorIcon $isBelow={isBelow}>{isBelow ? '\uD83D\uDCC9' : '\uD83D\uDCC8'}</PriceIndicatorIcon>
            <div style={{ minWidth: 0 }}>
              <PriceIndicatorTitle $isBelow={isBelow}>
                {isBelow ? `${Math.abs(diffPct)}% \u05DE\u05EA\u05D7\u05EA \u05DC\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D1${plot.city}` : `${diffPct}% \u05DE\u05E2\u05DC \u05D4\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D1${plot.city}`}
              </PriceIndicatorTitle>
              <PriceIndicatorSub>\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D0\u05D6\u05D5\u05E8\u05D9: {formatCurrency(avgPsm)}/\u05DE\u05F4\u05E8 \u00B7 \u05D7\u05DC\u05E7\u05D4 \u05D6\u05D5: {formatCurrency(Math.round(plotPsm))}/\u05DE\u05F4\u05E8</PriceIndicatorSub>
            </div>
          </PriceIndicatorBanner>
        )
      })()}

      {/* Price per sqm visual comparison */}
      {(() => {
        if (sizeSqM <= 0) return null
        const serverAvg = cityAvgPriceSqm
        const marketCityData = marketData?.cities?.find((c: any) => c.city === plot.city)
        const rawAvg = serverAvg || marketCityData?.avgPricePerSqm
        if (!rawAvg) return null
        if (!serverAvg && marketCityData && marketCityData.count < 3) return null
        const plotPsm = Math.round(totalPrice / sizeSqM)
        const avgPsm = Math.round(rawAvg)
        const maxPsm = Math.max(plotPsm, avgPsm) * 1.15
        const plotPct = (plotPsm / maxPsm) * 100
        const avgPct = (avgPsm / maxPsm) * 100
        const isBelow = plotPsm < avgPsm
        return (
          <ComparePanel>
            <CompareHeading>
              <BarChart style={{ width: 16, height: 16, color: '#C8942A' }} />
              <CompareTitle>\u05DE\u05D7\u05D9\u05E8 \u05DC\u05DE\u05F4\u05E8 \u2014 \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05D0\u05D6\u05D5\u05E8\u05D9\u05EA</CompareTitle>
            </CompareHeading>
            <CompareStack>
              <div>
                <CompareRow>
                  <CompareLabel>\u05D7\u05DC\u05E7\u05D4 \u05D6\u05D5</CompareLabel>
                  <span style={{ fontWeight: 700, color: isBelow ? '#34D399' : '#FBBF24' }}>\u20AA{plotPsm.toLocaleString()}/\u05DE\u05F4\u05E8</span>
                </CompareRow>
                <CompareBarTrack>
                  <div style={{ height: '100%', borderRadius: 9999, transition: 'all 0.7s ease', width: `${plotPct}%`, background: isBelow ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />
                </CompareBarTrack>
              </div>
              <div>
                <CompareRow>
                  <CompareLabel>\u05DE\u05DE\u05D5\u05E6\u05E2 {plot.city}{marketCityData?.count ? ` (${marketCityData.count} \u05D7\u05DC\u05E7\u05D5\u05EA)` : ''}</CompareLabel>
                  <span style={{ fontWeight: 500, color: '#CBD5E1' }}>\u20AA{avgPsm.toLocaleString()}/\u05DE\u05F4\u05E8</span>
                </CompareRow>
                <CompareBarTrack>
                  <div style={{ height: '100%', borderRadius: 9999, transition: 'all 0.7s ease', width: `${avgPct}%`, background: 'rgba(100,116,139,0.5)' }} />
                </CompareBarTrack>
              </div>
            </CompareStack>
            <CompareNote>
              {isBelow
                ? `\uD83D\uDCA1 \u05D4\u05DE\u05D7\u05D9\u05E8 \u05DC\u05DE\u05F4\u05E8 \u05E0\u05DE\u05D5\u05DA \u05D1-${Math.round(((avgPsm - plotPsm) / avgPsm) * 100)}% \u05DE\u05D4\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D4\u05D0\u05D6\u05D5\u05E8\u05D9`
                : `\uD83D\uDCCA \u05D4\u05DE\u05D7\u05D9\u05E8 \u05DC\u05DE\u05F4\u05E8 \u05D2\u05D1\u05D5\u05D4 \u05D1-${Math.round(((plotPsm - avgPsm) / avgPsm) * 100)}% \u05DE\u05D4\u05DE\u05DE\u05D5\u05E6\u05E2 \u05D4\u05D0\u05D6\u05D5\u05E8\u05D9`}
            </CompareNote>
          </ComparePanel>
        )
      })()}

      {/* Investment Narrative */}
      {(() => {
        const score = calcInvestmentScore(plot)
        const { grade } = getScoreLabel(score) as any
        const cagrData = calcCAGR(roi, readiness) as CAGRResult | null
        const zoningName = zoningLabels[zoningStage] || zoningStage
        const dunam = formatDunam(sizeSqM)
        const introSentence = `\u05D7\u05DC\u05E7\u05D4 ${plot.number} \u05D1\u05D2\u05D5\u05E9 ${blockNumber} \u05DE\u05DE\u05D5\u05E7\u05DE\u05EA \u05D1${plot.city} \u05D5\u05DE\u05E9\u05EA\u05E8\u05E2\u05EA \u05E2\u05DC \u05E9\u05D8\u05D7 \u05E9\u05DC ${dunam} \u05D3\u05D5\u05E0\u05DD (${sizeSqM.toLocaleString()} \u05DE\u05F4\u05E8).`
        const priceSentence = `\u05D4\u05DE\u05D7\u05D9\u05E8 \u05D4\u05DE\u05D1\u05D5\u05E7\u05E9 \u05E2\u05D5\u05DE\u05D3 \u05E2\u05DC ${formatCurrency(totalPrice)}, \u05E9\u05D4\u05DD ${formatCurrency(Math.round(totalPrice / sizeSqM * 1000))} \u05DC\u05D3\u05D5\u05E0\u05DD.`
        const roiSentence = roi > 0 ? `\u05D4\u05E9\u05D5\u05D5\u05D9 \u05D4\u05E6\u05E4\u05D5\u05D9 \u05DC\u05D0\u05D7\u05E8 \u05D4\u05E9\u05D1\u05D7\u05D4: ${formatCurrency(projectedValue)} \u2014 \u05EA\u05E9\u05D5\u05D0\u05D4 \u05D1\u05E8\u05D5\u05D8\u05D5 \u05E9\u05DC +${roi}%${cagrData ? ` (\u05DB-${cagrData.cagr}% \u05E9\u05E0\u05EA\u05D9 \u05E2\u05DC \u05E4\u05E0\u05D9 ${cagrData.years} \u05E9\u05E0\u05D9\u05DD)` : ''}.` : null
        const zoningSentence = `\u05D4\u05D7\u05DC\u05E7\u05D4 \u05E0\u05DE\u05E6\u05D0\u05EA \u05D1\u05E9\u05DC\u05D1 \u05EA\u05DB\u05E0\u05D5\u05E0\u05D9: ${zoningName}.${readiness ? ` \u05DE\u05D5\u05DB\u05E0\u05D5\u05EA \u05DE\u05E9\u05D5\u05E2\u05E8\u05EA \u05DC\u05D1\u05E0\u05D9\u05D9\u05D4: ${readiness}.` : ''}`
        const scoreSentence = `\u05E6\u05D9\u05D5\u05DF \u05D4\u05D4\u05E9\u05E7\u05E2\u05D4: ${score}/10 (${grade}).`
        const areaCtx = (plot as any).area_context ?? (plot as any).areaContext
        const nearbyDev = (plot as any).nearby_development ?? (plot as any).nearbyDevelopment

        return (
          <NarrativePanel id="section-narrative">
            <NarrativeHeading>
              <NarrativeIconBox><FileText style={{ width: 14, height: 14, color: '#C8942A' }} /></NarrativeIconBox>
              <NarrativeTitle>\u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05E9\u05E7\u05E2\u05D4</NarrativeTitle>
            </NarrativeHeading>
            <NarrativeText>{introSentence} {priceSentence} {roiSentence} {zoningSentence} {scoreSentence}</NarrativeText>
            {(areaCtx || nearbyDev) && (
              <NarrativeSecondary>
                {areaCtx && <span>\uD83D\uDCCD {areaCtx} </span>}
                {nearbyDev && <span>\uD83C\uDFD7\uFE0F {nearbyDev}</span>}
              </NarrativeSecondary>
            )}
            {plot.description && <NarrativeDesc>{plot.description}</NarrativeDesc>}
          </NarrativePanel>
        )
      })()}

      {/* Price trend chart */}
      <div style={{ marginBottom: 32 }}>
        <WidgetErrorBoundary name="\u05DE\u05D2\u05DE\u05EA \u05DE\u05D7\u05D9\u05E8\u05D9\u05DD">
          <Suspense fallback={<SectionSkeleton height="192px" />}>
            <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} plotId={plot.id} />
          </Suspense>
        </WidgetErrorBoundary>
      </div>

      {/* Investment Projection */}
      <TimelineWrap id="section-projection">
        <WidgetErrorBoundary name="\u05EA\u05D7\u05D6\u05D9\u05EA \u05D4\u05E9\u05E7\u05E2\u05D4">
          <Suspense fallback={<SectionSkeleton height="224px" />}>
            <InvestmentProjection totalPrice={totalPrice} projectedValue={projectedValue} readinessEstimate={readiness} zoningStage={zoningStage} />
          </Suspense>
        </WidgetErrorBoundary>
      </TimelineWrap>

      {/* Investment Timeline */}
      {(() => {
        const timeline = calcInvestmentTimeline(plot) as InvestmentTimelineType | null
        if (!timeline || timeline.stages.length === 0) return null
        return (
          <TimelineWrap id="section-timeline">
            <TimelineHeader>
              <TimelineHeaderLeft>
                <TimelineIconBox><Clock style={{ width: 16, height: 16, color: '#818CF8' }} /></TimelineIconBox>
                <div>
                  <TimelineTitle>\u05E6\u05D9\u05E8 \u05D6\u05DE\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4</TimelineTitle>
                  <TimelineSubtitle>\u05DE\u05E1\u05DC\u05D5\u05DC \u05EA\u05DB\u05E0\u05D5\u05E0\u05D9 \u05DE-{timeline.stages[0].label} \u05E2\u05D3 {timeline.stages[timeline.stages.length - 1].label}</TimelineSubtitle>
                </div>
              </TimelineHeaderLeft>
              <TimelineHeaderRight>
                {timeline.remainingMonths > 0 && (
                  <TimelineRemaining>
                    <TimelineRemainingLabel>\u05E0\u05D5\u05EA\u05E8\u05D5</TimelineRemainingLabel>
                    <TimelineRemainingValue>~{timeline.remainingMonths} \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD</TimelineRemainingValue>
                  </TimelineRemaining>
                )}
                <TimelineProgressBig>
                  <TimelineProgressPct>{timeline.progressPct}%</TimelineProgressPct>
                  <TimelineProgressLabel>\u05D4\u05EA\u05E7\u05D3\u05DE\u05D5\u05EA</TimelineProgressLabel>
                </TimelineProgressBig>
              </TimelineHeaderRight>
            </TimelineHeader>
            <TimelineBarTrack>
              <div style={{ height: '100%', borderRadius: 9999, transition: 'all 0.7s ease', width: `${Math.max(3, timeline.progressPct)}%`, background: timeline.progressPct >= 75 ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : timeline.progressPct >= 40 ? 'linear-gradient(90deg, #C8942A, #E5B94E)' : 'linear-gradient(90deg, #6366F1, #818CF8)' }} />
            </TimelineBarTrack>
            <TimelineMilestones>
              <TimelineConnector />
              <div>
                {timeline.stages.map((stage: TimelineStage) => {
                  const isCompleted = stage.status === 'completed'
                  const isCurrent = stage.status === 'current'
                  const isFuture = stage.status === 'future'
                  return (
                    <TimelineStageRow key={stage.key} $isCurrent={isCurrent} $isFuture={isFuture}>
                      <StageDot $status={stage.status}>
                        {isCompleted ? <CheckCircle2 style={{ width: 16, height: 16, color: '#34D399' }} /> : <span style={{ fontSize: 14 }}>{stage.icon}</span>}
                      </StageDot>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StageLabel $status={stage.status}>{stage.label}</StageLabel>
                          {isCurrent && <CurrentPill>\u05E9\u05DC\u05D1 \u05E0\u05D5\u05DB\u05D7\u05D9</CurrentPill>}
                          {isCompleted && <CompletedCheck>\u2713 \u05D4\u05D5\u05E9\u05DC\u05DD</CompletedCheck>}
                        </div>
                        {stage.durationMonths > 0 && !isCompleted && (
                          <StageDuration>~{stage.durationMonths} \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD {isCurrent ? '(\u05D1\u05EA\u05D4\u05DC\u05D9\u05DA)' : ''}</StageDuration>
                        )}
                      </div>
                    </TimelineStageRow>
                  )
                })}
              </div>
            </TimelineMilestones>
            {timeline.estimatedYear && timeline.remainingMonths > 0 && (
              <TimelineEstimate>
                <TimelineEstimateIcon>\uD83C\uDFAF</TimelineEstimateIcon>
                <div>
                  <TimelineEstimateLabel>\u05D4\u05E9\u05DC\u05DE\u05D4 \u05DE\u05E9\u05D5\u05E2\u05E8\u05EA</TimelineEstimateLabel>
                  <TimelineEstimateValue>\u05E9\u05E0\u05EA {timeline.estimatedYear} ({timeline.elapsedMonths > 0 ? `${timeline.elapsedMonths} \u05D7\u05D5\u05D3\u05E9\u05D9\u05DD \u05E2\u05D1\u05E8\u05D5, ` : ''}{timeline.remainingMonths} \u05E0\u05D5\u05EA\u05E8\u05D5)</TimelineEstimateValue>
                </div>
              </TimelineEstimate>
            )}
            <Disclaimer>* \u05D4\u05E2\u05E8\u05DB\u05D5\u05EA \u05D6\u05DE\u05E0\u05D9\u05DD \u05DE\u05D1\u05D5\u05E1\u05E1\u05D5\u05EA \u05E2\u05DC \u05DE\u05DE\u05D5\u05E6\u05E2\u05D9 \u05E8\u05E9\u05D5\u05D9\u05D5\u05EA \u05EA\u05DB\u05E0\u05D5\u05DF \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC. \u05D4\u05D6\u05DE\u05E0\u05D9\u05DD \u05D1\u05E4\u05D5\u05E2\u05DC \u05E2\u05E9\u05D5\u05D9\u05D9\u05DD \u05DC\u05D4\u05E9\u05EA\u05E0\u05D5\u05EA.</Disclaimer>
          </TimelineWrap>
        )
      })()}
    </>
  )
}
