import { Suspense, lazy, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { DollarSign, Hourglass, CheckCircle2, TrendingUp } from 'lucide-react'
import { media } from '../../../styles/theme'
import { formatCurrency } from '../../../utils/format'
import { calcInvestmentScore } from '../../../utils/investment'
import { calcTransactionCosts, calcExitCosts, calcAnnualHoldingCosts } from '../../../utils/plot'
import { zoningPipelineStages, roiStages } from '../../../utils/constants'
import { WidgetErrorBoundary } from '../../../components/ui/ErrorBoundaries'
import type { Plot, TransactionCosts, ExitCosts as ExitCostsType, AnnualHoldingCosts } from '../../../types'

const NeighborhoodRadar = lazy(() => import('../../../components/ui/NeighborhoodRadar'))
const InvestmentBenchmark = lazy(() => import('../../../components/ui/InvestmentBenchmark'))

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
const SpinnerCircle = styled.div`width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(200,148,42,0.3); border-top-color: ${({ theme }) => theme.colors.gold}; animation: ${spinAnim} 0.8s linear infinite;`
function SectionSkeleton({ height }: { height?: string }) {
  return <SkeletonWrap $height={height}><SkeletonSpinner><SpinnerCircle /></SkeletonSpinner></SkeletonWrap>
}

/* ── Styled ── */
const DetailSection = styled.div`background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;`
const Panel = styled.div`background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;`
const PanelTitle = styled.h2`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[100]}; margin-bottom: 12px;`
const PanelText = styled.p`font-size: 14px; color: ${({ theme }) => theme.colors.slate[300]}; line-height: 1.6;`
const NearbyDevPanel = styled.div`
  background: linear-gradient(to right, rgba(16,185,129,0.05), rgba(16,185,129,0.1));
  border: 1px solid rgba(16,185,129,0.15); border-radius: 16px; padding: 20px;
`
const NearbyDevHeader = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 12px;`
const NearbyDevIconBox = styled.div`
  width: 28px; height: 28px; border-radius: 8px; background: rgba(16,185,129,0.15);
  display: flex; align-items: center; justify-content: center;
`
const RoiStageRow = styled.div<{ $isCurrent: boolean }>`
  display: flex; align-items: center; gap: 8px; padding: 6px 0; border-radius: 8px;
  ${({ $isCurrent }) => $isCurrent && css`background: rgba(200,148,42,0.05); margin: 0 -4px; padding: 6px 4px;`}
`
const RoiStageLabel = styled.span<{ $status: 'current' | 'past' | 'future' }>`
  font-size: 12px; line-height: 1.2; width: 100px; flex-shrink: 0;
  ${({ $status, theme }) => $status === 'current' ? css`color: ${theme.colors.gold}; font-weight: 700;`
    : $status === 'past' ? css`color: rgba(74,222,128,0.7);` : css`color: ${theme.colors.slate[500]};`}
`
const RoiBarTrack = styled.div`flex: 1; height: 10px; border-radius: 9999px; background: rgba(255,255,255,0.05); overflow: hidden;`
const RoiPriceLabel = styled.span<{ $status: 'current' | 'past' | 'future' }>`
  font-size: 10px; width: 64px; text-align: left; flex-shrink: 0;
  ${({ $status, theme }) => $status === 'current' ? css`color: ${theme.colors.gold}; font-weight: 700;`
    : $status === 'past' ? css`color: rgba(74,222,128,0.7);` : css`color: ${theme.colors.slate[500]};`}
`
const ZoningRow = styled.div<{ $isCurrent: boolean; $isFuture: boolean }>`
  display: flex; align-items: center; gap: 12px; padding: 8px 0;
  ${({ $isFuture }) => $isFuture && css`opacity: 0.4;`}
  ${({ $isCurrent }) => $isCurrent && css`background: rgba(200,148,42,0.05); margin: 0 -8px; padding: 8px; border-radius: 12px;`}
`
const ReadinessBox = styled.div`
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px;
  background: rgba(200,148,42,0.05); border: 1px solid rgba(200,148,42,0.2); border-radius: 12px; padding: 10px 16px;
`
const CurrentPill = styled.span`
  font-size: 9px; color: ${({ theme }) => theme.colors.gold}; background: rgba(200,148,42,0.1);
  padding: 2px 8px; border-radius: 9999px; font-weight: 700; animation: ${pulseAnim} 2s ease-in-out infinite;
`
const CostCategoryLabel = styled.div`
  font-size: 11px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[400]}; text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
`
const CostDot = styled.span<{ $color: string }>`width: 6px; height: 6px; border-radius: 50%; background: ${({ $color }) => $color};`
const CostRow = styled.div`display: flex; justify-content: space-between; font-size: 14px;`
const CostLabel = styled.span`color: ${({ theme }) => theme.colors.slate[400]};`
const CostValue = styled.span`color: ${({ theme }) => theme.colors.slate[300]};`
const CostTotal = styled.div`display: flex; justify-content: space-between; font-size: 13px; font-weight: 500; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.05);`
const CostTotalLabel = styled.span`color: ${({ theme }) => theme.colors.slate[300]};`
const CostPerYear = styled.span`font-size: 10px; color: ${({ theme }) => theme.colors.slate[500]};`
const NetResultBox = styled.div<{ $positive: boolean }>`
  border-radius: 12px; padding: 16px; border: 1px solid;
  ${({ $positive }) => $positive
    ? css`background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.15);`
    : css`background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.15);`}
`
const NetResultHeader = styled.div`display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;`
const NetResultLabel = styled.span`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[200]};`
const NetResultValue = styled.span<{ $positive: boolean }>`
  font-size: 18px; font-weight: 900;
  color: ${({ $positive, theme }) => $positive ? theme.colors.emerald[400] : theme.colors.red[400]};
`
const NetResultSubRow = styled.div`display: flex; align-items: center; justify-content: space-between; font-size: 12px;`
const CostBreakdownBar = styled.div`margin-top: 12px; height: 8px; border-radius: 9999px; background: rgba(255,255,255,0.05); overflow: hidden; display: flex;`
const CostBreakdownLegend = styled.div`display: flex; justify-content: space-between; margin-top: 4px; font-size: 9px; color: ${({ theme }) => theme.colors.slate[600]};`
const Disclaimer = styled.p`font-size: 9px; color: ${({ theme }) => theme.colors.slate[600]}; margin-top: 12px;`

const CalcPanel = styled.div`background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;`
const CalcHeadingRow = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 16px;`
const CalcHeading = styled.h2`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[100]};`
const CalcStack = styled.div`display: flex; flex-direction: column; gap: 16px;`
const SliderLabelRow = styled.div`display: flex; justify-content: space-between; font-size: 12px; color: ${({ theme }) => theme.colors.slate[400]}; margin-bottom: 4px;`
const GoldVal = styled.span`color: ${({ theme }) => theme.colors.gold}; font-weight: 500;`
const SlateVal = styled.span`color: ${({ theme }) => theme.colors.slate[300]}; font-weight: 500;`
const RangeInput = styled.input`width: 100%; height: 6px; border-radius: 9999px; appearance: none; background: rgba(255,255,255,0.1); accent-color: ${({ theme }) => theme.colors.gold}; cursor: pointer;`
const CalcResults = styled.div`display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.05);`
const CalcResultCell = styled.div`text-align: center;`
const CalcResultLabel = styled.div`font-size: 12px; color: ${({ theme }) => theme.colors.slate[500]};`
const CalcResultValue = styled.div<{ $color?: string }>`font-size: 14px; font-weight: 700; color: ${({ $color, theme }) => $color || theme.colors.gold};`

/* ── Props ── */
interface FinancialBreakdownProps {
  plot: Plot
  totalPrice: number
  projectedValue: number
  sizeSqM: number
  roi: number
  readiness: string | undefined
  zoningStage: string
  currentStageIndex: number
  areaContext?: string
  distanceToSea?: number
  distanceToPark?: number
  distanceToHospital?: number
  plotId: string
}

/* ── Component ── */
export default function FinancialBreakdown({
  plot, totalPrice, projectedValue, sizeSqM, roi, readiness,
  zoningStage, currentStageIndex, areaContext, distanceToSea, distanceToPark, distanceToHospital, plotId,
}: FinancialBreakdownProps) {
  const nearbyDev = (plot as any).nearby_development ?? (plot as any).nearbyDevelopment
  const [equity, setEquity] = useState(50)
  const [years, setYears] = useState(15)
  const [rate, setRate] = useState(4.5)
  const loanAmount = totalPrice * (1 - equity / 100)
  const monthlyRate = rate / 100 / 12
  const numPayments = years * 12
  const monthlyPayment = monthlyRate > 0
    ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1))
    : Math.round(loanAmount / numPayments)
  const totalPayment = monthlyPayment * numPayments
  const totalInterest = totalPayment - loanAmount

  return (
    <>
      {/* Left column content */}
      {plot.description && <Panel><PanelTitle>\u05EA\u05D9\u05D0\u05D5\u05E8</PanelTitle><PanelText>{plot.description}</PanelText></Panel>}
      {areaContext && <Panel><PanelTitle>\u05D4\u05E7\u05E9\u05E8 \u05D0\u05D6\u05D5\u05E8\u05D9</PanelTitle><PanelText>{areaContext}</PanelText></Panel>}
      {nearbyDev && (
        <NearbyDevPanel>
          <NearbyDevHeader>
            <NearbyDevIconBox><TrendingUp style={{ width: 14, height: 14, color: '#34D399' }} /></NearbyDevIconBox>
            <PanelTitle style={{ marginBottom: 0 }}>\u05E4\u05D9\u05EA\u05D5\u05D7 \u05D1\u05E1\u05D1\u05D9\u05D1\u05D4</PanelTitle>
          </NearbyDevHeader>
          <PanelText>{nearbyDev}</PanelText>
        </NearbyDevPanel>
      )}

      {/* ROI Stages */}
      {roi > 0 && (
        <Panel>
          <PanelTitle>\u05E6\u05E4\u05D9 \u05D4\u05E9\u05D1\u05D7\u05D4 \u05DC\u05E4\u05D9 \u05E9\u05DC\u05D1\u05D9 \u05EA\u05DB\u05E0\u05D5\u05DF</PanelTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {roiStages.map((stage: any, i: number) => {
              const isPast = i < currentStageIndex
              const isCurrent = i === currentStageIndex
              const maxPrice = roiStages[roiStages.length - 1].pricePerSqM
              const barWidth = (stage.pricePerSqM / maxPrice) * 100
              return (
                <RoiStageRow key={i} $isCurrent={isCurrent}>
                  <RoiStageLabel $status={isCurrent ? 'current' : isPast ? 'past' : 'future'}>{stage.label}</RoiStageLabel>
                  <RoiBarTrack>
                    <div style={{ height: '100%', borderRadius: 9999, transition: 'all 0.3s ease', width: `${barWidth}%`, background: isCurrent ? 'linear-gradient(90deg, #C8942A, #E5B94E)' : isPast ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.15)' }} />
                  </RoiBarTrack>
                  <RoiPriceLabel $status={isCurrent ? 'current' : isPast ? 'past' : 'future'}>\u20AA{stage.pricePerSqM.toLocaleString()}/\u05DE\u05F4\u05E8</RoiPriceLabel>
                </RoiStageRow>
              )
            })}
          </div>
        </Panel>
      )}

      {/* Zoning pipeline */}
      <DetailSection id="section-planning">
        <PanelTitle>\u05E6\u05D9\u05E0\u05D5\u05E8 \u05EA\u05DB\u05E0\u05D5\u05E0\u05D9</PanelTitle>
        {readiness && (
          <ReadinessBox>
            <Hourglass style={{ width: 16, height: 16, color: '#C8942A' }} />
            <span style={{ fontSize: 14, color: '#CBD5E1' }}>\u05DE\u05D5\u05DB\u05E0\u05D5\u05EA:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#C8942A' }}>{readiness}</span>
          </ReadinessBox>
        )}
        <div>
          {zoningPipelineStages.map((stage: any, i: number) => {
            const isCompleted = i < currentStageIndex
            const isCurrent = i === currentStageIndex
            const isFuture = i > currentStageIndex
            return (
              <ZoningRow key={stage.key} $isCurrent={isCurrent} $isFuture={isFuture}>
                <span style={{ fontSize: 18, width: 28, textAlign: 'center' as const }}>{stage.icon}</span>
                <span style={{ fontSize: 14, color: isCompleted ? '#4ADE80' : isCurrent ? '#C8942A' : '#64748B', fontWeight: isCurrent ? 700 : 400 }}>{stage.label}</span>
                {isCompleted && <CheckCircle2 style={{ width: 14, height: 14, color: '#4ADE80', marginRight: 'auto' }} />}
                {isCurrent && <CurrentPill style={{ marginRight: 'auto' }}>\u05E0\u05D5\u05DB\u05D7\u05D9</CurrentPill>}
              </ZoningRow>
            )
          })}
        </div>
      </DetailSection>

      {/* Costs analysis */}
      {(() => {
        const txn = calcTransactionCosts(totalPrice) as TransactionCosts
        const exit = calcExitCosts(totalPrice, projectedValue) as ExitCostsType
        const holdYears = readiness?.includes('1-3') ? 2 : readiness?.includes('3-5') ? 4 : 7
        const annual = calcAnnualHoldingCosts(totalPrice, sizeSqM, zoningStage) as AnnualHoldingCosts
        const totalHolding = annual.totalAnnual * holdYears
        const totalAllCosts = txn.total + totalHolding + exit.totalExit
        const netAfterAll = (projectedValue - totalPrice) - totalAllCosts
        const trueRoi = txn.totalWithPurchase > 0 ? Math.round((netAfterAll / txn.totalWithPurchase) * 100) : 0
        return (
          <DetailSection id="section-costs">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <DollarSign style={{ width: 16, height: 16, color: '#C8942A' }} />
              <PanelTitle style={{ marginBottom: 0 }}>\u05E0\u05D9\u05EA\u05D5\u05D7 \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05DE\u05DC\u05D0</PanelTitle>
            </div>
            <div style={{ marginBottom: 16 }}>
              <CostCategoryLabel><CostDot $color="#60A5FA" />\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05E8\u05DB\u05D9\u05E9\u05D4 (\u05D7\u05D3-\u05E4\u05E2\u05DE\u05D9)</CostCategoryLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 12 }}>
                <CostRow><CostLabel>\u05DE\u05E1 \u05E8\u05DB\u05D9\u05E9\u05D4 (6%)</CostLabel><CostValue>{formatCurrency(txn.purchaseTax)}</CostValue></CostRow>
                <CostRow><CostLabel>\u05E9\u05DB\u05F4\u05D8 \u05E2\u05D5\u05F4\u05D3 (~1.75%)</CostLabel><CostValue>{formatCurrency(txn.attorneyFees)}</CostValue></CostRow>
                <CostRow><CostLabel>\u05E9\u05DE\u05D0\u05D9 \u05DE\u05E7\u05E8\u05E7\u05E2\u05D9\u05DF</CostLabel><CostValue>{formatCurrency(txn.appraiserFee)}</CostValue></CostRow>
                <CostTotal><CostTotalLabel>\u05E1\u05D4\u05F4\u05DB \u05DB\u05E0\u05D9\u05E1\u05D4</CostTotalLabel><span style={{ color: '#60A5FA' }}>{formatCurrency(txn.total)}</span></CostTotal>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <CostCategoryLabel><CostDot $color="#FBBF24" />\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05D4\u05D7\u05D6\u05E7\u05D4 \u05E9\u05E0\u05EA\u05D9\u05D5\u05EA</CostCategoryLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 12 }}>
                <CostRow><CostLabel>\u05D0\u05E8\u05E0\u05D5\u05E0\u05D4 (~\u20AA{annual.arnonaPerSqm}/\u05DE\u05F4\u05E8)</CostLabel><CostValue>{formatCurrency(annual.arnona)}<CostPerYear>/\u05E9\u05E0\u05D4</CostPerYear></CostValue></CostRow>
                <CostRow><CostLabel>\u05E0\u05D9\u05D4\u05D5\u05DC \u05D5\u05EA\u05D7\u05D6\u05D5\u05E7\u05EA \u05E7\u05E8\u05E7\u05E2</CostLabel><CostValue>{formatCurrency(annual.management)}<CostPerYear>/\u05E9\u05E0\u05D4</CostPerYear></CostValue></CostRow>
                <CostTotal><CostTotalLabel>\u05E1\u05D4\u05F4\u05DB \u05E9\u05E0\u05EA\u05D9</CostTotalLabel><span style={{ color: '#FBBF24' }}>{formatCurrency(annual.totalAnnual)}<CostPerYear>/\u05E9\u05E0\u05D4</CostPerYear></span></CostTotal>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B' }}>
                  <span>\u05E1\u05D4\u05F4\u05DB \u05DC-{holdYears} \u05E9\u05E0\u05D5\u05EA \u05D4\u05D7\u05D6\u05E7\u05D4</span><span>{formatCurrency(totalHolding)}</span>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <CostCategoryLabel><CostDot $color="#F87171" />\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05D9\u05E6\u05D9\u05D0\u05D4 (\u05DE\u05DB\u05D9\u05E8\u05D4)</CostCategoryLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 12 }}>
                <CostRow><CostLabel>\u05D4\u05D9\u05D8\u05DC \u05D4\u05E9\u05D1\u05D7\u05D4 (50%)</CostLabel><CostValue>{formatCurrency(exit.bettermentLevy)}</CostValue></CostRow>
                <CostRow><CostLabel>\u05DE\u05E1 \u05E9\u05D1\u05D7 (25%)</CostLabel><CostValue>{formatCurrency(exit.capitalGains)}</CostValue></CostRow>
                <CostRow><CostLabel>\u05E2\u05DE\u05DC\u05EA \u05DE\u05EA\u05D5\u05D5\u05DA (1%)</CostLabel><CostValue>{formatCurrency(exit.agentCommission)}</CostValue></CostRow>
                <CostTotal><CostTotalLabel>\u05E1\u05D4\u05F4\u05DB \u05D9\u05E6\u05D9\u05D0\u05D4</CostTotalLabel><span style={{ color: '#F87171' }}>{formatCurrency(exit.totalExit)}</span></CostTotal>
              </div>
            </div>
            <NetResultBox $positive={netAfterAll >= 0}>
              <NetResultHeader>
                <NetResultLabel>\u2728 \u05E8\u05D5\u05D5\u05D7 \u05E0\u05E7\u05D9 (\u05D0\u05D7\u05E8\u05D9 \u05D4\u05DB\u05DC)</NetResultLabel>
                <NetResultValue $positive={netAfterAll >= 0}>{formatCurrency(netAfterAll)}</NetResultValue>
              </NetResultHeader>
              <NetResultSubRow>
                <span style={{ color: '#64748B' }}>\u05EA\u05E9\u05D5\u05D0\u05D4 \u05D0\u05DE\u05D9\u05EA\u05D9\u05EA (\u05E0\u05D8\u05D5)</span>
                <span style={{ fontWeight: 700, color: trueRoi >= 0 ? '#34D399' : '#F87171' }}>{trueRoi > 0 ? '+' : ''}{trueRoi}%</span>
              </NetResultSubRow>
              <NetResultSubRow style={{ marginTop: 4 }}>
                <span style={{ color: '#64748B' }}>\u05E1\u05D4\u05F4\u05DB \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA</span>
                <span style={{ color: '#94A3B8' }}>{formatCurrency(totalAllCosts)}</span>
              </NetResultSubRow>
              <CostBreakdownBar>
                <div style={{ height: '100%', background: 'rgba(59,130,246,0.6)', width: `${totalAllCosts > 0 ? Math.round((txn.total / totalAllCosts) * 100) : 0}%` }} title={`\u05E8\u05DB\u05D9\u05E9\u05D4: ${formatCurrency(txn.total)}`} />
                <div style={{ height: '100%', background: 'rgba(245,158,11,0.6)', width: `${totalAllCosts > 0 ? Math.round((totalHolding / totalAllCosts) * 100) : 0}%` }} title={`\u05D4\u05D7\u05D6\u05E7\u05D4: ${formatCurrency(totalHolding)}`} />
                <div style={{ height: '100%', background: 'rgba(239,68,68,0.6)', width: `${totalAllCosts > 0 ? Math.round((exit.totalExit / totalAllCosts) * 100) : 0}%` }} title={`\u05D9\u05E6\u05D9\u05D0\u05D4: ${formatCurrency(exit.totalExit)}`} />
              </CostBreakdownBar>
              <CostBreakdownLegend><span>\uD83D\uDD35 \u05E8\u05DB\u05D9\u05E9\u05D4</span><span>\uD83D\uDFE1 \u05D4\u05D7\u05D6\u05E7\u05D4</span><span>\uD83D\uDD34 \u05D9\u05E6\u05D9\u05D0\u05D4</span></CostBreakdownLegend>
            </NetResultBox>
            <Disclaimer>* \u05D0\u05D5\u05DE\u05D3\u05E0\u05D9\u05DD \u05D1\u05DC\u05D1\u05D3. \u05D4\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05D5\u05D4\u05DE\u05D9\u05E1\u05D9\u05DD \u05D1\u05E4\u05D5\u05E2\u05DC \u05EA\u05DC\u05D5\u05D9\u05D9\u05DD \u05D1\u05E0\u05E1\u05D9\u05D1\u05D5\u05EA \u05E1\u05E4\u05E6\u05D9\u05E4\u05D9\u05D5\u05EA. \u05D9\u05E9 \u05DC\u05D4\u05EA\u05D9\u05D9\u05E2\u05E5 \u05E2\u05DD \u05E8\u05D5\u05F4\u05D7 \u05D5\u05E2\u05D5\u05F4\u05D3.</Disclaimer>
          </DetailSection>
        )
      })()}

      {/* Neighborhood Radar */}
      <WidgetErrorBoundary name="\u05E8\u05D3\u05D0\u05E8 \u05E9\u05DB\u05D5\u05E0\u05EA\u05D9">
        <Suspense fallback={<SectionSkeleton height="192px" />}>
          <NeighborhoodRadar distanceToSea={distanceToSea} distanceToPark={distanceToPark} distanceToHospital={distanceToHospital} roi={roi} investmentScore={calcInvestmentScore(plot)} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Mortgage Calculator */}
      <CalcPanel role="group" aria-labelledby="mortgage-calc-heading">
        <CalcHeadingRow>
          <DollarSign style={{ width: 16, height: 16, color: '#C8942A' }} />
          <CalcHeading id="mortgage-calc-heading">\u05DE\u05D7\u05E9\u05D1\u05D5\u05DF \u05DE\u05D9\u05DE\u05D5\u05DF</CalcHeading>
        </CalcHeadingRow>
        <CalcStack>
          <div>
            <SliderLabelRow><label htmlFor="mortgage-equity">\u05D4\u05D5\u05DF \u05E2\u05E6\u05DE\u05D9</label><GoldVal>{equity}% ({formatCurrency(Math.round(totalPrice * equity / 100))})</GoldVal></SliderLabelRow>
            <RangeInput type="range" id="mortgage-equity" min="20" max="100" step="5" value={equity} onChange={(e) => setEquity(Number(e.target.value))} />
          </div>
          <div>
            <SliderLabelRow><label htmlFor="mortgage-years">\u05EA\u05E7\u05D5\u05E4\u05D4</label><SlateVal>{years} \u05E9\u05E0\u05D9\u05DD</SlateVal></SliderLabelRow>
            <RangeInput type="range" id="mortgage-years" min="5" max="30" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} />
          </div>
          <div>
            <SliderLabelRow><label htmlFor="mortgage-rate">\u05E8\u05D9\u05D1\u05D9\u05EA</label><SlateVal>{rate}%</SlateVal></SliderLabelRow>
            <RangeInput type="range" id="mortgage-rate" min="2" max="8" step="0.25" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </div>
          {equity < 100 && (
            <CalcResults role="status" aria-live="polite" aria-atomic="true">
              <CalcResultCell><CalcResultLabel>\u05D4\u05D7\u05D6\u05E8 \u05D7\u05D5\u05D3\u05E9\u05D9</CalcResultLabel><CalcResultValue>{formatCurrency(monthlyPayment)}</CalcResultValue></CalcResultCell>
              <CalcResultCell><CalcResultLabel>\u05E1\u05D4\u05F4\u05DB \u05E8\u05D9\u05D1\u05D9\u05EA</CalcResultLabel><CalcResultValue $color="#FB923C">{formatCurrency(totalInterest)}</CalcResultValue></CalcResultCell>
              <CalcResultCell><CalcResultLabel>\u05E1\u05D4\u05F4\u05DB \u05EA\u05E9\u05DC\u05D5\u05DD</CalcResultLabel><CalcResultValue $color="#CBD5E1">{formatCurrency(totalPayment)}</CalcResultValue></CalcResultCell>
            </CalcResults>
          )}
        </CalcStack>
      </CalcPanel>

      {/* Investment Benchmark */}
      <WidgetErrorBoundary name="\u05D4\u05E9\u05D5\u05D5\u05D0\u05EA \u05D4\u05E9\u05E7\u05E2\u05D5\u05EA">
        <Suspense fallback={<SectionSkeleton height="176px" />}>
          <InvestmentBenchmark totalPrice={totalPrice} projectedValue={projectedValue} readinessEstimate={readiness} />
        </Suspense>
      </WidgetErrorBoundary>
    </>
  )
}
