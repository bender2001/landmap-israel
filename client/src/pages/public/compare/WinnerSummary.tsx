import styled, { css } from 'styled-components'
import { Trophy, Crown } from 'lucide-react'
import { calcInvestmentScore } from '../../../utils/investment'
import type { Plot } from '../../../types'

const CardPanelPadded = styled.div`background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.xl}; padding: 24px;`
const WinnerPanel = styled(CardPanelPadded)`border-color: ${({ theme }) => theme.colors.primary}; border-width: 1px; padding: 20px; margin-bottom: 24px;`
const WinnerHeader = styled.div`display: flex; align-items: center; gap: 12px; margin-bottom: 12px;`
const WinnerIconBox = styled.div`width: 40px; height: 40px; border-radius: ${({ theme }) => theme.radii.lg}; background: ${({ theme }) => theme.colors.primaryLight}; border: 1px solid ${({ theme }) => theme.colors.border}; display: flex; align-items: center; justify-content: center;`
const WinnerTitle = styled.h3`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const WinnerSubtitle = styled.p`font-size: 11px; color: ${({ theme }) => theme.colors.textSecondary};`
const WinnerChips = styled.div`display: flex; flex-wrap: wrap; gap: 6px;`
const WinnerChip = styled.div<{ $isWinner: boolean }>`
  display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: ${({ theme }) => theme.radii.lg}; font-size: 12px;
  ${({ $isWinner, theme }) => $isWinner
    ? css`background: ${theme.colors.primaryLight}; border: 1px solid ${theme.colors.primary}30; color: ${theme.colors.primary};`
    : css`background: ${theme.colors.bgSecondary}; border: 1px solid ${theme.colors.borderLight}; color: ${theme.colors.textSecondary};`}
`
const ChipName = styled.span`font-weight: 500;`
const ChipCount = styled.span`font-size: 10px; opacity: 0.7;`
const ChipCategories = styled.span`font-size: 9px; opacity: 0.5;`

interface WinnerSummaryProps { plots: Plot[] }

export default function WinnerSummary({ plots }: WinnerSummaryProps) {
  const criteria: Array<{ label: string; getter: (p: Plot) => number; mode: 'min' | 'max' }> = [
    { label: '\u05DE\u05D7\u05D9\u05E8 \u05E0\u05DE\u05D5\u05DA', getter: (p) => (p.total_price ?? p.totalPrice ?? Infinity) as number, mode: 'min' },
    { label: '\u05E9\u05D8\u05D7 \u05D2\u05D3\u05D5\u05DC', getter: (p) => (p.size_sqm ?? p.sizeSqM ?? 0) as number, mode: 'max' },
    { label: '\u05EA\u05E9\u05D5\u05D0\u05D4 \u05D2\u05D1\u05D5\u05D4\u05D4', getter: (p) => { const pr = (p.total_price ?? p.totalPrice ?? 0) as number; const pj = (p.projected_value ?? p.projectedValue ?? 0) as number; return pr > 0 ? (pj - pr) / pr : 0 }, mode: 'max' },
    { label: '\u05DE\u05D7\u05D9\u05E8/\u05DE\u05F4\u05E8', getter: (p) => { const pr = (p.total_price ?? p.totalPrice ?? 0) as number; const sz = (p.size_sqm ?? p.sizeSqM ?? 1) as number; return sz > 0 ? pr / sz : Infinity }, mode: 'min' },
    { label: '\u05E6\u05D9\u05D5\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4', getter: (p) => calcInvestmentScore(p), mode: 'max' },
    { label: '\u05E7\u05E8\u05D1\u05D4 \u05DC\u05D9\u05DD', getter: (p) => (p.distance_to_sea ?? p.distanceToSea ?? Infinity) as number, mode: 'min' },
  ]
  const wins: Record<string, { count: number; categories: string[] }> = {}
  plots.forEach(p => { wins[p.id] = { count: 0, categories: [] } })
  criteria.forEach(({ label, getter, mode }) => {
    const values = plots.map(p => ({ id: p.id, val: getter(p) }))
    const best = mode === 'max' ? Math.max(...values.map(v => v.val)) : Math.min(...values.map(v => v.val))
    values.forEach(v => { if (v.val === best && isFinite(best)) { wins[v.id].count++; wins[v.id].categories.push(label) } })
  })
  const sorted = plots.map(p => ({ plot: p, ...wins[p.id] })).sort((a, b) => b.count - a.count)
  const winner = sorted[0]
  if (!winner || winner.count === 0) return null
  const blockNum = winner.plot.block_number ?? winner.plot.blockNumber
  const isTie = sorted.length > 1 && sorted[1].count === winner.count

  return (
    <WinnerPanel>
      <WinnerHeader>
        <WinnerIconBox><Trophy style={{ width: 20, height: 20, color: '#1A73E8' }} /></WinnerIconBox>
        <div>
          <WinnerTitle>{isTie ? '\u05EA\u05D9\u05E7\u05D5!' : `\uD83C\uDFC6 \u05D4\u05DE\u05E0\u05E6\u05D7: \u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${winner.plot.number}`}</WinnerTitle>
          <WinnerSubtitle>{isTie ? `\u05E9\u05EA\u05D9 \u05D7\u05DC\u05E7\u05D5\u05EA \u05DE\u05D5\u05D1\u05D9\u05DC\u05D5\u05EA \u05D1-${winner.count} \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA \u05DB\u05DC \u05D0\u05D7\u05EA` : `\u05DE\u05D5\u05D1\u05D9\u05DC \u05D1-${winner.count} \u05DE\u05EA\u05D5\u05DA ${criteria.length} \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA`}</WinnerSubtitle>
        </div>
      </WinnerHeader>
      <WinnerChips>
        {sorted.map(({ plot, count, categories }, i) => {
          const bn = plot.block_number ?? plot.blockNumber
          return (
            <WinnerChip key={plot.id} $isWinner={i === 0}>
              {i === 0 && <Crown style={{ width: 14, height: 14 }} />}
              <ChipName>{bn}/{plot.number}</ChipName>
              <ChipCount>{count} \u05E0\u05D9\u05E6\u05D7\u05D5\u05E0\u05D5\u05EA</ChipCount>
              {categories.length > 0 && <ChipCategories>({categories.slice(0, 3).join(', ')})</ChipCategories>}
            </WinnerChip>
          )
        })}
      </WinnerChips>
    </WinnerPanel>
  )
}
