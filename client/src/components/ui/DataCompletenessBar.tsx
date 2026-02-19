import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import styled from 'styled-components'
import { theme } from '../../styles/theme'

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const MicroDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`

const MicroText = styled.span<{ $color: string }>`
  font-size: 8px;
  color: ${({ $color }) => $color};
  font-variant-numeric: tabular-nums;
`

const Label = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`

const Track = styled.div`
  position: relative;
  width: 64px;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const Fill = styled.div<{ $width: number; $color: string }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $width }) => `${$width}%`};
  border-radius: ${theme.radii.full};
  background: ${({ $color }) => $color};
  transition: width ${theme.transitions.smooth};
`

const Score = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  font-variant-numeric: tabular-nums;
`

const Panel = styled.div<{ $bg: string; $border: string }>`
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $border }) => $border};
  border-radius: ${theme.radii.lg};
  padding: 12px;
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const PanelTitle = styled.span<{ $color: string }>`
  font-size: 12px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const PanelPct = styled.span<{ $color: string }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ $color }) => $color};
  font-variant-numeric: tabular-nums;
`

const FullTrack = styled.div`
  position: relative;
  width: 100%;
  height: 8px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
  margin-bottom: 8px;
`

const MissingList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`

const Missing = styled.span`
  font-size: 8px;
  color: ${theme.colors.slate[500]};
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: ${theme.radii.sm};
`

interface PlotShape {
  coordinates?: Array<unknown>
  total_price?: number
  totalPrice?: number
  projected_value?: number
  projectedValue?: number
  city?: string
  block_number?: string | number
  blockNumber?: string | number
  number?: string | number
  description?: string
  zoning_stage?: string
  zoningStage?: string
  readiness_estimate?: string
  readinessEstimate?: string
  plot_images?: Array<unknown>
  market_data?: unknown
  enrichment_data?: unknown
  size_sqm?: number
  sizeSqM?: number
}

interface DataCompletenessBarProps {
  plot?: PlotShape | null
  variant?: 'micro' | 'compact' | 'full'
  className?: string
}

export default function DataCompletenessBar({ plot, variant = 'compact', className }: DataCompletenessBarProps) {
  const { score, total, pct, level, missing } = useMemo(() => {
    if (!plot) return { score: 0, total: 10, pct: 0, level: 'low', missing: [] as string[] }

    const checks = [
      { label: 'מיקום מדויק', pass: Array.isArray(plot.coordinates) && plot.coordinates.length >= 3 },
      { label: 'מחיר', pass: (plot.total_price ?? plot.totalPrice ?? 0) > 0 },
      { label: 'שווי צפוי', pass: (plot.projected_value ?? plot.projectedValue ?? 0) > 0 },
      { label: 'עיר', pass: !!plot.city },
      { label: 'גוש/חלקה', pass: !!(plot.block_number ?? plot.blockNumber) && !!plot.number },
      { label: 'תיאור', pass: !!plot.description && plot.description.length > 10 },
      { label: 'שלב תכנוני', pass: !!(plot.zoning_stage ?? plot.zoningStage) && (plot.zoning_stage ?? plot.zoningStage) !== 'UNKNOWN' },
      { label: 'הערכת מוכנות', pass: !!(plot.readiness_estimate ?? plot.readinessEstimate) },
      { label: 'תמונות', pass: Array.isArray(plot.plot_images) && plot.plot_images.length > 0 },
      { label: 'נתוני שוק', pass: !!(plot.market_data || plot.enrichment_data) },
    ]

    const passed = checks.filter(c => c.pass).length
    const percentage = Math.round((passed / checks.length) * 100)
    const missingItems = checks.filter(c => !c.pass).map(c => c.label)

    let lvl: 'low' | 'fair' | 'medium' | 'high' = 'low'
    if (percentage >= 80) lvl = 'high'
    else if (percentage >= 60) lvl = 'medium'
    else if (percentage >= 40) lvl = 'fair'

    return { score: passed, total: checks.length, pct: percentage, level: lvl, missing: missingItems }
  }, [plot])

  const levelConfig = {
    high: { color: theme.colors.emerald, label: 'מלא', icon: CheckCircle2 },
    medium: { color: theme.colors.amber, label: 'טוב', icon: Info },
    fair: { color: theme.colors.orange, label: 'חלקי', icon: AlertTriangle },
    low: { color: theme.colors.red, label: 'בסיסי', icon: AlertTriangle },
  }

  const config = levelConfig[level as keyof typeof levelConfig]
  const Icon = config.icon

  if (variant === 'micro') {
    return (
      <Row className={className} title={`שלמות נתונים: ${pct}% (${score}/${total})${missing.length > 0 ? ` · חסר: ${missing.join(', ')}` : ''}`}>
        <MicroDot $color={config.color} />
        <MicroText $color={config.color}>{pct}%</MicroText>
      </Row>
    )
  }

  if (variant === 'compact') {
    return (
      <Row className={className} title={missing.length > 0 ? `חסר: ${missing.join(', ')}` : 'כל הנתונים זמינים'}>
        <Row>
          <Icon size={12} color={config.color} />
          <Label $color={config.color}>{config.label}</Label>
        </Row>
        <Track>
          <Fill $width={pct} $color={config.color} />
        </Track>
        <Score>{score}/{total}</Score>
      </Row>
    )
  }

  return (
    <Panel className={className} $bg={`${config.color}1a`} $border={`${config.color}33`}>
      <PanelHeader>
        <Row>
          <Icon size={16} color={config.color} />
          <PanelTitle $color={config.color}>שלמות נתונים: {config.label}</PanelTitle>
        </Row>
        <PanelPct $color={config.color}>{pct}%</PanelPct>
      </PanelHeader>
      <FullTrack>
        <Fill $width={pct} $color={config.color} />
      </FullTrack>
      {missing.length > 0 && missing.length <= 4 && (
        <MissingList>
          {missing.map(item => (
            <Missing key={item}>{item}</Missing>
          ))}
        </MissingList>
      )}
    </Panel>
  )
}
