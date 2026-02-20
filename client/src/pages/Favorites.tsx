import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Heart, ArrowRight, MapPin, TrendingUp } from 'lucide-react'
import { t, media } from '../theme'
import { useFavorites, usePlotsBatch } from '../hooks'
import { Spinner, Badge, GoldButton, GhostButton } from '../components/UI'
import { fmt, p, roi, calcScore, getGrade, statusLabels, statusColors } from '../utils'
import type { Plot } from '../types'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`

const Page = styled.div`min-height: 100vh; background: ${t.colors.bg}; padding: 24px;`
const Container = styled.div`max-width: 800px; margin: 0 auto;`
const BackLink = styled(Link)`display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${t.colors.textDim}; text-decoration: none; margin-bottom: 20px; &:hover { color: ${t.colors.gold}; }`
const Title = styled.h1`font-size: 24px; font-weight: 800; color: ${t.colors.text}; margin-bottom: 8px;`
const Subtitle = styled.p`font-size: 14px; color: ${t.colors.textSec}; margin-bottom: 24px;`
const Empty = styled.div`text-align: center; padding: 60px 20px; color: ${t.colors.textDim};`

const Grid = styled.div`display: flex; flex-direction: column; gap: 12px;`
const Card = styled(Link)`
  display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center;
  padding: 16px; border-radius: ${t.radius.lg};
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  text-decoration: none; color: inherit; transition: all ${t.transition};
  animation: ${fadeIn} 0.3s ease both;
  &:hover { border-color: ${t.colors.goldBorder}; box-shadow: ${t.shadow.glow}; transform: translateY(-1px); }
`
const CardInfo = styled.div``
const CardTitle = styled.h3`font-size: 15px; font-weight: 700; color: ${t.colors.text}; margin-bottom: 4px;`
const CardSub = styled.p`font-size: 12px; color: ${t.colors.textSec};`
const CardMetrics = styled.div`display: flex; gap: 12px; margin-top: 8px;`
const Metric = styled.div`font-size: 13px; font-weight: 600; color: ${t.colors.text};`
const MetricLabel = styled.span`font-size: 10px; color: ${t.colors.textDim}; display: block;`

const RemoveBtn = styled.button`
  width: 36px; height: 36px; border-radius: ${t.radius.sm};
  border: 1px solid rgba(239,68,68,0.2); background: rgba(239,68,68,0.08);
  color: #EF4444; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all ${t.transition}; &:hover { background: rgba(239,68,68,0.15); }
`

export default function Favorites() {
  const { ids, toggle } = useFavorites()
  const { data: plots = [], isLoading } = usePlotsBatch(ids)

  return (
    <Page>
      <Container>
        <BackLink to="/"><ArrowRight size={15} /> חזרה למפה</BackLink>
        <Title>❤️ מועדפים</Title>
        <Subtitle>{ids.length} חלקות שמורות</Subtitle>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spinner size={32} /></div>
        ) : ids.length === 0 ? (
          <Empty>
            <Heart size={48} color={t.colors.textDim} style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>עדיין אין מועדפים</p>
            <p style={{ marginBottom: 20 }}>לחצו על ❤️ ליד חלקה כדי לשמור אותה כאן</p>
            <GoldButton as={Link} to="/" style={{ textDecoration: 'none' }}>חזרה למפה</GoldButton>
          </Empty>
        ) : (
          <Grid>
            {(plots as Plot[]).map((plot, i) => {
              const d = p(plot)
              const plotRoi = roi(plot)
              const grade = getGrade(calcScore(plot))
              const status = plot.status || 'AVAILABLE'
              return (
                <Card key={plot.id} to={`/plot/${plot.id}`} style={{ animationDelay: `${i * 0.05}s` }}>
                  <CardInfo>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <Badge $color={statusColors[status]}>{statusLabels[status]}</Badge>
                      <Badge $color={grade.color}>{grade.grade}</Badge>
                    </div>
                    <CardTitle>גוש {d.block} | חלקה {plot.number}</CardTitle>
                    <CardSub><MapPin size={11} style={{ verticalAlign: -1 }} /> {plot.city}</CardSub>
                    <CardMetrics>
                      <Metric>{fmt.compact(d.price)}<MetricLabel>מחיר</MetricLabel></Metric>
                      <Metric>{fmt.dunam(d.size)} דונם<MetricLabel>שטח</MetricLabel></Metric>
                      <Metric style={{ color: t.colors.success }}>+{fmt.pct(plotRoi)}<MetricLabel>תשואה</MetricLabel></Metric>
                    </CardMetrics>
                  </CardInfo>
                  <RemoveBtn onClick={e => { e.preventDefault(); toggle(plot.id) }} title="הסר ממועדפים">
                    <Heart size={16} fill="#EF4444" />
                  </RemoveBtn>
                </Card>
              )
            })}
          </Grid>
        )}
      </Container>
    </Page>
  )
}
