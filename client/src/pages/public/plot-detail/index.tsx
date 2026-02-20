import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { media } from '../../../styles/theme'
import { usePlot } from '../../../hooks/usePlots'
import { useMarketOverview } from '../../../hooks/useMarket'
import { useLastVisitPrice } from '../../../hooks/useTracking'
import { useFavorites } from '../../../hooks/useUserData'
import { useViewTracker } from '../../../hooks/useTracking'
import { useLocalStorage } from '../../../hooks/useInfra'
import { useThemeColor, themeColors } from '../../../hooks/useSEO'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages } from '../../../utils/constants'
import { formatCurrency, formatDunam } from '../../../utils/format'
import { calcInvestmentScore, getScoreLabel, calcCAGR } from '../../../utils/investment'
import PublicNav from '../../../components/PublicNav'
import PublicFooter from '../../../components/PublicFooter'
import Breadcrumb from '../../../components/ui/Breadcrumb'
import type { Plot, CAGRResult } from '../../../types'

import PlotDetailSkeleton from './PlotDetailSkeleton'
import PlotDetailError from './PlotDetailError'
import HeroSection from './HeroSection'
import KeyMetricsRow from './KeyMetricsRow'
import InvestmentAnalysis from './InvestmentAnalysis'
import LocationDetails from './LocationDetails'
import FinancialBreakdown from './FinancialBreakdown'
import DocumentsGallery from './DocumentsGallery'
import SimilarPlots from './SimilarPlots'
import PlotDetailCTA from './PlotDetailCTA'

/* ── Preloading ── */
const chunkPreloaders = [
  () => import('../../../components/ui/PriceTrendChart'),
  () => import('../../../components/ui/InvestmentProjection'),
  () => import('../../../components/ui/NeighborhoodRadar'),
  () => import('../../../components/ui/InvestmentBenchmark'),
  () => import('../../../components/ui/DueDiligenceChecklist'),
  () => import('../../../components/ui/ShareMenu'),
  () => import('../../../components/LeadModal'),
]
let _chunksPreloaded = false
function preloadPlotDetailChunks(): void {
  if (_chunksPreloaded) return
  _chunksPreloaded = true
  const schedule = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (fn: () => void) => setTimeout(fn, 200)
  schedule(() => { chunkPreloaders.forEach(loader => loader().catch(() => {})) })
}

/* ── Animations ── */
const pulseAnim = keyframes`0%,100%{opacity:1}50%{opacity:0.6}`

/* ── Page styled ── */
const PageWrap = styled.div`min-height: 100vh; width: 100%; background: ${({ theme }) => theme.colors.navy}; direction: rtl;`
const BackgroundGrid = styled.div`
  position: fixed; inset: 0; opacity: 0.05; pointer-events: none;
  background-image: linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px);
  background-size: 40px 40px;
`
const ContentZone = styled.div`position: relative; z-index: 10; padding-top: 80px; padding-bottom: 112px;`
const MaxWidth = styled.div`max-width: 896px; margin: 0 auto; padding-left: 16px; padding-right: 16px; ${media.sm} { padding-left: 24px; padding-right: 24px; }`
const TwoColGrid = styled.div`display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 32px; ${media.lg} { grid-template-columns: repeat(2, 1fr); }`
const ColStack = styled.div`display: flex; flex-direction: column; gap: 16px;`

/* ── Sticky bar ── */
const StatusBar = styled.div<{ $color: string }>`width: 6px; height: 32px; border-radius: 9999px; flex-shrink: 0; background: ${({ $color }) => $color};`
const StickyBarOuter = styled.div<{ $visible: boolean }>`
  position: fixed; top: 0; left: 0; right: 0; z-index: 56; transition: all 0.3s ease;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transform: translateY(${({ $visible }) => $visible ? '0' : '-100%'});
  pointer-events: ${({ $visible }) => $visible ? 'auto' : 'none'}; direction: rtl;
`
const StickyBarInner = styled.div`background: rgba(10,22,40,0.92); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.08); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);`
const StickyBarContent = styled.div`max-width: 896px; margin: 0 auto; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; ${media.sm} { padding: 8px 24px; }`
const StickyBarTitle = styled.div`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[100]}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const StickyBarCity = styled.div`font-size: 10px; color: ${({ theme }) => theme.colors.slate[500]}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const StickyPrice = styled.span`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.gold};`

/* ── Section Nav ── */
const SectionNavFixed = styled.div<{ $visible: boolean }>`
  position: fixed; top: 68px; left: 0; right: 0; z-index: 54; transition: all 0.3s ease;
  opacity: ${({ $visible }) => $visible ? 1 : 0}; transform: translateY(${({ $visible }) => $visible ? '0' : '-8px'});
`
const SectionNavBar = styled.div`background: rgba(10,22,40,0.85); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.05);`
const SectionNavInner = styled.div`max-width: 896px; margin: 0 auto; padding: 0 16px; ${media.sm} { padding: 0 24px; }`
const SectionNavScroll = styled.div`display: flex; align-items: center; gap: 4px; padding: 6px 0; overflow-x: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; }`
const SectionNavBtn = styled.button<{ $active: boolean }>`
  display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: 500;
  white-space: nowrap; flex-shrink: 0; transition: all 0.2s ease; cursor: pointer;
  ${({ $active, theme }) => $active
    ? css`background: rgba(200,148,42,0.15); color: ${theme.colors.gold}; border: 1px solid rgba(200,148,42,0.25);`
    : css`background: rgba(255,255,255,0.02); color: ${theme.colors.slate[500]}; border: 1px solid transparent; &:hover { background: rgba(255,255,255,0.05); color: ${theme.colors.slate[300]}; }`}
`
const ProgressBarTrack = styled.div`position: fixed; top: 64px; left: 0; right: 0; z-index: 55; height: 2px; background: rgba(255,255,255,0.05);`
const ProgressBarFill = styled.div<{ $progress: number }>`
  height: 100%; transform-origin: left; will-change: transform; transform: scaleX(${({ $progress }) => $progress});
  background: linear-gradient(90deg, #C8942A, #E5B84B, #C8942A);
  box-shadow: ${({ $progress }) => $progress > 0.5 ? '0 0 6px rgba(200,148,42,0.35)' : 'none'};
`

/* ── Interfaces ── */
interface ComputedPlot {
  totalPrice: number; projectedValue: number; sizeSqM: number; blockNumber: string
  roi: number; pricePerDunam: string; readiness: string | undefined; zoningStage: string; currentStageIndex: number
}
interface SectionAnchor { id: string; label: string; emoji: string }

const SECTION_ANCHORS: SectionAnchor[] = [
  { id: 'section-financial', label: '\u05E4\u05D9\u05E0\u05E0\u05E1\u05D9', emoji: '\uD83D\uDCB0' },
  { id: 'section-location', label: '\u05DE\u05D9\u05E7\u05D5\u05DD', emoji: '\uD83D\uDCCD' },
  { id: 'section-projection', label: '\u05EA\u05D7\u05D6\u05D9\u05EA', emoji: '\uD83D\uDCC8' },
  { id: 'section-timeline', label: '\u05E6\u05D9\u05E8 \u05D6\u05DE\u05DF', emoji: '\u23F3' },
  { id: 'section-planning', label: '\u05EA\u05DB\u05E0\u05D5\u05DF', emoji: '\uD83D\uDCCB' },
  { id: 'section-costs', label: '\u05E2\u05DC\u05D5\u05D9\u05D5\u05EA', emoji: '\uD83E\uDDFE' },
  { id: 'section-documents', label: '\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD', emoji: '\uD83D\uDCC4' },
  { id: 'section-similar', label: '\u05D3\u05D5\u05DE\u05D5\u05EA', emoji: '\uD83C\uDFAF' },
]

/* ── Schema helpers ── */
function JsonLdSchema({ plot }: { plot: Plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = plot.total_price ?? plot.totalPrice
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM
  const schema = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: `\u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${plot.number} - ${plot.city}`,
    description: plot.description || `\u05E7\u05E8\u05E7\u05E2 \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4 \u05D1${plot.city}, \u05E9\u05D8\u05D7 ${formatDunam(sizeSqM as number)} \u05D3\u05D5\u05E0\u05DD`,
    url: window.location.href,
    offers: { '@type': 'Offer', price, priceCurrency: 'ILS', availability: plot.status === 'AVAILABLE' ? 'https://schema.org/InStock' : plot.status === 'SOLD' ? 'https://schema.org/SoldOut' : 'https://schema.org/PreOrder' },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

function PlotFaqSchema({ plot }: { plot: Plot }) {
  const blockNum = plot.block_number ?? plot.blockNumber
  const price = (plot.total_price ?? plot.totalPrice) as number
  const sizeSqM = (plot.size_sqm ?? plot.sizeSqM) as number
  const projected = (plot.projected_value ?? plot.projectedValue) as number
  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  const readiness = (plot.readiness_estimate ?? plot.readinessEstimate) as string | undefined
  const zoning = (plot.zoning_stage ?? plot.zoningStage) as string
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [
    { '@type': 'Question', name: `\u05DE\u05D4 \u05D4\u05DE\u05D7\u05D9\u05E8 \u05E9\u05DC \u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${plot.number} \u05D1${plot.city}?`, acceptedAnswer: { '@type': 'Answer', text: `\u05D4\u05DE\u05D7\u05D9\u05E8: \u20AA${price.toLocaleString()}. \u05E9\u05D8\u05D7: ${sizeSqM > 0 ? (sizeSqM/1000).toFixed(1) : '\u2014'} \u05D3\u05D5\u05E0\u05DD.` } },
    { '@type': 'Question', name: `\u05DE\u05D4 \u05D4\u05EA\u05E9\u05D5\u05D0\u05D4 \u05D4\u05E6\u05E4\u05D5\u05D9\u05D4?`, acceptedAnswer: { '@type': 'Answer', text: `+${roi}%. \u05E9\u05D5\u05D5\u05D9 \u05E6\u05E4\u05D5\u05D9: \u20AA${projected.toLocaleString()}.${readiness ? ` \u05D6\u05DE\u05DF \u05DE\u05E9\u05D5\u05E2\u05E8: ${readiness}.` : ''}` } },
  ]}
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
}

/* ── Main Component ── */
export default function PlotDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: plot, isLoading, error } = usePlot(id) as { data: Plot | undefined; isLoading: boolean; error: any }
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const favorites = useFavorites() as any
  const { trackView } = useViewTracker()
  const [compareIds, setCompareIds] = useLocalStorage<string[]>('landmap_compare', [])
  const { data: marketData } = useMarketOverview() as { data: any }
  const [nearbyPlots, setNearbyPlots] = useState<Plot[]>([])
  const [stickyVisible, setStickyVisible] = useState(false)
  const [sectionNavVisible, setSectionNavVisible] = useState(false)
  const [activeAnchor, setActiveAnchor] = useState('')
  const [readingProgress, setReadingProgress] = useState(0)

  useThemeColor(themeColors.detail)

  const toggleCompare = useCallback((plotId: string) => {
    setCompareIds((prev: string[]) => prev.includes(plotId) ? prev.filter((cid: string) => cid !== plotId) : prev.length < 3 ? [...prev, plotId] : prev)
  }, [])

  const handleNearbyLoaded = useCallback((plots: Plot[]) => setNearbyPlots(plots), [])

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      const sectionId = hash.startsWith('section-') ? hash : `section-${hash}`
      const timer = setTimeout(() => {
        const el = document.getElementById(sectionId)
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' })
      }, 600)
      return () => clearTimeout(timer)
    } else { window.scrollTo(0, 0) }
    preloadPlotDetailChunks()
  }, [id])

  useEffect(() => { if (id) trackView(id) }, [id, trackView])

  useEffect(() => {
    if (plot) {
      const blockNum = plot.block_number ?? plot.blockNumber
      const price = (plot.total_price ?? plot.totalPrice) as number
      const sizeSqM = (plot.size_sqm ?? plot.sizeSqM) as number
      document.title = `\u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${plot.number} - ${plot.city} | LandMap Israel`
      const setMeta = (attr: string, key: string, content: string) => {
        let el = document.querySelector(`meta[${attr}="${key}"]`)
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el) }
        ;(el as HTMLMetaElement).content = content
      }
      const desc = `\u05E7\u05E8\u05E7\u05E2 \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4 \u05D1\u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${plot.number}, ${plot.city}. \u05DE\u05D7\u05D9\u05E8: \u20AA${Math.round(price/1000)}K.`
      setMeta('name', 'description', desc)
      setMeta('property', 'og:title', `\u05D2\u05D5\u05E9 ${blockNum} \u05D7\u05DC\u05E7\u05D4 ${plot.number} - ${plot.city}`)
      setMeta('property', 'og:description', desc)
      setMeta('property', 'og:url', window.location.href)
    }
    return () => { document.title = 'LandMap Israel - \u05DE\u05E4\u05EA \u05E7\u05E8\u05E7\u05E2\u05D5\u05EA \u05DC\u05D4\u05E9\u05E7\u05E2\u05D4' }
  }, [plot])

  useEffect(() => {
    const canonical = document.querySelector('link[rel="canonical"]') || (() => {
      const el = document.createElement('link'); el.setAttribute('rel', 'canonical'); document.head.appendChild(el); return el
    })()
    ;(canonical as HTMLLinkElement).href = `${window.location.origin}/plot/${id}`
    return () => (canonical as HTMLLinkElement).remove()
  }, [id])

  useEffect(() => {
    const handler = () => { setShowScrollTop(window.scrollY > 400); setStickyVisible(window.scrollY > 280); setSectionNavVisible(window.scrollY > 300) }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    let rafId: number | null = null
    const handler = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        if (docHeight <= 0) return
        setReadingProgress(Math.min(1, Math.max(0, window.scrollY / docHeight)))
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => { window.removeEventListener('scroll', handler); if (rafId) cancelAnimationFrame(rafId) }
  }, [])

  useEffect(() => {
    const elements = SECTION_ANCHORS.map(a => document.getElementById(a.id)).filter(Boolean) as HTMLElement[]
    if (elements.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => { const vis = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio); if (vis.length > 0) setActiveAnchor(vis[0].target.id) },
      { rootMargin: '-80px 0px -40% 0px', threshold: [0, 0.25, 0.5] }
    )
    elements.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [plot])

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [])
  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }).catch(() => {})
  }, [])

  const computed = useMemo<ComputedPlot | null>(() => {
    if (!plot) return null
    const totalPrice = (plot.total_price ?? plot.totalPrice) as number
    const projectedValue = (plot.projected_value ?? plot.projectedValue) as number
    const sizeSqM = (plot.size_sqm ?? plot.sizeSqM) as number
    const blockNumber = (plot.block_number ?? plot.blockNumber) as string
    const roi = Math.round((projectedValue - totalPrice) / totalPrice * 100)
    const pricePerDunam = formatCurrency(Math.round(totalPrice / sizeSqM * 1000))
    const readiness = (plot.readiness_estimate ?? plot.readinessEstimate) as string | undefined
    const zoningStage = (plot.zoning_stage ?? plot.zoningStage) as string
    const currentStageIndex = zoningPipelineStages.findIndex((s: any) => s.key === zoningStage)
    return { totalPrice, projectedValue, sizeSqM, blockNumber, roi, pricePerDunam, readiness, zoningStage, currentStageIndex }
  }, [plot])

  const lastVisitPrice = useLastVisitPrice(id as string, computed?.totalPrice) as any

  const handleCopyInvestmentCard = useCallback(() => {
    if (!plot || !computed) return
    const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, readiness, zoningStage } = computed
    const score = calcInvestmentScore(plot)
    const { label: scoreLabel } = getScoreLabel(score)
    const cagrData = calcCAGR(roi, readiness) as CAGRResult | null
    const card = [`\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`, `\uD83C\uDFD7\uFE0F *\u05D2\u05D5\u05E9 ${blockNumber} | \u05D7\u05DC\u05E7\u05D4 ${plot.number}*`, `\uD83D\uDCCD ${plot.city}`, ``, `\uD83D\uDCB0 \u05DE\u05D7\u05D9\u05E8: ${formatCurrency(totalPrice)}`, `\uD83D\uDCC8 \u05EA\u05E9\u05D5\u05D0\u05D4: *+${roi}%*`, cagrData ? `\uD83D\uDCCA CAGR: ${cagrData.cagr}%/\u05E9\u05E0\u05D4` : null, `\u2B50 \u05E6\u05D9\u05D5\u05DF: ${score}/10 (${scoreLabel})`, `\uD83D\uDD17 ${window.location.href}`].filter(Boolean).join('\n')
    navigator.clipboard.writeText(card).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500) }).catch(() => {})
  }, [plot, computed])

  const handlePrintReport = useCallback(() => {
    if (!plot || !computed) return
    const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, readiness, zoningStage } = computed
    const score = calcInvestmentScore(plot)
    const { label: scoreLabel } = getScoreLabel(score)
    const pw = window.open('', '_blank')
    if (!pw) return
    pw.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>\u05D3\u05D5\u05F4\u05D7 \u05D4\u05E9\u05E7\u05E2\u05D4 - \u05D2\u05D5\u05E9 ${blockNumber} \u05D7\u05DC\u05E7\u05D4 ${plot.number}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;color:#1a1a2e;padding:40px;max-width:800px;margin:0 auto;line-height:1.6}h1{font-size:24px;margin-bottom:24px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:13px}.footer{margin-top:40px;text-align:center;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:16px}</style></head><body><h1>\uD83C\uDFD7\uFE0F \u05D3\u05D5\u05F4\u05D7 \u05D4\u05E9\u05E7\u05E2\u05D4 \u2014 \u05D2\u05D5\u05E9 ${blockNumber} | \u05D7\u05DC\u05E7\u05D4 ${plot.number} (${plot.city})</h1><div class="row"><span>\u05DE\u05D7\u05D9\u05E8</span><span style="font-weight:700">${formatCurrency(totalPrice)}</span></div><div class="row"><span>\u05E9\u05D5\u05D5\u05D9 \u05E6\u05E4\u05D5\u05D9</span><span style="color:#22C55E;font-weight:700">${formatCurrency(projectedValue)}</span></div><div class="row"><span>\u05EA\u05E9\u05D5\u05D0\u05D4</span><span style="color:#C8942A;font-weight:700">+${roi}%</span></div><div class="row"><span>\u05E6\u05D9\u05D5\u05DF</span><span>${score}/10 (${scoreLabel})</span></div><div class="footer"><div>LandMap Israel</div><div>${window.location.href}</div><div style="margin-top:8px;font-size:10px">\u26A0\uFE0F \u05D0\u05D9\u05E0\u05D5 \u05DE\u05D4\u05D5\u05D5\u05D4 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05D4\u05E9\u05E7\u05E2\u05D5\u05EA</div></div></body></html>`)
    pw.document.close()
    setTimeout(() => pw.print(), 300)
  }, [plot, computed])

  const handleSectionClick = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (!el) return
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' })
  }, [])

  // Loading state
  if (isLoading) return <PlotDetailSkeleton />

  // Error state
  if (error || !plot) return <PlotDetailError id={id} error={error} isLoading={isLoading} />

  // Main content
  const { totalPrice, projectedValue, sizeSqM, blockNumber, roi, pricePerDunam, readiness, zoningStage, currentStageIndex } = computed!
  const statusColor = statusColors[plot.status as string] || '#94A3B8'
  const distanceToSea = (plot as any).distance_to_sea ?? (plot as any).distanceToSea
  const distanceToPark = (plot as any).distance_to_park ?? (plot as any).distanceToPark
  const distanceToHospital = (plot as any).distance_to_hospital ?? (plot as any).distanceToHospital
  const areaContext = (plot as any).area_context ?? (plot as any).areaContext
  const images: any[] = (plot as any).plot_images || []
  const netRoi = (plot as any)._netRoi as number | undefined
  const investmentRank = (plot as any)._investmentRank as number | undefined
  const totalRanked = (plot as any)._totalRanked as number | undefined
  const buySignal = (plot as any)._buySignal as any
  const paybackYears = (plot as any)._paybackYears as number | undefined
  const cityAvgPriceSqm = (plot as any)._cityAvgPriceSqm as number | undefined

  return (
    <PageWrap>
      <PublicNav />

      {/* Reading progress */}
      {readingProgress > 0.01 && (
        <ProgressBarTrack><ProgressBarFill $progress={readingProgress} /></ProgressBarTrack>
      )}

      {/* Sticky info bar */}
      {stickyVisible && plot && computed && (
        <StickyBarOuter $visible={stickyVisible} dir="rtl">
          <StickyBarInner>
            <StickyBarContent>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <StatusBar $color={statusColor} />
                <div style={{ minWidth: 0 }}>
                  <StickyBarTitle>\u05D2\u05D5\u05E9 {blockNumber} | \u05D7\u05DC\u05E7\u05D4 {plot.number}</StickyBarTitle>
                  <StickyBarCity>{plot.city}</StickyBarCity>
                </div>
              </div>
              <div style={{ display: 'none', alignItems: 'center', gap: 12 }} className="sm-flex">
                <StickyPrice>{formatCurrency(totalPrice).replace(/\u20AA/, '\u20AA')}</StickyPrice>
              </div>
            </StickyBarContent>
          </StickyBarInner>
        </StickyBarOuter>
      )}

      {/* Section nav */}
      {sectionNavVisible && (
        <SectionNavFixed $visible={sectionNavVisible}>
          <SectionNavBar>
            <SectionNavInner>
              <SectionNavScroll dir="rtl" role="navigation">
                {SECTION_ANCHORS.filter(a => document.getElementById(a.id)).map(anchor => (
                  <SectionNavBtn key={anchor.id} $active={activeAnchor === anchor.id} onClick={() => handleSectionClick(anchor.id)}>
                    <span style={{ fontSize: 10 }}>{anchor.emoji}</span>
                    <span>{anchor.label}</span>
                  </SectionNavBtn>
                ))}
              </SectionNavScroll>
            </SectionNavInner>
          </SectionNavBar>
        </SectionNavFixed>
      )}

      <JsonLdSchema plot={plot} />
      <PlotFaqSchema plot={plot} />
      <BackgroundGrid />

      <ContentZone>
        <MaxWidth>
          <div style={{ marginBottom: 24 }}>
            <Breadcrumb items={[{ label: '\u05DE\u05E4\u05D4', to: '/' }, { label: plot.city, to: `/?city=${encodeURIComponent(plot.city)}` }, { label: `\u05D2\u05D5\u05E9 ${blockNumber} \u05D7\u05DC\u05E7\u05D4 ${plot.number}` }]} />
          </div>

          <HeroSection
            plot={plot} blockNumber={blockNumber} sizeSqM={sizeSqM} zoningStage={zoningStage}
            statusColor={statusColor} netRoi={netRoi} investmentRank={investmentRank}
            totalRanked={totalRanked} lastVisitPrice={lastVisitPrice} favorites={favorites}
            totalPrice={totalPrice} images={images} lightboxOpen={lightboxOpen}
            setLightboxOpen={setLightboxOpen} setLightboxIndex={setLightboxIndex}
          />

          <LocationDetails plot={plot} distanceToSea={distanceToSea} distanceToPark={distanceToPark} distanceToHospital={distanceToHospital} />

          <InvestmentAnalysis
            plot={plot} totalPrice={totalPrice} projectedValue={projectedValue}
            sizeSqM={sizeSqM} blockNumber={blockNumber} roi={roi} readiness={readiness}
            zoningStage={zoningStage} nearbyPlots={nearbyPlots} marketData={marketData}
            cityAvgPriceSqm={cityAvgPriceSqm}
          />

          <KeyMetricsRow
            plot={plot} totalPrice={totalPrice} projectedValue={projectedValue} roi={roi}
            pricePerDunam={pricePerDunam} readiness={readiness} netRoi={netRoi}
            buySignal={buySignal} paybackYears={paybackYears}
            investmentScore={calcInvestmentScore(plot)} zoningStage={zoningStage} sizeSqM={sizeSqM}
          />

          <TwoColGrid>
            <ColStack>
              <LocationDetails plot={plot} distanceToSea={distanceToSea} distanceToPark={distanceToPark} distanceToHospital={distanceToHospital} />
              <DocumentsGallery plot={plot} plotId={id as string} />
            </ColStack>
            <ColStack>
              <FinancialBreakdown
                plot={plot} totalPrice={totalPrice} projectedValue={projectedValue}
                sizeSqM={sizeSqM} roi={roi} readiness={readiness} zoningStage={zoningStage}
                currentStageIndex={currentStageIndex} areaContext={areaContext}
                distanceToSea={distanceToSea} distanceToPark={distanceToPark}
                distanceToHospital={distanceToHospital} plotId={id as string}
              />
            </ColStack>
          </TwoColGrid>

          <div id="section-similar">
            <SimilarPlots plotId={id as string} onNearbyLoaded={handleNearbyLoaded} />
          </div>
        </MaxWidth>
      </ContentZone>

      <PublicFooter />

      <PlotDetailCTA
        plot={plot} id={id as string} isLeadModalOpen={isLeadModalOpen}
        setIsLeadModalOpen={setIsLeadModalOpen} linkCopied={linkCopied}
        handleCopyLink={handleCopyLink} handleCopyInvestmentCard={handleCopyInvestmentCard}
        handlePrintReport={handlePrintReport} toggleCompare={toggleCompare}
        compareIds={compareIds} showScrollTop={showScrollTop} scrollToTop={scrollToTop}
        favorites={favorites} lightboxOpen={lightboxOpen} setLightboxOpen={setLightboxOpen}
        lightboxIndex={lightboxIndex} images={images}
      />
    </PageWrap>
  )
}
