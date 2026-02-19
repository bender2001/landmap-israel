import styled from 'styled-components'
import type { LucideIcon } from 'lucide-react'
import { Waves, TreePine, Hospital, Bus, Train, GraduationCap, ShoppingBag } from 'lucide-react'
import { calcRiskLevel } from '../../utils/investment'
import { theme } from '../../styles/theme'

type Plot = Record<string, unknown> & {
  distance_to_sea?: number
  distanceToSea?: number
  distance_to_park?: number
  distanceToPark?: number
  distance_to_hospital?: number
  distanceToHospital?: number
  distance_to_bus?: number
  distanceToBus?: number
  distance_to_train?: number
  distanceToTrain?: number
  distance_to_school?: number
  distanceToSchool?: number
  distance_to_shopping?: number
  distanceToShopping?: number
}

interface LocationScoreProps {
  plot: Plot
  allPlots?: Plot[]
}

type Risk = {
  color: string
  emoji: string
  label: string
  level: number
  factors: string[]
}

type ProximityBarProps = {
  icon: LucideIcon
  label: string
  distance?: number | null
  maxKm?: number
  color: string
  qualityType?: keyof typeof QUALITY_THRESHOLDS
}

const QUALITY_THRESHOLDS = {
  default: { excellent: 1, good: 3, fair: 6 },
  bus: { excellent: 0.3, good: 0.8, fair: 1.5 },
  train: { excellent: 1, good: 3, fair: 7 },
  park: { excellent: 0.5, good: 1, fair: 3 },
  hospital: { excellent: 2, good: 5, fair: 10 },
  school: { excellent: 0.5, good: 1.5, fair: 3 },
  shopping: { excellent: 0.5, good: 1.5, fair: 4 },
  sea: { excellent: 1, good: 3, fair: 6 },
}

const SCORE_CONFIG = [
  { field: 'sea', weight: 1.2, thresholds: [1, 3, 6] },
  { field: 'park', weight: 0.8, thresholds: [0.5, 1, 3] },
  { field: 'hospital', weight: 0.7, thresholds: [2, 5, 10] },
  { field: 'bus', weight: 1.0, thresholds: [0.3, 0.8, 1.5] },
  { field: 'train', weight: 1.1, thresholds: [1, 3, 7] },
  { field: 'school', weight: 0.6, thresholds: [0.5, 1.5, 3] },
  { field: 'shopping', weight: 0.5, thresholds: [0.5, 1.5, 4] },
]

const CATEGORIES = [
  { id: 'nature', label: 'טבע וסביבה', emoji: '🌿', fields: ['sea', 'park'] },
  { id: 'services', label: 'שירותים', emoji: '🏥', fields: ['hospital', 'school', 'shopping'] },
  { id: 'transport', label: 'תחבורה', emoji: '🚌', fields: ['bus', 'train'] },
] as const

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ScoreHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
`

const ScoreBadge = styled.div<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: ${theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 18px;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}18`};
  border: 1px solid ${({ $color }) => `${$color}30`};
`

const ScoreText = styled.div`
  flex: 1;
`

const ScoreTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${theme.colors.slate[200]};
`

const ScoreSubtitle = styled.div`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const CategoryRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
`

const CategoryBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: ${theme.radii.md};
  background: ${({ $color }) => `${$color}08`};
  border: 1px solid ${({ $color }) => `${$color}18`};
`

const CategoryLabel = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[400]};
`

const CategoryScore = styled.span<{ $color: string }>`
  font-size: 10px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const ProximityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const IconBox = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: ${theme.radii.md};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: ${({ $color }) => `${$color}18`};
`

const ProximityText = styled.div`
  flex: 1;
  min-width: 0;
`

const ProximityHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`

const ProximityLabel = styled.span`
  font-size: 10px;
  color: ${theme.colors.slate[400]};
`

const ProximityMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const ProximityDistance = styled.span`
  font-size: 10px;
  color: ${theme.colors.slate[500]};
`

const ProximityQuality = styled.span<{ $color: string }>`
  font-size: 8px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}15`};
`

const ProximityTrack = styled.div`
  height: 6px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const ProximityFill = styled.div`
  height: 100%;
  border-radius: ${theme.radii.full};
  transition: ${theme.transitions.smooth};
`

const RiskCard = styled.div<{ $color: string }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: ${theme.radii.lg};
  border: 1px solid ${({ $color }) => `${$color}20`};
  background: ${({ $color }) => `${$color}08`};
`

const RiskTitle = styled.div<{ $color: string }>`
  font-size: 11px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`

const RiskDots = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

const RiskDot = styled.span<{ $active: boolean; $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: ${({ $active, $color }) => ($active ? $color : 'rgba(255,255,255,0.08)')};
`

const RiskTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`

const RiskTag = styled.span`
  font-size: 9px;
  color: ${theme.colors.slate[500]};
  background: rgba(255, 255, 255, 0.03);
  padding: 2px 6px;
  border-radius: 6px;
`

const getQuality = (distance: number, type: keyof typeof QUALITY_THRESHOLDS = 'default') => {
  const t = QUALITY_THRESHOLDS[type] || QUALITY_THRESHOLDS.default
  if (distance <= t.excellent) return 'מעולה'
  if (distance <= t.good) return 'טוב'
  if (distance <= t.fair) return 'סביר'
  return 'רחוק'
}

const ProximityBar = ({
  icon: Icon,
  label,
  distance,
  maxKm = 10,
  color,
  qualityType = 'default',
}: ProximityBarProps) => {
  if (distance == null) return null
  const pct = Math.max(5, Math.min(100, (1 - distance / maxKm) * 100))
  const displayDist = distance < 1 ? `${Math.round(distance * 1000)}מ׳` : `${distance.toFixed(1)} ק״מ`
  const quality = getQuality(distance, qualityType)

  return (
    <ProximityRow>
      <IconBox $color={color}>
        <Icon size={14} color={color} />
      </IconBox>
      <ProximityText>
        <ProximityHeader>
          <ProximityLabel>{label}</ProximityLabel>
          <ProximityMeta>
            <ProximityDistance>{displayDist}</ProximityDistance>
            <ProximityQuality $color={color}>{quality}</ProximityQuality>
          </ProximityMeta>
        </ProximityHeader>
        <ProximityTrack>
          <ProximityFill
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}60, ${color})`,
            }}
          />
        </ProximityTrack>
      </ProximityText>
    </ProximityRow>
  )
}

const RiskBadge = ({ plot, allPlots }: { plot: Plot; allPlots?: Plot[] }) => {
  const risk = calcRiskLevel(plot, allPlots) as Risk | null
  if (!risk) return null

  return (
    <RiskCard $color={risk.color}>
      <span style={{ fontSize: 16, marginTop: 2 }}>{risk.emoji}</span>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RiskTitle $color={risk.color}>{risk.label}</RiskTitle>
          <RiskDots>
            {[1, 2, 3, 4, 5].map(i => (
              <RiskDot key={i} $active={i <= risk.level} $color={risk.color} />
            ))}
          </RiskDots>
        </div>
        {risk.factors.length > 0 && (
          <RiskTags>
            {risk.factors.map((factor, i) => (
              <RiskTag key={i}>{factor}</RiskTag>
            ))}
          </RiskTags>
        )}
      </div>
    </RiskCard>
  )
}

const calcProximityScore = (distance: number | undefined, thresholds: number[]) => {
  if (distance == null) return null
  if (distance <= thresholds[0]) return 10
  if (distance <= thresholds[1]) return 7
  if (distance <= thresholds[2]) return 4
  return 2
}

export default function LocationScore({ plot, allPlots }: LocationScoreProps) {
  const distanceToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distanceToPark = plot.distance_to_park ?? plot.distanceToPark
  const distanceToHospital = plot.distance_to_hospital ?? plot.distanceToHospital
  const distanceToBus = plot.distance_to_bus ?? plot.distanceToBus
  const distanceToTrain = plot.distance_to_train ?? plot.distanceToTrain
  const distanceToSchool = plot.distance_to_school ?? plot.distanceToSchool
  const distanceToShopping = plot.distance_to_shopping ?? plot.distanceToShopping

  const distances = {
    sea: distanceToSea,
    park: distanceToPark,
    hospital: distanceToHospital,
    bus: distanceToBus,
    train: distanceToTrain,
    school: distanceToSchool,
    shopping: distanceToShopping,
  }

  const hasData = Object.values(distances).some(distance => distance != null)

  let locationScore: number | null = null
  const categoryScores: Record<string, number> = {}

  if (hasData) {
    let totalScore = 0
    let totalWeight = 0

    for (const cfg of SCORE_CONFIG) {
      const dist = distances[cfg.field as keyof typeof distances]
      const score = calcProximityScore(dist, cfg.thresholds)
      if (score != null) {
        totalScore += score * cfg.weight
        totalWeight += cfg.weight
      }
    }

    locationScore = totalWeight > 0 ? Math.max(1, Math.min(10, Math.round(totalScore / totalWeight))) : null

    for (const cat of CATEGORIES) {
      let catTotal = 0
      let catWeight = 0
      for (const field of cat.fields) {
        const cfg = SCORE_CONFIG.find(c => c.field === field)
        if (!cfg) continue
        const score = calcProximityScore(distances[field as keyof typeof distances], cfg.thresholds)
        if (score != null) {
          catTotal += score * cfg.weight
          catWeight += cfg.weight
        }
      }
      if (catWeight > 0) {
        categoryScores[cat.id] = Math.max(1, Math.min(10, Math.round(catTotal / catWeight)))
      }
    }
  }

  if (!hasData && !allPlots) return null

  const scoreColor =
    locationScore != null && locationScore >= 8
      ? theme.colors.emerald
      : locationScore != null && locationScore >= 6
        ? '#84CC16'
        : locationScore != null && locationScore >= 4
          ? theme.colors.amber
          : theme.colors.red
  const scoreLabel =
    locationScore != null && locationScore >= 8
      ? 'מיקום מעולה'
      : locationScore != null && locationScore >= 6
        ? 'מיקום טוב'
        : locationScore != null && locationScore >= 4
          ? 'מיקום סביר'
          : 'מיקום מרוחק'

  const hasCategoryScores = Object.keys(categoryScores).length > 1

  return (
    <Wrapper>
      {locationScore && (
        <ScoreHeader>
          <ScoreBadge $color={scoreColor}>{locationScore}</ScoreBadge>
          <ScoreText>
            <ScoreTitle>{scoreLabel}</ScoreTitle>
            <ScoreSubtitle>ציון מיקום ונגישות (1-10)</ScoreSubtitle>
          </ScoreText>
        </ScoreHeader>
      )}

      {hasCategoryScores && (
        <CategoryRow>
          {CATEGORIES.map(cat => {
            const score = categoryScores[cat.id]
            if (score == null) return null
            const catColor =
              score >= 8 ? theme.colors.emerald : score >= 6 ? '#84CC16' : score >= 4 ? theme.colors.amber : theme.colors.red
            return (
              <CategoryBadge key={cat.id} $color={catColor} title={`${cat.label}: ${score}/10`}>
                <span style={{ fontSize: 10 }}>{cat.emoji}</span>
                <CategoryLabel>{cat.label}</CategoryLabel>
                <CategoryScore $color={catColor}>{score}</CategoryScore>
              </CategoryBadge>
            )
          })}
        </CategoryRow>
      )}

      <Bars>
        <ProximityBar icon={Waves} label="מרחק לים" distance={distanceToSea} maxKm={8} color={theme.colors.blue} qualityType="sea" />
        <ProximityBar icon={TreePine} label="מרחק לפארק" distance={distanceToPark} maxKm={5} color={theme.colors.emerald} qualityType="park" />
        <ProximityBar icon={Bus} label="תחנת אוטובוס" distance={distanceToBus} maxKm={3} color={theme.colors.purple} qualityType="bus" />
        <ProximityBar icon={Train} label="תחנת רכבת" distance={distanceToTrain} maxKm={10} color={theme.colors.cyan} qualityType="train" />
        <ProximityBar icon={Hospital} label="מרחק לביה״ח" distance={distanceToHospital} maxKm={15} color={theme.colors.red} qualityType="hospital" />
        <ProximityBar icon={GraduationCap} label="מוסד חינוך" distance={distanceToSchool} maxKm={5} color={theme.colors.amber} qualityType="school" />
        <ProximityBar icon={ShoppingBag} label="מרכז מסחרי" distance={distanceToShopping} maxKm={6} color="#EC4899" qualityType="shopping" />
      </Bars>

      <RiskBadge plot={plot} allPlots={allPlots} />
    </Wrapper>
  )
}
