import { useMemo } from 'react'
import styled from 'styled-components'
import { DollarSign } from 'lucide-react'
import { media } from '../../../styles/theme'
import { formatCurrency } from '../../../utils/format'
import { calcCAGR } from '../../../utils/investment'
import { getPlotPrice, getPlotProjectedValue, getPlotSize, getPlotReadiness, calcTransactionCosts, calcExitCosts } from '../../../utils/plot'
import type { Plot, CAGRResult } from '../../../types'

const PLOT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B']

const CardPanelPadded = styled.div`background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.xl}; margin-bottom: 24px; padding: 24px;`
const SectionHeader = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 20px;`
const SectionIconBox = styled.div<{ $bg: string; $border: string }>`width: 36px; height: 36px; border-radius: ${({ theme }) => theme.radii.lg}; background: ${({ $bg }) => $bg}; border: 1px solid ${({ $border }) => $border}; display: flex; align-items: center; justify-content: center;`
const SectionTitleText = styled.h3`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const SectionSubtitle = styled.p`font-size: 10px; color: ${({ theme }) => theme.colors.textTertiary};`
const ProfitGrid = styled.div<{ $count: number }>`display: grid; gap: 16px; grid-template-columns: ${({ $count }) => $count === 3 ? 'repeat(3, 1fr)' : $count === 2 ? 'repeat(2, 1fr)' : '1fr'}; ${media.mobile} { grid-template-columns: 1fr; }`
const ProfitCard = styled.div<{ $isBest: boolean }>`border-radius: ${({ theme }) => theme.radii.xl}; padding: 16px; border: 1px solid ${({ $isBest, theme }) => $isBest ? theme.colors.emerald[200] : theme.colors.borderLight}; background: ${({ $isBest, theme }) => $isBest ? theme.colors.emerald[50] : theme.colors.bgSecondary};`
const ProfitCardHeader = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight};`
const PlotDot = styled.span<{ $color: string }>`width: 12px; height: 12px; border-radius: 9999px; flex-shrink: 0; background: ${({ $color }) => $color};`
const PlotLabel = styled.span`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.text}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const BestBadge = styled.span`font-size: 9px; color: ${({ theme }) => theme.colors.emerald[600]}; background: ${({ theme }) => theme.colors.emerald[100]}; padding: 2px 6px; border-radius: 9999px; margin-right: auto;`
const LineItemStack = styled.div`display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;`
const LineItemRow = styled.div`display: flex; justify-content: space-between; font-size: 11px;`
const LineItemLabel = styled.span`color: ${({ theme }) => theme.colors.textTertiary};`
const LineItemValue = styled.span<{ $color?: string }>`color: ${({ $color, theme }) => $color || theme.colors.text};`
const TotalRow = styled.div`display: flex; justify-content: space-between; font-size: 12px; font-weight: 500; padding-top: 4px; border-top: 1px solid ${({ theme }) => theme.colors.borderLight};`
const TotalLabel = styled.span`color: ${({ theme }) => theme.colors.primary};`
const TotalValue = styled.span`color: ${({ theme }) => theme.colors.primary};`
const BottomLineBox = styled.div<{ $positive: boolean }>`border-radius: ${({ theme }) => theme.radii.lg}; padding: 12px; background: ${({ $positive, theme }) => $positive ? theme.colors.emerald[50] : theme.colors.red[50]};`
const BottomLineHeader = styled.div`display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;`
const BottomLineLabel = styled.span`font-size: 12px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const BottomLineAmount = styled.span<{ $positive: boolean }>`font-size: 18px; font-weight: 900; color: ${({ $positive, theme }) => $positive ? theme.colors.emerald[600] : theme.colors.red[600]};`
const BottomLineDetail = styled.div`display: flex; justify-content: space-between; font-size: 10px;`
const BottomLineDetailLabel = styled.span`color: ${({ theme }) => theme.colors.textTertiary};`
const BottomLineDetailValue = styled.span<{ $highlight?: boolean }>`font-weight: 700; color: ${({ $highlight, theme }) => $highlight ? theme.colors.primary : theme.colors.textSecondary};`
const Disclaimer = styled.p`font-size: 9px; color: ${({ theme }) => theme.colors.textTertiary}; margin-top: 12px; text-align: center;`

interface PlotFinancials { price: number; projected: number; sizeSqM: number; roi: number; readiness: string; purchaseTax: number; attorneyFees: number; totalInvestment: number; grossProfit: number; bettermentLevy: number; capitalGains: number; netProfit: number; netRoi: number; cagr: CAGRResult | null }

function calcPlotFinancials(plot: Plot): PlotFinancials {
  const price = getPlotPrice(plot); const projected = getPlotProjectedValue(plot); const sizeSqM = getPlotSize(plot); const readiness = getPlotReadiness(plot)
  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  const txn = calcTransactionCosts(price); const exit = calcExitCosts(price, projected); const totalInvestment = txn.totalWithPurchase
  const cagrData = calcCAGR(roi, readiness)
  return { price, projected, sizeSqM, roi, readiness, purchaseTax: txn.purchaseTax, attorneyFees: txn.attorneyFees, totalInvestment, grossProfit: projected - price, bettermentLevy: exit.bettermentLevy, capitalGains: exit.capitalGains, netProfit: exit.netProfit, netRoi: totalInvestment > 0 ? Math.round((exit.netProfit / totalInvestment) * 100) : 0, cagr: cagrData }
}

export { calcPlotFinancials }

interface NetProfitAnalysisProps { plots: Plot[] }

export default function NetProfitAnalysis({ plots }: NetProfitAnalysisProps) {
  const financials = useMemo(() => plots.map(calcPlotFinancials), [plots])
  const bestNetProfit = Math.max(...financials.map(f => f.netProfit))
  const bestNetRoi = Math.max(...financials.map(f => f.netRoi))

  return (
    <CardPanelPadded>
      <SectionHeader>
        <SectionIconBox $bg="rgba(16,185,129,0.08)" $border="rgba(16,185,129,0.15)">
          <DollarSign style={{ width: 18, height: 18, color: '#10B981' }} />
        </SectionIconBox>
        <div><SectionTitleText>\u05E0\u05D9\u05EA\u05D5\u05D7 \u05E8\u05D5\u05D5\u05D7\u05D9\u05D5\u05EA \u05E0\u05D8\u05D5</SectionTitleText><SectionSubtitle>\u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05D4\u05DE\u05D9\u05E1\u05D9\u05DD, \u05D4\u05D9\u05D8\u05DC\u05D9\u05DD \u05D5\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05E0\u05DC\u05D5\u05D5\u05EA</SectionSubtitle></div>
      </SectionHeader>
      <ProfitGrid $count={plots.length}>
        {plots.map((plot, i) => {
          const f = financials[i]; const bn = plot.block_number ?? plot.blockNumber
          const isBestProfit = f.netProfit === bestNetProfit && plots.length > 1
          const isBestRoi = f.netRoi === bestNetRoi && plots.length > 1
          return (
            <ProfitCard key={plot.id} $isBest={isBestProfit}>
              <ProfitCardHeader><PlotDot $color={PLOT_COLORS[i]} /><PlotLabel>\u05D2\u05D5\u05E9 {bn}/{plot.number}</PlotLabel>{isBestProfit && <BestBadge>\u05D4\u05DB\u05D9 \u05E8\u05D5\u05D5\u05D7\u05D9</BestBadge>}</ProfitCardHeader>
              <LineItemStack>
                <LineItemRow><LineItemLabel>\u05DE\u05D7\u05D9\u05E8 \u05E8\u05DB\u05D9\u05E9\u05D4</LineItemLabel><LineItemValue>{formatCurrency(f.price)}</LineItemValue></LineItemRow>
                <LineItemRow><LineItemLabel>\u05DE\u05E1 \u05E8\u05DB\u05D9\u05E9\u05D4 (6%)</LineItemLabel><LineItemValue $color="#94A3B8">{formatCurrency(f.purchaseTax)}</LineItemValue></LineItemRow>
                <LineItemRow><LineItemLabel>\u05E9\u05DB\u05F4\u05D8 \u05E2\u05D5\u05F4\u05D3</LineItemLabel><LineItemValue $color="#94A3B8">{formatCurrency(f.attorneyFees)}</LineItemValue></LineItemRow>
                <TotalRow><TotalLabel>\u05E1\u05D4\u05F4\u05DB \u05D4\u05E9\u05E7\u05E2\u05D4</TotalLabel><TotalValue>{formatCurrency(f.totalInvestment)}</TotalValue></TotalRow>
              </LineItemStack>
              <LineItemStack>
                <LineItemRow><LineItemLabel>\u05E8\u05D5\u05D5\u05D7 \u05D2\u05D5\u05DC\u05DE\u05D9</LineItemLabel><LineItemValue $color="#10B981">{formatCurrency(f.grossProfit)}</LineItemValue></LineItemRow>
                <LineItemRow><LineItemLabel>\u05D4\u05D9\u05D8\u05DC \u05D4\u05E9\u05D1\u05D7\u05D4 (50%)</LineItemLabel><LineItemValue $color="#EF4444">-{formatCurrency(f.bettermentLevy)}</LineItemValue></LineItemRow>
                <LineItemRow><LineItemLabel>\u05DE\u05E1 \u05E9\u05D1\u05D7 (25%)</LineItemLabel><LineItemValue $color="#EF4444">-{formatCurrency(f.capitalGains)}</LineItemValue></LineItemRow>
              </LineItemStack>
              <BottomLineBox $positive={f.netProfit >= 0}>
                <BottomLineHeader><BottomLineLabel>\u05E8\u05D5\u05D5\u05D7 \u05E0\u05E7\u05D9</BottomLineLabel><BottomLineAmount $positive={f.netProfit >= 0}>{formatCurrency(f.netProfit)}</BottomLineAmount></BottomLineHeader>
                <BottomLineDetail><BottomLineDetailLabel>ROI \u05E0\u05D8\u05D5</BottomLineDetailLabel><BottomLineDetailValue $highlight={isBestRoi}>{f.netRoi}%{isBestRoi && plots.length > 1 ? ' \uD83D\uDC51' : ''}</BottomLineDetailValue></BottomLineDetail>
                {f.cagr && <BottomLineDetail><BottomLineDetailLabel>CAGR ({f.cagr.years} \u05E9\u05E0\u05D9\u05DD)</BottomLineDetailLabel><BottomLineDetailValue>{f.cagr.cagr}%/\u05E9\u05E0\u05D4</BottomLineDetailValue></BottomLineDetail>}
              </BottomLineBox>
            </ProfitCard>
          )
        })}
      </ProfitGrid>
      <Disclaimer>\u05D7\u05D9\u05E9\u05D5\u05D1 \u05DE\u05E9\u05D5\u05E2\u05E8 -- \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D4\u05D5\u05D5\u05D4 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05DE\u05E1. \u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D4\u05EA\u05D9\u05D9\u05E2\u05E5 \u05E2\u05DD \u05E8\u05D5\u05F4\u05D7 \u05DC\u05E4\u05E0\u05D9 \u05D4\u05D7\u05DC\u05D8\u05EA \u05D4\u05E9\u05E7\u05E2\u05D4.</Disclaimer>
    </CardPanelPadded>
  )
}
