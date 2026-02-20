import styled from 'styled-components'
import { TrendingUp } from 'lucide-react'
import type { Plot } from '../../../types'

const PLOT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B']

const CardPanelPadded = styled.div`background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.xl}; margin-bottom: 24px; padding: 24px;`
const SectionHeader = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 20px;`
const SectionIconBox = styled.div<{ $bg: string; $border: string }>`width: 36px; height: 36px; border-radius: ${({ theme }) => theme.radii.lg}; background: ${({ $bg }) => $bg}; border: 1px solid ${({ $border }) => $border}; display: flex; align-items: center; justify-content: center;`
const SectionTitleText = styled.h3`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const SectionSubtitle = styled.p`font-size: 10px; color: ${({ theme }) => theme.colors.textTertiary};`
const ScatterSvg = styled.svg`width: 100%; max-width: 400px; margin: 0 auto; display: block;`
const ScatterAxisLabel = styled.text`font-size: 9px; fill: ${({ theme }) => theme.colors.textSecondary};`
const ScatterTick = styled.text`font-size: 8px; fill: ${({ theme }) => theme.colors.textTertiary};`
const ScatterQuadLabel = styled.text`font-size: 7px;`
const ScatterPointLabel = styled.text`font-size: 8px; font-weight: 700;`
const ScatterLegendRow = styled.div`display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 8px;`
const ScatterLegendItem = styled.div`display: flex; align-items: center; gap: 6px; font-size: 10px; color: ${({ theme }) => theme.colors.textSecondary};`
const ScatterLegendDot = styled.span<{ $color: string }>`width: 12px; height: 12px; border-radius: 9999px; flex-shrink: 0; background: ${({ $color }) => $color};`
const ScatterLegendMeta = styled.span`color: ${({ theme }) => theme.colors.textTertiary};`

interface RiskReturnScatterProps { plots: Plot[] }

export default function RiskReturnScatter({ plots }: RiskReturnScatterProps) {
  if (!plots || plots.length < 2) return null
  const ZONING_RISK: Record<string, number> = { AGRICULTURAL: 9, MASTER_PLAN_DEPOSIT: 7.5, MASTER_PLAN_APPROVED: 6, DETAILED_PLAN_PREP: 5, DETAILED_PLAN_DEPOSIT: 4, DETAILED_PLAN_APPROVED: 3, DEVELOPER_TENDER: 2, BUILDING_PERMIT: 1 }
  const READINESS_RISK: Record<string, number> = { '1-3': 2, '3-5': 4, '5-7': 6, '5+': 7, '7-10': 8, '10+': 9 }
  const dataPoints = plots.map((p, i) => {
    const price = (p.total_price ?? p.totalPrice ?? 0) as number
    const proj = (p.projected_value ?? p.projectedValue ?? 0) as number
    const roi = price > 0 ? Math.round(((proj - price) / price) * 100) : 0
    const zoning = (p.zoning_stage ?? p.zoningStage ?? 'AGRICULTURAL') as string
    const readiness = (p.readiness_estimate ?? p.readinessEstimate ?? '5+') as string
    const zoningRisk = ZONING_RISK[zoning] ?? 5; const timeRisk = READINESS_RISK[readiness] ?? 5
    const risk = (p as Record<string, unknown>)._riskScore != null ? (p as Record<string, unknown>)._riskScore as number : Math.round((zoningRisk * 0.6 + timeRisk * 0.4) * 10) / 10
    return { plot: p, roi, risk, color: PLOT_COLORS[i], index: i }
  })
  const W = 320, H = 220, pad = { top: 25, right: 25, bottom: 35, left: 45 }
  const chartW = W - pad.left - pad.right, chartH = H - pad.top - pad.bottom
  const minRoi = Math.min(0, ...dataPoints.map(d => d.roi))
  const maxRoi = Math.max(100, ...dataPoints.map(d => d.roi)) * 1.1, maxRisk = 10
  const scaleX = (risk: number) => pad.left + (risk / maxRisk) * chartW
  const scaleY = (roi: number) => pad.top + chartH - ((roi - minRoi) / (maxRoi - minRoi)) * chartH
  const medianRoi = dataPoints.length > 0 ? [...dataPoints].sort((a, b) => a.roi - b.roi)[Math.floor(dataPoints.length / 2)].roi : 100
  const quadX = scaleX(5), quadY = scaleY(medianRoi)

  return (
    <CardPanelPadded>
      <SectionHeader>
        <SectionIconBox $bg="rgba(139,92,246,0.08)" $border="rgba(139,92,246,0.15)"><TrendingUp style={{ width: 18, height: 18, color: '#8B5CF6' }} /></SectionIconBox>
        <div><SectionTitleText>\u05E1\u05D9\u05DB\u05D5\u05DF \u05DE\u05D5\u05DC \u05EA\u05E9\u05D5\u05D0\u05D4</SectionTitleText><SectionSubtitle>\u05D4\u05E4\u05D9\u05E0\u05D4 \u05D4\u05E9\u05DE\u05D0\u05DC\u05D9\u05EA-\u05E2\u05DC\u05D9\u05D5\u05E0\u05D4 = \u05D4\u05D4\u05E9\u05E7\u05E2\u05D4 \u05D4\u05D0\u05D9\u05D3\u05D0\u05DC\u05D9\u05EA</SectionSubtitle></div>
      </SectionHeader>
      <ScatterSvg viewBox={`0 0 ${W} ${H}`} dir="ltr">
        <rect x={pad.left} y={pad.top} width={quadX - pad.left} height={quadY - pad.top} fill="rgba(34,197,94,0.04)" />
        <rect x={quadX} y={quadY} width={pad.left + chartW - quadX} height={pad.top + chartH - quadY} fill="rgba(239,68,68,0.04)" />
        <line x1={quadX} y1={pad.top} x2={quadX} y2={pad.top + chartH} stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
        <line x1={pad.left} y1={quadY} x2={pad.left + chartW} y2={quadY} stroke="rgba(0,0,0,0.06)" strokeDasharray="4 4" />
        <ScatterQuadLabel x={pad.left + 4} y={pad.top + 12} fill="#10B981">\u05D0\u05D9\u05D3\u05D0\u05DC\u05D9</ScatterQuadLabel>
        <ScatterQuadLabel x={pad.left + chartW - 4} y={pad.top + chartH - 4} textAnchor="end" fill="#EF4444">\u05DE\u05E1\u05D5\u05DB\u05DF</ScatterQuadLabel>
        <line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH} stroke="rgba(0,0,0,0.1)" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + chartH} stroke="rgba(0,0,0,0.1)" />
        {[0, 2.5, 5, 7.5, 10].map(v => <g key={`x-${v}`}><line x1={scaleX(v)} y1={pad.top + chartH} x2={scaleX(v)} y2={pad.top + chartH + 4} stroke="rgba(0,0,0,0.1)" /><ScatterTick x={scaleX(v)} y={pad.top + chartH + 14} textAnchor="middle">{v}</ScatterTick></g>)}
        {[0, 50, 100, 150, 200, 250].filter(v => v >= minRoi && v <= maxRoi).map(v => <g key={`y-${v}`}><ScatterTick x={pad.left - 8} y={scaleY(v) + 3} textAnchor="end">{v}%</ScatterTick></g>)}
        <ScatterAxisLabel x={pad.left + chartW / 2} y={H - 2} textAnchor="middle">{'\u05E1\u05D9\u05DB\u05D5\u05DF \u2192'}</ScatterAxisLabel>
        {dataPoints.map(({ plot, roi, risk, color }) => {
          const cxVal = scaleX(risk), cyVal = scaleY(roi), bn = plot.block_number ?? plot.blockNumber
          return <g key={plot.id}><circle cx={cxVal} cy={cyVal} r="12" fill={`${color}15`} /><circle cx={cxVal} cy={cyVal} r="6" fill={color} stroke="#ffffff" strokeWidth="2" /><ScatterPointLabel x={cxVal} y={cyVal - 10} textAnchor="middle" fill={color}>{bn}/{plot.number}</ScatterPointLabel></g>
        })}
      </ScatterSvg>
      <ScatterLegendRow>
        {dataPoints.map(({ plot, roi, risk, color }) => {
          const bn = plot.block_number ?? plot.blockNumber
          return <ScatterLegendItem key={plot.id}><ScatterLegendDot $color={color} /><span>{bn}/{plot.number}</span><ScatterLegendMeta>({roi}% / {risk})</ScatterLegendMeta></ScatterLegendItem>
        })}
      </ScatterLegendRow>
    </CardPanelPadded>
  )
}
