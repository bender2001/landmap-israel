import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { MapPin, X } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels } from '../../../utils/constants'
import { formatCurrency, formatMonthlyPayment } from '../../../utils/format'
import { calcInvestmentScore, calcMonthlyPayment } from '../../../utils/investment'
import { calcPlotFinancials } from './NetProfitAnalysis'
import type { Plot } from '../../../types'

const TablePanel = styled.div`background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.xl}; overflow: hidden; margin-bottom: 24px;`
const TopBar = styled.div`height: 3px; background: ${({ theme }) => theme.gradients.primary};`
const TableScroll = styled.div`overflow-x: auto;`
const Table = styled.table`width: 100%; font-size: 14px;`
const TableHead = styled.thead``
const TableHeadRow = styled.tr`border-bottom: 1px solid ${({ theme }) => theme.colors.border};`
const TableHeadLabel = styled.th`padding: 16px; text-align: right; color: ${({ theme }) => theme.colors.textSecondary}; font-weight: 500; width: 140px;`
const TableHeadPlot = styled.th`padding: 16px; text-align: right; min-width: 180px;`
const PlotHeaderWrap = styled.div`display: flex; align-items: flex-start; justify-content: space-between;`
const PlotHeaderName = styled.div`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const PlotHeaderCity = styled.div`display: flex; align-items: center; gap: 4px; font-size: 12px; color: ${({ theme }) => theme.colors.textSecondary}; margin-top: 4px;`
const StatusBadgeComp = styled.span<{ $bg: string; $color: string }>`display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 500; margin-top: 8px; background: ${({ $bg }) => $bg}; color: ${({ $color }) => $color};`
const RemoveButton = styled.button`width: 24px; height: 24px; border-radius: ${({ theme }) => theme.radii.sm}; background: ${({ theme }) => theme.colors.bgTertiary}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; &:hover { background: ${({ theme }) => theme.colors.red[100]}; }`
const TableBody = styled.tbody``
const TableRow = styled.tr<{ $highlight?: boolean }>`border-bottom: 1px solid ${({ theme }) => theme.colors.borderLight}; background: ${({ $highlight, theme }) => $highlight ? theme.colors.emerald[50] : 'transparent'}; &:hover { background: ${({ $highlight, theme }) => $highlight ? theme.colors.emerald[50] : theme.colors.bgSecondary}; }`
const RowLabel = styled.td<{ $color?: string; $bold?: boolean }>`padding: 12px 16px; font-size: 14px; color: ${({ $color, theme }) => $color || theme.colors.textSecondary}; font-weight: ${({ $bold }) => $bold ? 700 : 500};`
const CellTd = styled.td<{ $highlight?: boolean }>`padding: 12px 16px; font-size: 14px; color: ${({ $highlight, theme }) => $highlight ? theme.colors.primary : theme.colors.text}; font-weight: ${({ $highlight }) => $highlight ? 700 : 400};`
const NetProfitCell = styled.td<{ $best: boolean; $positive: boolean }>`padding: 12px 16px; font-size: 14px; font-weight: 700; color: ${({ $best, $positive, theme }) => { if ($best) return theme.colors.emerald[600]; if ($positive) return theme.colors.emerald[500]; return theme.colors.red[500] }};`
const SeparatorRow = styled.tr`& > td { padding: 4px 0; background: ${({ theme }) => theme.colors.bgSecondary}; }`
const ScoreBarWrap = styled.td`padding: 12px 16px; font-size: 14px;`
const ScoreBarInner = styled.div`display: flex; align-items: center; gap: 8px;`
const ScoreTrack = styled.div`flex: 1; height: 8px; border-radius: 9999px; background: ${({ theme }) => theme.colors.bgTertiary}; overflow: hidden; max-width: 80px;`
const ScoreFill = styled.div<{ $width: number; $color: string }>`height: 100%; border-radius: 9999px; width: ${({ $width }) => $width}%; background: ${({ $color }) => $color};`
const ScoreNumber = styled.span<{ $highlight: boolean }>`font-weight: 700; color: ${({ $highlight, theme }) => $highlight ? theme.colors.primary : theme.colors.text};`
const TableFootnote = styled.div`padding: 8px 16px 0;`
const FootnoteText = styled.p`font-size: 9px; color: ${({ theme }) => theme.colors.textTertiary};`
const TableActions = styled.div`padding: 16px; border-top: 1px solid ${({ theme }) => theme.colors.borderLight}; display: flex; align-items: center; justify-content: space-between;`
const AddPlotLink = styled(Link)`font-size: 14px; color: ${({ theme }) => theme.colors.textSecondary}; text-decoration: none; &:hover { color: ${({ theme }) => theme.colors.primary}; }`
const ClearAllButton = styled.button`font-size: 14px; color: ${({ theme }) => theme.colors.red[500]}; background: none; border: none; cursor: pointer; &:hover { color: ${({ theme }) => theme.colors.red[400]}; }`

function CompareCell({ value, highlight = false }: { value?: string | number | null; highlight?: boolean }) {
  return <CellTd $highlight={highlight}>{value ?? '\u2014'}</CellTd>
}

interface CompareTableProps { plots: Plot[]; removeFromCompare: (id: string) => void; clearAll: () => void; bestValue: (getter: (p: Plot) => number | null | undefined, mode?: 'max' | 'min') => number | null }

export default function CompareTable({ plots, removeFromCompare, clearAll, bestValue }: CompareTableProps) {
  return (
    <TablePanel>
      <TopBar />
      <TableScroll>
        <Table>
          <TableHead>
            <TableHeadRow>
              <TableHeadLabel>\u05D7\u05DC\u05E7\u05D4</TableHeadLabel>
              {plots.map(plot => {
                const blockNum = plot.block_number ?? plot.blockNumber
                const color = statusColors[plot.status as keyof typeof statusColors]
                return (
                  <TableHeadPlot key={plot.id}>
                    <PlotHeaderWrap>
                      <div>
                        <PlotHeaderName>\u05D2\u05D5\u05E9 {blockNum} / {plot.number}</PlotHeaderName>
                        <PlotHeaderCity><MapPin style={{ width: 12, height: 12 }} />{plot.city}</PlotHeaderCity>
                        <StatusBadgeComp $bg={`${color}20`} $color={color}>{statusLabels[plot.status as keyof typeof statusLabels]}</StatusBadgeComp>
                      </div>
                      <RemoveButton onClick={() => removeFromCompare(plot.id)}><X style={{ width: 14, height: 14, color: '#94A3B8' }} /></RemoveButton>
                    </PlotHeaderWrap>
                  </TableHeadPlot>
                )
              })}
            </TableHeadRow>
          </TableHead>
          <TableBody>
            <TableRow><RowLabel>\u05DE\u05D7\u05D9\u05E8</RowLabel>{plots.map(p => { const price = (p.total_price ?? p.totalPrice) as number | undefined; const best = bestValue((pl) => (pl.total_price ?? pl.totalPrice) as number | undefined, 'min'); return <CompareCell key={p.id} value={formatCurrency(price as number)} highlight={price === best} /> })}</TableRow>
            <TableRow><RowLabel>\u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9*</RowLabel>{plots.map(p => { const price = (p.total_price ?? p.totalPrice) as number; const payment = calcMonthlyPayment(price); const best = bestValue((pl) => { const pm = calcMonthlyPayment((pl.total_price ?? pl.totalPrice) as number); return pm ? pm.monthly : null }, 'min'); return <CompareCell key={p.id} value={payment ? formatMonthlyPayment(payment.monthly) : null} highlight={!!(payment && payment.monthly === best)} /> })}</TableRow>
            <TableRow><RowLabel>\u05E9\u05D8\u05D7</RowLabel>{plots.map(p => { const size = (p.size_sqm ?? p.sizeSqM) as number | undefined; const best = bestValue((pl) => (pl.size_sqm ?? pl.sizeSqM) as number | undefined, 'max'); return <CompareCell key={p.id} value={size ? `${size.toLocaleString()} \u05DE"\u05E8` : null} highlight={size === best} /> })}</TableRow>
            <TableRow><RowLabel>\u05DE\u05D7\u05D9\u05E8/\u05DE"\u05E8</RowLabel>{plots.map(p => { const price = (p.total_price ?? p.totalPrice) as number; const size = (p.size_sqm ?? p.sizeSqM) as number | undefined; const ppsm = size ? Math.round(price / size) : null; const best = bestValue((pl) => { const pr = (pl.total_price ?? pl.totalPrice) as number; const sz = (pl.size_sqm ?? pl.sizeSqM) as number | undefined; return sz ? Math.round(pr / sz) : null }, 'min'); return <CompareCell key={p.id} value={ppsm ? `${ppsm.toLocaleString()} \u20AA` : null} highlight={ppsm === best} /> })}</TableRow>
            <TableRow><RowLabel>\u05E9\u05DC\u05D1 \u05D9\u05D9\u05E2\u05D5\u05D3</RowLabel>{plots.map(p => <CompareCell key={p.id} value={zoningLabels[(p.zoning_stage ?? p.zoningStage) as keyof typeof zoningLabels]} />)}</TableRow>
            <TableRow><RowLabel>\u05E9\u05D5\u05D5\u05D9 \u05E6\u05E4\u05D5\u05D9</RowLabel>{plots.map(p => { const val = (p.projected_value ?? p.projectedValue) as number | undefined; const best = bestValue((pl) => (pl.projected_value ?? pl.projectedValue) as number | undefined, 'max'); return <CompareCell key={p.id} value={val ? formatCurrency(val) : null} highlight={val === best} /> })}</TableRow>
            <TableRow><RowLabel>\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E6\u05E4\u05D5\u05D9\u05D4</RowLabel>{plots.map(p => { const price = (p.total_price ?? p.totalPrice) as number | undefined; const proj = (p.projected_value ?? p.projectedValue) as number | undefined; const roi = price && proj ? Math.round(((proj - price) / price) * 100) : null; const best = bestValue((pl) => { const pr = (pl.total_price ?? pl.totalPrice) as number | undefined; const pj = (pl.projected_value ?? pl.projectedValue) as number | undefined; return pr && pj ? Math.round(((pj - pr) / pr) * 100) : null }, 'max'); return <CompareCell key={p.id} value={roi != null ? `+${roi}%` : null} highlight={roi === best} /> })}</TableRow>
            <TableRow $highlight><RowLabel $color="#059669" $bold>\u05E8\u05D5\u05D5\u05D7 \u05E0\u05E7\u05D9</RowLabel>{plots.map(p => { const f = calcPlotFinancials(p); const bestNet = Math.max(...plots.map(pl => calcPlotFinancials(pl).netProfit)); return <NetProfitCell key={p.id} $best={f.netProfit === bestNet && plots.length > 1} $positive={f.netProfit >= 0}>{formatCurrency(f.netProfit)}</NetProfitCell> })}</TableRow>
            <TableRow $highlight><RowLabel $color="#10B981">ROI \u05E0\u05D8\u05D5</RowLabel>{plots.map(p => { const f = calcPlotFinancials(p); const bestNetRoi = Math.max(...plots.map(pl => calcPlotFinancials(pl).netRoi)); return <CompareCell key={p.id} value={`${f.netRoi}%`} highlight={f.netRoi === bestNetRoi && plots.length > 1} /> })}</TableRow>
            <SeparatorRow><td colSpan={plots.length + 1} /></SeparatorRow>
            <TableRow><RowLabel>\u05DE\u05D5\u05DB\u05E0\u05D5\u05EA \u05DC\u05D1\u05E0\u05D9\u05D9\u05D4</RowLabel>{plots.map(p => <CompareCell key={p.id} value={(p.readiness_estimate ?? p.readinessEstimate) as string | undefined} />)}</TableRow>
            <TableRow><RowLabel>\u05DE\u05E8\u05D7\u05E7 \u05DE\u05D4\u05D9\u05DD</RowLabel>{plots.map(p => { const dist = (p.distance_to_sea ?? p.distanceToSea) as number | undefined; const best = bestValue((pl) => (pl.distance_to_sea ?? pl.distanceToSea) as number | undefined, 'min'); return <CompareCell key={p.id} value={dist != null ? `${dist} \u05DE'` : null} highlight={dist === best} /> })}</TableRow>
            <TableRow><RowLabel>\u05E6\u05D9\u05D5\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4</RowLabel>{plots.map(p => { const score = calcInvestmentScore(p); const bestScore = Math.max(...plots.map(pl => calcInvestmentScore(pl))); const isBest = score === bestScore && plots.length > 1; return <ScoreBarWrap key={p.id}><ScoreBarInner><ScoreTrack><ScoreFill $width={score * 10} $color={score >= 8 ? '#22C55E' : score >= 6 ? '#84CC16' : score >= 4 ? '#F59E0B' : '#EF4444'} /></ScoreTrack><ScoreNumber $highlight={isBest}>{score}/10 {isBest ? '\uD83D\uDC51' : ''}</ScoreNumber></ScoreBarInner></ScoreBarWrap> })}</TableRow>
          </TableBody>
        </Table>
      </TableScroll>
      <TableFootnote><FootnoteText>* \u05EA\u05E9\u05DC\u05D5\u05DD \u05D7\u05D5\u05D3\u05E9\u05D9 \u05DE\u05E9\u05D5\u05E2\u05E8: 50% \u05D4\u05D5\u05DF \u05E2\u05E6\u05DE\u05D9, \u05E8\u05D9\u05D1\u05D9\u05EA 6%, \u05EA\u05E7\u05D5\u05E4\u05D4 15 \u05E9\u05E0\u05D4.</FootnoteText></TableFootnote>
      <TableActions>
        <AddPlotLink to="/">+ \u05D4\u05D5\u05E1\u05E3 \u05D7\u05DC\u05E7\u05D4 \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4</AddPlotLink>
        <ClearAllButton onClick={clearAll}>\u05E0\u05E7\u05D4 \u05D4\u05DB\u05DC</ClearAllButton>
      </TableActions>
    </TablePanel>
  )
}
