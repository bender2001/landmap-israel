import { useMemo } from 'react'
import styled from 'styled-components'
import { calcInvestmentScoreBreakdown, generateInvestmentNarrative } from '../../utils/investment'
import { theme } from '../../styles/theme'

type Plot = Record<string, unknown> & { city?: string }

interface InvestmentScoreBreakdownProps {
  plot: Plot
  areaAvgPriceSqm?: number
  compact?: boolean
}

type Grade = {
  grade: string
  color: string
}

type Factor = {
  key: string
  label: string
  score: number
  color: string
  points: number
  maxPoints: number
  emoji: string
  explanation: string
}

type Breakdown = {
  total: number
  grade: Grade
  factors: Factor[]
}

const CompactRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const CompactGrade = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 14px;
  border: 2px solid ${({ $color }) => `${$color}40`};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
  flex-shrink: 0;
`

const CompactBars = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const CompactBarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const CompactLabel = styled.span`
  font-size: 8px;
  color: ${theme.colors.slate[500]};
  width: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CompactTrack = styled.div`
  flex: 1;
  height: 4px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const CompactFill = styled.div`
  height: 100%;
  border-radius: ${theme.radii.full};
  transition: ${theme.transitions.smooth};
`

const Card = styled.div`
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.lg};
  padding: 16px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const GradeBadge = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  border: 2px solid ${({ $color }) => `${$color}40`};
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
  box-shadow: 0 4px 12px ${({ $color }) => `${$color}20`};
`

const ScoreTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const ScoreSubtitle = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const Factors = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
`

const FactorItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  &:hover p {
    opacity: 1;
  }
`

const FactorHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const FactorLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${theme.colors.slate[300]};
  font-weight: 500;
`

const FactorPoints = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const FactorTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const FactorFill = styled.div`
  position: absolute;
  inset-block: 0;
  right: 0;
  border-radius: ${theme.radii.full};
  transition: ${theme.transitions.smooth};
`

const FactorExplanation = styled.p`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  line-height: 1.5;
  opacity: 0.7;
  transition: ${theme.transitions.normal};
`

const Narrative = styled.div`
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
`

const NarrativeTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 10px;
  font-weight: 700;
  color: rgba(200, 148, 42, 0.8);
`

const NarrativeText = styled.p`
  font-size: 10px;
  color: ${theme.colors.slate[400]};
  line-height: 1.6;
`

export default function InvestmentScoreBreakdown({
  plot,
  areaAvgPriceSqm,
  compact = false,
}: InvestmentScoreBreakdownProps) {
  const breakdown = useMemo(
    () => calcInvestmentScoreBreakdown(plot, { areaAvgPriceSqm }) as Breakdown | null,
    [plot, areaAvgPriceSqm]
  )

  const narrative = useMemo(
    () => generateInvestmentNarrative(plot, { areaAvgPriceSqm, cityName: plot?.city }) as string | null,
    [plot, areaAvgPriceSqm]
  )

  if (!breakdown) return null

  const { total, grade, factors } = breakdown

  if (compact) {
    return (
      <CompactRow>
        <CompactGrade $color={grade.color}>{grade.grade}</CompactGrade>
        <CompactBars>
          {factors.slice(0, 3).map(f => (
            <CompactBarRow key={f.key}>
              <CompactLabel>{f.label}</CompactLabel>
              <CompactTrack>
                <CompactFill
                  style={{
                    width: `${Math.round(f.score * 100)}%`,
                    backgroundColor: f.color,
                  }}
                />
              </CompactTrack>
            </CompactBarRow>
          ))}
        </CompactBars>
      </CompactRow>
    )
  }

  return (
    <Card dir="rtl">
      <Header>
        <HeaderLeft>
          <GradeBadge $color={grade.color}>{grade.grade}</GradeBadge>
          <div>
            <ScoreTitle>ציון השקעה: {total}/10</ScoreTitle>
            <ScoreSubtitle>על בסיס {factors.length} פרמטרים</ScoreSubtitle>
          </div>
        </HeaderLeft>
      </Header>

      <Factors>
        {factors.map(f => (
          <FactorItem key={f.key}>
            <FactorHeader>
              <FactorLabel>
                <span>{f.emoji}</span>
                <span>{f.label}</span>
              </FactorLabel>
              <FactorPoints $color={f.color}>
                {f.points}/{f.maxPoints}
              </FactorPoints>
            </FactorHeader>
            <FactorTrack>
              <FactorFill
                style={{
                  width: `${Math.round(f.score * 100)}%`,
                  backgroundColor: f.color,
                  opacity: 0.8,
                }}
              />
            </FactorTrack>
            <FactorExplanation>{f.explanation}</FactorExplanation>
          </FactorItem>
        ))}
      </Factors>

      {narrative && (
        <Narrative>
          <NarrativeTitle>
            <span>📝</span>
            <span>סיכום השקעה</span>
          </NarrativeTitle>
          <NarrativeText>{narrative}</NarrativeText>
        </Narrative>
      )}
    </Card>
  )
}
