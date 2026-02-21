import { useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import { ArrowRight, Heart, Navigation, MapPin, FileText, Calendar, Building2, Landmark, Clock, TrendingUp, Shield, Share2, Copy, Check } from 'lucide-react'
import { t, sm, md, lg, fadeInUp } from '../theme'
import { usePlot, useFavorites } from '../hooks'
import { Spinner, GoldButton, GhostButton, Badge, ErrorBoundary, AnimatedCard } from '../components/UI'
import { PublicLayout } from '../components/Layout'
import { p, roi, fmt, calcScore, getGrade, calcCAGR, calcTimeline, statusLabels, statusColors, zoningLabels, daysOnMarket, zoningPipeline, pricePerSqm } from '../utils'
import type { Plot } from '../types'

const LeadModal = lazy(() => import('../components/LeadModal'))

/* ── styled ── */
const Back = styled(Link)`display:inline-flex;align-items:center;gap:6px;color:${t.lTextSec};font-size:13px;font-weight:500;margin-bottom:16px;text-decoration:none!important;transition:color ${t.tr};&:hover{color:${t.gold};}`
const Page = styled.div`max-width:1120px;margin:0 auto;padding:24px;direction:rtl;`
const TitleRow = styled.div`display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px;`
const TitleLeft = styled.div`display:flex;flex-direction:column;gap:8px;`
const Badges = styled.div`display:flex;align-items:center;gap:8px;flex-wrap:wrap;`
const Title = styled.h1`font-size:clamp(22px,3vw,30px);font-weight:800;color:${t.lText};font-family:${t.font};`
const Actions = styled.div`display:flex;gap:8px;`
const IconBtn = styled.button<{$active?:boolean}>`display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:${t.r.md};border:1px solid ${t.lBorder};background:${pr=>pr.$active?t.goldDim:'#fff'};color:${pr=>pr.$active?t.gold:t.lTextSec};cursor:pointer;transition:all ${t.tr};&:hover{border-color:${t.gold};color:${t.gold};}`

const Metrics = styled.div`display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:32px;${md}{grid-template-columns:repeat(3,1fr);}${sm}{grid-template-columns:repeat(2,1fr);}`
const Metric = styled(AnimatedCard)`padding:20px;background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};text-align:center;transition:all ${t.tr};&:hover{border-color:${t.goldBorder};box-shadow:${t.sh.glow};}`
const MetricVal = styled.div`font-size:24px;font-weight:800;color:${t.lText};font-family:${t.font};`
const MetricLabel = styled.div`font-size:12px;color:${t.lTextSec};margin-top:4px;`

const Grid = styled.div`display:grid;grid-template-columns:1fr 360px;gap:24px;${md}{grid-template-columns:1fr;}`
const Card = styled(AnimatedCard)`background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;`
const CardTitle = styled.h3`font-size:16px;font-weight:700;color:${t.lText};display:flex;align-items:center;gap:8px;margin-bottom:16px;font-family:${t.font};`
const Row = styled.div`display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid ${t.lBorder};&:last-child{border:none;}`
const Label = styled.span`font-size:13px;color:${t.lTextSec};`
const Value = styled.span`font-size:13px;font-weight:600;color:${t.lText};`

const ProgressTrack = styled.div`width:100%;height:8px;background:${t.lBorder};border-radius:${t.r.full};overflow:hidden;margin:12px 0;`
const ProgressFill = styled.div<{$pct:number}>`width:${pr=>pr.$pct}%;height:100%;background:linear-gradient(90deg,${t.gold},${t.goldBright});border-radius:${t.r.full};transition:width 1s ease;`
const Stages = styled.div`display:flex;flex-direction:column;gap:6px;`
const Stage = styled.div<{$done:boolean;$current:boolean}>`display:flex;align-items:center;gap:8px;font-size:12px;color:${pr=>pr.$current?t.gold:pr.$done?t.lText:t.lTextSec};font-weight:${pr=>pr.$current?700:400};`
const Dot = styled.div<{$done:boolean}>`width:8px;height:8px;border-radius:50%;background:${pr=>pr.$done?t.gold:t.lBorder};flex-shrink:0;`

const DocItem = styled.a`display:flex;align-items:center;gap:8px;padding:8px 12px;background:${t.lBg};border-radius:${t.r.md};font-size:13px;color:${t.lText};text-decoration:none!important;transition:all ${t.tr};&:hover{background:${t.lBorder};}`

const BottomBar = styled.div`position:fixed;bottom:0;left:0;right:0;z-index:40;background:rgba(255,255,255,0.97);backdrop-filter:blur(12px);border-top:1px solid ${t.lBorder};padding:12px 24px;display:flex;align-items:center;justify-content:center;gap:16px;`
const BarPrice = styled.span`font-size:20px;font-weight:800;color:${t.lText};font-family:${t.font};`

const Center = styled.div`display:flex;align-items:center;justify-content:center;min-height:60vh;`

export default function PlotDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: plot, isLoading, error } = usePlot(id)
  const { isFav, toggle } = useFavorites()
  const [leadOpen, setLeadOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    const title = plot ? `גוש ${p(plot).block} חלקה ${plot.number} - ${plot.city} | LandMap` : 'LandMap'
    if (navigator.share) {
      try { await navigator.share({ title, url }) } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) return <PublicLayout><Center><Spinner size={36} /></Center></PublicLayout>
  if (error || !plot) return <PublicLayout><Center><p style={{color:t.lTextSec}}>Plot not found</p></Center></PublicLayout>

  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const cagr = calcCAGR(r, d.readiness), timeline = calcTimeline(plot), dom = daysOnMarket(d.created), pps = pricePerSqm(plot)

  return (
    <PublicLayout>
      <ErrorBoundary>
        <Page>
          <Back to="/explore"><ArrowRight size={16} /> חזרה למפה</Back>

          <TitleRow>
            <TitleLeft>
              <Badges>
                <Badge $color={statusColors[plot.status || 'AVAILABLE']}>{statusLabels[plot.status || 'AVAILABLE'] || plot.status}</Badge>
                <Badge $color={grade.color}>{grade.grade}</Badge>
                {dom && <Badge $color={dom.color}>{dom.label}</Badge>}
              </Badges>
              <Title>גוש {d.block} חלקה {plot.number} - {plot.city}</Title>
            </TitleLeft>
            <Actions>
              <IconBtn $active={isFav(plot.id)} onClick={() => toggle(plot.id)} aria-label="מועדפים"><Heart size={20} fill={isFav(plot.id) ? t.gold : 'none'} /></IconBtn>
              <IconBtn onClick={handleShare} aria-label="שיתוף">{copied ? <Check size={20} color={t.ok} /> : <Share2 size={20} />}</IconBtn>
              <IconBtn aria-label="ניווט" onClick={() => window.open(`https://waze.com/ul?ll=${plot.coordinates?.[0]?.[0]},${plot.coordinates?.[0]?.[1]}&navigate=yes`, '_blank')}><Navigation size={20} /></IconBtn>
            </Actions>
          </TitleRow>

          <Metrics>
            <Metric $delay={0}><MetricVal>{fmt.compact(d.price)}</MetricVal><MetricLabel>מחיר</MetricLabel></Metric>
            <Metric $delay={0.06}><MetricVal>{fmt.dunam(d.size)} דונם</MetricVal><MetricLabel>שטח</MetricLabel></Metric>
            {pps > 0 && <Metric $delay={0.12}><MetricVal>{fmt.num(pps)}</MetricVal><MetricLabel>₪ / מ״ר</MetricLabel></Metric>}
            <Metric $delay={0.18}><MetricVal style={{color:t.ok}}>{fmt.pct(r)}</MetricVal><MetricLabel>ROI צפוי</MetricLabel></Metric>
            <Metric $delay={0.24}><MetricVal style={{color:t.gold}}>{cagr ? `${cagr.cagr}%` : '--'}</MetricVal><MetricLabel>CAGR ({cagr?.years || '-'} שנים)</MetricLabel></Metric>
          </Metrics>

          <Grid>
            {/* Main column */}
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              <Card $delay={0.1}>
                <CardTitle><TrendingUp size={18} color={t.gold} /> ניתוח השקעה</CardTitle>
                <Row><Label>מחיר שמאי</Label><Value>{fmt.price(plot.standard22?.value || 0)}</Value></Row>
                <Row><Label>שווי חזוי</Label><Value style={{color:t.ok}}>{fmt.price(d.projected)}</Value></Row>
                <Row><Label>ציון השקעה</Label><Value style={{color:grade.color}}>{score}/10 ({grade.grade})</Value></Row>
                {pps > 0 && <Row><Label>מחיר למ״ר</Label><Value style={{color:t.gold}}>₪{fmt.num(pps)}</Value></Row>}
                <Row><Label>צפיפות</Label><Value>{d.density} יח"ד/דונם</Value></Row>
                <Row><Label>אומדן מוכנות</Label><Value>{d.readiness || '--'}</Value></Row>
              </Card>

              {timeline && (
                <Card $delay={0.2}>
                  <CardTitle><Clock size={18} color={t.gold} /> ציר זמן תכנוני</CardTitle>
                  <ProgressTrack><ProgressFill $pct={timeline.progress} /></ProgressTrack>
                  <Stages>
                    {timeline.stages.map((s, i) => (
                      <Stage key={s.key} $done={i <= timeline.currentIdx} $current={i === timeline.currentIdx}>
                        <Dot $done={i <= timeline.currentIdx} />
                        {s.label}
                      </Stage>
                    ))}
                  </Stages>
                </Card>
              )}

              {plot.committees && (
                <Card $delay={0.3}>
                  <CardTitle><Landmark size={18} color={t.gold} /> ועדות</CardTitle>
                  {Object.entries(plot.committees).map(([k, c]) => (
                    <Row key={k}>
                      <Label>{c.label}</Label>
                      <Value>
                        <Badge $color={c.status === 'approved' ? t.ok : c.status === 'in_preparation' ? t.warn : t.info}>
                          {c.status === 'approved' ? 'מאושר' : c.status === 'in_preparation' ? 'בהכנה' : c.status === 'pending' ? 'ממתין' : c.status === 'in_discussion' ? 'בדיון' : 'טרם התחיל'}
                        </Badge>
                        {c.date && <span style={{marginRight:8,fontSize:11,color:t.lTextSec}}>{c.date}</span>}
                      </Value>
                    </Row>
                  ))}
                </Card>
              )}

              {plot.description && (
                <Card $delay={0.35}>
                  <CardTitle><FileText size={18} color={t.gold} /> תיאור</CardTitle>
                  <p style={{fontSize:14,color:t.lTextSec,lineHeight:1.8}}>{plot.description}</p>
                  {plot.area_context && <p style={{fontSize:13,color:t.lTextSec,marginTop:12}}>{plot.area_context}</p>}
                </Card>
              )}
            </div>

            {/* Side column */}
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              <Card $delay={0.15}>
                <CardTitle><MapPin size={18} color={t.gold} /> מיקום</CardTitle>
                <Row><Label>עיר</Label><Value>{plot.city}</Value></Row>
                <Row><Label>גוש / חלקה</Label><Value>{d.block} / {plot.number}</Value></Row>
                {d.seaDist && <Row><Label>מרחק לים</Label><Value>{fmt.num(d.seaDist)} מ'</Value></Row>}
                {d.parkDist && <Row><Label>מרחק לפארק</Label><Value>{fmt.num(d.parkDist)} מ'</Value></Row>}
              </Card>

              {plot.standard22 && (
                <Card $delay={0.25}>
                  <CardTitle><Shield size={18} color={t.gold} /> שומת תקן 22</CardTitle>
                  <Row><Label>שמאי</Label><Value>{plot.standard22.appraiser}</Value></Row>
                  <Row><Label>תאריך</Label><Value>{plot.standard22.date}</Value></Row>
                  <Row><Label>שווי</Label><Value style={{color:t.gold}}>{fmt.price(plot.standard22.value)}</Value></Row>
                  <Row><Label>מתודולוגיה</Label><Value style={{fontSize:12}}>{plot.standard22.methodology}</Value></Row>
                </Card>
              )}

              {plot.documents?.length ? (
                <Card $delay={0.3}>
                  <CardTitle><FileText size={18} color={t.gold} /> מסמכים</CardTitle>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {plot.documents.map((doc, i) => (
                      <DocItem key={i} href="#"><FileText size={14} color={t.lTextSec} />{doc}</DocItem>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
          </Grid>
        </Page>

        <BottomBar>
          <BarPrice>{fmt.price(d.price)}</BarPrice>
          <GoldButton onClick={() => setLeadOpen(true)} style={{padding:'12px 32px',borderRadius:t.r.full}}>קבל פרטים</GoldButton>
        </BottomBar>

        <Suspense fallback={null}>
          <LeadModal plot={plot} open={leadOpen} onClose={() => setLeadOpen(false)} />
        </Suspense>
      </ErrorBoundary>
    </PublicLayout>
  )
}
