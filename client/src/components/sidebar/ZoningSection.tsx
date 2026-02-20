/**
 * ZoningSection - Zoning pipeline stages + investment timeline
 */
import styled, { css } from 'styled-components'
import { MapPin, CheckCircle2, Hourglass, Clock } from 'lucide-react'
import { zoningPipelineStages } from '../../utils/constants'
import { calcInvestmentTimeline } from '../../utils/investment'
import ZoningProgressBar from '../ui/ZoningProgressBar'
import { SectionWrap } from '../ds'
import { theme as themeTokens } from '../../styles/theme'

/* ── Styled ────────────────────────────────────────────────── */

const ZoningStageRow = styled.div<{ $isCurrent?: boolean; $opacity?: number }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  opacity: ${({ $opacity }) => $opacity ?? 1};
  transition: opacity 0.2s;
  ${({ $isCurrent }) => $isCurrent && css`
    background: rgba(200, 148, 42, 0.05);
    margin: 0 -8px;
    padding: 8px;
    border-radius: ${({ theme }) => theme.radii.xl};
  `}
`

const StageDot = styled.div<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  transition: all 0.2s;
  ${({ $status }) => {
    if ($status === 'completed') return css`background: #4ADE80; box-shadow: 0 1px 2px rgba(74, 222, 128, 0.4);`
    if ($status === 'current') return css`background: ${({ theme }) => theme.colors.gold}; box-shadow: 0 1px 2px rgba(200, 148, 42, 0.4); outline: 2px solid rgba(200, 148, 42, 0.2); outline-offset: 1px;`
    return css`background: ${({ theme }) => theme.colors.slate[700]};`
  }}
`

/* ── Component ─────────────────────────────────────────────── */

interface ZoningSectionProps {
  plot: any
  zoningStage: string
  readinessEstimate: string | undefined
  currentStageIndex: number
}

export default function ZoningSection({ plot, zoningStage, readinessEstimate, currentStageIndex }: ZoningSectionProps) {
  return (
    <>
      {readinessEstimate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, background: 'linear-gradient(to right, rgba(200,148,42,0.05), rgba(200,148,42,0.1))', border: '1px solid rgba(200,148,42,0.2)', borderRadius: 12, padding: '10px 16px' }}>
          <Hourglass style={{ width: 16, height: 16, color: themeTokens.colors.gold, flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: themeTokens.colors.slate[300] }}>מוכנות לבנייה:</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.gold }}>{readinessEstimate}</span>
        </div>
      )}

      {zoningStage && (
        <SectionWrap style={{ padding: 16, marginBottom: 16 }}>
          <ZoningProgressBar currentStage={zoningStage} variant="detailed" />
        </SectionWrap>
      )}

      {/* Investment Timeline */}
      {(() => {
        const timeline = calcInvestmentTimeline(plot)
        if (!timeline || timeline.stages.length === 0) return null
        return (
          <SectionWrap style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>ציר זמן השקעה</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {timeline.remainingMonths > 0 && <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>~{timeline.remainingMonths} חודשים נותרו</span>}
                <span style={{ fontSize: 10, fontWeight: 700, color: themeTokens.colors.gold }}>{timeline.progressPct}%</span>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ height: 8, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 9999, transition: 'all 0.7s', width: `${Math.max(3, timeline.progressPct)}%`, background: timeline.progressPct >= 75 ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : timeline.progressPct >= 40 ? 'linear-gradient(90deg, #C8942A, #E5B94E)' : 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                {timeline.stages.map((stage: any, i: number) => (
                  <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: `${100 / timeline.stages.length}%` }} title={`${stage.label}${stage.status === 'completed' ? ' \u2713' : stage.status === 'current' ? ' (נוכחי)' : ''}`}>
                    <StageDot $status={stage.status} />
                    {(i === 0 || stage.status === 'current' || i === timeline.stages.length - 1) && (
                      <span style={{ fontSize: 7, marginTop: 4, textAlign: 'center', lineHeight: 1.2, color: stage.status === 'current' ? themeTokens.colors.gold : themeTokens.colors.slate[600], fontWeight: stage.status === 'current' ? 700 : 400 }}>{stage.icon}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {timeline.estimatedYear && timeline.remainingMonths > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 9, color: themeTokens.colors.slate[500] }}>סיום משוער</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: themeTokens.colors.gold }}>{timeline.estimatedYear}</span>
              </div>
            )}
          </SectionWrap>
        )
      })()}

      {/* Pipeline stages */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
        {zoningPipelineStages.map((stage: any, i: number) => {
          const isCompleted = i < currentStageIndex
          const isCurrent = i === currentStageIndex
          const isFuture = i > currentStageIndex
          return (
            <ZoningStageRow key={stage.key} $isCurrent={isCurrent} $opacity={isFuture ? 0.5 : 1}>
              <span style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>{stage.icon}</span>
              <span style={{ fontSize: 14, color: isCompleted ? '#4ADE80' : isCurrent ? themeTokens.colors.gold : themeTokens.colors.slate[500], fontWeight: isCurrent ? 700 : 400 }}>{stage.label}</span>
              {isCompleted && <CheckCircle2 style={{ width: 14, height: 14, color: '#4ADE80', marginRight: 'auto' }} />}
              {isCurrent && <span style={{ marginRight: 'auto', fontSize: 10, color: themeTokens.colors.gold, background: 'rgba(200,148,42,0.1)', padding: '2px 8px', borderRadius: 9999 }}>נוכחי</span>}
            </ZoningStageRow>
          )
        })}
      </div>
    </>
  )
}
