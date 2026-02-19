import styled from 'styled-components'
import { theme } from '../../styles/theme'

interface NeighborhoodRadarProps {
  distanceToSea?: number | null
  distanceToPark?: number | null
  distanceToHospital?: number | null
  roi?: number
  investmentScore?: number
  className?: string
}

type Dimension = {
  label: string
  score: number
}

const Card = styled.div`
  background: rgba(22, 42, 74, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${theme.radii.xxl};
  padding: 20px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`

const Title = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${theme.colors.slate[100]};
`

const ScoreValue = styled.span<{ $tone: 'good' | 'mid' | 'low' }>`
  font-size: 18px;
  font-weight: 900;
  color: ${({ $tone }) => {
    if ($tone === 'good') return theme.colors.emerald
    if ($tone === 'mid') return theme.colors.gold
    return theme.colors.orange
  }};
`

const RadarSvg = styled.svg`
  width: 100%;
  max-width: 220px;
  display: block;
  margin: 0 auto;
`

const RadarText = styled.text`
  font-size: 8px;
  fill: ${theme.colors.slate[400]};
`

const Bars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
`

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const BarLabel = styled.span`
  width: 48px;
  font-size: 10px;
  color: ${theme.colors.slate[500]};
  text-align: left;
`

const BarTrack = styled.div`
  flex: 1;
  height: 6px;
  border-radius: ${theme.radii.full};
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
`

const BarFill = styled.div<{ $color: string }>`
  height: 100%;
  border-radius: ${theme.radii.full};
  background: ${({ $color }) => $color};
  transition: ${theme.transitions.normal};
`

const BarValue = styled.span`
  width: 24px;
  font-size: 10px;
  color: ${theme.colors.slate[400]};
  text-align: right;
`

export default function NeighborhoodRadar({
  distanceToSea,
  distanceToPark,
  distanceToHospital,
  roi,
  investmentScore,
  className = '',
}: NeighborhoodRadarProps) {
  const seaScore = distanceToSea != null ? Math.max(0, Math.min(10, 10 - distanceToSea / 500)) : null
  const parkScore = distanceToPark != null ? Math.max(0, Math.min(10, 10 - distanceToPark / 300)) : null
  const hospitalScore =
    distanceToHospital != null ? Math.max(0, Math.min(10, 10 - distanceToHospital / 1000)) : null
  const roiScore = Math.max(0, Math.min(10, (roi || 0) / 30))
  const invScore = investmentScore || 5

  const dimensions: Dimension[] = [
    { label: '🌊 ים', score: seaScore ?? -1 },
    { label: '🌳 פארק', score: parkScore ?? -1 },
    { label: '🏥 בי״ח', score: hospitalScore ?? -1 },
    { label: '📈 ROI', score: roiScore },
    { label: '⭐ השקעה', score: invScore },
  ].filter(d => d.score >= 0)

  if (dimensions.length < 3) return null

  const cx = 80
  const cy = 80
  const r = 60
  const n = dimensions.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i: number, val: number) => {
    const angle = startAngle + i * angleStep
    const dist = (val / 10) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  const gridLevels = [2, 4, 6, 8, 10]
  const overallScore = Math.round((dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length) * 10) / 10
  const tone = overallScore >= 7 ? 'good' : overallScore >= 4 ? 'mid' : 'low'

  return (
    <Card className={className}>
      <Header>
        <Title>ציון שכונה</Title>
        <ScoreValue $tone={tone}>{overallScore}/10</ScoreValue>
      </Header>
      <RadarSvg viewBox="0 0 160 160">
        {gridLevels.map(level => {
          const points = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        })}
        {dimensions.map((_, i) => {
          const p = getPoint(i, 10)
          return (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          )
        })}
        <polygon
          points={dimensions
            .map((d, i) => {
              const p = getPoint(i, d.score)
              return `${p.x},${p.y}`
            })
            .join(' ')}
          fill="rgba(200,148,42,0.15)"
          stroke={theme.colors.gold}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {dimensions.map((d, i) => {
          const p = getPoint(i, d.score)
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill={theme.colors.gold}
              stroke={theme.colors.navy}
              strokeWidth="1"
            />
          )
        })}
        {dimensions.map((d, i) => {
          const p = getPoint(i, 12.5)
          return (
            <RadarText key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle">
              {d.label}
            </RadarText>
          )
        })}
      </RadarSvg>
      <Bars>
        {dimensions.map((d, i) => (
          <BarRow key={i}>
            <BarLabel>{d.label}</BarLabel>
            <BarTrack>
              <BarFill
                $color={d.score >= 7 ? theme.colors.emerald : d.score >= 4 ? theme.colors.gold : theme.colors.amber}
                style={{ width: `${(d.score / 10) * 100}%` }}
              />
            </BarTrack>
            <BarValue>{d.score.toFixed(1)}</BarValue>
          </BarRow>
        ))}
      </Bars>
    </Card>
  )
}
