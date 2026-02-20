/**
 * MetricsGrid - Top metric cards (price, projected, ROI) + CAGR + buildable value
 */
import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import styled from 'styled-components'
import { TrendingUp, Building2 } from 'lucide-react'
import { MetricCard, MetricAccent, MetricLabel, MetricValue, MetricSub, IconBox } from '../ds'
import { SectionWrap } from '../ds'
import { formatCurrency } from '../../utils/format'
import { calcCAGR, calcBuildableValue } from '../../utils/investment'
import { theme as themeTokens } from '../../styles/theme'
import { Grid3, Grid2Gap2, BuildableCell } from './shared'

/* ── AnimatedNumber (inlined) ──────────────────────────────── */

const AN_Value = styled.span`
  font-family: ${themeTokens.fonts.primary};
  font-variant-numeric: tabular-nums;
`

interface AnimatedNumberProps {
  value: number
  formatter?: (v: number) => ReactNode
  duration?: number
  className?: string
}

export function AnimatedNumber({ value, formatter, duration = 800, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    prevRef.current = value
    if (from === to) return
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [value, duration])

  return <AN_Value className={className}>{formatter ? formatter(display) : display}</AN_Value>
}

/* ── Component ─────────────────────────────────────────────── */

interface MetricsGridProps {
  totalPrice: number
  projectedValue: number
  roi: number
  pricePerDunam: string
  readinessEstimate: string | undefined
  plot: any
}

export default function MetricsGrid({ totalPrice, projectedValue, roi, pricePerDunam, readinessEstimate, plot }: MetricsGridProps) {
  return (
    <>
      <Grid3>
        <MetricCard $accentFrom="#3B82F6" $accentTo="#2563EB" $borderColor="#3B82F6">
          <MetricAccent $from="#60A5FA" $to="#2563EB" />
          <MetricLabel>מחיר מבוקש</MetricLabel>
          <MetricValue $color="#60A5FA"><AnimatedNumber value={totalPrice} formatter={formatCurrency} /></MetricValue>
          <MetricSub>{pricePerDunam} / דונם</MetricSub>
        </MetricCard>
        <MetricCard $accentFrom="#10B981" $accentTo="#059669" $borderColor="#10B981">
          <MetricAccent $from="#34D399" $to="#059669" />
          <MetricLabel>שווי צפוי</MetricLabel>
          <MetricValue $color="#6EE7A0"><AnimatedNumber value={projectedValue} formatter={formatCurrency} /></MetricValue>
          <MetricSub>בסיום תהליך</MetricSub>
        </MetricCard>
        <MetricCard $accentFrom="#C8942A" $accentTo="#E5B94E" $borderColor="#C8942A">
          <MetricAccent $from={themeTokens.colors.gold} $to={themeTokens.colors.goldBright} />
          <MetricLabel>תשואה צפויה</MetricLabel>
          <MetricValue $color="#E5B94E"><AnimatedNumber value={roi} />%</MetricValue>
          <MetricSub>ROI</MetricSub>
        </MetricCard>
      </Grid3>

      {/* CAGR */}
      {(() => {
        const cagrData = calcCAGR(roi, readinessEstimate)
        if (!cagrData) return null
        const { cagr, years } = cagrData
        const cagrColor = cagr >= 20 ? '#22C55E' : cagr >= 12 ? '#84CC16' : cagr >= 6 ? '#EAB308' : '#EF4444'
        return (
          <SectionWrap style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBox $bg={`${cagrColor}15`} $size={28}><TrendingUp style={{ width: 14, height: 14, color: cagrColor }} /></IconBox>
              <div>
                <div style={{ fontSize: 12, color: themeTokens.colors.slate[300] }}>תשואה שנתית (CAGR)</div>
                <div style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>על בסיס {years} שנות החזקה</div>
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: cagrColor }}>{cagr}%</div>
          </SectionWrap>
        )
      })()}

      {/* Buildable Value Analysis */}
      {(() => {
        const buildable = calcBuildableValue(plot)
        if (!buildable) return null
        return (
          <div style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <IconBox $bg="rgba(139,92,246,0.15)" $size={24}><Building2 style={{ width: 14, height: 14, color: '#A78BFA' }} /></IconBox>
              <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>ניתוח שווי בנייה</span>
              <span style={{ fontSize: 9, color: 'rgba(167,139,250,0.6)', background: 'rgba(139,92,246,0.1)', padding: '2px 6px', borderRadius: 4, marginRight: 'auto' }}>PRO</span>
            </div>
            <Grid2Gap2>
              <BuildableCell><div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>מחיר/מ״ר בנוי</div><div style={{ fontSize: 14, fontWeight: 700, color: '#A78BFA' }}>{formatCurrency(buildable.pricePerBuildableSqm)}</div></BuildableCell>
              <BuildableCell><div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>מחיר ליח׳ דיור</div><div style={{ fontSize: 14, fontWeight: 700, color: '#818CF8' }}>{formatCurrency(buildable.pricePerUnit)}</div></BuildableCell>
              <BuildableCell><div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>יח׳ דיור משוערות</div><div style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.slate[300] }}>{buildable.estimatedUnits}</div></BuildableCell>
              <BuildableCell><div style={{ fontSize: 9, color: themeTokens.colors.slate[500], marginBottom: 2 }}>שטח בנוי כולל</div><div style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.slate[300] }}>{buildable.totalBuildableArea.toLocaleString()} מ״ר</div></BuildableCell>
            </Grid2Gap2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 9, color: themeTokens.colors.slate[500] }}>
              <span>יחס ניצול: x{buildable.efficiencyRatio}</span>
              <span style={{ color: themeTokens.colors.slate[700] }}>&#183;</span>
              <span>על בסיס {buildable.density} יח״ד/דונם, 100 מ״ר ליח׳</span>
            </div>
          </div>
        )
      })()}
    </>
  )
}
