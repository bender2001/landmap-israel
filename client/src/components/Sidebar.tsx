import { useState, useMemo, useRef, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { X, TrendingUp, MapPin, FileText, ChevronDown, ExternalLink, Building2, Navigation, Clock, Shield, ChevronLeft, Phone } from 'lucide-react'
import { t, media } from '../theme'
import { GoldButton, Badge } from './UI'
import { fmt, p, roi, calcScore, getGrade, calcCAGR, calcMonthly, calcTimeline, zoningLabels, statusLabels, statusColors, zoningPipeline, daysOnMarket, plotCenter } from '../utils'
import type { Plot } from '../types'

// ── Animations ──
const slideIn = keyframes`
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`

// ── Shell ──
const Panel = styled.aside<{ $open: boolean }>`
  position: fixed; top: 0; right: 0; bottom: 0; z-index: ${t.z.sidebar};
  width: 100%; max-width: 440px;
  background: ${t.colors.surface};
  border-left: 1px solid ${t.colors.border};
  box-shadow: ${t.shadow.xl};
  display: flex; flex-direction: column;
  transform: ${({ $open }) => $open ? 'translateX(0)' : 'translateX(100%)'};
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  overflow: hidden;

  ${media.mobile} { max-width: 100%; }
`
const ScrollArea = styled.div`
  flex: 1; overflow-y: auto; padding: 0 20px 100px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${t.colors.surfaceLight}; border-radius: 2px; }
`
const TopBar = styled.div`
  height: 2px;
  background: linear-gradient(90deg, transparent, ${t.colors.gold}, ${t.colors.goldBright}, ${t.colors.gold}, transparent);
`

// ── Header ──
const Header = styled.div`
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  padding: 20px 20px 16px;
`
const PlotTitle = styled.h2`font-size: 20px; font-weight: 800; color: ${t.colors.text}; line-height: 1.3;`
const PlotCity = styled.p`font-size: 13px; color: ${t.colors.textSec}; margin-top: 2px;`
const CloseBtn = styled.button`
  width: 32px; height: 32px; border-radius: ${t.radius.sm}; border: none;
  background: ${t.colors.surfaceHover}; color: ${t.colors.textDim};
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all ${t.transition}; flex-shrink: 0;
  &:hover { background: ${t.colors.surfaceLight}; color: ${t.colors.text}; }
`

// ── Metrics Grid ──
const MetricsRow = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  padding: 0 20px 16px;
`
const MetricCard = styled.div<{ $accent?: boolean }>`
  padding: 12px; border-radius: ${t.radius.md};
  background: ${({ $accent }) => $accent ? `linear-gradient(135deg, ${t.colors.gold}12, ${t.colors.goldBright}08)` : t.colors.surfaceHover};
  border: 1px solid ${({ $accent }) => $accent ? t.colors.goldBorder : t.colors.border};
`
const MetricLabel = styled.div`font-size: 10px; color: ${t.colors.textDim}; margin-bottom: 4px; font-weight: 500;`
const MetricValue = styled.div<{ $color?: string }>`
  font-size: 16px; font-weight: 800; color: ${({ $color }) => $color || t.colors.text};
  font-variant-numeric: tabular-nums;
`

// ── Section ──
const Section = styled.div`
  padding: 16px 0; border-top: 1px solid ${t.colors.border};
  animation: ${fadeIn} 0.3s ease both;
`
const SectionHead = styled.button<{ $collapsed?: boolean }>`
  width: 100%; display: flex; align-items: center; gap: 8px;
  padding: 0; border: none; background: none; cursor: pointer; text-align: right;
`
const STitle = styled.h3`font-size: 14px; font-weight: 700; color: ${t.colors.text}; flex: 1;`
const SChevron = styled(ChevronDown)<{ $collapsed?: boolean }>`
  width: 14px; height: 14px; color: ${t.colors.textDim};
  transition: transform 0.2s; transform: ${({ $collapsed }) => $collapsed ? 'rotate(-90deg)' : 'none'};
`
const SContent = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '2000px' : '0'};
  opacity: ${({ $open }) => $open ? 1 : 0};
  overflow: hidden; transition: max-height 0.35s ease, opacity 0.25s ease;
  padding-top: ${({ $open }) => $open ? '12px' : '0'};
`

function CollapsibleSection({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Section>
      <SectionHead onClick={() => setOpen(!open)} $collapsed={!open}>
        {icon}
        <STitle>{title}</STitle>
        <SChevron $collapsed={!open} />
      </SectionHead>
      <SContent $open={open}>{children}</SContent>
    </Section>
  )
}

// ── Info Row ──
const InfoRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; font-size: 13px;
`
const InfoLabel = styled.span`color: ${t.colors.textDim};`
const InfoValue = styled.span<{ $color?: string }>`font-weight: 600; color: ${({ $color }) => $color || t.colors.text};`

// ── Timeline ──
const TimelineWrap = styled.div`display: flex; flex-direction: column; gap: 4px;`
const TimelineRow = styled.div<{ $status: string }>`
  display: flex; align-items: center; gap: 8px; padding: 6px 8px;
  border-radius: ${t.radius.sm};
  background: ${({ $status }) => $status === 'current' ? `${t.colors.gold}12` : 'transparent'};
  opacity: ${({ $status }) => $status === 'future' ? 0.4 : 1};
`
const TimelineDot = styled.div<{ $status: string }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: ${({ $status }) => $status === 'completed' ? t.colors.success : $status === 'current' ? t.colors.gold : t.colors.textDim};
`

// ── Footer ──
const Footer = styled.div`
  position: sticky; bottom: 0; padding: 16px 20px;
  background: linear-gradient(transparent, ${t.colors.surface} 20%);
  display: flex; gap: 8px;
`

// ── Main Component ──
interface SidebarProps {
  plot: Plot | null
  open: boolean
  onClose: () => void
  onLead: () => void
  onNavigate: (id: string) => void
}

export default function Sidebar({ plot, open, onClose, onLead, onNavigate }: SidebarProps) {
  if (!plot) return null

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

  return (
    <Panel $open={open}>
      <TopBar />

      <Header>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Badge $color={statusColors[status]}>{statusLabels[status]}</Badge>
            <Badge $color={grade.color}>{grade.grade}</Badge>
            {dom && <Badge $color={dom.color}>{dom.label}</Badge>}
          </div>
          <PlotTitle>גוש {d.block} | חלקה {plot.number}</PlotTitle>
          <PlotCity>{plot.city} · {zoningLabels[d.zoning] || d.zoning}</PlotCity>
        </div>
        <CloseBtn onClick={onClose}><X size={18} /></CloseBtn>
      </Header>

      <MetricsRow>
        <MetricCard $accent>
          <MetricLabel>מחיר</MetricLabel>
          <MetricValue $color={t.colors.goldBright}>{fmt.compact(d.price)}</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>שטח</MetricLabel>
          <MetricValue>{fmt.dunam(d.size)} דונם</MetricValue>
        </MetricCard>
        <MetricCard>
          <MetricLabel>תשואה</MetricLabel>
          <MetricValue $color={t.colors.success}>+{fmt.pct(plotRoi)}</MetricValue>
        </MetricCard>
      </MetricsRow>

      <ScrollArea>
        {/* Investment */}
        <CollapsibleSection title="ניתוח השקעה" icon={<TrendingUp size={16} color={t.colors.gold} />}>
          <InfoRow>
            <InfoLabel>ציון השקעה</InfoLabel>
            <InfoValue $color={grade.color}>{score}/10 ({grade.grade})</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>שווי חזוי</InfoLabel>
            <InfoValue $color={t.colors.success}>{fmt.price(d.projected)}</InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>רווח גולמי</InfoLabel>
            <InfoValue>{fmt.price(d.projected - d.price)}</InfoValue>
          </InfoRow>
          {cagr && (
            <InfoRow>
              <InfoLabel>צמיחה שנתית (CAGR)</InfoLabel>
              <InfoValue>{cagr.cagr}%/שנה ({cagr.years} שנים)</InfoValue>
            </InfoRow>
          )}
          <InfoRow>
            <InfoLabel>מחיר/מ"ר</InfoLabel>
            <InfoValue>{d.size > 0 ? fmt.price(Math.round(d.price / d.size)) : '—'}</InfoValue>
          </InfoRow>
          {monthly && (
            <InfoRow>
              <InfoLabel>החזר חודשי (50% מימון)</InfoLabel>
              <InfoValue>₪{monthly.monthly.toLocaleString()}/חודש</InfoValue>
            </InfoRow>
          )}
        </CollapsibleSection>

        {/* Zoning Timeline */}
        {timeline && (
          <CollapsibleSection title="התקדמות תכנונית" icon={<Building2 size={16} color={t.colors.gold} />}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.colors.textDim, marginBottom: 4 }}>
                <span>התקדמות</span>
                <span>{timeline.progress}%</span>
              </div>
              <div style={{ height: 4, background: t.colors.surfaceHover, borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${timeline.progress}%`, background: `linear-gradient(90deg, ${t.colors.gold}, ${t.colors.goldBright})`, borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <TimelineWrap>
              {timeline.stages.map((stage, i) => (
                <TimelineRow key={stage.key} $status={i < timeline.currentIdx ? 'completed' : i === timeline.currentIdx ? 'current' : 'future'}>
                  <TimelineDot $status={i < timeline.currentIdx ? 'completed' : i === timeline.currentIdx ? 'current' : 'future'} />
                  <span style={{ fontSize: 12 }}>{stage.label}</span>
                </TimelineRow>
              ))}
            </TimelineWrap>
            {d.readiness && (
              <InfoRow style={{ marginTop: 8 }}>
                <InfoLabel>אומדן מוכנות</InfoLabel>
                <InfoValue>{d.readiness}</InfoValue>
              </InfoRow>
            )}
          </CollapsibleSection>
        )}

        {/* Committees */}
        {plot.committees && (
          <CollapsibleSection title="ועדות תכנון" icon={<Shield size={16} color={t.colors.gold} />}>
            {Object.entries(plot.committees).map(([key, c]) => {
              const statusMap: Record<string, { label: string; color: string }> = {
                approved: { label: 'מאושר', color: t.colors.success },
                in_preparation: { label: 'בהכנה', color: t.colors.warning },
                pending: { label: 'ממתין', color: t.colors.warning },
                in_discussion: { label: 'בדיון', color: t.colors.info },
                not_started: { label: 'טרם החל', color: t.colors.textDim },
              }
              const s = statusMap[c.status] || { label: c.status, color: t.colors.textDim }
              return (
                <InfoRow key={key}>
                  <InfoLabel>{c.label}</InfoLabel>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.date && <span style={{ fontSize: 11, color: t.colors.textDim }}>{c.date}</span>}
                    <Badge $color={s.color}>{s.label}</Badge>
                  </div>
                </InfoRow>
              )
            })}
          </CollapsibleSection>
        )}

        {/* Location */}
        <CollapsibleSection title="מיקום ונגישות" icon={<MapPin size={16} color={t.colors.gold} />}>
          {d.seaDist != null && <InfoRow><InfoLabel>🌊 מרחק מהים</InfoLabel><InfoValue>{d.seaDist} מ׳</InfoValue></InfoRow>}
          {d.parkDist != null && <InfoRow><InfoLabel>🌳 מרחק מפארק</InfoLabel><InfoValue>{(plot.distance_to_park ?? plot.distanceToPark ?? 0)} מ׳</InfoValue></InfoRow>}
          {plot.distance_to_hospital ?? plot.distanceToHospital ? <InfoRow><InfoLabel>🏥 מרחק מבי"ח</InfoLabel><InfoValue>{(plot.distance_to_hospital ?? plot.distanceToHospital ?? 0)} מ׳</InfoValue></InfoRow> : null}
          {center && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: t.colors.gold, marginTop: 8 }}
            >
              <Navigation size={13} /> נווט לחלקה <ExternalLink size={11} />
            </a>
          )}
        </CollapsibleSection>

        {/* Documents */}
        {plot.documents && plot.documents.length > 0 && (
          <CollapsibleSection title="מסמכים" icon={<FileText size={16} color={t.colors.gold} />} defaultOpen={false}>
            {plot.documents.map((doc, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, color: t.colors.textSec }}>
                <FileText size={13} color={t.colors.textDim} />
                {doc}
              </div>
            ))}
          </CollapsibleSection>
        )}

        {/* Description */}
        {plot.description && (
          <CollapsibleSection title="תיאור" icon={<FileText size={16} color={t.colors.gold} />} defaultOpen={false}>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: t.colors.textSec }}>{plot.description}</p>
          </CollapsibleSection>
        )}
      </ScrollArea>

      <Footer>
        <GoldButton onClick={onLead} style={{ flex: 1 }}>
          <Phone size={15} /> קבל פרטים
        </GoldButton>
        <CloseBtn onClick={() => onNavigate(plot.id)} style={{ width: 'auto', padding: '0 12px', gap: 4, display: 'flex', alignItems: 'center', fontSize: 12, color: t.colors.textSec }}>
          עמוד מלא <ChevronLeft size={14} />
        </CloseBtn>
      </Footer>
    </Panel>
  )
}

