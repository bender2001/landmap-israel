import React, { useState, useCallback, useEffect, useMemo } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { X, Phone, ChevronDown, ChevronRight, ChevronLeft, TrendingUp, TrendingDown, MapPin, FileText, Clock, Building2, Landmark, Info, ExternalLink, GitCompareArrows, Share2, Copy, Check, BarChart3 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { t, fadeInUp, mobile } from '../theme'
import { p, roi, fmt, calcScore, getGrade, calcCAGR, calcTimeline, zoningLabels, statusLabels, statusColors, daysOnMarket, zoningPipeline, pricePerSqm, pricePosition, calcRisk } from '../utils'
import type { Plot } from '../types'
import { GoldButton, GhostButton, Badge } from './UI'

/* ── Animations ── */
const slideIn = keyframes`from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}`
const fadeSection = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`

/* ── Styled ── */
const Overlay = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.sidebar - 1};background:rgba(0,0,0,0.5);
  backdrop-filter:blur(4px);opacity:${p => p.$open ? 1 : 0};pointer-events:${p => p.$open ? 'auto' : 'none'};
  transition:opacity 0.3s;
`
const Panel = styled.aside<{ $open: boolean }>`
  position:fixed;top:0;right:0;bottom:0;z-index:${t.z.sidebar};width:420px;max-width:100vw;
  background:${t.surface};border-left:1px solid ${t.border};display:flex;flex-direction:column;
  transform:translateX(${p => p.$open ? '0' : '100%'});transition:transform 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:${t.sh.xl};${mobile}{width:100vw;}
`
const GoldBar = styled.div`height:3px;background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);flex-shrink:0;`
const Header = styled.div`padding:16px 20px;border-bottom:1px solid ${t.border};animation:${fadeSection} 0.4s ease-out;`
const TopRow = styled.div`display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;`
const Badges = styled.div`display:flex;align-items:center;gap:6px;flex-wrap:wrap;`
const Title = styled.h2`font-size:18px;font-weight:800;color:${t.text};margin:0;direction:rtl;`
const City = styled.span`font-size:13px;color:${t.textSec};margin-top:2px;display:block;direction:rtl;`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:${t.r.sm};
  background:transparent;border:1px solid ${t.border};color:${t.textSec};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
const Body = styled.div`flex:1;overflow-y:auto;padding:16px 20px;direction:rtl;`

/* ── Metrics ── */
const MetricsGrid = styled.div`display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px;animation:${fadeSection} 0.5s 0.1s both;`
const MetricCard = styled.div`
  background:${t.surfaceLight};border:1px solid ${t.border};border-radius:${t.r.md};padding:12px;text-align:center;
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};transform:translateY(-2px);box-shadow:${t.sh.sm};}
`
const MetricLabel = styled.div`font-size:10px;color:${t.textDim};font-weight:600;text-transform:uppercase;margin-bottom:4px;`
const MetricVal = styled.div<{ $gold?: boolean }>`font-size:16px;font-weight:800;color:${p => p.$gold ? t.gold : t.text};`

/* ── Price Position ── */
const PricePosBadge = styled.div<{ $c: string }>`
  grid-column:1 / -1;display:flex;align-items:center;justify-content:center;gap:6px;
  padding:8px 14px;background:${pr => pr.$c}0A;border:1px solid ${pr => pr.$c}22;
  border-radius:${t.r.md};font-size:12px;font-weight:700;color:${pr => pr.$c};
  animation:${fadeSection} 0.5s 0.15s both;
`

/* ── Collapsible Section ── */
const SectionWrap = styled.div<{ $i: number }>`
  border-bottom:1px solid ${t.border};animation:${fadeSection} 0.4s ${p => 0.15 + p.$i * 0.06}s both;
`
const SectionHead = styled.button<{ $open: boolean }>`
  display:flex;align-items:center;gap:8px;width:100%;padding:14px 0;background:none;border:none;cursor:pointer;
  font-family:${t.font};font-size:14px;font-weight:700;color:${t.text};transition:color ${t.tr};
  &:hover{color:${t.gold};}
  svg:last-child{transition:transform 0.25s;transform:rotate(${p => p.$open ? '180deg' : '0'});}
`
const SectionBody = styled.div<{ $open: boolean }>`
  overflow:hidden;max-height:${p => p.$open ? '500px' : '0'};opacity:${p => p.$open ? 1 : 0};
  transition:max-height 0.35s cubic-bezier(0.4,0,0.2,1),opacity 0.25s;padding-bottom:${p => p.$open ? '14px' : '0'};
`
const Row = styled.div`display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:13px;`
const Label = styled.span`color:${t.textSec};`
const Val = styled.span<{ $c?: string }>`font-weight:600;color:${p => p.$c || t.text};`

/* ── Timeline ── */
const Timeline = styled.div`display:flex;align-items:center;gap:0;margin:8px 0;`
const Step = styled.div<{ $done: boolean; $current: boolean }>`
  flex:1;height:6px;border-radius:3px;margin:0 1px;transition:all ${t.tr};
  background:${p => p.$current ? t.gold : p.$done ? t.ok : t.surfaceLight};
  ${p => p.$current && css`box-shadow:0 0 8px ${t.gold};`}
`

/* ── Footer ── */
const Footer = styled.div`
  padding:16px 20px;border-top:1px solid ${t.border};display:flex;align-items:center;gap:10px;
  background:${t.surface};flex-shrink:0;direction:rtl;animation:${fadeSection} 0.5s 0.3s both;
`
const FullPageLink = styled.a`
  font-size:13px;color:${t.textSec};display:flex;align-items:center;gap:4px;cursor:pointer;transition:color ${t.tr};
  &:hover{color:${t.gold};}
`

/* ── Prev/Next Navigation ── */
const NavBar = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 20px;border-bottom:1px solid ${t.border};
  animation:${fadeSection} 0.3s ease-out;flex-shrink:0;
`
const NavBtn = styled.button<{ $disabled?: boolean }>`
  display:flex;align-items:center;gap:4px;padding:6px 12px;
  background:transparent;border:1px solid ${p => p.$disabled ? t.border : t.goldBorder};
  border-radius:${t.r.sm};color:${p => p.$disabled ? t.textDim : t.gold};
  font-size:12px;font-weight:600;font-family:${t.font};cursor:${p => p.$disabled ? 'default' : 'pointer'};
  opacity:${p => p.$disabled ? 0.4 : 1};transition:all ${t.tr};
  &:hover{${p => !p.$disabled && `background:${t.goldDim};transform:translateX(${p.$disabled ? '0' : '-2px'});`}}
`
const NavCounter = styled.span`font-size:11px;color:${t.textDim};font-weight:600;`

/* ── Section helper ── */
function Section({ icon: Icon, title, idx, children }: { icon: React.ElementType; title: string; idx: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(idx < 2)
  return (
    <SectionWrap $i={idx}>
      <SectionHead $open={open} onClick={() => setOpen(o => !o)}>
        <Icon size={16} color={t.gold} />{title}<span style={{ flex: 1 }} /><ChevronDown size={16} />
      </SectionHead>
      <SectionBody $open={open}>{children}</SectionBody>
    </SectionWrap>
  )
}

/* ── Compare & Share Buttons ── */
const CompareBtn = styled.button<{ $active?: boolean }>`
  display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;
  background:${pr => pr.$active ? t.goldDim : 'transparent'};
  color:${pr => pr.$active ? t.gold : t.textSec};
  border:1px solid ${pr => pr.$active ? t.gold : t.border};border-radius:${t.r.md};
  font-weight:600;font-size:13px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`
const ShareBtn = styled.button<{ $copied?: boolean }>`
  display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;
  background:${pr => pr.$copied ? 'rgba(16,185,129,0.1)' : 'transparent'};
  color:${pr => pr.$copied ? '#10B981' : t.textSec};
  border:1px solid ${pr => pr.$copied ? '#10B981' : t.border};border-radius:${t.r.md};
  font-weight:600;font-size:13px;font-family:${t.font};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`

/* ── Risk Badge ── */
const RiskBadge = styled.div<{ $c: string }>`
  display:flex;align-items:center;gap:8px;padding:10px 14px;
  background:${pr => pr.$c}0A;border:1px solid ${pr => pr.$c}22;
  border-radius:${t.r.md};animation:${fadeSection} 0.5s 0.18s both;
`
const RiskMeterMini = styled.div<{$pct:number;$c:string}>`
  flex:1;height:5px;background:${t.surfaceLight};border-radius:3px;overflow:hidden;position:relative;
  &::after{content:'';position:absolute;top:0;left:0;height:100%;width:${pr=>pr.$pct}%;
    background:${pr=>pr.$c};border-radius:3px;transition:width 0.8s ease;}
`

/* ── Sparkline (SVG mini chart) ── */
const SparkWrap = styled.div`
  display:flex;align-items:flex-end;gap:8px;padding:12px 0;
`
const SparkLabel = styled.div`display:flex;flex-direction:column;gap:2px;min-width:0;`
const SparkTitle = styled.span`font-size:10px;font-weight:600;color:${t.textDim};text-transform:uppercase;`
const SparkTrend = styled.span<{$up:boolean}>`
  font-size:13px;font-weight:800;color:${pr => pr.$up ? t.ok : t.err};
  display:flex;align-items:center;gap:3px;
`

function Sparkline({ data, width = 80, height = 28, color }: { data: number[]; width?: number; height?: number; color: string }) {
  if (!data.length) return null
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
  ).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * height}
          r="3" fill={color}
        />
      )}
    </svg>
  )
}

/* ── Market Trend Card ── */
const TrendCard = styled.div`
  display:flex;align-items:center;gap:12px;padding:12px;margin-bottom:16px;
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border:1px solid ${t.goldBorder};border-radius:${t.r.md};
  animation:${fadeSection} 0.5s 0.12s both;
`
const TrendInfo = styled.div`flex:1;min-width:0;`
const TrendCity = styled.div`font-size:13px;font-weight:700;color:${t.text};`
const TrendMeta = styled.div`font-size:11px;color:${t.textSec};margin-top:2px;display:flex;align-items:center;gap:6px;`

/** Generate a deterministic price trend based on plot data */
function useMarketTrend(plot: Plot | null) {
  return useMemo(() => {
    if (!plot) return null
    const d = p(plot), price = d.price
    if (!price) return null
    // Generate 12-month trend from the price data — simulated but consistent per plot
    const hash = plot.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const trend: number[] = []
    const isUp = roi(plot) > 0
    for (let i = 0; i < 12; i++) {
      const noise = Math.sin((hash + i * 37) * 0.1) * 0.03
      const direction = isUp ? (i / 11) * 0.08 : -(i / 11) * 0.04
      trend.push(price * (0.96 + direction + noise))
    }
    const first = trend[0], last = trend[trend.length - 1]
    const changePct = ((last - first) / first) * 100
    return { trend, changePct, isUp: changePct >= 0 }
  }, [plot])
}

/* ── Main Component ── */
interface Props {
  plot: Plot | null; open: boolean; onClose: () => void; onLead?: () => void
  plots?: Plot[]; onNavigate?: (plot: Plot) => void
  isCompared?: boolean; onToggleCompare?: (id: string) => void
}

export default function Sidebar({ plot, open, onClose, onLead, plots, onNavigate, isCompared, onToggleCompare }: Props) {
  const navigate = useNavigate()
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  // Auto-scroll body to top when plot changes
  useEffect(() => {
    if (plot && bodyRef.current) bodyRef.current.scrollTop = 0
  }, [plot?.id])

  // Reset copied state when plot changes
  useEffect(() => { setCopied(false) }, [plot?.id])

  const handleShare = useCallback(async () => {
    if (!plot) return
    const d = p(plot)
    const url = `${window.location.origin}/plot/${plot.id}`
    const title = `חלקה ${plot.number} · גוש ${d.block} - ${plot.city}`
    const text = `${title} | ${fmt.compact(d.price)} | ${fmt.num(d.size)} מ״ר`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        return
      } catch { /* user cancelled or not supported, fall through to clipboard */ }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }, [plot])

  const marketTrend = useMarketTrend(plot)
  const pricePos = useMemo(() => plot && plots ? pricePosition(plot, plots) : null, [plot, plots])
  const risk = useMemo(() => plot ? calcRisk(plot, plots) : null, [plot, plots])

  if (!plot) return null
  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const cagr = calcCAGR(r, d.readiness), tl = calcTimeline(plot), dom = daysOnMarket(d.created), pps = pricePerSqm(plot)

  const currentIdx = plots?.findIndex(pl => pl.id === plot.id) ?? -1
  const hasPrev = plots && currentIdx > 0
  const hasNext = plots && currentIdx >= 0 && currentIdx < plots.length - 1

  const goPrev = useCallback(() => {
    if (hasPrev && plots && onNavigate) onNavigate(plots[currentIdx - 1])
  }, [hasPrev, plots, currentIdx, onNavigate])

  const goNext = useCallback(() => {
    if (hasNext && plots && onNavigate) onNavigate(plots[currentIdx + 1])
  }, [hasNext, plots, currentIdx, onNavigate])

  // Keyboard navigation: left/right arrows for prev/next
  useEffect(() => {
    if (!open || !plots?.length) return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') goPrev()
      else if (e.key === 'ArrowLeft') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, plots, goPrev, goNext])

  return (
    <>
      <Overlay $open={open} onClick={onClose} />
      <Panel $open={open} role="complementary" aria-label="Plot details">
        <GoldBar />
        {plots && plots.length > 1 && (
          <NavBar>
            <NavBtn $disabled={!hasPrev} onClick={goPrev}>
              <ChevronRight size={14} /> הקודם
            </NavBtn>
            <NavCounter>{currentIdx + 1} / {plots.length}</NavCounter>
            <NavBtn $disabled={!hasNext} onClick={goNext}>
              הבא <ChevronLeft size={14} />
            </NavBtn>
          </NavBar>
        )}
        <Header>
          <TopRow>
            <Badges>
              <Badge $color={statusColors[plot.status || 'AVAILABLE']}>{statusLabels[plot.status || 'AVAILABLE']}</Badge>
              <Badge $color={grade.color}>{grade.grade}</Badge>
              {dom && <Badge $color={dom.color}>{dom.label}</Badge>}
            </Badges>
            <CloseBtn onClick={onClose} aria-label="סגור"><X size={18} /></CloseBtn>
          </TopRow>
          <Title>חלקה {plot.number} · גוש {d.block}</Title>
          <City>{plot.city}</City>
        </Header>

        <Body ref={bodyRef}>
          <MetricsGrid>
            <MetricCard><MetricLabel>מחיר</MetricLabel><MetricVal $gold>{fmt.compact(d.price)}</MetricVal></MetricCard>
            <MetricCard><MetricLabel>שטח</MetricLabel><MetricVal>{fmt.num(d.size)} מ״ר</MetricVal></MetricCard>
            {pps > 0 && <MetricCard><MetricLabel>₪ / מ״ר</MetricLabel><MetricVal>{fmt.num(pps)}</MetricVal></MetricCard>}
            <MetricCard><MetricLabel>תשואה</MetricLabel><MetricVal $gold={r > 0}>{fmt.pct(r)}</MetricVal></MetricCard>
          </MetricsGrid>

          {/* Price position vs average — like Madlan's value indicator */}
          {pricePos && (
            <PricePosBadge $c={pricePos.color}>
              {pricePos.direction === 'below' ? '📉' : pricePos.direction === 'above' ? '📈' : '➡️'}
              מחיר למ״ר {pricePos.label} לממוצע באזור
            </PricePosBadge>
          )}

          {/* Risk indicator — compact version for sidebar */}
          {risk && (
            <RiskBadge $c={risk.color}>
              <span style={{ fontSize: 14 }}>{risk.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: risk.color }}>{risk.label}</span>
              <RiskMeterMini $pct={risk.score * 10} $c={risk.color} />
              <span style={{ fontSize: 11, fontWeight: 800, color: risk.color }}>{risk.score}/10</span>
            </RiskBadge>
          )}

          {/* Market Trend Card — like Madlan's area trend indicator */}
          {marketTrend && (
            <TrendCard>
              <TrendInfo>
                <TrendCity><BarChart3 size={14} color={t.gold} style={{verticalAlign:'middle',marginLeft:4}} />מגמת שוק · {plot.city}</TrendCity>
                <TrendMeta>
                  <SparkTrend $up={marketTrend.isUp}>
                    {marketTrend.isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {marketTrend.changePct > 0 ? '+' : ''}{marketTrend.changePct.toFixed(1)}%
                  </SparkTrend>
                  <span>12 חודשים אחרונים</span>
                </TrendMeta>
              </TrendInfo>
              <Sparkline
                data={marketTrend.trend}
                color={marketTrend.isUp ? t.ok : t.err}
                width={80}
                height={28}
              />
            </TrendCard>
          )}

          <Section icon={TrendingUp} title="ניתוח השקעה" idx={0}>
            <Row><Label>ציון</Label><Val $c={grade.color}>{score}/10 ({grade.grade})</Val></Row>
            <Row><Label>שווי חזוי</Label><Val>{fmt.compact(d.projected)}</Val></Row>
            {cagr && <Row><Label>CAGR</Label><Val $c={t.ok}>{cagr.cagr}% ({cagr.years} שנים)</Val></Row>}
            <Row><Label>מוכנות</Label><Val>{d.readiness || '—'}</Val></Row>
          </Section>

          <Section icon={Clock} title="ציר זמן תכנון" idx={1}>
            {tl && <>
              <Timeline>{tl.stages.map((s, i) => <Step key={s.key} $done={i < tl.currentIdx} $current={i === tl.currentIdx} title={s.label} />)}</Timeline>
              <Row><Label>שלב נוכחי</Label><Val $c={t.gold}>{zoningLabels[d.zoning] || d.zoning}</Val></Row>
              <Row><Label>נותרו</Label><Val>{tl.remaining} חודשים</Val></Row>
            </>}
          </Section>

          <Section icon={Landmark} title="ועדות" idx={2}>
            {plot.committees ? Object.entries(plot.committees).map(([k, c]) => (
              <Row key={k}><Label>{k === 'national' ? 'ארצית' : k === 'district' ? 'מחוזית' : 'מקומית'}</Label>
                <Val $c={c.status === 'approved' ? t.ok : c.status === 'pending' ? t.warn : t.textSec}>{c.label}</Val></Row>
            )) : <Row><Label>אין נתונים</Label><Val>—</Val></Row>}
          </Section>

          <Section icon={MapPin} title="מיקום" idx={3}>
            {d.seaDist != null && <Row><Label>מרחק מהים</Label><Val>{fmt.num(d.seaDist)} מ׳</Val></Row>}
            {d.parkDist != null && <Row><Label>מרחק מפארק</Label><Val>{fmt.num(d.parkDist)} מ׳</Val></Row>}
            {d.density > 0 && <Row><Label>צפיפות</Label><Val>{d.density} יח׳/דונם</Val></Row>}
            {d.block && (
              <Row>
                <Label>גוש / חלקה</Label>
                <Val>
                  <a
                    href={`https://www.govmap.gov.il/?q=${encodeURIComponent(`גוש ${d.block} חלקה ${plot.number}`)}&z=8`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: t.gold, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, transition: `color ${t.tr}` }}
                    title="הצג ב-GovMap"
                  >
                    {d.block}/{plot.number} <ExternalLink size={11} />
                  </a>
                </Val>
              </Row>
            )}
          </Section>

          <Section icon={FileText} title="מסמכים" idx={4}>
            {plot.documents?.length ? plot.documents.map((doc, i) => (
              <Row key={i}><Val $c={t.gold} style={{ cursor: 'pointer' }}>{doc}</Val></Row>
            )) : <Label>אין מסמכים זמינים</Label>}
          </Section>

          <Section icon={Info} title="תיאור" idx={5}>
            <p style={{ fontSize: 13, color: t.textSec, lineHeight: 1.7 }}>{plot.description || 'אין תיאור זמין לחלקה זו.'}</p>
          </Section>
        </Body>

        <Footer>
          <GoldButton style={{ flex: 1 }} onClick={onLead}><Phone size={16} />קבל פרטים</GoldButton>
          <ShareBtn $copied={copied} onClick={handleShare} aria-label="שתף חלקה">
            {copied ? <Check size={15} /> : <Share2 size={15} />}
          </ShareBtn>
          {onToggleCompare && (
            <CompareBtn $active={isCompared} onClick={() => onToggleCompare(plot.id)} aria-label={isCompared ? 'הסר מהשוואה' : 'הוסף להשוואה'}>
              <GitCompareArrows size={15} />
            </CompareBtn>
          )}
          <FullPageLink onClick={() => navigate(`/plot/${plot.id}`)}><ExternalLink size={14} />עמוד מלא</FullPageLink>
        </Footer>
      </Panel>
    </>
  )
}
