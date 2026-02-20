/**
 * FinancialsSection - PnL, tax authority, mortgage calc, transaction costs, sensitivity
 */
import { useState, useMemo, lazy, Suspense } from 'react'
import styled from 'styled-components'
import { DollarSign, TrendingUp, BarChart3, Shield, CheckCircle2, AlertTriangle, Navigation } from 'lucide-react'
import { DataRow, DataRowLabel, DataRowValue, IconBox, SectionWrap } from '../ds'
import { formatCurrency } from '../../utils/format'
import { calcCAGR, calcAlternativeReturns } from '../../utils/investment'
import PriceTrendChart from '../ui/PriceTrendChart'
import ProfitWaterfall from '../ui/ProfitWaterfall'
import { theme as themeTokens } from '../../styles/theme'
import { SectionSpinner, GoldPanelSm, ThinDivider, CompBarTrack, CompBarFill, AltBar, ScenarioRow, RangeInput } from './shared'

const InvestmentScoreBreakdown = lazy(() => import('../ui/InvestmentScoreBreakdown'))
const InvestmentProjection = lazy(() => import('../ui/InvestmentProjection'))
const InvestmentBenchmark = lazy(() => import('../ui/InvestmentBenchmark'))

/* ── MiniMortgageCalc ──────────────────────────────────────── */

function MiniMortgageCalc({ totalPrice }: { totalPrice: number }) {
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
    <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <DollarSign style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>מחשבון מימון</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: themeTokens.colors.slate[400], marginBottom: 4 }}>
            <span>הון עצמי</span>
            <span style={{ color: themeTokens.colors.gold, fontWeight: 500 }}>{equity}% ({formatCurrency(Math.round(totalPrice * equity / 100))})</span>
          </div>
          <RangeInput type="range" min="20" max="100" step="5" value={equity} onChange={(e) => setEquity(Number(e.target.value))} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: themeTokens.colors.slate[400], marginBottom: 4 }}>
            <span>תקופה</span>
            <span style={{ color: themeTokens.colors.slate[300], fontWeight: 500 }}>{years} שנים</span>
          </div>
          <RangeInput type="range" min="5" max="30" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: themeTokens.colors.slate[400], marginBottom: 4 }}>
            <span>ריבית</span>
            <span style={{ color: themeTokens.colors.slate[300], fontWeight: 500 }}>{rate}%</span>
          </div>
          <RangeInput type="range" min="2" max="8" step="0.25" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </div>
        {equity < 100 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>החזר חודשי</div><div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.gold }}>{formatCurrency(monthlyPayment)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>סה״כ ריבית</div><div style={{ fontSize: 12, fontWeight: 700, color: '#FB923C' }}>{formatCurrency(totalInterest)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>סה״כ תשלום</div><div style={{ fontSize: 12, fontWeight: 700, color: themeTokens.colors.slate[300] }}>{formatCurrency(totalPayment)}</div></div>
          </div>
        )}
      </div>
    </SectionWrap>
  )
}

/* ── Main component ────────────────────────────────────────── */

interface FinancialsSectionProps {
  plot: any
  totalPrice: number
  projectedValue: number
  sizeSqM: number
  roi: number
  readinessEstimate: string | undefined
  taxAuthorityValue: number
  allPlots: any[]
  bettermentLevy: string
}

export default function FinancialsSection({
  plot, totalPrice, projectedValue, sizeSqM, roi, readinessEstimate, taxAuthorityValue, allPlots, bettermentLevy,
}: FinancialsSectionProps) {
  return (
    <>
      {/* Tax Authority Value Comparison */}
      {taxAuthorityValue > 0 && (
        <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IconBox $bg="rgba(139,92,246,0.15)" $size={28}><Shield style={{ width: 14, height: 14, color: '#A78BFA' }} /></IconBox>
            <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>שווי רשות המיסים</span>
            {(() => {
              const diffPct = Math.round(((totalPrice - taxAuthorityValue) / taxAuthorityValue) * 100)
              const isBelow = diffPct < 0
              return (
                <span style={{ fontSize: 10, fontWeight: 700, marginRight: 'auto', padding: '2px 8px', borderRadius: 9999, background: isBelow ? 'rgba(16,185,129,0.1)' : diffPct <= 10 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: isBelow ? '#34D399' : diffPct <= 10 ? '#FBBF24' : '#F87171', border: `1px solid ${isBelow ? 'rgba(16,185,129,0.2)' : diffPct <= 10 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                  {isBelow ? `${Math.abs(diffPct)}% מתחת` : `+${diffPct}% מעל`}
                </span>
              )
            })()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: themeTokens.colors.slate[400] }}>מחיר מבוקש</span>
                <span style={{ color: themeTokens.colors.slate[300], fontWeight: 500 }}>{formatCurrency(totalPrice)}</span>
              </div>
              <CompBarTrack>
                <CompBarFill $dir="right" $width={`${Math.min(100, Math.max(10, (totalPrice / Math.max(totalPrice, taxAuthorityValue) * 100)))}%`} $bg={totalPrice <= taxAuthorityValue ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : 'linear-gradient(90deg, #F59E0B, #FB923C)'} />
              </CompBarTrack>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                <span style={{ color: themeTokens.colors.slate[400] }}>🏛️ הערכת רשות המיסים</span>
                <span style={{ color: '#A78BFA', fontWeight: 500 }}>{formatCurrency(taxAuthorityValue)}</span>
              </div>
              <CompBarTrack>
                <CompBarFill $dir="right" $width={`${Math.min(100, Math.max(10, (taxAuthorityValue / Math.max(totalPrice, taxAuthorityValue) * 100)))}%`} $bg="rgba(139,92,246,0.4)" />
              </CompBarTrack>
            </div>
          </div>
          {totalPrice < taxAuthorityValue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <CheckCircle2 style={{ width: 14, height: 14, color: '#34D399', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#34D399', fontWeight: 500 }}>מחיר אטרקטיבי! {formatCurrency(taxAuthorityValue - totalPrice)} מתחת לשומת רשות המיסים</span>
            </div>
          )}
          {totalPrice > taxAuthorityValue * 1.1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: 8, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <AlertTriangle style={{ width: 14, height: 14, color: '#FBBF24', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#FBBF24' }}>המחיר מעל הערכת רשות המיסים — מומלץ לבדוק עם שמאי</span>
            </div>
          )}
          <div style={{ fontSize: 9, color: themeTokens.colors.slate[600], marginTop: 8 }}>היטל השבחה משוער (50% מהשבחה): {bettermentLevy}</div>
        </SectionWrap>
      )}

      {/* Area Price Benchmark */}
      {(() => {
        const sameCityPlots = allPlots.filter((p: any) => p.city === plot.city && p.id !== plot.id)
        const benchmarkPlots = sameCityPlots.length >= 2 ? sameCityPlots : allPlots.filter((p: any) => p.id !== plot.id)
        const areaAvgPerSqm = benchmarkPlots.length > 0
          ? Math.round(benchmarkPlots.reduce((sum: number, p: any) => { const pp = p.total_price ?? p.totalPrice ?? 0; const ps = p.size_sqm ?? p.sizeSqM ?? 1; return sum + pp / ps }, 0) / benchmarkPlots.length)
          : 1500
        const plotPricePerSqm = Math.round(totalPrice / sizeSqM)
        const diffPct = Math.round(((plotPricePerSqm - areaAvgPerSqm) / areaAvgPerSqm) * 100)
        const isBelow = diffPct < 0
        const barPct = Math.min(100, Math.max(5, (plotPricePerSqm / (areaAvgPerSqm * 2)) * 100))
        const avgBarPct = Math.min(100, (areaAvgPerSqm / (areaAvgPerSqm * 2)) * 100)
        return (
          <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <BarChart3 style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>השוואה למחיר אזורי</span>
              <span style={{ fontSize: 12, fontWeight: 700, marginRight: 'auto', color: isBelow ? '#4ADE80' : '#FB923C' }}>{isBelow ? `${Math.abs(diffPct)}% מתחת` : `${diffPct}% מעל`} הממוצע</span>
            </div>
            <div style={{ position: 'relative', height: 12, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', borderRadius: 9999, width: `${barPct}%`, background: isBelow ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : 'linear-gradient(90deg, #F59E0B, #FB923C)', transition: 'all 0.5s' }} />
              <div style={{ position: 'absolute', top: 0, height: '100%', width: 2, background: 'rgba(255,255,255,0.4)', right: `${avgBarPct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>\u20AA{plotPricePerSqm.toLocaleString()}/מ״ר (חלקה זו)</span>
              <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>\u20AA{areaAvgPerSqm.toLocaleString()}/מ״ר (ממוצע)</span>
            </div>
          </SectionWrap>
        )
      })()}

      <PriceTrendChart totalPrice={totalPrice} sizeSqM={sizeSqM} city={plot.city} plotId={plot.id} />

      <Suspense fallback={<SectionSpinner />}>
        <InvestmentScoreBreakdown plot={plot} areaAvgPriceSqm={(() => {
          if (!allPlots || allPlots.length < 2) return undefined
          const sameCityPlots = allPlots.filter((p: any) => p.city === plot.city && p.id !== plot.id)
          const benchPlots = sameCityPlots.length >= 2 ? sameCityPlots : allPlots.filter((p: any) => p.id !== plot.id)
          if (benchPlots.length === 0) return undefined
          let total = 0, count = 0
          for (const p of benchPlots) { const pp = p.total_price ?? p.totalPrice ?? 0; const ps = p.size_sqm ?? p.sizeSqM ?? 0; if (pp > 0 && ps > 0) { total += pp / ps; count++ } }
          return count > 0 ? Math.round(total / count) : undefined
        })()} />
      </Suspense>

      <Suspense fallback={<SectionSpinner />}>
        <InvestmentProjection totalPrice={totalPrice} projectedValue={projectedValue} readinessEstimate={readinessEstimate} zoningStage={plot.zoning_stage ?? plot.zoningStage} />
      </Suspense>

      {/* Alternative Investment Comparison */}
      {(() => {
        const purchaseTaxAlt = Math.round(totalPrice * 0.06)
        const attorneyFeesAlt = Math.round(totalPrice * 0.0175)
        const totalInvestmentAlt = totalPrice + purchaseTaxAlt + attorneyFeesAlt
        const grossProfitAlt = projectedValue - totalPrice
        const bettermentLevyAlt = Math.round(grossProfitAlt * 0.5)
        const costsAlt = purchaseTaxAlt + attorneyFeesAlt
        const taxableAlt = Math.max(0, grossProfitAlt - bettermentLevyAlt - costsAlt)
        const capGainsAlt = Math.round(taxableAlt * 0.25)
        const netProfitAlt = grossProfitAlt - costsAlt - bettermentLevyAlt - capGainsAlt
        const cagrDataAlt = calcCAGR(roi, readinessEstimate)
        const yearsAlt = cagrDataAlt?.years || 5
        const comparison = calcAlternativeReturns(totalInvestmentAlt, netProfitAlt, yearsAlt)
        if (!comparison) return null
        const options = [comparison.land, comparison.stock, comparison.bank]
        const maxProfit = Math.max(...options.map((o: any) => o.profit))
        return (
          <div style={{ background: 'linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.4))', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <IconBox $bg="rgba(200,148,42,0.15)" $size={24}><BarChart3 style={{ width: 14, height: 14, color: themeTokens.colors.gold }} /></IconBox>
              <div>
                <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>השוואת אלטרנטיבות השקעה</span>
                <span style={{ fontSize: 9, color: themeTokens.colors.slate[500], display: 'block' }}>מה אם היית משקיע {formatCurrency(totalInvestmentAlt)} אחרת? ({yearsAlt} שנים)</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt: any, i: number) => {
                const barWidth = maxProfit > 0 ? Math.max(5, (opt.profit / maxProfit) * 100) : 5
                const isWinner = opt.profit === maxProfit && options.filter((o: any) => o.profit === maxProfit).length === 1
                return (
                  <AltBar key={i}>
                    <span style={{ fontSize: 10, width: 70, flexShrink: 0, textAlign: 'right', color: opt.color }}>{opt.emoji} {opt.label}</span>
                    <div style={{ flex: 1, position: 'relative', height: 16, borderRadius: 8, background: 'rgba(255,255,255,0.03)', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', borderRadius: 8, width: `${barWidth}%`, background: `linear-gradient(90deg, ${opt.color}40, ${opt.color}20)`, borderRight: `2px solid ${opt.color}`, transition: 'all 0.7s' }} />
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontSize: 9, fontWeight: 700, color: opt.color }}>{opt.profit >= 0 ? '+' : ''}{formatCurrency(opt.profit)}</span>
                    </div>
                    {isWinner && <span style={{ fontSize: 10, flexShrink: 0 }} title="תשואה הגבוהה ביותר">🏆</span>}
                  </AltBar>
                )
              })}
            </div>
            {comparison.realReturns && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 9, color: themeTokens.colors.slate[500] }}>
                <span>תשואה ריאלית (אחרי אינפלציה {(comparison.inflationRate * 100).toFixed(0)}%):</span>
                <span style={{ color: comparison.land.color }}>{comparison.realReturns.land}%/שנה</span>
                <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ color: comparison.stock.color }}>{comparison.realReturns.stock}%/שנה</span>
                <span style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.1)' }} />
                <span style={{ color: comparison.bank.color }}>{comparison.realReturns.bank}%/שנה</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* Associated Costs */}
      <SectionWrap style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <DollarSign style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>עלויות נלוות משוערות</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <DataRow><DataRowLabel>מס רכישה (6%)</DataRowLabel><DataRowValue>{formatCurrency(Math.round(totalPrice * 0.06))}</DataRowValue></DataRow>
          <DataRow><DataRowLabel>שכ&quot;ט עו&quot;ד (~1.5%+מע&quot;מ)</DataRowLabel><DataRowValue>{formatCurrency(Math.round(totalPrice * 0.0175))}</DataRowValue></DataRow>
          <DataRow><DataRowLabel>היטל השבחה משוער</DataRowLabel><DataRowValue>{bettermentLevy}</DataRowValue></DataRow>
          <ThinDivider />
          <DataRow><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[300] }}>סה&quot;כ עלות כוללת (ללא היטל)</span><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.gold }}>{formatCurrency(Math.round(totalPrice * 1.0775))}</span></DataRow>
        </div>
      </SectionWrap>

      {/* Quick Investment Summary with Sensitivity */}
      {(() => {
        const grossProfit = projectedValue - totalPrice
        const purchaseTax = Math.round(totalPrice * 0.06)
        const attorneyFees = Math.round(totalPrice * 0.0175)
        const bettermentLevyAmount = Math.round(grossProfit * 0.5)
        const totalCosts = purchaseTax + attorneyFees
        const profitAfterBetterment = grossProfit - bettermentLevyAmount
        const taxableProfit = Math.max(0, profitAfterBetterment - totalCosts)
        const capitalGainsTax = Math.round(taxableProfit * 0.25)
        const netProfit = grossProfit - totalCosts - bettermentLevyAmount - capitalGainsTax
        const netRoi = totalPrice > 0 ? Math.round((netProfit / totalPrice) * 100) : 0
        const years = readinessEstimate?.includes('1-3') ? 2 : readinessEstimate?.includes('3-5') ? 4 : readinessEstimate?.includes('5+') ? 7 : 4
        const netCagr = years > 0 && netRoi > 0 ? Math.round((Math.pow(1 + netRoi / 100, 1 / years) - 1) * 100 * 10) / 10 : 0

        return (
          <GoldPanelSm>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <TrendingUp style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>סיכום השקעה מלא</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <DataRow><DataRowLabel>רווח צפוי (ברוטו)</DataRowLabel><DataRowValue $color="#34D399">{formatCurrency(grossProfit)}</DataRowValue></DataRow>
              <DataRow><DataRowLabel>עלויות רכישה</DataRowLabel><DataRowValue $color="rgba(248,113,113,0.7)">-{formatCurrency(totalCosts)}</DataRowValue></DataRow>
              <DataRow><DataRowLabel>היטל השבחה (50%)</DataRowLabel><DataRowValue $color="rgba(248,113,113,0.7)">-{formatCurrency(bettermentLevyAmount)}</DataRowValue></DataRow>
              <DataRow><DataRowLabel>מס שבח (25%)</DataRowLabel><DataRowValue $color="rgba(248,113,113,0.7)">-{formatCurrency(capitalGainsTax)}</DataRowValue></DataRow>
              <ThinDivider />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                <span style={{ color: themeTokens.colors.slate[200] }}>רווח נקי</span>
                <span style={{ color: netProfit >= 0 ? '#34D399' : '#F87171' }}>{formatCurrency(netProfit)}</span>
              </div>
              <DataRow><DataRowLabel>תשואה נטו</DataRowLabel><span style={{ fontSize: 12, fontWeight: 500, color: netRoi >= 0 ? themeTokens.colors.gold : '#F87171' }}>{netRoi}%</span></DataRow>
              {netCagr > 0 && <DataRow><DataRowLabel>CAGR נטו ({years} שנים)</DataRowLabel><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.gold }}>{netCagr}%/שנה</span></DataRow>}
              {readinessEstimate && <DataRow><DataRowLabel>זמן החזר משוער</DataRowLabel><span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.gold }}>{readinessEstimate}</span></DataRow>}
            </div>
            {/* Sensitivity Analysis */}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,148,42,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <AlertTriangle style={{ width: 12, height: 12, color: themeTokens.colors.slate[400] }} />
                <span style={{ fontSize: 10, fontWeight: 500, color: themeTokens.colors.slate[400] }}>ניתוח רגישות</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'אופטימי (+10%)', factor: 1.1, color: '#34D399' },
                  { label: 'בסיס', factor: 1.0, color: themeTokens.colors.gold },
                  { label: 'שמרני (-10%)', factor: 0.9, color: '#FB923C' },
                  { label: 'פסימי (-20%)', factor: 0.8, color: '#F87171' },
                ].map(scenario => {
                  const adjProjected = Math.round(projectedValue * scenario.factor)
                  const adjGross = adjProjected - totalPrice
                  const adjBetterment = Math.round(Math.max(0, adjGross) * 0.5)
                  const adjTaxable = Math.max(0, adjGross - adjBetterment - totalCosts)
                  const adjCapGains = Math.round(adjTaxable * 0.25)
                  const adjNet = adjGross - totalCosts - adjBetterment - adjCapGains
                  const adjNetRoi = totalPrice > 0 ? Math.round((adjNet / totalPrice) * 100) : 0
                  return (
                    <ScenarioRow key={scenario.label}>
                      <span style={{ color: themeTokens.colors.slate[500], width: 96 }}>{scenario.label}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', margin: '0 8px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 9999, transition: 'all 0.3s', width: `${Math.max(3, Math.min(100, (adjNetRoi / (netRoi * 1.3 || 100)) * 100))}%`, background: adjNet >= 0 ? 'linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.6))' : 'linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.6))' }} />
                      </div>
                      <span style={{ width: 80, textAlign: 'left', fontWeight: 500, color: scenario.color }}>{formatCurrency(adjNet)} ({adjNetRoi >= 0 ? '+' : ''}{adjNetRoi}%)</span>
                    </ScenarioRow>
                  )
                })}
              </div>
              <p style={{ fontSize: 8, color: themeTokens.colors.slate[600], marginTop: 6 }}>* הערכות בלבד. מס שבח 25% על רווח לאחר ניכוי עלויות והיטל השבחה.</p>
            </div>
          </GoldPanelSm>
        )
      })()}

      <ProfitWaterfall totalPrice={totalPrice} projectedValue={projectedValue} sizeSqM={sizeSqM} />
      <MiniMortgageCalc totalPrice={totalPrice} />
      <Suspense fallback={<SectionSpinner />}>
        <InvestmentBenchmark totalPrice={totalPrice} projectedValue={projectedValue} readinessEstimate={readinessEstimate} />
      </Suspense>
    </>
  )
}
