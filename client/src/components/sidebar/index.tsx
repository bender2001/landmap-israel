/**
 * Sidebar orchestrator - composes all sidebar sub-components.
 * Default export preserves the original SidebarDetails interface.
 */
import { useState, useRef, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import styled from 'styled-components'
import { TrendingUp, BarChart3, BarChart, MapPin, Award, Shield, FileText, Image as ImageIcon, Eye, Maximize2, AlertTriangle, Building2, CheckCircle2, Clock } from 'lucide-react'
import { useLazyVisible } from '../../hooks/useUI'
import { usePlot } from '../../hooks/usePlots'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../../utils/constants'
import { formatCurrency, formatDunam } from '../../utils/format'
import { calcInvestmentScore, getScoreLabel } from '../../utils/investment'
import { plotCenter, calcPlotPerimeter } from '../../utils/geo'
import { calcInvestmentPnL } from '../../utils/plot'
import DataCompletenessBar from '../ui/DataCompletenessBar'
import { NOTE_TAGS } from '../../hooks/useUserData'
import { theme as themeTokens, media } from '../../styles/theme'

import SidebarShell from './SidebarShell'
import SidebarHeader from './SidebarHeader'
import QuickNavBar from './QuickNavBar'
import MetricsGrid from './MetricsGrid'
import ZoningSection from './ZoningSection'
import FinancialsSection from './FinancialsSection'
import LocationSection from './LocationSection'
import InvestmentSection from './InvestmentSection'
import GallerySection from './GallerySection'
import DocumentsSection from './DocumentsSection'
import SidebarFooter from './SidebarFooter'
import SimilarPlots from './SimilarPlots'
import { SectionSpinner, StaggerIn, InfoBadge, MobileOnlyBlock, GoldDivider, SummaryCard, SummaryGrid, ContextPanel, FooterRow, MiniBar, MiniBarTrack, MiniBarFill, pulseAnim } from './shared'
import type { SidebarDetailsProps } from './types'

/* ── Lazy-loaded sub-components ────────────────────────────── */

const ImageLightbox = lazy(() => import('../ui/ImageLightbox'))
const NeighborhoodRadar = lazy(() => import('../ui/NeighborhoodRadar'))
const LocationScore = lazy(() => import('../ui/LocationScore'))
const StreetViewPanel = lazy(() => import('../ui/StreetViewPanel'))
const DueDiligenceChecklist = lazy(() => import('../ui/DueDiligenceChecklist'))
const AreaComparisonWidget = lazy(() => import('../ui/AreaComparisonWidget'))
const RealTransactions = lazy(() => import('../RealTransactions'))
const PlanningInfo = lazy(() => import('../PlanningInfo'))

/* ── Collapsible section (local, with lazy visibility) ─────── */

import { ChevronDown } from 'lucide-react'
import { css, keyframes } from 'styled-components'

const staggerFadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const LStaggerIn = styled.div<{ $delay?: number }>`
  animation: ${staggerFadeIn} 0.4s ease both;
  animation-delay: ${({ $delay = 0 }) => $delay * 0.06}s;
`

const SectionHeaderBtn = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border: none;
  background: none;
  cursor: pointer;
  text-align: right;
`
const SectionNumber = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.gold};
  opacity: 0.5;
  width: 20px;
  flex-shrink: 0;
`
const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.slate[100]};
  flex: 1;
  text-align: right;
`
const SectionChevron = styled(ChevronDown)<{ $collapsed?: boolean }>`
  width: 16px;
  height: 16px;
  color: ${({ theme }) => theme.colors.slate[400]};
  transition: transform 0.2s ease;
  ${({ $collapsed }) => $collapsed && css`transform: rotate(-90deg);`}
`
const CollapseContent = styled.div<{ $open: boolean; $maxH: string }>`
  max-height: ${({ $open, $maxH }) => $open ? $maxH : '0px'};
  opacity: ${({ $open }) => $open ? 1 : 0};
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.25s ease;
`
const SIconWrap = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(200, 148, 42, 0.15);
`
const SpinnerWrap = styled.div`display: flex; align-items: center; justify-content: center; padding: 24px 0;`
const SpinnerCircle = styled.div`width: 20px; height: 20px; border-radius: 9999px; border: 2px solid rgba(200,148,42,0.3); border-top-color: ${({ theme }) => theme.colors.gold}; animation: spin 0.6s linear infinite; @keyframes spin { to { transform: rotate(360deg); } }`

interface CollapsibleSectionLocalProps {
  number: string; icon: React.ComponentType<any>; title: string; children: React.ReactNode; animClass?: string; sectionId?: string; defaultOpen?: boolean
}

function CollapsibleSection({ number, icon: Icon, title, children, animClass = '', sectionId, defaultOpen = true }: CollapsibleSectionLocalProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState('2000px')
  const [lazyRef, isNearViewport] = useLazyVisible({ rootMargin: '300px', skip: defaultOpen })

  useEffect(() => { if (isOpen && !hasBeenOpened) setHasBeenOpened(true) }, [isOpen, hasBeenOpened])
  useEffect(() => {
    if (!contentRef.current) return
    const target = isOpen ? `${contentRef.current.scrollHeight + 20}px` : '0px'
    if (target !== maxHeight) setMaxHeight(target)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const shouldRenderContent = hasBeenOpened && isNearViewport

  return (
    <LStaggerIn $delay={animClass ? parseInt(animClass.replace(/\D/g, '') || '0', 10) : 0} id={sectionId} ref={lazyRef}>
      <SectionHeaderBtn type="button" onClick={() => setIsOpen(prev => !prev)} aria-expanded={isOpen} aria-controls={sectionId ? `${sectionId}-content` : undefined}>
        <SectionNumber>{number}</SectionNumber>
        <SIconWrap><Icon style={{ width: 16, height: 16, color: themeTokens.colors.gold }} /></SIconWrap>
        <SectionTitle>{title}</SectionTitle>
        <SectionChevron $collapsed={!isOpen} />
      </SectionHeaderBtn>
      <CollapseContent ref={contentRef} $open={isOpen} $maxH={isOpen ? maxHeight : '0px'} id={sectionId ? `${sectionId}-content` : undefined} role="region">
        <div style={{ paddingBottom: 8 }}>
          {shouldRenderContent ? children : (
            isOpen && !isNearViewport ? <SpinnerWrap><SpinnerCircle /></SpinnerWrap> : null
          )}
        </div>
      </CollapseContent>
    </LStaggerIn>
  )
}

/* ── PlotNotes (inlined - kept local) ──────────────────────── */
// Importing the PlotNotes inline components would be excessive duplication.
// We keep PlotNotes as a lazy-loaded local import from a small helper.
import PlotNotes from './PlotNotes'

/* ── Market context bar ────────────────────────────────────── */

const MarketContextBar = styled.div`
  margin: 8px 16px 4px;
  ${media.sm} { margin: 8px 20px 4px; }
`
const MarketContextInner = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 8px 12px;
  direction: rtl;
`

/* ── Full-detail CTA ───────────────────────────────────────── */

const FullDetailCta = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px;
  background: linear-gradient(to right, rgba(200,148,42,0.1), rgba(200,148,42,0.05));
  border: 1px solid rgba(200, 148, 42, 0.2);
  border-radius: ${({ theme }) => theme.radii.xl};
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.gold};
  text-decoration: none;
  transition: all 0.2s;
  &:hover { background: linear-gradient(to right, rgba(200,148,42,0.15), rgba(200,148,42,0.1)); border-color: rgba(200, 148, 42, 0.3); }
  &:hover svg { transform: scale(1.1); }
  svg { transition: transform 0.2s; }
`

const ContentPad = styled.div`padding: 0 24px 24px;`

/* ── ROI stage styled ──────────────────────────────────────── */

const RoiStageRow = styled.div<{ $isCurrent?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radii.lg};
  ${({ $isCurrent }) => $isCurrent && css`
    background: rgba(200, 148, 42, 0.05);
    margin: 0 -4px;
    padding: 4px 8px;
  `}
`

/* ── Committee styled ──────────────────────────────────────── */

const CommitteeRow = styled.div`display: flex; align-items: flex-start; gap: 12px; position: relative;`
const CommitteeLine = styled.div`position: absolute; right: 15px; top: 32px; width: 2px; height: 32px; background: rgba(255,255,255,0.1);`
const CommitteeCircle = styled.div<{ $bg: string; $border: string }>`width: 32px; height: 32px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: ${({ $bg }) => $bg}; border: 1px solid ${({ $border }) => $border};`

const committeeStatusConfig: Record<string, any> = {
  approved: { icon: CheckCircle2, bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.5)', color: '#4ADE80', label: 'אושר' },
  pending: { icon: Clock, bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.5)', color: '#FACC15', label: 'ממתין' },
  in_preparation: { icon: Clock, bg: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.5)', color: '#60A5FA', label: 'בהכנה' },
  in_discussion: { icon: Clock, bg: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.5)', color: '#A78BFA', label: 'בדיון' },
  not_started: { icon: null, bg: 'rgba(100,116,139,0.2)', border: 'rgba(100,116,139,0.5)', color: '#94A3B8', label: 'טרם החל' },
}

const committeeLevels = [{ key: 'national', label: 'ארצית' }, { key: 'district', label: 'מחוזית' }, { key: 'local', label: 'מקומית' }]

/* ── Main component ────────────────────────────────────────── */

export default function SidebarDetails({
  plot: rawPlot, onClose, onOpenLeadModal, favorites, compareIds = [], onToggleCompare, allPlots = [], onSelectPlot, priceChange, personalNotes,
}: SidebarDetailsProps) {
  const needsEnrich = rawPlot && !rawPlot.plot_images && !rawPlot.plot_documents
  const { data: enrichedPlot, isLoading: isEnriching } = usePlot(needsEnrich ? rawPlot.id : null)
  const plot = useMemo(() => (needsEnrich && enrichedPlot ? { ...rawPlot, ...enrichedPlot } : rawPlot), [needsEnrich, enrichedPlot, rawPlot])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [gushCopied, setGushCopied] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (!plot) return null

  const totalPrice = plot.total_price ?? plot.totalPrice
  const projectedValue = plot.projected_value ?? plot.projectedValue
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM
  const blockNumber = plot.block_number ?? plot.blockNumber
  const zoningStage = plot.zoning_stage ?? plot.zoningStage
  const readinessEstimate = plot.readiness_estimate ?? plot.readinessEstimate
  const distanceToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distanceToPark = plot.distance_to_park ?? plot.distanceToPark
  const distanceToHospital = plot.distance_to_hospital ?? plot.distanceToHospital
  const areaContext = plot.area_context ?? plot.areaContext
  const nearbyDevelopment = plot.nearby_development ?? plot.nearbyDevelopment
  const taxAuthorityValue = plot.tax_authority_value ?? plot.taxAuthorityValue
  const standard22 = plot.standard22 ?? plot.standard_22

  const statusColor = statusColors[plot.status]
  const roi = Math.round((projectedValue - totalPrice) / totalPrice * 100)
  const pricePerDunam = formatCurrency(Math.round(totalPrice / sizeSqM * 1000))
  const bettermentLevy = formatCurrency(Math.round((projectedValue - totalPrice) * 0.5))
  const currentStageIndex = zoningPipelineStages.findIndex((s: any) => s.key === zoningStage)

  let sectionNum = 0

  /* ── Header content ──────────────────────────────────────── */
  const headerContent = (
    <SidebarHeader
      plot={plot}
      onClose={onClose}
      favorites={favorites}
      allPlots={allPlots}
      onSelectPlot={onSelectPlot}
      gushCopied={gushCopied}
      setGushCopied={setGushCopied}
    />
  )

  /* ── Footer content ──────────────────────────────────────── */
  const footerContent = (
    <SidebarFooter
      plot={plot}
      onOpenLeadModal={onOpenLeadModal}
      compareIds={compareIds}
      onToggleCompare={onToggleCompare}
      totalPrice={totalPrice}
      projectedValue={projectedValue}
      sizeSqM={sizeSqM}
      roi={roi}
      blockNumber={blockNumber}
      readinessEstimate={readinessEstimate}
    />
  )

  return (
    <>
      <SidebarShell
        isOpen={!!plot}
        onClose={onClose}
        plotLabel={`פרטי חלקה — גוש ${blockNumber} חלקה ${plot.number}`}
        headerContent={headerContent}
        footerContent={footerContent}
        scrollRef={scrollRef}
      >
        <QuickNavBar scrollRef={scrollRef} />

        {/* Mobile badges full set */}
        <MobileOnlyBlock>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            <InfoBadge $size="sm">{formatDunam(sizeSqM)} דונם ({sizeSqM.toLocaleString()} מ&quot;ר)</InfoBadge>
            <InfoBadge $size="sm" $color={themeTokens.colors.slate[300]}>{zoningLabels[zoningStage]}</InfoBadge>
            <InfoBadge $bg={statusColor + '14'} $border={statusColor + '35'} $color={statusColor} $size="sm" style={{ borderRadius: 9999 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, display: 'inline-block', background: statusColor }} />{statusLabels[plot.status]}
            </InfoBadge>
            {(() => { const score = calcInvestmentScore(plot); const { color } = getScoreLabel(score); return <InfoBadge $bg={`${color}14`} $border={`${color}35`} $color={color} $size="sm" style={{ borderRadius: 9999, fontWeight: 700 }}>\u2B50 {score}/10</InfoBadge> })()}
          </div>
        </MobileOnlyBlock>

        {/* Area Market Context Bar */}
        {(() => {
          if (!allPlots || allPlots.length < 3 || sizeSqM <= 0) return null
          const cityPlots = allPlots.filter((p: any) => (p.city === plot.city) && (p.total_price ?? p.totalPrice ?? 0) > 0)
          if (cityPlots.length < 2) return null
          const plotPsm = totalPrice / sizeSqM
          const psmValues: number[] = []
          let totalRoi = 0
          for (const p of cityPlots) { const pp = p.total_price ?? p.totalPrice ?? 0; const ps = p.size_sqm ?? p.sizeSqM ?? 1; const pj = p.projected_value ?? p.projectedValue ?? 0; if (pp > 0 && ps > 0) psmValues.push(pp / ps); if (pp > 0) totalRoi += ((pj - pp) / pp) * 100 }
          const avgRoi = Math.round(totalRoi / cityPlots.length)
          const sorted = [...psmValues].sort((a, b) => a - b)
          const rank = sorted.filter(v => v <= plotPsm).length
          const percentile = Math.round((rank / sorted.length) * 100)
          const rankLabel = percentile <= 25 ? 'הזולה ביותר' : percentile <= 50 ? 'מתחת לממוצע' : percentile <= 75 ? 'מעל הממוצע' : 'היקרה ביותר'
          const rankColor = percentile <= 25 ? '#22C55E' : percentile <= 50 ? '#4ADE80' : percentile <= 75 ? '#FBBF24' : '#EF4444'
          return (
            <MarketContextBar>
              <MarketContextInner>
                <span style={{ fontSize: 10 }}>🏘️</span>
                <span style={{ fontSize: 10, color: themeTokens.colors.slate[500] }}>{cityPlots.length} חלקות ב{plot.city}</span>
                <span style={{ fontSize: 10, color: themeTokens.colors.slate[700] }}>\u2022</span>
                <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.8)' }}>\u2205 +{avgRoi}% ROI</span>
                <span style={{ fontSize: 10, color: themeTokens.colors.slate[700] }}>\u2022</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: rankColor }}>{rankLabel}</span>
                <MiniBar><MiniBarTrack><MiniBarFill $width={`${percentile}%`} $bg={rankColor} /></MiniBarTrack></MiniBar>
              </MarketContextInner>
            </MarketContextBar>
          )
        })()}

        <ContentPad>
          {/* Total Investment Summary */}
          {(() => {
            const readiness = readinessEstimate || ''
            const holdingYears = readiness.startsWith('1-3') ? 2 : readiness.startsWith('3-5') ? 4 : readiness.startsWith('5') ? 7 : 5
            const pnl = calcInvestmentPnL(plot, holdingYears)
            return (
              <StaggerIn $delay={1}><SummaryCard>
                <SummaryGrid>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: themeTokens.colors.slate[500], marginBottom: 2 }}>💰 סה״כ השקעה נדרשת</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#60A5FA' }}>{formatCurrency(pnl.totalInvestment)}</div>
                    <div style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>כולל מיסים, שכ״ט + {holdingYears}ש׳ החזקה</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: themeTokens.colors.slate[500], marginBottom: 2 }}>\u2728 רווח נקי צפוי</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: pnl.netProfit >= 0 ? '#34D399' : '#F87171' }}>{formatCurrency(pnl.netProfit)}</div>
                    <div style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>אחרי הכל \u00B7 {pnl.trueRoi}% ROI נטו</div>
                  </div>
                </SummaryGrid>
                {pnl.totalHoldingCosts > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 9 }}>
                    <span style={{ color: themeTokens.colors.slate[600] }}>ארנונה + ניהול: {formatCurrency(pnl.annual.totalAnnual)}/שנה</span>
                    <span style={{ color: themeTokens.colors.slate[700] }}>\u00B7</span>
                    <span style={{ color: 'rgba(249,115,22,0.6)' }}>סה״כ {holdingYears} שנים: {formatCurrency(pnl.totalHoldingCosts)}</span>
                  </div>
                )}
              </SummaryCard></StaggerIn>
            )
          })()}

          {/* Personal Notes */}
          {personalNotes && (
            <StaggerIn $delay={1} style={{ marginBottom: 12 }}>
              <PlotNotes plotId={plot.id} notes={personalNotes} />
            </StaggerIn>
          )}

          {/* Investment alerts */}
          <InvestmentSection plot={plot} allPlots={allPlots} totalPrice={totalPrice} sizeSqM={sizeSqM} priceChange={priceChange} />

          {/* Description */}
          {plot.description && <StaggerIn $delay={1}><p style={{ fontSize: 14, color: themeTokens.colors.slate[300], lineHeight: 1.6, marginBottom: 4 }}>{plot.description}</p></StaggerIn>}

          {/* Area Context */}
          {(areaContext || nearbyDevelopment) && (
            <StaggerIn $delay={2}><ContextPanel>
              {areaContext && <div style={{ display: 'flex', gap: 12, marginBottom: nearbyDevelopment ? 12 : 0 }}><div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(200,148,42,0.15)', flexShrink: 0, marginTop: 2 }}><MapPin style={{ width: 14, height: 14, color: themeTokens.colors.gold }} /></div><p style={{ fontSize: 14, color: themeTokens.colors.slate[300], lineHeight: 1.6, margin: 0 }}>{areaContext}</p></div>}
              {nearbyDevelopment && <div style={{ display: 'flex', gap: 12 }}><div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.15)', flexShrink: 0, marginTop: 2 }}><Building2 style={{ width: 14, height: 14, color: '#34D399' }} /></div><p style={{ fontSize: 12, color: themeTokens.colors.slate[400], lineHeight: 1.6, margin: 0 }}>{nearbyDevelopment}</p></div>}
            </ContextPanel></StaggerIn>
          )}

          {/* Location: distance chips, maps, POIs, commute */}
          <LocationSection plot={plot} distanceToSea={distanceToSea} distanceToPark={distanceToPark} distanceToHospital={distanceToHospital} blockNumber={blockNumber} />

          {/* Data Completeness */}
          <div style={{ marginTop: 12 }}><DataCompletenessBar plot={plot} variant="compact" /></div>

          {/* View Full Details */}
          <FullDetailCta href={`/plot/${plot.id}`} target="_blank" rel="noopener noreferrer">
            <Maximize2 style={{ width: 14, height: 14 }} /><span>צפה בדף המלא — מחשבון מימון, בדיקת נאותות ועוד</span>
          </FullDetailCta>

          <GoldDivider />

          {/* Committees */}
          {plot.committees && (
            <CollapsibleSection number={`0${++sectionNum}`} icon={Award} title="סטטוס ועדות" sectionId="section-committees">
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
                {committeeLevels.map((level, i) => {
                  const committee = plot.committees[level.key]
                  const status = committee?.status || 'not_started'
                  const config = committeeStatusConfig[status] || committeeStatusConfig.not_started
                  const StatusIcon = config.icon
                  return (
                    <CommitteeRow key={level.key}>
                      {i < committeeLevels.length - 1 && <CommitteeLine />}
                      <CommitteeCircle $bg={config.bg} $border={config.border}>
                        {StatusIcon ? <StatusIcon style={{ width: 16, height: 16, color: config.color }} /> : <span style={{ fontSize: 14, color: config.color }}>\u2014</span>}
                      </CommitteeCircle>
                      <div style={{ paddingBottom: 16 }}>
                        <div style={{ fontWeight: 500, color: themeTokens.colors.slate[200], fontSize: 14 }}>{level.label}</div>
                        <div style={{ fontSize: 12, color: config.color }}>{config.label}</div>
                        {committee?.date && <div style={{ fontSize: 12, color: themeTokens.colors.slate[500], marginTop: 2 }}>{committee.date}</div>}
                      </div>
                    </CommitteeRow>
                  )
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Standard 22 */}
          {standard22 && (
            <CollapsibleSection number={`0${++sectionNum}`} icon={Award} title="הערכת שמאי - תקן 22">
              <div style={{ background: 'linear-gradient(to right, rgba(200,148,42,0.05), rgba(200,148,42,0.1))', border: '1px solid rgba(200,148,42,0.2)', borderRadius: 16, padding: 16, marginBottom: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div><div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>שמאי</div><div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{standard22.appraiser}</div></div>
                  <div><div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>תאריך</div><div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{standard22.date}</div></div>
                  <div><div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>שווי מוערך</div><div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{formatCurrency(standard22.value)}</div></div>
                  <div><div style={{ fontSize: 12, color: themeTokens.colors.slate[400] }}>מתודולוגיה</div><div style={{ fontSize: 14, color: themeTokens.colors.slate[200], fontWeight: 500 }}>{standard22.methodology}</div></div>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Financial Section */}
          <CollapsibleSection number={`0${++sectionNum}`} icon={TrendingUp} title="נתונים פיננסיים" sectionId="section-financial">
            <MetricsGrid totalPrice={totalPrice} projectedValue={projectedValue} roi={roi} pricePerDunam={pricePerDunam} readinessEstimate={readinessEstimate} plot={plot} />
            <FinancialsSection plot={plot} totalPrice={totalPrice} projectedValue={projectedValue} sizeSqM={sizeSqM} roi={roi} readinessEstimate={readinessEstimate} taxAuthorityValue={taxAuthorityValue} allPlots={allPlots} bettermentLevy={bettermentLevy} />
          </CollapsibleSection>

          {/* Area Comparison */}
          <CollapsibleSection number={`0${++sectionNum}`} icon={BarChart} title="ביחס לאזור" sectionId="section-area-comparison" defaultOpen={false}>
            <Suspense fallback={<SectionSpinner />}><AreaComparisonWidget plot={plot} allPlots={allPlots} /></Suspense>
          </CollapsibleSection>

          {/* ROI Stages */}
          <CollapsibleSection number={`0${++sectionNum}`} icon={BarChart3} title="צפי השבחה לפי שלבי תכנון" sectionId="section-roi-stages">
            <div style={{ background: 'rgba(10,22,40,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {roiStages.map((stage: any, i: number) => {
                  const isCurrentStage = i === currentStageIndex
                  const isPast = i < currentStageIndex
                  const maxPrice = roiStages[roiStages.length - 1].pricePerSqM
                  const barWidth = (stage.pricePerSqM / maxPrice) * 100
                  return (
                    <RoiStageRow key={i} $isCurrent={isCurrentStage}>
                      <div style={{ width: 90, flexShrink: 0 }}><span style={{ fontSize: 10, lineHeight: 1.2, color: isCurrentStage ? themeTokens.colors.gold : isPast ? 'rgba(74,222,128,0.7)' : themeTokens.colors.slate[500], fontWeight: isCurrentStage ? 700 : 400 }}>{stage.label}</span></div>
                      <div style={{ flex: 1, height: 10, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 9999, transition: 'all 0.5s', width: `${barWidth}%`, background: isCurrentStage ? 'linear-gradient(90deg, #C8942A, #E5B94E)' : isPast ? 'rgba(34,197,94,0.4)' : 'rgba(148,163,184,0.15)' }} />
                      </div>
                      <span style={{ fontSize: 10, width: 56, textAlign: 'left', flexShrink: 0, color: isCurrentStage ? themeTokens.colors.gold : isPast ? 'rgba(74,222,128,0.7)' : themeTokens.colors.slate[500], fontWeight: isCurrentStage ? 700 : 400 }}>{stage.pricePerSqM.toLocaleString()}</span>
                    </RoiStageRow>
                  )
                })}
                <div style={{ fontSize: 9, color: themeTokens.colors.slate[500], textAlign: 'left', marginTop: 4 }}>* ש&quot;ח למ&quot;ר (הערכה ממוצעת)</div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Transactions */}
          <CollapsibleSection number={`0${++sectionNum}`} icon={BarChart3} title="עסקאות באזור" sectionId="section-transactions" defaultOpen={false}>
            <Suspense fallback={<SectionSpinner />}><RealTransactions plotId={plot.id} city={plot.city} /></Suspense>
          </CollapsibleSection>

          {/* Planning */}
          <CollapsibleSection number={`0${++sectionNum}`} icon={FileText} title='תכנון ותב"עות' sectionId="section-planning" defaultOpen={false}>
            <Suspense fallback={<SectionSpinner />}><PlanningInfo plotId={plot.id} city={plot.city} /></Suspense>
          </CollapsibleSection>

          <GoldDivider />

          {/* Zoning Pipeline */}
          <CollapsibleSection number={`0${++sectionNum}`} icon={MapPin} title="צינור תכנוני" sectionId="section-zoning">
            <ZoningSection plot={plot} zoningStage={zoningStage} readinessEstimate={readinessEstimate} currentStageIndex={currentStageIndex} />
          </CollapsibleSection>

          {/* Images */}
          {plot.plot_images && plot.plot_images.length > 0 && (
            <CollapsibleSection number={`0${++sectionNum}`} icon={ImageIcon} title={`תמונות (${plot.plot_images.length})`} sectionId="section-images">
              <GallerySection images={plot.plot_images} onOpenLightbox={(i) => { setLightboxIndex(i); setLightboxOpen(true) }} />
            </CollapsibleSection>
          )}

          {/* Documents */}
          {(() => {
            const docs = plot.plot_documents?.length ? plot.plot_documents : plot.documents?.length ? plot.documents : null
            if (!docs) return null
            return (
              <CollapsibleSection number={`0${++sectionNum}`} icon={FileText} title="מסמכים ותוכניות">
                <DocumentsSection docs={docs} isEnriching={isEnriching} hasPlotDocuments={!!plot.plot_documents} />
              </CollapsibleSection>
            )
          })()}

          {/* Quality / Location Score */}
          {(distanceToSea != null || distanceToPark != null || distanceToHospital != null) && (
            <CollapsibleSection number={`0${++sectionNum}`} icon={Shield} title="מיקום, סביבה וסיכון" sectionId="section-quality">
              <Suspense fallback={<SectionSpinner />}><LocationScore plot={plot} allPlots={allPlots} /></Suspense>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '16px 0' }} />
              <Suspense fallback={<SectionSpinner />}><NeighborhoodRadar distanceToSea={distanceToSea} distanceToPark={distanceToPark} distanceToHospital={distanceToHospital} roi={roi} investmentScore={calcInvestmentScore(plot)} /></Suspense>
            </CollapsibleSection>
          )}
          {distanceToSea == null && distanceToPark == null && distanceToHospital == null && allPlots.length >= 2 && (
            <CollapsibleSection number={`0${++sectionNum}`} icon={Shield} title="הערכת סיכון" sectionId="section-quality">
              <Suspense fallback={<SectionSpinner />}><LocationScore plot={plot} allPlots={allPlots} /></Suspense>
            </CollapsibleSection>
          )}

          {/* Street View */}
          {plot.coordinates && plot.coordinates.length >= 3 && (() => {
            const center = plotCenter(plot.coordinates)
            if (!center) return null
            return (
              <CollapsibleSection number="🛣️" icon={Eye} title="Street View — מבט מהקרקע" sectionId="section-streetview" defaultOpen={false}>
                <Suspense fallback={<SectionSpinner />}><StreetViewPanel lat={center.lat} lng={center.lng} /></Suspense>
              </CollapsibleSection>
            )
          })()}

          {/* Similar Plots */}
          <SimilarPlots currentPlot={plot} allPlots={allPlots} onSelectPlot={onSelectPlot || (() => {})} />

          {/* Due Diligence */}
          <div id="section-dd">
            <Suspense fallback={<SectionSpinner />}><DueDiligenceChecklist plotId={plot.id} /></Suspense>
          </div>

          {/* Footer row */}
          <FooterRow>
            <a href={`mailto:info@landmapisrael.com?subject=${encodeURIComponent(`דיווח על אי-דיוק — גוש ${blockNumber} חלקה ${plot.number}`)}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: themeTokens.colors.slate[500], textDecoration: 'none' }} title="דווח על מידע שגוי">
              <AlertTriangle style={{ width: 12, height: 12 }} /><span>דיווח על אי-דיוק</span>
            </a>
            <span style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>
              עודכן {(() => { const d = plot.updated_at ?? plot.updatedAt ?? plot.created_at ?? plot.createdAt; if (!d) return '\u2014'; return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) })()}
            </span>
          </FooterRow>
        </ContentPad>
      </SidebarShell>

      {/* Image Lightbox */}
      {plot.plot_images && plot.plot_images.length > 0 && lightboxOpen && (
        <Suspense fallback={null}>
          <ImageLightbox images={plot.plot_images} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
        </Suspense>
      )}
    </>
  )
}
