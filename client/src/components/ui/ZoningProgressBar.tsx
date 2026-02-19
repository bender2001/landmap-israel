import { useMemo, memo } from 'react'
import styled from 'styled-components'
import { zoningPipelineStages } from '../../utils/constants'
import { theme } from '../../styles/theme'

const CompactWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const Segments = styled.div`
  display: flex;
  gap: 2px;
  flex: 1;
  min-width: 48px;
  max-width: 72px;
`

const Segment = styled.div<{ $bg: string; $glow: boolean }>`
  height: 4px;
  flex: 1;
  border-radius: ${theme.radii.full};
  background: ${({ $bg }) => $bg};
  box-shadow: ${({ $glow }) => ($glow ? '0 0 4px rgba(200,148,42,0.4)' : 'none')};
  transition: background ${theme.transitions.normal};
`

const CompactLabel = styled.span`
  font-size: 8px;
  color: ${theme.colors.slate[500]};
  white-space: nowrap;
`

const DetailWrap = styled.div`
  direction: rtl;
`

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`

const Current = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const CurrentLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${theme.colors.slate[200]};
`

const StagePill = styled.span`
  font-size: 10px;
  color: ${theme.colors.gold};
  background: ${theme.colors.gold}1a;
  padding: 2px 8px;
  border-radius: ${theme.radii.md};
  border: 1px solid ${theme.colors.gold}33;
`

const DetailSegments = styled.div`
  display: flex;
  gap: 3px;
  margin-bottom: 8px;
`

const DetailSegment = styled.div<{ $bg: string; $glow: boolean }>`
  flex: 1;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: ${({ $bg }) => $bg};
  box-shadow: ${({ $glow }) => ($glow ? '0 0 6px rgba(200,148,42,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none')};
  transition: background ${theme.transitions.smooth};
`

const Next = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const Done = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: ${theme.colors.emerald};
`

interface ZoningProgressBarProps {
  currentStage?: string
  variant?: 'compact' | 'detailed'
  className?: string
}

const ZoningProgressBar = memo(function ZoningProgressBar({ currentStage, variant = 'compact', className }: ZoningProgressBarProps) {
  const stageIndex = useMemo(() => {
    if (!currentStage) return -1
    return zoningPipelineStages.findIndex(s => s.key === currentStage)
  }, [currentStage])

  if (stageIndex < 0) return null

  const totalStages = zoningPipelineStages.length
  const currentLabel = zoningPipelineStages[stageIndex]?.label || ''
  const currentIcon = zoningPipelineStages[stageIndex]?.icon || ''
  const nextStage = stageIndex < totalStages - 1 ? zoningPipelineStages[stageIndex + 1] : null

  if (variant === 'compact') {
    return (
      <CompactWrap className={className} title={`שלב נוכחי: ${currentLabel} (${stageIndex + 1}/${totalStages}) ${nextStage ? `→ הבא: ${nextStage.label}` : '— שלב סופי!'}`}>
        <Segments>
          {zoningPipelineStages.map((stage, i) => (
            <Segment
              key={stage.key}
              $bg={i <= stageIndex ? (i === stageIndex ? theme.colors.gold : theme.colors.emerald) : 'rgba(255,255,255,0.06)'}
              $glow={i === stageIndex}
            />
          ))}
        </Segments>
        <CompactLabel>{stageIndex + 1}/{totalStages}</CompactLabel>
      </CompactWrap>
    )
  }

  return (
    <DetailWrap className={className}>
      <DetailHeader>
        <Current>
          <span>{currentIcon}</span>
          <CurrentLabel>{currentLabel}</CurrentLabel>
        </Current>
        <StagePill>שלב {stageIndex + 1} מתוך {totalStages}</StagePill>
      </DetailHeader>

      <DetailSegments>
        {zoningPipelineStages.map((stage, i) => (
          <DetailSegment
            key={stage.key}
            $bg={i <= stageIndex ? (i === stageIndex ? `linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright})` : theme.colors.emerald) : 'rgba(255,255,255,0.06)'}
            $glow={i === stageIndex}
          />
        ))}
      </DetailSegments>

      {nextStage ? (
        <Next>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: `${theme.colors.gold}66` }} />
          <span>שלב הבא:</span>
          <span>{nextStage.icon} {nextStage.label}</span>
        </Next>
      ) : (
        <Done>
          <span>✅</span>
          <span>הושלם — קרקע מוכנה לבנייה!</span>
        </Done>
      )}
    </DetailWrap>
  )
})

export default ZoningProgressBar
