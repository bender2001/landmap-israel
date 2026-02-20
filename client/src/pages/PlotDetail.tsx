import { useState, useMemo, lazy, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowRight, MapPin, TrendingUp, Building2, FileText, Phone, Share2, Heart, Navigation, ExternalLink, Shield, ChevronLeft, Clock } from 'lucide-react'
import { t, media } from '../theme'
import { usePlot, useFavorites } from '../hooks'
import { Spinner, GoldButton, GhostButton, Badge, ErrorBoundary } from '../components/UI'
import { fmt, p, roi, calcScore, getGrade, calcCAGR, calcMonthly, calcTimeline, zoningLabels, statusLabels, statusColors, plotCenter, daysOnMarket } from '../utils'
import type { Plot } from '../types'

const LeadModal = lazy(() => import('../components/LeadModal'))

const fadeIn = keyframes`from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }`

const Page = styled.div`
  min-height: 100vh; background: ${t.colors.bg};
  padding-bottom: 80px;
`
const Hero = styled.div`
  padding: 24px 24px 0;
  max-width: 960px; margin: 0 auto;
  animation: ${fadeIn} 0.4s ease;
`
const BackLink = styled(Link)`
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: ${t.colors.textDim}; text-decoration: none;
  margin-bottom: 16px;
  &:hover { color: ${t.colors.gold}; }
`
const TitleRow = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  flex-wrap: wrap; margin-bottom: 20px;
`
const TitleBlock = styled.div``
const PageTitle = styled.h1`font-size: 28px; font-weight: 800; color: ${t.colors.text}; line-height: 1.2;`
const PageSub = styled.p`font-size: 14px; color: ${t.colors.textSec}; margin-top: 4px;`
const ActionRow = styled.div`display: flex; gap: 8px; align-items: flex-start;`

const MetricsGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;
  margin-bottom: 32px;
`
const MetricCard = styled.div<{ $accent?: boolean }>`
  padding: 16px; border-radius: ${t.radius.md};
  background: ${({ $accent }) => $accent ? `linear-gradient(135deg, ${t.colors.gold}12, ${t.colors.goldBright}08)` : t.colors.surface};
  border: 1px solid ${({ $accent }) => $accent ? t.colors.goldBorder : t.colors.border};
  animation: ${fadeIn} 0.4s ease both;
`
const MLabel = styled.div`font-size: 11px; color: ${t.colors.textDim}; margin-bottom: 6px; font-weight: 500;`
const MValue = styled.div<{ $color?: string }>`font-size: 22px; font-weight: 800; color: ${({ $color }) => $color || t.colors.text}; font-variant-numeric: tabular-nums;`
const MSub = styled.div`font-size: 11px; color: ${t.colors.textDim}; margin-top: 2px;`

const ContentGrid = styled.div`
  max-width: 960px; margin: 0 auto; padding: 0 24px;
  display: grid; grid-template-columns: 1fr; gap: 24px;
  ${media.lg} { grid-template-columns: 2fr 1fr; }
`
const Main = styled.div`display: flex; flex-direction: column; gap: 24px;`
const Side = styled.div`display: flex; flex-direction: column; gap: 24px;`

const Section = styled.div`
  background: ${t.colors.surface}; border: 1px solid ${t.colors.border};
  border-radius: ${t.radius.lg}; padding: 20px;
  animation: ${fadeIn} 0.4s ease both;
`
const STitle = styled.h2`font-size: 16px; font-weight: 700; color: ${t.colors.text}; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;`
const Row = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; font-size: 13px; border-bottom: 1px solid ${t.colors.border};
  &:last-child { border-bottom: none; }
`
const RLabel = styled.span`color: ${t.colors.textDim};`
const RValue = styled.span<{ $color?: string }>`font-weight: 600; color: ${({ $color }) => $color || t.colors.text};`

const ProgressBar = styled.div`
  height: 6px; background: ${t.colors.surfaceHover}; border-radius: 3px; overflow: hidden; margin: 8px 0 16px;
`
const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%; width: ${({ $pct }) => $pct}%;
  background: linear-gradient(90deg, ${t.colors.gold}, ${t.colors.goldBright});
  border-radius: 3px; transition: width 0.6s ease;
`

const StageRow = styled.div<{ $active: boolean; $done: boolean }>`
  display: flex; align-items: center; gap: 8px; padding: 5px 8px;
  border-radius: ${t.radius.sm};
  background: ${({ $active }) => $active ? `${t.colors.gold}12` : 'transparent'};
  opacity: ${({ $done, $active }) => $done || $active ? 1 : 0.4};
  font-size: 12px; color: ${t.colors.text};
`
const StageDot = styled.div<{ $done: boolean; $active: boolean }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $done, $active }) => $done ? t.colors.success : $active ? t.colors.gold : t.colors.textDim};
`

const FixedCTA = styled.div`
  position: fixed; bottom: 0; left: 0; right: 0; z-index: ${t.z.filter};
  padding: 12px 24px; display: flex; gap: 8px; justify-content: center;
  background: linear-gradient(transparent, ${t.colors.bg} 30%);
`

const LoadWrap = styled.div`
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh;
`

export default function PlotDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: plot, isLoading, error } = usePlot(id)
  const favorites = useFavorites()
  const [showLead, setShowLead] = useState(false)

  if (isLoading) return <LoadWrap><Spinner size={40} /></LoadWrap>
  if (error || !plot) return <LoadWrap><p style={{ color: t.colors.textSec }}>החלקה לא נמצאה</p></LoadWrap>

  const d = p(plot)
  const plotRoi = roi(plot)
  const score = calcScore(plot)
  const grade = getGrade(score)
  const cagr = calcCAGR(plotRoi, d.readiness)
  const monthly = calcMonthly(d.price)
  const timeline = calcTimeline(plot)
  const dom = daysOnMarket(d.created)
  const status = plot.status || 'AVAILABLE'
  const center = plotCenter(plot.coordinates)
  const isFav = favorites.isFav(plot.id)

  return (
    <Page>
      <Hero>
        <BackLink to="/"><ArrowRight size={15} /> חזרה למפה</BackLink>
        <TitleRow>
          <TitleBlock>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <Badge $color={statusColors[status]}>{statusLabels[status]}</Badge>
              <Badge $color={grade.color}>ציון {score}/10 · {grade.grade}</Badge>
              {dom && <Badge $color={dom.color}>{dom.label}</Badge>}
            </div>
            <PageTitle>גוש {d.block} | חלקה {plot.number}</PageTitle>
            <PageSub><MapPin size={13} style={{ verticalAlign: -2 }} /> {plot.city} · {zoningLabels[d.zoning]}</PageSub>
          </TitleBlock>
          <ActionRow>
            <GhostButton onClick={() => favorites.toggle(plot.id)}>
              <Heart size={14} fill={isFav ? '#EF4444' : 'none'} color={isFav ? '#EF4444' : undefined} />
              {isFav ? 'שמור' : 'שמור'}
            </GhostButton>
            {center && (
              <GhostButton as="a" href={`https://www.google.com/maps/@${center.lat},${center.lng},17z`} target="_blank">
                <Navigation size={14} /> נווט
              </GhostButton>
            )}
          </ActionRow>
        </TitleRow>

        <MetricsGrid>
          <MetricCard $accent>
            <MLabel>מחיר</MLabel>
            <MValue $color={t.colors.goldBright}>{fmt.price(d.price)}</MValue>
            <MSub>{d.size > 0 ? `${fmt.price(Math.round(d.price / d.size))}/מ"ר` : ''}</MSub>
          </MetricCard>
          <MetricCard>
            <MLabel>שטח</MLabel>
            <MValue>{fmt.dunam(d.size)} דונם</MValue>
            <MSub>{d.size.toLocaleString()} מ"ר</MSub>
          </MetricCard>
          <MetricCard>
            <MLabel>תשואה צפויה</MLabel>
            <MValue $color={t.colors.success}>+{fmt.pct(plotRoi)}</MValue>
            <MSub>שווי חזוי {fmt.compact(d.projected)}</MSub>
          </MetricCard>
          <MetricCard>
            <MLabel>צמיחה שנתית</MLabel>
            <MValue>{cagr ? `${cagr.cagr}%` : '—'}</MValue>
            <MSub>{cagr ? `${cagr.years} שנים` : ''}</MSub>
          </MetricCard>
        </MetricsGrid>
      </Hero>

      <ContentGrid>
        <Main>
          {/* Investment Analysis */}
          <Section>
            <STitle><TrendingUp size={18} color={t.colors.gold} /> ניתוח השקעה</STitle>
            <Row><RLabel>ציון השקעה</RLabel><RValue $color={grade.color}>{score}/10 ({grade.grade})</RValue></Row>
            <Row><RLabel>מחיר רכישה</RLabel><RValue>{fmt.price(d.price)}</RValue></Row>
            <Row><RLabel>שווי חזוי</RLabel><RValue $color={t.colors.success}>{fmt.price(d.projected)}</RValue></Row>
            <Row><RLabel>רווח גולמי</RLabel><RValue>{fmt.price(d.projected - d.price)}</RValue></Row>
            {monthly && <Row><RLabel>החזר חודשי (50% מימון)</RLabel><RValue>₪{monthly.monthly.toLocaleString()}/חודש</RValue></Row>}
            {d.density > 0 && <Row><RLabel>צפיפות</RLabel><RValue>{d.density} יח"ד/דונם</RValue></Row>}
          </Section>

          {/* Zoning Timeline */}
          {timeline && (
            <Section>
              <STitle><Building2 size={18} color={t.colors.gold} /> התקדמות תכנונית</STitle>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.colors.textDim, marginBottom: 4 }}>
                <span>התקדמות כללית</span>
                <span>{timeline.progress}%</span>
              </div>
              <ProgressBar><ProgressFill $pct={timeline.progress} /></ProgressBar>
              {timeline.stages.map((stage, i) => (
                <StageRow key={stage.key} $active={i === timeline.currentIdx} $done={i < timeline.currentIdx}>
                  <StageDot $done={i < timeline.currentIdx} $active={i === timeline.currentIdx} />
                  {stage.label}
                </StageRow>
              ))}
              {d.readiness && <Row style={{ marginTop: 12 }}><RLabel>אומדן מוכנות</RLabel><RValue>{d.readiness}</RValue></Row>}
            </Section>
          )}

          {/* Committees */}
          {plot.committees && (
            <Section>
              <STitle><Shield size={18} color={t.colors.gold} /> ועדות תכנון</STitle>
              {Object.entries(plot.committees).map(([key, c]) => {
                const sMap: Record<string, { l: string; c: string }> = {
                  approved: { l: 'מאושר', c: t.colors.success }, in_preparation: { l: 'בהכנה', c: t.colors.warning },
                  pending: { l: 'ממתין', c: t.colors.warning }, in_discussion: { l: 'בדיון', c: t.colors.info },
                  not_started: { l: 'טרם החל', c: t.colors.textDim },
                }
                const s = sMap[c.status] || { l: c.status, c: t.colors.textDim }
                return (
                  <Row key={key}>
                    <RLabel>{c.label}</RLabel>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.date && <span style={{ fontSize: 11, color: t.colors.textDim }}>{c.date}</span>}
                      <Badge $color={s.c}>{s.l}</Badge>
                    </div>
                  </Row>
                )
              })}
            </Section>
          )}

          {/* Description */}
          {plot.description && (
            <Section>
              <STitle><FileText size={18} color={t.colors.gold} /> תיאור</STitle>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: t.colors.textSec }}>{plot.description}</p>
              {plot.areaContext ?? (plot as any).area_context ? (
                <p style={{ fontSize: 13, lineHeight: 1.7, color: t.colors.textDim, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.colors.border}` }}>
                  {(plot as any).areaContext || (plot as any).area_context}
                </p>
              ) : null}
            </Section>
          )}
        </Main>

        <Side>
          {/* Location */}
          <Section>
            <STitle><MapPin size={18} color={t.colors.gold} /> מיקום</STitle>
            {d.seaDist != null && <Row><RLabel>🌊 מהים</RLabel><RValue>{d.seaDist} מ׳</RValue></Row>}
            {d.parkDist != null && <Row><RLabel>🌳 מפארק</RLabel><RValue>{d.parkDist} מ׳</RValue></Row>}
            {(plot.distance_to_hospital ?? plot.distanceToHospital) != null && (
              <Row><RLabel>🏥 מבי"ח</RLabel><RValue>{plot.distance_to_hospital ?? plot.distanceToHospital} מ׳</RValue></Row>
            )}
            {center && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.colors.gold, marginTop: 12 }}
              >
                <Navigation size={13} /> נווט לחלקה <ExternalLink size={11} />
              </a>
            )}
          </Section>

          {/* Standard 22 */}
          {plot.standard22 && typeof plot.standard22 === 'object' && (
            <Section>
              <STitle>📋 שמאות (תקן 22)</STitle>
              <Row><RLabel>שמאי</RLabel><RValue>{(plot.standard22 as any).appraiser}</RValue></Row>
              <Row><RLabel>תאריך</RLabel><RValue>{(plot.standard22 as any).date}</RValue></Row>
              <Row><RLabel>שווי מוערך</RLabel><RValue $color={t.colors.goldBright}>{fmt.price((plot.standard22 as any).value)}</RValue></Row>
              <Row><RLabel>מתודולוגיה</RLabel><RValue style={{ fontSize: 11 }}>{(plot.standard22 as any).methodology}</RValue></Row>
            </Section>
          )}

          {/* Documents */}
          {plot.documents && (plot.documents as string[]).length > 0 && (
            <Section>
              <STitle><FileText size={18} color={t.colors.gold} /> מסמכים</STitle>
              {(plot.documents as string[]).map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, color: t.colors.textSec }}>
                  <FileText size={13} color={t.colors.textDim} /> {doc}
                </div>
              ))}
            </Section>
          )}
        </Side>
      </ContentGrid>

      <FixedCTA>
        <GoldButton onClick={() => setShowLead(true)} style={{ padding: '12px 32px', fontSize: 14 }}>
          <Phone size={16} /> קבל פרטים על החלקה
        </GoldButton>
      </FixedCTA>

      <Suspense fallback={null}>
        <LeadModal open={showLead} onClose={() => setShowLead(false)} plot={plot} />
      </Suspense>
    </Page>
  )
}
