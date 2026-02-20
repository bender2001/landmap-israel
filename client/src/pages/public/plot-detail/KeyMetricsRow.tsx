import { Link } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { ArrowRight, Calculator as CalcIcon } from 'lucide-react'
import { media } from '../../../styles/theme'
import { formatCurrency } from '../../../utils/format'
import type { Plot } from '../../../types'

/* ── Styled ── */
const FinancialGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px;
  ${media.sm} { grid-template-columns: repeat(4, 1fr); }
`
const FinancialCard = styled.div<{ $gradientFrom: string; $gradientTo: string; $borderColor: string }>`
  border-radius: 16px; padding: 20px; display: flex; flex-direction: column;
  align-items: center; gap: 8px; text-align: center; position: relative; overflow: hidden;
  background: linear-gradient(to bottom, ${({ $gradientFrom }) => $gradientFrom}, ${({ $gradientTo }) => $gradientTo});
  border: 1px solid ${({ $borderColor }) => $borderColor};
`
const CardTopBar = styled.div<{ $gradient: string }>`
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: ${({ $gradient }) => $gradient};
`
const CardLabel = styled.div`font-size: 12px; color: ${({ theme }) => theme.colors.slate[400]};`
const CardValue = styled.div<{ $color: string }>`
  font-size: 20px; font-weight: 700; color: ${({ $color }) => $color};
  ${media.sm} { font-size: 24px; }
`
const CardSub = styled.div`font-size: 12px; color: ${({ theme }) => theme.colors.slate[500]};`
const NetRoiSub = styled.div`font-size: 12px;`
const NetRoiLabel = styled.span`color: ${({ theme }) => theme.colors.slate[500]};`
const NetRoiValue = styled.span<{ $tier: string }>`
  font-weight: 700;
  ${({ $tier, theme }) =>
    $tier === 'excellent' ? css`color: ${theme.colors.emerald[400]};`
    : $tier === 'good' ? css`color: rgba(200,148,42,0.8);`
    : $tier === 'ok' ? css`color: ${theme.colors.amber[400]};`
    : css`color: ${theme.colors.red[400]};`}
`
const CalcCTA = styled(Link)`
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 24px; padding: 12px 20px;
  background: linear-gradient(to right, rgba(124,58,237,0.15), rgba(99,102,241,0.15));
  border: 1px solid rgba(139,92,246,0.2); border-radius: 16px;
  font-size: 14px; font-weight: 500; color: #c4b5fd; text-decoration: none;
  transition: all 0.2s ease;
  &:hover { border-color: rgba(139,92,246,0.4); background: linear-gradient(to right, rgba(124,58,237,0.2), rgba(99,102,241,0.2)); }
`

/* ── Props ── */
interface KeyMetricsRowProps {
  plot: Plot
  totalPrice: number
  projectedValue: number
  roi: number
  pricePerDunam: string
  readiness: string | undefined
  netRoi?: number
  buySignal?: any
  paybackYears?: number
  investmentScore: number
  zoningStage: string
  sizeSqM: number
}

/* ── Component ── */
export default function KeyMetricsRow({
  totalPrice, projectedValue, roi, pricePerDunam, readiness,
  netRoi, buySignal, paybackYears, investmentScore, zoningStage, sizeSqM,
}: KeyMetricsRowProps) {
  return (
    <>
      <FinancialGrid id="section-financial">
        <FinancialCard $gradientFrom="rgba(59,130,246,0.15)" $gradientTo="rgba(59,130,246,0.08)" $borderColor="rgba(59,130,246,0.2)">
          <CardTopBar $gradient="linear-gradient(to right, #60A5FA, #2563EB)" />
          <CardLabel>\u05DE\u05D7\u05D9\u05E8 \u05DE\u05D1\u05D5\u05E7\u05E9</CardLabel>
          <CardValue $color="#60A5FA">{formatCurrency(totalPrice)}</CardValue>
          <CardSub>{pricePerDunam} / \u05D3\u05D5\u05E0\u05DD</CardSub>
        </FinancialCard>
        <FinancialCard $gradientFrom="rgba(16,185,129,0.15)" $gradientTo="rgba(16,185,129,0.08)" $borderColor="rgba(16,185,129,0.2)">
          <CardTopBar $gradient="linear-gradient(to right, #34D399, #059669)" />
          <CardLabel>\u05E9\u05D5\u05D5\u05D9 \u05E6\u05E4\u05D5\u05D9</CardLabel>
          <CardValue $color="#34D399">{formatCurrency(projectedValue)}</CardValue>
          <CardSub>\u05D1\u05E1\u05D9\u05D5\u05DD \u05EA\u05D4\u05DC\u05D9\u05DA</CardSub>
        </FinancialCard>
        <FinancialCard $gradientFrom="rgba(200,148,42,0.15)" $gradientTo="rgba(200,148,42,0.08)" $borderColor="rgba(200,148,42,0.2)">
          <CardTopBar $gradient="linear-gradient(to right, #C8942A, #E5B94E)" />
          <CardLabel>\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E6\u05E4\u05D5\u05D9\u05D4</CardLabel>
          <CardValue $color="#C8942A">+{roi}%</CardValue>
          {netRoi != null ? (
            <NetRoiSub title="\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E0\u05D8\u05D5 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05D4\u05DE\u05D9\u05E1\u05D9\u05DD">
              <NetRoiLabel>\u05E0\u05D8\u05D5: </NetRoiLabel>
              <NetRoiValue $tier={netRoi >= 50 ? 'excellent' : netRoi >= 20 ? 'good' : netRoi >= 0 ? 'ok' : 'negative'}>
                {netRoi > 0 ? '+' : ''}{netRoi}%
              </NetRoiValue>
            </NetRoiSub>
          ) : readiness ? <CardSub>{readiness}</CardSub> : null}
        </FinancialCard>
        {buySignal ? (
          <FinancialCard
            $gradientFrom={buySignal.signal === 'BUY' ? 'rgba(16,185,129,0.15)' : buySignal.signal === 'HOLD' ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)'}
            $gradientTo={buySignal.signal === 'BUY' ? 'rgba(16,185,129,0.08)' : buySignal.signal === 'HOLD' ? 'rgba(245,158,11,0.08)' : 'rgba(100,116,139,0.08)'}
            $borderColor={buySignal.signal === 'BUY' ? 'rgba(16,185,129,0.2)' : buySignal.signal === 'HOLD' ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)'}
          >
            <CardTopBar $gradient={buySignal.signal === 'BUY' ? 'linear-gradient(to right, #34D399, #059669)' : buySignal.signal === 'HOLD' ? 'linear-gradient(to right, #FBBF24, #D97706)' : 'linear-gradient(to right, #94A3B8, #475569)'} />
            <CardLabel>\u05D0\u05D5\u05EA \u05D4\u05E9\u05E7\u05E2\u05D4</CardLabel>
            <CardValue $color={buySignal.signal === 'BUY' ? '#34D399' : buySignal.signal === 'HOLD' ? '#FBBF24' : '#94A3B8'}>
              {buySignal.label}
            </CardValue>
            {paybackYears != null && paybackYears > 0
              ? <CardSub>\u05D4\u05D7\u05D6\u05E8: ~{paybackYears} \u05E9\u05E0\u05D9\u05DD</CardSub>
              : <CardSub>\u05E6\u05D9\u05D5\u05DF {buySignal.strength}/10</CardSub>}
          </FinancialCard>
        ) : (
          <FinancialCard $gradientFrom="rgba(139,92,246,0.15)" $gradientTo="rgba(139,92,246,0.08)" $borderColor="rgba(139,92,246,0.2)">
            <CardTopBar $gradient="linear-gradient(to right, #A78BFA, #7C3AED)" />
            <CardLabel>\u05E6\u05D9\u05D5\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4</CardLabel>
            <CardValue $color="#A78BFA">{investmentScore}/10</CardValue>
            {readiness && <CardSub>{readiness}</CardSub>}
          </FinancialCard>
        )}
      </FinancialGrid>

      <CalcCTA
        to={`/calculator?price=${totalPrice}&size=${sizeSqM}&zoning=${encodeURIComponent(zoningStage)}&years=${readiness?.includes('1-3') ? '2' : readiness?.includes('3-5') ? '4' : '7'}`}
      >
        <CalcIcon style={{ width: 16, height: 16, color: '#A78BFA' }} />
        <span>\u05D7\u05E9\u05D1 \u05EA\u05E9\u05D5\u05D0\u05D4 \u05DE\u05E4\u05D5\u05E8\u05D8\u05EA \u05D1\u05DE\u05D7\u05E9\u05D1\u05D5\u05DF \u05D4\u05D4\u05E9\u05E7\u05E2\u05D5\u05EA</span>
        <ArrowRight style={{ width: 14, height: 14, color: 'rgba(167,139,250,0.6)' }} />
      </CalcCTA>
    </>
  )
}
