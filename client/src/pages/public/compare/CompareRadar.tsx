import styled from 'styled-components'
import { Award } from 'lucide-react'
import { calcInvestmentScore } from '../../../utils/investment'
import type { Plot } from '../../../types'

const PLOT_COLORS = ['#3B82F6', '#22C55E', '#F59E0B']

const CardPanelPadded = styled.div`background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.xl}; margin-bottom: 24px; padding: 24px;`
const SectionTitleText = styled.h3`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const RadarSvg = styled.svg`width: 100%; max-width: 300px; margin: 0 auto; display: block;`
const RadarLabel = styled.text`font-size: 9px; fill: ${({ theme }) => theme.colors.textSecondary};`
const LegendRow = styled.div`display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 12px;`
const LegendItem = styled.div`display: flex; align-items: center; gap: 6px;`
const LegendDot = styled.span<{ $color: string }>`width: 12px; height: 12px; border-radius: 9999px; background: ${({ $color }) => $color};`
const LegendText = styled.span`font-size: 10px; color: ${({ theme }) => theme.colors.textSecondary};`

interface CompareRadarProps { plots: Plot[] }

export default function CompareRadar({ plots }: CompareRadarProps) {
  const dimensions = ['ROI', '\u05E9\u05D8\u05D7', '\u05DE\u05D9\u05E7\u05D5\u05DD', '\u05EA\u05DB\u05E0\u05D5\u05DF', '\u05E6\u05D9\u05D5\u05DF']
  const getScores = (plot: Plot): number[] => {
    const price = (plot.total_price ?? plot.totalPrice ?? 0) as number
    const proj = (plot.projected_value ?? plot.projectedValue ?? 0) as number
    const roi = price > 0 ? ((proj - price) / price) * 100 : 0
    const size = (plot.size_sqm ?? plot.sizeSqM ?? 0) as number
    const distSea = (plot.distance_to_sea ?? plot.distanceToSea) as number | undefined
    const investScore = calcInvestmentScore(plot)
    const zoningOrder = ['AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED', 'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT']
    const zoning = (plot.zoning_stage ?? plot.zoningStage ?? 'AGRICULTURAL') as string
    const zoningIdx = zoningOrder.indexOf(zoning)
    return [Math.min(10, roi / 25), Math.min(10, (size / 3000) * 10), distSea != null ? Math.max(0, 10 - distSea / 500) : 5, zoningIdx >= 0 ? (zoningIdx / 7) * 10 : 0, investScore]
  }
  const cx = 100, cy = 100, r = 70, n = dimensions.length
  const angleStep = (2 * Math.PI) / n, startAngle = -Math.PI / 2
  const getPoint = (i: number, val: number) => {
    const angle = startAngle + i * angleStep; const dist = (val / 10) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }
  return (
    <CardPanelPadded>
      <SectionTitleText style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Award style={{ width: 16, height: 16, color: '#1A73E8' }} /> \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05D7\u05D6\u05D5\u05EA\u05D9\u05EA
      </SectionTitleText>
      <RadarSvg viewBox="0 0 200 200">
        {[2, 4, 6, 8, 10].map(level => {
          const points = Array.from({ length: n }, (_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}` }).join(' ')
          return <polygon key={level} points={points} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
        })}
        {dimensions.map((_, i) => { const p = getPoint(i, 10); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" /> })}
        {plots.map((plot, pi) => {
          const scores = getScores(plot)
          const points = scores.map((s, i) => { const p = getPoint(i, s); return `${p.x},${p.y}` }).join(' ')
          return <polygon key={plot.id} points={points} fill={`${PLOT_COLORS[pi]}15`} stroke={PLOT_COLORS[pi]} strokeWidth="1.5" strokeLinejoin="round" />
        })}
        {plots.map((plot, pi) => getScores(plot).map((s, i) => { const p = getPoint(i, s); return <circle key={`${plot.id}-${i}`} cx={p.x} cy={p.y} r="3" fill={PLOT_COLORS[pi]} stroke="#ffffff" strokeWidth="1" /> }))}
        {dimensions.map((d, i) => { const p = getPoint(i, 12.5); return <RadarLabel key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle">{d}</RadarLabel> })}
      </RadarSvg>
      <LegendRow>
        {plots.map((plot, i) => {
          const blockNum = plot.block_number ?? plot.blockNumber
          return <LegendItem key={plot.id}><LegendDot $color={PLOT_COLORS[i]} /><LegendText>\u05D2\u05D5\u05E9 {blockNum}/{plot.number}</LegendText></LegendItem>
        })}
      </LegendRow>
    </CardPanelPadded>
  )
}
