import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled, { keyframes, createGlobalStyle } from 'styled-components'
import { ArrowRight, Heart, Navigation, MapPin, FileText, Calendar, Building2, Landmark, Clock, TrendingUp, TrendingDown, Shield, Share2, Copy, Check, Waves, TreePine, Hospital, Calculator, DollarSign, Percent, BarChart3, Ruler, Printer, AlertTriangle, Map as MapIcon, MessageCircle, Compass, ClipboardCopy, Construction, Milestone, Phone, GitCompareArrows, RotateCcw } from 'lucide-react'
import { t, sm, md, lg, fadeInUp } from '../theme'
import { usePlot, useFavorites, useCompare, useSimilarPlots, useRecentlyViewed, useAllPlots, usePlotCityRanking } from '../hooks'
import { Spinner, GoldButton, GhostButton, Badge, ErrorBoundary, AnimatedCard, ScrollToTop } from '../components/UI'
import { PublicLayout } from '../components/Layout'
import { p, roi, fmt, calcScore, calcScoreBreakdown, getGrade, calcCAGR, calcMonthly, calcTimeline, statusLabels, statusColors, zoningLabels, daysOnMarket, zoningPipeline, pricePerSqm, pricePerDunam, plotCenter, calcRisk, calcLocationScore, setOgMeta, removeOgMeta, SITE_CONFIG, calcExitScenarios, estimatedYear, satelliteTileUrl, investmentRecommendation } from '../utils'
import type { RiskAssessment } from '../utils'
import type { Plot } from '../types'

const LeadModal = lazy(() => import('../components/LeadModal'))

/* ── styled ── */
const Back = styled(Link)`display:inline-flex;align-items:center;gap:6px;color:${t.lTextSec};font-size:13px;font-weight:500;margin-bottom:16px;text-decoration:none!important;transition:color ${t.tr};&:hover{color:${t.gold};}`

/* ── Hero Satellite Banner ── */
const heroPanKf = keyframes`0%{transform:scale(1.08) translate(0,0)}50%{transform:scale(1.12) translate(-1%,-1%)}100%{transform:scale(1.08) translate(0,0)}`
const HeroBanner = styled.div`
  position:relative;width:100%;height:200px;margin-bottom:24px;border-radius:${t.r.xl};overflow:hidden;
  background:${t.lBorder};
  @media(min-width:768px){height:260px;}
  @media print{height:160px;page-break-inside:avoid;}
`
const HeroBannerImg = styled.img`
  width:100%;height:100%;object-fit:cover;display:block;
  animation:${heroPanKf} 25s ease-in-out infinite;
  @media(prefers-reduced-motion:reduce){animation:none;}
`
const HeroBannerOverlay = styled.div`
  position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,0.55) 100%);
  pointer-events:none;
`
const HeroBannerContent = styled.div`
  position:absolute;bottom:16px;left:20px;right:20px;z-index:2;
  display:flex;align-items:flex-end;justify-content:space-between;gap:12px;direction:rtl;
  @media(max-width:639px){bottom:12px;left:12px;right:12px;}
`
const HeroBannerTitle = styled.div`
  display:flex;flex-direction:column;gap:4px;
`
const HeroBannerHeadline = styled.h2`
  font-size:clamp(18px,3vw,26px);font-weight:900;color:#fff;margin:0;
  font-family:${t.font};text-shadow:0 2px 12px rgba(0,0,0,0.5);
`
const HeroBannerSub = styled.div`
  font-size:13px;color:rgba(255,255,255,0.85);font-weight:500;
  text-shadow:0 1px 4px rgba(0,0,0,0.4);
  display:flex;align-items:center;gap:8px;
`
const HeroBannerBadge = styled.span<{$bg:string;$c:string}>`
  display:inline-flex;align-items:center;gap:5px;padding:6px 14px;
  background:${pr=>pr.$bg};backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,0.2);border-radius:${t.r.full};
  font-size:13px;font-weight:800;color:${pr=>pr.$c};
  white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,0.3);
  text-shadow:none;
  @media(max-width:639px){font-size:12px;padding:5px 10px;}
`

/* ── Investment Recommendation Pill ── */
const RecoBadge = styled.span<{$color:string}>`
  display:inline-flex;align-items:center;gap:5px;padding:5px 14px;
  background:${pr=>pr.$color}14;border:1.5px solid ${pr=>pr.$color}35;
  border-radius:${t.r.full};font-size:13px;font-weight:800;color:${pr=>pr.$color};
  font-family:${t.font};white-space:nowrap;
  transition:all ${t.tr};
  &:hover{background:${pr=>pr.$color}1F;border-color:${pr=>pr.$color}50;}
`

/* ── Breadcrumbs ── */
const BreadcrumbNav = styled.nav`
  display:flex;align-items:center;gap:6px;margin-bottom:20px;direction:rtl;
  font-size:13px;font-family:${t.font};flex-wrap:wrap;
`
const BreadcrumbLink = styled(Link)`
  color:${t.lTextSec};text-decoration:none!important;transition:color ${t.tr};font-weight:500;
  &:hover{color:${t.gold};}
`
const BreadcrumbSep = styled.span`color:${t.lBorder};font-size:11px;`
const BreadcrumbCurrent = styled.span`color:${t.lText};font-weight:600;`

function Breadcrumbs({ plot }: { plot: Plot }) {
  const d = p(plot)
  return (
    <BreadcrumbNav aria-label="ניווט">
      <BreadcrumbLink to="/">ראשי</BreadcrumbLink>
      <BreadcrumbSep>/</BreadcrumbSep>
      <BreadcrumbLink to="/explore">חלקות</BreadcrumbLink>
      <BreadcrumbSep>/</BreadcrumbSep>
      <BreadcrumbLink to={`/explore?city=${encodeURIComponent(plot.city)}`}>{plot.city}</BreadcrumbLink>
      <BreadcrumbSep>/</BreadcrumbSep>
      <BreadcrumbCurrent>גוש {d.block} חלקה {plot.number}</BreadcrumbCurrent>
    </BreadcrumbNav>
  )
}

/* ── JSON-LD Structured Data ── */
function PlotJsonLd({ plot }: { plot: Plot }) {
  const d = p(plot), center = plotCenter(plot.coordinates)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: `גוש ${d.block} חלקה ${plot.number} - ${plot.city}`,
    description: plot.description || `חלקת קרקע להשקעה ב${plot.city}, גוש ${d.block} חלקה ${plot.number}`,
    url: window.location.href,
    ...(d.price > 0 && {
      offers: {
        '@type': 'Offer',
        price: d.price,
        priceCurrency: 'ILS',
        availability: plot.status === 'SOLD' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      },
    }),
    ...(center && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: center.lat,
        longitude: center.lng,
      },
    }),
    address: {
      '@type': 'PostalAddress',
      addressLocality: plot.city,
      addressCountry: 'IL',
    },
    ...(d.size > 0 && {
      floorSize: {
        '@type': 'QuantitativeValue',
        value: d.size,
        unitCode: 'MTK',
        unitText: 'מ״ר',
      },
    }),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ראשי', item: `${window.location.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'חלקות', item: `${window.location.origin}/explore` },
        { '@type': 'ListItem', position: 3, name: plot.city, item: `${window.location.origin}/explore?city=${encodeURIComponent(plot.city)}` },
        { '@type': 'ListItem', position: 4, name: `גוש ${d.block} חלקה ${plot.number}` },
      ],
    },
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
const Page = styled.div`max-width:1120px;margin:0 auto;padding:24px 24px 80px;direction:rtl;`
const TitleRow = styled.div`display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:24px;`
const TitleLeft = styled.div`display:flex;flex-direction:column;gap:8px;`
const Badges = styled.div`display:flex;align-items:center;gap:8px;flex-wrap:wrap;`
const Title = styled.h1`font-size:clamp(22px,3vw,30px);font-weight:800;color:${t.lText};font-family:${t.font};`
const Actions = styled.div`display:flex;gap:8px;`
const IconBtn = styled.button<{$active?:boolean}>`display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:${t.r.md};border:1px solid ${t.lBorder};background:${pr=>pr.$active?t.goldDim:'#fff'};color:${pr=>pr.$active?t.gold:t.lTextSec};cursor:pointer;transition:all ${t.tr};&:hover{border-color:${t.gold};color:${t.gold};}`

const Metrics = styled.div`display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:32px;${sm}{grid-template-columns:repeat(2,1fr);}${md}{grid-template-columns:repeat(3,1fr);}${lg}{grid-template-columns:repeat(5,1fr);}`
const Metric = styled(AnimatedCard)`padding:20px;background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};text-align:center;transition:all ${t.tr};&:hover{border-color:${t.goldBorder};box-shadow:${t.sh.glow};}`
const MetricVal = styled.div`font-size:24px;font-weight:800;color:${t.lText};font-family:${t.font};`
const MetricLabel = styled.div`font-size:12px;color:${t.lTextSec};margin-top:4px;`

const Grid = styled.div`display:grid;grid-template-columns:1fr;gap:24px;${lg}{grid-template-columns:1fr 360px;}`
const Card = styled(AnimatedCard)`background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;contain:layout style;`
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

const BottomBar = styled.div`
  position:fixed;bottom:0;left:0;right:0;z-index:40;
  background:rgba(255,255,255,0.97);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  border-top:1px solid ${t.lBorder};padding:12px 24px;
  display:flex;align-items:center;justify-content:center;gap:12px;direction:rtl;
  @media(max-width:639px){padding:10px 14px;gap:8px;}
`
const BarPrice = styled.span`font-size:20px;font-weight:800;color:${t.lText};font-family:${t.font};
  @media(max-width:639px){font-size:17px;}
`
const BarGradeBadge = styled.span<{$color:string}>`
  display:inline-flex;align-items:center;justify-content:center;
  padding:4px 12px;border-radius:${t.r.full};
  background:${pr=>pr.$color}14;border:1px solid ${pr=>pr.$color}30;
  font-size:13px;font-weight:800;color:${pr=>pr.$color};font-family:${t.font};
  @media(max-width:639px){padding:3px 9px;font-size:12px;}
`
const BarCallBtn = styled.a`
  display:inline-flex;align-items:center;justify-content:center;gap:5px;
  padding:12px 18px;border-radius:${t.r.full};
  background:#25D366;color:#fff;font-weight:700;font-size:14px;font-family:${t.font};
  text-decoration:none!important;cursor:pointer;transition:all ${t.tr};
  &:hover{box-shadow:0 4px 16px rgba(37,211,102,0.4);transform:translateY(-1px);}
  @media(max-width:639px){padding:10px 14px;font-size:13px;}
  @media(min-width:640px){display:none;}
`
const BarRoiBadge = styled.span<{$color:string}>`
  display:inline-flex;align-items:center;gap:4px;
  padding:4px 10px;border-radius:${t.r.full};
  background:${pr=>pr.$color}12;border:1px solid ${pr=>pr.$color}28;
  font-size:12px;font-weight:800;color:${pr=>pr.$color};font-family:${t.font};
  @media(max-width:639px){padding:3px 8px;font-size:11px;}
`
const BarProfit = styled.span`
  font-size:12px;font-weight:700;color:${t.ok};
  @media(max-width:639px){display:none;}
`
/* ── Updated At Indicator ── */
const UpdatedAtTag = styled.span`
  display:inline-flex;align-items:center;gap:4px;
  font-size:11px;font-weight:500;color:${t.lTextSec};
  padding:3px 10px;border-radius:${t.r.full};
  background:${t.lBg};border:1px solid ${t.lBorder};
`
/* ── Investment Highlights Card ── */
const HighlightsCard = styled(AnimatedCard)`
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border:1px solid ${t.goldBorder};border-radius:${t.r.lg};padding:20px;overflow:hidden;
  position:relative;
  &::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;
    background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);}
`
const HighlightItem = styled.div`
  display:flex;align-items:center;gap:10px;padding:8px 0;
  border-bottom:1px solid rgba(212,168,75,0.1);
  &:last-child{border-bottom:none;}
`
const HighlightIcon = styled.span`
  width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  background:rgba(212,168,75,0.12);font-size:14px;flex-shrink:0;
`
const HighlightText = styled.div`flex:1;min-width:0;`
const HighlightLabel = styled.div`font-size:11px;color:${t.lTextSec};font-weight:500;`
const HighlightVal = styled.div<{$c?:string}>`font-size:15px;font-weight:800;color:${pr=>pr.$c||t.lText};font-family:${t.font};`

const Center = styled.div`display:flex;align-items:center;justify-content:center;min-height:60vh;`

/* ── Reading Progress Bar (must be before PrintStyles which references it) ── */
const ReadingProgress = styled.div<{$pct:number}>`
  position:fixed;top:0;left:0;right:0;height:3px;z-index:999;pointer-events:none;
  background:transparent;
  &::after{
    content:'';position:absolute;top:0;left:0;height:100%;
    width:${pr => pr.$pct}%;
    background:linear-gradient(90deg,${t.gold},${t.goldBright});
    transition:width 0.1s linear;
    box-shadow:${pr => pr.$pct > 5 ? '0 0 8px rgba(212,168,75,0.4)' : 'none'};
  }
  @media print{display:none;}
`

/* ── Print Styles — professional investor report layout ── */
const PrintStyles = createGlobalStyle`
  @media print {
    /* Reset page for clean A4 printing */
    @page { margin: 16mm 12mm; size: A4; }
    body { background: #fff !important; color: #1a1a2e !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Hide non-essential UI */
    nav, header, footer, .chat-widget, .toast-container,
    [data-print-hide], button:not([data-print-show]) { display: none !important; }

    /* Show the bottom bar price info but hide CTA buttons */
    ${BottomBar} { display: none !important; }

    /* Hero banner: keep but reduce height for print */
    ${HeroBanner} {
      height: 120px !important;
      margin-bottom: 16px !important;
    }
    ${HeroBannerImg} { animation: none !important; }

    /* Ensure page content is visible and not clipped */
    ${Page} { max-width: 100% !important; padding: 0 !important; }

    /* Cards: remove shadows, ensure borders print */
    ${Card}, ${Metric}, ${HighlightsCard} {
      box-shadow: none !important;
      break-inside: avoid;
      border: 1px solid #ddd !important;
      page-break-inside: avoid;
    }

    /* Grid: single column for print */
    ${Grid} { grid-template-columns: 1fr !important; gap: 16px !important; }

    /* Metrics: compact grid */
    ${Metrics} { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }

    /* Values: ensure readable colors */
    ${MetricVal} { color: #1a1a2e !important; font-size: 20px !important; }
    ${Title} { color: #1a1a2e !important; font-size: 24px !important; }

    /* Add print header */
    ${Page}::before {
      content: 'LandMap Israel — דו״ח חלקה להשקעה';
      display: block;
      font-size: 10px;
      color: #888;
      text-align: center;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid #ddd;
    }

    /* Add print date */
    ${Page}::after {
      content: 'הודפס: ' attr(data-print-date);
      display: block;
      font-size: 9px;
      color: #aaa;
      text-align: center;
      padding-top: 12px;
      margin-top: 24px;
      border-top: 1px solid #eee;
    }

    /* Animations: disable */
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
    }

    /* Links: show URL */
    a[href^="http"]::after {
      content: " (" attr(href) ")";
      font-size: 9px;
      color: #888;
      font-weight: 400;
    }

    /* Hide reading progress bar */
    ${ReadingProgress} { display: none !important; }
  }
`

function useReadingProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const handler = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) { setProgress(0); return }
      setProgress(Math.min(100, Math.round((scrollTop / docHeight) * 100)))
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [])
  return progress
}

/* ── Mortgage Calculator ── */
const CalcWrap = styled.div`display:flex;flex-direction:column;gap:14px;`
const CalcSliderRow = styled.div`display:flex;flex-direction:column;gap:6px;`
const CalcSliderLabel = styled.div`display:flex;align-items:center;justify-content:space-between;font-size:12px;`
const CalcSliderName = styled.span`color:${t.lTextSec};font-weight:600;`
const CalcSliderVal = styled.span`color:${t.lText};font-weight:700;font-size:13px;font-family:${t.font};`
const CalcSlider = styled.input.attrs({ type: 'range' })`
  width:100%;height:6px;-webkit-appearance:none;appearance:none;outline:none;border-radius:3px;
  background:linear-gradient(90deg,${t.gold} 0%,${t.gold} var(--pct,50%),${t.lBorder} var(--pct,50%),${t.lBorder} 100%);
  &::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;
    background:linear-gradient(135deg,${t.gold},${t.goldBright});cursor:pointer;
    box-shadow:0 2px 8px rgba(212,168,75,0.35);transition:transform 0.15s;border:2px solid #fff;}
  &::-webkit-slider-thumb:hover{transform:scale(1.15);}
  &::-moz-range-thumb{width:18px;height:18px;border-radius:50%;
    background:linear-gradient(135deg,${t.gold},${t.goldBright});cursor:pointer;border:2px solid #fff;}
`
const CalcResult = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px;
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border:1px solid ${t.goldBorder};border-radius:${t.r.md};
`
const CalcResultItem = styled.div`text-align:center;`
const CalcResultVal = styled.div<{$gold?:boolean}>`font-size:18px;font-weight:800;color:${pr => pr.$gold ? t.gold : t.lText};font-family:${t.font};`
const CalcResultLabel = styled.div`font-size:11px;color:${t.lTextSec};margin-top:2px;`

/* ── City Ranking Card ── */
const RankGrid = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:12px;
  ${sm}{grid-template-columns:repeat(3,1fr);}
  @media(max-width:479px){grid-template-columns:1fr;}
`
const RankCell = styled.div<{$highlight?:boolean}>`
  display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;
  background:${pr=>pr.$highlight?'rgba(212,168,75,0.06)':t.lSurface};
  border:1px solid ${pr=>pr.$highlight?t.goldBorder:t.lBorder};border-radius:${t.r.md};
  text-align:center;transition:all 0.3s;
  &:hover{transform:translateY(-2px);box-shadow:${t.sh.sm};}
`
const RankVal = styled.div<{$c?:string}>`font-size:20px;font-weight:900;color:${pr=>pr.$c||t.lText};font-family:${t.font};`
const RankLabel = styled.div`font-size:11px;font-weight:600;color:${t.lTextSec};`
const RankDelta = styled.span<{$positive:boolean}>`
  display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:${t.r.full};
  font-size:11px;font-weight:700;
  background:${pr=>pr.$positive?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)'};
  color:${pr=>pr.$positive?t.ok:t.err};
`
const RankBar = styled.div`width:100%;height:6px;border-radius:3px;background:${t.lBorder};overflow:hidden;position:relative;`
const RankBarFill = styled.div<{$pct:number;$c:string}>`
  position:absolute;top:0;left:0;height:100%;width:${pr=>pr.$pct}%;
  background:${pr=>pr.$c};border-radius:3px;transition:width 0.8s ease;
`
const RankBarMarker = styled.div<{$pct:number}>`
  position:absolute;top:-4px;left:${pr=>pr.$pct}%;transform:translateX(-50%);
  width:14px;height:14px;border-radius:50%;background:${t.gold};
  border:2px solid ${t.lSurface};box-shadow:${t.sh.sm};z-index:1;
  transition:left 0.8s ease;
`
const PercentileBar = styled.div`
  width:100%;display:flex;flex-direction:column;gap:4px;margin-top:4px;
`
const PercentileLabel = styled.div`
  display:flex;justify-content:space-between;font-size:9px;color:${t.lTextSec};font-weight:600;
`

/* ── Similar Plots ── */
const SimilarGrid = styled.div`display:grid;grid-template-columns:1fr;gap:12px;${sm}{grid-template-columns:repeat(2,1fr);}`
const SimilarCard = styled(Link)`
  display:flex;flex-direction:column;gap:0;overflow:hidden;
  background:${t.lBg};border:1px solid ${t.lBorder};border-radius:${t.r.lg};
  text-decoration:none!important;color:inherit;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};box-shadow:${t.sh.md};transform:translateY(-3px);}
`
const SimilarThumb = styled.div<{$url:string}>`
  width:100%;height:80px;background-image:url(${pr=>pr.$url});background-size:cover;background-position:center;
  position:relative;
  &::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.45));}
`
const SimilarThumbOverlay = styled.div`
  position:absolute;bottom:6px;left:8px;right:8px;z-index:1;
  display:flex;align-items:center;justify-content:space-between;
`
const SimilarThumbPrice = styled.span`
  font-size:14px;font-weight:800;color:#fff;font-family:${t.font};
  text-shadow:0 1px 4px rgba(0,0,0,0.5);
`
const SimilarThumbGrade = styled.span<{$c:string}>`
  display:inline-flex;align-items:center;padding:2px 8px;border-radius:${t.r.full};
  background:${pr=>pr.$c}28;backdrop-filter:blur(6px);
  font-size:10px;font-weight:800;color:${pr=>pr.$c};border:1px solid ${pr=>pr.$c}40;
`
const SimilarBody = styled.div`padding:12px 14px;display:flex;flex-direction:column;gap:6px;`
const SimilarTop = styled.div`display:flex;align-items:center;justify-content:space-between;gap:8px;`
const SimilarCity = styled.span`font-size:13px;font-weight:700;color:${t.lText};`
const SimilarBlock = styled.span`font-size:11px;color:${t.lTextSec};`
const SimilarMetrics = styled.div`display:flex;align-items:center;gap:10px;flex-wrap:wrap;`
const SimilarCompareBar = styled.div`
  display:flex;align-items:center;gap:6px;margin-top:2px;
`
const SimilarCompareSegment = styled.div<{$pct:number;$c:string}>`
  height:4px;border-radius:2px;background:${pr=>pr.$c};
  width:${pr=>Math.max(8,Math.min(100,pr.$pct))}%;
  transition:width 0.6s ease;
`
const SimilarCompareLabel = styled.span`font-size:9px;color:${t.lTextSec};font-weight:600;white-space:nowrap;`
const SimilarMetric = styled.span`font-size:12px;color:${t.lTextSec};display:flex;align-items:center;gap:3px;`
const SimilarVal = styled.span<{$gold?:boolean}>`font-weight:700;color:${pr => pr.$gold ? t.gold : t.lText};`

/* ── Investment Projection Chart ── */
const ChartWrap = styled.div`
  width:100%;height:180px;position:relative;margin:16px 0 8px;
`
const ChartLabel = styled.div`
  position:absolute;font-size:10px;font-weight:700;color:${t.lTextSec};
  font-family:${t.font};pointer-events:none;
`
const ChartValueLabel = styled.div<{$gold?:boolean}>`
  font-size:11px;font-weight:800;color:${pr=>pr.$gold?t.gold:t.lText};font-family:${t.font};
  display:flex;align-items:center;gap:3px;
`
const ChartFooter = styled.div`display:flex;justify-content:space-between;align-items:center;margin-top:4px;`
const ChartCagrVal = styled.span`color:${t.gold};font-weight:800;`
function InvestmentProjectionChart({ price, projected, years }: { price: number; projected: number; years: number }) {
  if (price <= 0 || projected <= 0 || years <= 0) return null
  const w = 320, h = 140, padL = 8, padR = 8, padT = 20, padB = 30
  const cagr = Math.pow(projected / price, 1 / years) - 1
  // Generate data points for each year
  const points: { x: number; y: number; value: number; year: number }[] = []
  const maxVal = projected * 1.05
  const minVal = price * 0.95
  const range = maxVal - minVal
  for (let yr = 0; yr <= years; yr++) {
    const value = price * Math.pow(1 + cagr, yr)
    const x = padL + (yr / years) * (w - padL - padR)
    const y = padT + (1 - (value - minVal) / range) * (h - padT - padB)
    points.push({ x, y, value, year: yr })
  }
  const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${h - padB} L${points[0].x},${h - padB} Z`
  return (
    <ChartWrap>
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}
        role="img" aria-label={`תרשים צמיחת השקעה: מ-${fmt.compact(price)} ל-${fmt.compact(projected)} על פני ${years} שנים, צמיחה שנתית ${(cagr * 100).toFixed(1)}%`}
      >
        <title>תחזית צמיחת ערך החלקה</title>
        <desc>גרף המראה את עליית ערך החלקה מ-{fmt.compact(price)} ל-{fmt.compact(projected)} על פני {years} שנים</desc>
        <defs>
          <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.gold} stopOpacity="0.25" />
            <stop offset="100%" stopColor={t.gold} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={t.gold} />
            <stop offset="100%" stopColor={t.goldBright} />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          const y = padT + pct * (h - padT - padB)
          return <line key={pct} x1={padL} y1={y} x2={w - padR} y2={y} stroke={t.lBorder} strokeWidth="0.5" strokeDasharray="3 3" />
        })}
        {/* Year labels on X axis */}
        {points.filter((_, i) => i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)).map(pt => (
          <text key={pt.year} x={pt.x} y={h - 10} textAnchor="middle" fontSize="9" fontWeight="600" fill={t.lTextSec} fontFamily={t.font}>
            שנה {pt.year}
          </text>
        ))}
        {/* Area fill */}
        <path d={areaPath} fill="url(#projGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Start dot */}
        <circle cx={points[0].x} cy={points[0].y} r="4" fill={t.lBg} stroke={t.gold} strokeWidth="2" />
        {/* End dot */}
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill={t.gold} stroke={t.lBg} strokeWidth="2" />
        {/* Start label */}
        <text x={points[0].x + 4} y={points[0].y - 10} fontSize="10" fontWeight="700" fill={t.lTextSec} fontFamily={t.font}>
          {fmt.compact(price)}
        </text>
        {/* End label */}
        <text x={points[points.length - 1].x - 4} y={points[points.length - 1].y - 10} textAnchor="end" fontSize="11" fontWeight="800" fill={t.gold} fontFamily={t.font}>
          {fmt.compact(projected)}
        </text>
      </svg>
      <ChartFooter>
        <ChartValueLabel>📈 צמיחה שנתית: <ChartCagrVal>{(cagr * 100).toFixed(1)}%</ChartCagrVal></ChartValueLabel>
        <ChartValueLabel $gold>+{fmt.compact(projected - price)} רווח צפוי</ChartValueLabel>
      </ChartFooter>
    </ChartWrap>
  )
}

/* ── Mini Map ── */
const MiniMapWrap = styled.div`
  width:100%;height:260px;border-radius:${t.r.lg};overflow:hidden;border:1px solid ${t.lBorder};
  position:relative;cursor:grab;&:active{cursor:grabbing;}
`
const MiniMapOverlay = styled.div`
  position:absolute;bottom:10px;left:10px;z-index:400;display:flex;gap:6px;
`
const MiniMapBtn = styled.a`
  display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
  background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border:1px solid ${t.lBorder};
  border-radius:${t.r.sm};font-size:11px;font-weight:600;color:${t.lText};
  text-decoration:none!important;cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.gold};color:${t.gold};box-shadow:${t.sh.sm};}
`
const MiniMapToggle = styled.button<{$active?:boolean}>`
  display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
  background:${pr=>pr.$active?'rgba(212,168,75,0.15)':'rgba(255,255,255,0.95)'};
  backdrop-filter:blur(8px);
  border:1px solid ${pr=>pr.$active?t.goldBorder:t.lBorder};
  border-radius:${t.r.sm};font-size:11px;font-weight:600;
  color:${pr=>pr.$active?t.gold:t.lText};
  cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.gold};color:${t.gold};box-shadow:${t.sh.sm};}
`

/* ── Score Breakdown ── */
const ScoreBreakdownWrap = styled.div`
  margin-top:16px;padding-top:16px;border-top:1px solid ${t.lBorder};
`
const ScoreBreakdownTitle = styled.div`
  font-size:12px;font-weight:700;color:${t.lTextSec};margin-bottom:12px;
  display:flex;align-items:center;gap:6px;cursor:pointer;transition:color ${t.tr};
  &:hover{color:${t.gold};}
`
const ScoreBreakdownGrid = styled.div`display:flex;flex-direction:column;gap:10px;`
const ScoreFactorRow = styled.div`display:flex;align-items:center;gap:10px;`
const ScoreFactorIcon = styled.span`font-size:16px;flex-shrink:0;width:24px;text-align:center;`
const ScoreFactorLabel = styled.span`font-size:13px;font-weight:600;color:${t.lText};min-width:80px;`
const ScoreFactorBarTrack = styled.div`flex:1;height:8px;background:${t.lBorder};border-radius:4px;overflow:hidden;`
const ScoreFactorBarFill = styled.div<{$pct:number;$color:string}>`
  width:${pr=>pr.$pct}%;height:100%;border-radius:4px;transition:width 0.8s ease;
  background:linear-gradient(90deg,${pr=>pr.$color},${pr=>pr.$color}dd);
`
const ScoreFactorVal = styled.span`font-size:12px;font-weight:800;color:${t.lText};min-width:42px;text-align:left;font-family:${t.font};`
const ScoreFactorDetail = styled.span`font-size:11px;color:${t.lTextSec};min-width:80px;text-align:left;`

/* ── Nearby Amenities ── */
const AmenitiesGrid = styled.div`display:grid;grid-template-columns:1fr;gap:10px;${sm}{grid-template-columns:repeat(2,1fr);}${md}{grid-template-columns:repeat(3,1fr);}`
const AmenityItem = styled.div`
  display:flex;align-items:center;gap:10px;padding:12px;border-radius:${t.r.md};
  background:${t.lBg};border:1px solid ${t.lBorder};transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};}
`
const AmenityIcon = styled.div<{$color:string}>`
  width:36px;height:36px;border-radius:${t.r.md};display:flex;align-items:center;justify-content:center;
  background:${pr=>pr.$color}14;color:${pr=>pr.$color};flex-shrink:0;
`
const AmenityLabel = styled.div`font-size:12px;color:${t.lTextSec};`
const AmenityVal = styled.div`font-size:14px;font-weight:700;color:${t.lText};`

/* ── Location Score Card ── */
const LocationScoreCard = styled(AnimatedCard)`
  background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;
  @media print{break-inside:avoid;border:1px solid #ddd;box-shadow:none;}
`
const LocScoreHeader = styled.div`
  display:flex;align-items:center;gap:16px;margin-bottom:20px;
`
const LocGauge = styled.div`
  position:relative;width:72px;height:72px;flex-shrink:0;
`
const LocGaugeSvg = styled.svg`
  width:72px;height:72px;transform:rotate(-90deg);
`
const LocScoreNum = styled.div<{$color:string}>`
  position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:22px;font-weight:900;color:${pr=>pr.$color};font-family:${t.font};
`
const LocScoreLabel = styled.div<{$color:string}>`
  font-size:16px;font-weight:800;color:${pr=>pr.$color};font-family:${t.font};
`
const LocScoreDesc = styled.div`font-size:12px;color:${t.lTextSec};margin-top:2px;`
const LocFactors = styled.div`display:flex;flex-direction:column;gap:8px;`
const LocFactor = styled.div`display:flex;align-items:center;gap:10px;`
const LocFactorIcon = styled.span`font-size:16px;flex-shrink:0;width:24px;text-align:center;`
const LocFactorName = styled.span`font-size:13px;font-weight:600;color:${t.lText};flex:1;`
const LocBarTrack = styled.div`width:80px;height:6px;background:${t.lBorder};border-radius:3px;overflow:hidden;flex-shrink:0;`
const LocBarFill = styled.div<{$pct:number;$color:string}>`
  width:${pr=>pr.$pct}%;height:100%;background:${pr=>pr.$color};border-radius:3px;transition:width 0.8s ease;
`
const LocFactorDetail = styled.span`font-size:11px;color:${t.lTextSec};min-width:60px;text-align:left;`
const LocationTags = styled.div`display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;`
const LocationTag = styled.span<{$color:string}>`
  display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
  background:${pr=>pr.$color}0F;border:1px solid ${pr=>pr.$color}25;
  border-radius:${t.r.full};font-size:11px;font-weight:600;color:${pr=>pr.$color};
`

/* ── WhatsApp FAB for PlotDetail ── */
const waPulse = keyframes`0%{box-shadow:0 0 0 0 rgba(37,211,102,0.45)}70%{box-shadow:0 0 0 14px rgba(37,211,102,0)}100%{box-shadow:0 0 0 0 rgba(37,211,102,0)}`
const WhatsAppFab = styled.a`
  position:fixed;bottom:80px;left:20px;z-index:40;
  width:52px;height:52px;border-radius:${t.r.full};
  background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(37,211,102,0.4);cursor:pointer;
  transition:all ${t.tr};animation:${waPulse} 2.5s ease-in-out infinite;
  text-decoration:none!important;
  &:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 8px 28px rgba(37,211,102,0.5);}
  @media print{display:none;}
  @media(max-width:639px){bottom:72px;left:14px;width:46px;height:46px;}
`

/* ── Contact Agent Card (like Madlan's agent sidebar) ── */
const AgentCard = styled(AnimatedCard)`
  background:linear-gradient(145deg,#fff,#FAFBFC);
  border:1px solid ${t.goldBorder};border-radius:${t.r.lg};padding:0;overflow:hidden;
  @media print{display:none;}
`
const AgentCardHeader = styled.div`
  padding:16px 20px;
  background:linear-gradient(135deg,rgba(212,168,75,0.08),rgba(212,168,75,0.03));
  border-bottom:1px solid rgba(212,168,75,0.12);
  display:flex;align-items:center;gap:12px;
`
const AgentAvatar = styled.div`
  width:48px;height:48px;border-radius:${t.r.full};
  background:linear-gradient(135deg,${t.gold},${t.goldBright});
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:900;color:${t.bg};font-family:${t.font};
  flex-shrink:0;box-shadow:0 2px 8px rgba(212,168,75,0.3);
`
const AgentInfo = styled.div`flex:1;min-width:0;`
const AgentName = styled.div`font-size:15px;font-weight:700;color:${t.lText};font-family:${t.font};`
const AgentRole = styled.div`font-size:11px;color:${t.lTextSec};font-weight:500;display:flex;align-items:center;gap:4px;`
const AgentVerifiedBadge = styled.span`
  display:inline-flex;align-items:center;gap:2px;padding:1px 6px;
  background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);
  border-radius:${t.r.full};font-size:10px;font-weight:700;color:${t.ok};
`
const AgentCardBody = styled.div`padding:16px 20px;display:flex;flex-direction:column;gap:10px;`
const AgentCTARow = styled.div`display:flex;gap:8px;`
const AgentWhatsAppBtn = styled.a`
  flex:1;display:flex;align-items:center;justify-content:center;gap:8px;
  padding:12px 16px;background:#25D366;color:#fff;border:none;border-radius:${t.r.md};
  font-size:14px;font-weight:700;font-family:${t.font};cursor:pointer;
  text-decoration:none!important;transition:all ${t.tr};
  &:hover{background:#1DAF54;box-shadow:0 4px 16px rgba(37,211,102,0.3);transform:translateY(-1px);}
`
const AgentPhoneBtn = styled.a`
  display:flex;align-items:center;justify-content:center;width:44px;height:44px;
  border-radius:${t.r.md};border:1px solid ${t.lBorder};background:#fff;
  color:${t.lTextSec};text-decoration:none!important;transition:all ${t.tr};flex-shrink:0;
  &:hover{border-color:${t.gold};color:${t.gold};box-shadow:${t.sh.sm};}
`
const AgentMetaRow = styled.div`
  display:flex;align-items:center;justify-content:center;gap:16px;
  padding:10px;background:${t.lBg};border-radius:${t.r.md};
  font-size:11px;color:${t.lTextSec};font-weight:500;
`
const AgentMetaItem = styled.span`display:flex;align-items:center;gap:4px;white-space:nowrap;`
const AgentMetaVal = styled.span`color:${t.lText};font-weight:700;`

/* ── Extracted inline styles → styled components (perf: avoids new objects each render) ── */
const FlexCol = styled.div<{$gap?:number}>`display:flex;flex-direction:column;gap:${pr=>pr.$gap||24}px;`
const ErrorCenter = styled.div`text-align:center;direction:rtl;padding:40px;`
const ErrorIcon = styled.div`font-size:56px;margin-bottom:16px;`
const ErrorTitle = styled.h2`font-size:24px;font-weight:800;color:${t.lText};margin-bottom:8px;font-family:${t.font};`
const ErrorDesc = styled.p`font-size:14px;color:${t.lTextSec};margin-bottom:24px;line-height:1.6;`
const ErrorBackLink = styled(Link)`
  display:inline-flex;align-items:center;gap:8px;padding:12px 28px;
  background:linear-gradient(135deg,${t.gold},${t.goldBright});color:${t.bg};
  border-radius:${t.r.full};font-weight:700;font-size:15px;font-family:${t.font};
  text-decoration:none;transition:all ${t.tr};
  &:hover{box-shadow:${t.sh.glow};transform:translateY(-2px);}
`
const StickyNavLabel = styled.span`
  font-size:13px;font-weight:800;color:${t.lText};white-space:nowrap;
  margin-inline-end:8px;font-family:${t.font};
`
const StickyNavSep = styled.span`width:1px;height:20px;background:${t.lBorder};flex-shrink:0;`
const MetricDelta = styled.div<{$positive:boolean}>`
  font-size:10px;font-weight:700;margin-top:4px;display:flex;align-items:center;
  justify-content:center;gap:2px;color:${pr=>pr.$positive?t.ok:t.err};
`
const CardSubtitle = styled.div`font-size:12px;color:${t.lTextSec};margin-bottom:16px;line-height:1.6;`
const ExitIntro = styled.div`font-size:13px;color:${t.lTextSec};margin-top:-8px;margin-bottom:4px;line-height:1.6;`
const CommitteeDate = styled.span`margin-right:8px;font-size:11px;color:${t.lTextSec};`
const DescriptionText = styled.p`font-size:14px;color:${t.lTextSec};line-height:1.8;margin:0;`
const AmenitiesWrap = styled.div`margin-top:12px;`
const AmenitiesTitle = styled.div`font-size:12px;font-weight:700;color:${t.lTextSec};margin-bottom:10px;`
const TaxCompNote = styled.div`font-size:11px;color:${t.lTextSec};margin-top:8px;line-height:1.5;`
const CompVsAreaSubtitle = styled.div`font-size:12px;color:${t.lTextSec};margin-top:-8px;margin-bottom:8px;`
const SummaryDot = styled.span`color:${t.lBorder};margin:0 6px;`
const SummaryGradeBadge = styled.span<{$color:string}>`
  display:inline-flex;align-items:center;justify-content:center;
  padding:3px 10px;border-radius:${t.r.full};
  background:${pr=>`${pr.$color}18`};border:1px solid ${pr=>`${pr.$color}30`};
  font-size:13px;font-weight:800;color:${pr=>pr.$color};font-family:${t.font};
`
const SummaryActions = styled.span`
  margin-inline-start:auto;flex-shrink:0;display:flex;align-items:center;gap:4px;
`
const RiskScoreLabel = styled.span<{$color:string}>`
  font-size:12px;font-weight:800;color:${pr=>pr.$color};min-width:28px;text-align:center;
`
const SimilarSection = styled.div`margin-top:32px;`
const SatThumbWrap = styled.div`position:relative;width:100%;height:80px;overflow:hidden;`
const SatThumbOverlay = styled.div`
  position:absolute;inset:0;
  background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.45));
`
const BarSpacer = styled.span`flex:1;`
const BarGetInfoBtn = styled(GoldButton)`padding:12px 32px;border-radius:${t.r.full};`
const CompareToggleBtn = styled(IconBtn)<{$active?:boolean}>`
  position:relative;
  ${pr=>pr.$active?`background:rgba(139,92,246,0.12);border-color:rgba(139,92,246,0.3);color:#8B5CF6;`:''}
`
const CompareBadge = styled.span`
  position:absolute;top:-4px;right:-4px;
  display:inline-flex;align-items:center;justify-content:center;
  min-width:16px;height:16px;padding:0 3px;
  background:#8B5CF6;color:#fff;border-radius:${t.r.full};
  font-size:9px;font-weight:800;line-height:1;
  box-shadow:0 1px 4px rgba(139,92,246,0.4);
`

/* ── Lazy Satellite Thumbnail ── */
const SatThumbImg = styled.img`
  width:100%;height:80px;object-fit:cover;display:block;
  background:${t.lBorder};transition:opacity 0.3s;
`

/* ── Plot vs Area Average Comparison ── */
const CompVsArea = styled(AnimatedCard)`
  background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;
  @media print{break-inside:avoid;border:1px solid #ddd;box-shadow:none;}
`
const CompGrid = styled.div`
  display:grid;grid-template-columns:1fr;gap:12px;margin-top:16px;
`
const CompRow = styled.div`
  display:flex;align-items:center;gap:12px;padding:12px 14px;
  background:${t.lBg};border:1px solid ${t.lBorder};border-radius:${t.r.md};
  transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};}
`
const CompMetric = styled.div`flex:1;min-width:0;`
const CompMetricLabel = styled.div`font-size:11px;font-weight:600;color:${t.lTextSec};margin-bottom:2px;`
const CompMetricVal = styled.div`font-size:15px;font-weight:800;color:${t.lText};font-family:${t.font};`
const CompBarWrap = styled.div`flex:2;display:flex;flex-direction:column;gap:4px;`
const CompBarRow = styled.div`display:flex;align-items:center;gap:8px;`
const CompBarLabel = styled.span`font-size:10px;font-weight:600;color:${t.lTextSec};min-width:42px;text-align:left;`
const CompBarTrack = styled.div`flex:1;height:8px;background:${t.lBorder};border-radius:4px;overflow:hidden;position:relative;`
const CompBarFill = styled.div<{$pct:number;$color:string}>`
  height:100%;width:${pr=>Math.min(100,pr.$pct)}%;background:${pr=>pr.$color};border-radius:4px;
  transition:width 0.8s cubic-bezier(0.32,0.72,0,1);
`
const CompDelta = styled.div<{$positive:boolean}>`
  display:flex;align-items:center;gap:3px;
  font-size:12px;font-weight:700;min-width:64px;text-align:left;
  color:${pr=>pr.$positive?t.ok:t.err};
`

/* ── Radar/Spider Chart — visual multi-axis comparison ── */
const RadarWrap = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:16px;margin-bottom:16px;
`
const RadarLegend = styled.div`
  display:flex;align-items:center;gap:16px;justify-content:center;flex-wrap:wrap;
`
const RadarLegendItem = styled.div`
  display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;
`
const RadarLegendDot = styled.span<{$color:string;$dashed?:boolean}>`
  width:12px;height:3px;border-radius:2px;
  background:${pr=>pr.$dashed?'transparent':pr.$color};
  border:${pr=>pr.$dashed?`1.5px dashed ${pr.$color}`:'none'};
  flex-shrink:0;
`

function RadarChart({ plot, similarPlots }: { plot: Plot; similarPlots: Plot[] }) {
  const allPlots = [plot, ...similarPlots]
  if (allPlots.length < 2) return null

  const d = p(plot), thisRoi = roi(plot), thisScore = calcScore(plot)
  const thisPps = pricePerSqm(plot), thisPpd = pricePerDunam(plot)
  const thisLocScore = calcLocationScore(plot).score

  // Calculate area averages
  const prices = allPlots.map(pl => p(pl).price).filter(v => v > 0)
  const rois = allPlots.map(pl => roi(pl)).filter(v => v > 0)
  const ppdList = allPlots.map(pl => pricePerDunam(pl)).filter(v => v > 0)
  const scores = allPlots.map(pl => calcScore(pl))
  const locScores = allPlots.map(pl => calcLocationScore(pl).score)

  const avgPrice = prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0
  const avgRoi = rois.length ? rois.reduce((s, v) => s + v, 0) / rois.length : 0
  const avgPpd = ppdList.length ? Math.round(ppdList.reduce((s, v) => s + v, 0) / ppdList.length) : 0
  const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0
  const avgLocScore = locScores.length ? locScores.reduce((s, v) => s + v, 0) / locScores.length : 0

  // Build radar axes: each metric normalized to 0-1 range
  // For "lower is better" metrics (like price), invert so higher = better visually
  const axes = [
    { label: 'ציון השקעה', thisRaw: thisScore, avgRaw: avgScore, max: 10, lowerBetter: false },
    { label: 'תשואה', thisRaw: thisRoi, avgRaw: avgRoi, max: Math.max(thisRoi, avgRoi, 50) || 50, lowerBetter: false },
    { label: 'מחיר/דונם', thisRaw: thisPpd, avgRaw: avgPpd, max: Math.max(thisPpd, avgPpd) * 1.2 || 1, lowerBetter: true },
    { label: 'מיקום', thisRaw: thisLocScore, avgRaw: avgLocScore, max: 10, lowerBetter: false },
    { label: 'ערך שוק', thisRaw: d.price, avgRaw: avgPrice, max: Math.max(d.price, avgPrice) * 1.2 || 1, lowerBetter: true },
  ].filter(a => a.thisRaw > 0 && a.avgRaw > 0)

  if (axes.length < 3) return null

  // Normalize to 0-1 (invert "lowerBetter" axes)
  const thisNorm = axes.map(a => {
    const norm = a.max > 0 ? a.thisRaw / a.max : 0
    return a.lowerBetter ? Math.max(0, 1 - norm) : Math.min(1, norm)
  })
  const avgNorm = axes.map(a => {
    const norm = a.max > 0 ? a.avgRaw / a.max : 0
    return a.lowerBetter ? Math.max(0, 1 - norm) : Math.min(1, norm)
  })

  // SVG geometry
  const cx = 140, cy = 130, radius = 95, n = axes.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2 // Start from top

  function polarToXY(value: number, index: number): { x: number; y: number } {
    const angle = startAngle + index * angleStep
    const r = value * radius
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]

  const thisPath = thisNorm.map((v, i) => {
    const { x, y } = polarToXY(v, i)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + ' Z'

  const avgPath = avgNorm.map((v, i) => {
    const { x, y } = polarToXY(v, i)
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ') + ' Z'

  return (
    <RadarWrap>
      <svg width="280" height="280" viewBox="0 0 280 260" style={{ overflow: 'visible' }}
        role="img" aria-label="תרשים רדאר — השוואת חלקה לממוצע האזור"
      >
        <defs>
          <linearGradient id="radarGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={t.gold} stopOpacity="0.3" />
            <stop offset="100%" stopColor={t.goldBright} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {/* Grid circles */}
        {gridLevels.map(level => {
          const pts = Array.from({ length: n }, (_, i) => {
            const { x, y } = polarToXY(level, i)
            return `${x.toFixed(1)},${y.toFixed(1)}`
          })
          return (
            <polygon key={level} points={pts.join(' ')}
              fill="none" stroke={t.lBorder} strokeWidth="0.8"
              strokeDasharray={level < 1 ? '3 3' : 'none'}
              opacity={level === 1 ? 0.6 : 0.3}
            />
          )
        })}
        {/* Axis lines */}
        {axes.map((_, i) => {
          const { x, y } = polarToXY(1, i)
          return (
            <line key={i} x1={cx} y1={cy} x2={x} y2={y}
              stroke={t.lBorder} strokeWidth="0.6" opacity="0.4"
            />
          )
        })}
        {/* Average area (dashed, grey) */}
        <path d={avgPath} fill="rgba(148,163,184,0.08)" stroke="#94A3B8" strokeWidth="1.5"
          strokeDasharray="5 3" opacity="0.7"
        />
        {/* This plot area (solid, gold) */}
        <path d={thisPath} fill="url(#radarGoldGrad)" stroke={t.gold} strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* This plot dots */}
        {thisNorm.map((v, i) => {
          const { x, y } = polarToXY(v, i)
          return (
            <circle key={i} cx={x} cy={y} r="4"
              fill={t.gold} stroke="#fff" strokeWidth="2"
              style={{ filter: 'drop-shadow(0 1px 3px rgba(212,168,75,0.4))' }}
            />
          )
        })}
        {/* Axis labels */}
        {axes.map((a, i) => {
          const { x, y } = polarToXY(1.2, i)
          const textAnchor = x < cx - 10 ? 'end' : x > cx + 10 ? 'start' : 'middle'
          const dy = y < cy - 20 ? '-4' : y > cy + 20 ? '12' : '4'
          return (
            <text key={i} x={x} y={y} dy={dy}
              textAnchor={textAnchor}
              fontSize="11" fontWeight="700" fill={t.lTextSec}
              fontFamily={t.font} style={{ userSelect: 'none' }}
            >
              {a.label}
            </text>
          )
        })}
      </svg>
      <RadarLegend>
        <RadarLegendItem>
          <RadarLegendDot $color={t.gold} />
          <span style={{ color: t.gold, fontWeight: 700 }}>חלקה זו</span>
        </RadarLegendItem>
        <RadarLegendItem>
          <RadarLegendDot $color="#94A3B8" $dashed />
          <span style={{ color: t.lTextSec }}>ממוצע אזורי</span>
        </RadarLegendItem>
      </RadarLegend>
    </RadarWrap>
  )
}

function PlotVsAreaComparison({ plot, similarPlots }: { plot: Plot; similarPlots: Plot[] }) {
  const allPlots = [plot, ...similarPlots]
  if (allPlots.length < 2) return null

  const d = p(plot), thisPrice = d.price, thisSize = d.size, thisRoi = roi(plot)
  const thisPps = pricePerSqm(plot), thisPpd = pricePerDunam(plot), thisScore = calcScore(plot)

  // Calculate area averages
  const prices = allPlots.map(pl => p(pl).price).filter(v => v > 0)
  const rois = allPlots.map(pl => roi(pl)).filter(v => v > 0)
  const ppsList = allPlots.map(pl => pricePerSqm(pl)).filter(v => v > 0)
  const ppdList = allPlots.map(pl => pricePerDunam(pl)).filter(v => v > 0)
  const sizes = allPlots.map(pl => p(pl).size).filter(v => v > 0)
  const scores = allPlots.map(pl => calcScore(pl))

  const avgPrice = prices.length ? prices.reduce((s, v) => s + v, 0) / prices.length : 0
  const avgRoi = rois.length ? rois.reduce((s, v) => s + v, 0) / rois.length : 0
  const avgPps = ppsList.length ? Math.round(ppsList.reduce((s, v) => s + v, 0) / ppsList.length) : 0
  const avgPpd = ppdList.length ? Math.round(ppdList.reduce((s, v) => s + v, 0) / ppdList.length) : 0
  const avgSize = sizes.length ? Math.round(sizes.reduce((s, v) => s + v, 0) / sizes.length) : 0
  const avgScore = scores.length ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : 0

  const metrics = [
    { label: 'מחיר', thisVal: fmt.compact(thisPrice), avgVal: fmt.compact(avgPrice), thisNum: thisPrice, avgNum: avgPrice, lowerBetter: true },
    { label: 'מחיר/מ״ר', thisVal: `₪${fmt.num(thisPps)}`, avgVal: `₪${fmt.num(avgPps)}`, thisNum: thisPps, avgNum: avgPps, lowerBetter: true },
    { label: 'מחיר/דונם', thisVal: `₪${fmt.num(thisPpd)}`, avgVal: `₪${fmt.num(avgPpd)}`, thisNum: thisPpd, avgNum: avgPpd, lowerBetter: true },
    { label: 'שטח', thisVal: `${fmt.num(thisSize)} מ״ר`, avgVal: `${fmt.num(avgSize)} מ״ר`, thisNum: thisSize, avgNum: avgSize, lowerBetter: false },
    { label: 'תשואה', thisVal: `${Math.round(thisRoi)}%`, avgVal: `${Math.round(avgRoi)}%`, thisNum: thisRoi, avgNum: avgRoi, lowerBetter: false },
    { label: 'ציון', thisVal: `${thisScore}/10`, avgVal: `${avgScore}/10`, thisNum: thisScore, avgNum: avgScore, lowerBetter: false },
  ].filter(m => m.thisNum > 0 && m.avgNum > 0)

  if (metrics.length < 2) return null

  return (
    <CompVsArea $delay={0.22}>
      <CardTitle><BarChart3 size={18} color={t.gold} /> השוואה לממוצע האזור</CardTitle>
      <CompVsAreaSubtitle>
        בהשוואה ל-{allPlots.length - 1} חלקות דומות ב{plot.city}
      </CompVsAreaSubtitle>
      {/* Radar Chart — visual multi-axis comparison */}
      <RadarChart plot={plot} similarPlots={similarPlots} />
      <CompGrid>
        {metrics.map(m => {
          const maxNum = Math.max(m.thisNum, m.avgNum) || 1
          const thisPct = (m.thisNum / maxNum) * 100
          const avgPct = (m.avgNum / maxNum) * 100
          const delta = m.avgNum > 0 ? ((m.thisNum - m.avgNum) / m.avgNum) * 100 : 0
          const isPositive = m.lowerBetter ? delta < 0 : delta > 0
          return (
            <CompRow key={m.label}>
              <CompMetric>
                <CompMetricLabel>{m.label}</CompMetricLabel>
                <CompMetricVal>{m.thisVal}</CompMetricVal>
              </CompMetric>
              <CompBarWrap>
                <CompBarRow>
                  <CompBarLabel>חלקה</CompBarLabel>
                  <CompBarTrack>
                    <CompBarFill $pct={thisPct} $color={t.gold} />
                  </CompBarTrack>
                </CompBarRow>
                <CompBarRow>
                  <CompBarLabel>ממוצע</CompBarLabel>
                  <CompBarTrack>
                    <CompBarFill $pct={avgPct} $color={t.lBorder.replace('0.08', '0.5') || '#94A3B8'} />
                  </CompBarTrack>
                </CompBarRow>
              </CompBarWrap>
              <CompDelta $positive={isPositive}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {delta > 0 ? '+' : ''}{Math.round(delta)}%
              </CompDelta>
            </CompRow>
          )
        })}
      </CompGrid>
    </CompVsArea>
  )
}

/* ── Section Navigation (Table of Contents) — sticky scroll-spy ── */
const SectionNav = styled.nav<{$sticky?:boolean}>`
  display:flex;align-items:center;gap:6px;margin-bottom:24px;
  overflow-x:auto;scrollbar-width:none;direction:rtl;
  -webkit-overflow-scrolling:touch;
  &::-webkit-scrollbar{display:none;}
  ${sm}{flex-wrap:wrap;}
  @media print{display:none;}
`
const StickyNav = styled.nav<{$show:boolean}>`
  position:fixed;top:0;left:0;right:0;z-index:50;
  display:flex;align-items:center;gap:6px;padding:10px 24px;direction:rtl;
  background:rgba(255,255,255,0.97);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);
  border-bottom:1px solid ${t.lBorder};
  overflow-x:auto;scrollbar-width:none;
  -webkit-overflow-scrolling:touch;
  &::-webkit-scrollbar{display:none;}
  transform:translateY(${pr => pr.$show ? '0' : '-100%'});
  transition:transform 0.3s cubic-bezier(0.4,0,0.2,1),box-shadow 0.3s;
  box-shadow:${pr => pr.$show ? '0 2px 12px rgba(0,0,0,0.08)' : 'none'};
  @media print{display:none;}
  @media(max-width:639px){padding:8px 12px;gap:4px;}
`
const SectionNavBtn = styled.a<{$active?:boolean}>`
  display:inline-flex;align-items:center;gap:5px;padding:7px 14px;
  background:${pr => pr.$active ? 'rgba(212,168,75,0.1)' : t.lBg};
  border:1px solid ${pr => pr.$active ? t.goldBorder : t.lBorder};
  border-radius:${t.r.full};
  font-size:12px;font-weight:${pr => pr.$active ? 700 : 600};
  font-family:${t.font};
  color:${pr => pr.$active ? t.gold : t.lTextSec};
  cursor:pointer;white-space:nowrap;flex-shrink:0;text-decoration:none !important;
  transition:all 0.2s;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:rgba(212,168,75,0.04);}
`
/* ── Scroll-spy hook ── */
function useScrollSpy(sectionIds: string[], offset = 120) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showSticky, setShowSticky] = useState(false)
  useEffect(() => {
    let ticking = false
    const handler = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        // Show sticky nav after scrolling past the inline nav (roughly 400px)
        setShowSticky(window.scrollY > 400)
        // Find active section
        let found: string | null = null
        for (let i = sectionIds.length - 1; i >= 0; i--) {
          const el = document.getElementById(sectionIds[i])
          if (el) {
            const rect = el.getBoundingClientRect()
            if (rect.top <= offset) { found = sectionIds[i]; break }
          }
        }
        setActiveId(found)
      })
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [sectionIds, offset])
  return { activeId, showSticky }
}

/* ── Investment Summary One-Liner ── */
const SummaryBar = styled.div`
  display:flex;align-items:center;gap:10px;padding:14px 18px;margin-bottom:24px;
  background:linear-gradient(135deg,rgba(212,168,75,0.06),rgba(212,168,75,0.02));
  border:1px solid ${t.goldBorder};border-radius:${t.r.lg};direction:rtl;
  font-size:14px;color:${t.lText};line-height:1.6;
  animation:${fadeInUp} 0.5s ease-out 0.15s both;
  @media(max-width:639px){font-size:13px;padding:12px 14px;gap:8px;flex-wrap:wrap;}
`
const SummaryIcon = styled.span`font-size:20px;flex-shrink:0;`
const SummaryHighlight = styled.span`color:${t.gold};font-weight:800;`

/* ── Skeleton Loading ── */
const shimmer = keyframes`0%{background-position:-200% 0}100%{background-position:200% 0}`
const SkeletonPulse = styled.div<{$w?:string;$h?:string}>`
  width:${pr=>pr.$w||'100%'};height:${pr=>pr.$h||'20px'};border-radius:${t.r.md};
  background:linear-gradient(90deg,${t.lBorder} 25%,#e8e8e8 50%,${t.lBorder} 75%);
  background-size:200% 100%;animation:${shimmer} 1.5s ease infinite;
`
const SkeletonMetrics = styled.div`display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:32px;${md}{grid-template-columns:repeat(3,1fr);}${lg}{grid-template-columns:repeat(5,1fr);}`
const SkeletonCard = styled.div`padding:20px;background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};`

function PlotDetailSkeleton() {
  return (
    <Page>
      <SkeletonPulse $w="120px" $h="14px" style={{marginBottom:16}} />
      {/* Hero banner skeleton */}
      <SkeletonPulse $h="200px" style={{borderRadius:'24px',marginBottom:24,width:'100%'}} />
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:24}}>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',gap:8}}><SkeletonPulse $w="60px" $h="22px" /><SkeletonPulse $w="40px" $h="22px" /></div>
          <SkeletonPulse $w="280px" $h="32px" />
        </div>
      </div>
      <SkeletonMetrics>
        {[0,1,2,3,4].map(i=><SkeletonCard key={i}><SkeletonPulse $w="80px" $h="28px" style={{margin:'0 auto 8px'}} /><SkeletonPulse $w="50px" $h="12px" style={{margin:'0 auto'}} /></SkeletonCard>)}
      </SkeletonMetrics>
      <Grid>
        <div style={{display:'flex',flexDirection:'column',gap:24}}>
          <SkeletonCard style={{height:200}}><SkeletonPulse $w="160px" $h="20px" style={{marginBottom:16}} />{[0,1,2,3].map(i=><SkeletonPulse key={i} $h="16px" style={{marginBottom:10}} />)}</SkeletonCard>
          <SkeletonCard style={{height:180}}><SkeletonPulse $w="140px" $h="20px" style={{marginBottom:16}} /><SkeletonPulse $h="8px" style={{marginBottom:12}} />{[0,1,2].map(i=><SkeletonPulse key={i} $h="14px" style={{marginBottom:8}} />)}</SkeletonCard>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:24}}>
          <SkeletonCard style={{height:260}}><SkeletonPulse $h="100%" /></SkeletonCard>
          <SkeletonCard style={{height:160}}><SkeletonPulse $w="120px" $h="20px" style={{marginBottom:16}} />{[0,1,2].map(i=><SkeletonPulse key={i} $h="16px" style={{marginBottom:10}} />)}</SkeletonCard>
        </div>
      </Grid>
    </Page>
  )
}

/* ── Risk Indicator ── */
const RiskCard = styled(AnimatedCard)`
  background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;
  @media print{break-inside:avoid;border:1px solid #ddd;box-shadow:none;}
`
const RiskHeader = styled.div`display:flex;align-items:center;gap:12px;margin-bottom:16px;`
const RiskMeter = styled.div`display:flex;align-items:center;gap:4px;flex:1;`
const RiskBar = styled.div<{$pct:number;$color:string}>`
  flex:1;height:8px;background:${t.lBorder};border-radius:${t.r.full};overflow:hidden;position:relative;
  &::after{content:'';position:absolute;top:0;left:0;height:100%;width:${pr=>pr.$pct}%;
    background:${pr=>pr.$color};border-radius:${t.r.full};transition:width 1s ease;}
`
const RiskLabel = styled.span<{$color:string}>`
  font-size:14px;font-weight:800;color:${pr=>pr.$color};white-space:nowrap;
`
const RiskFactors = styled.div`display:flex;flex-direction:column;gap:8px;`
const RiskFactor = styled.div<{$impact:string}>`
  display:flex;align-items:center;gap:10px;padding:8px 12px;
  background:${pr=>pr.$impact === 'positive' ? 'rgba(16,185,129,0.06)' : pr.$impact === 'negative' ? 'rgba(239,68,68,0.06)' : t.lBg};
  border:1px solid ${pr=>pr.$impact === 'positive' ? 'rgba(16,185,129,0.15)' : pr.$impact === 'negative' ? 'rgba(239,68,68,0.15)' : t.lBorder};
  border-radius:${t.r.md};font-size:13px;
`
const FactorIcon = styled.span<{$impact:string}>`
  font-size:14px;flex-shrink:0;
  color:${pr=>pr.$impact === 'positive' ? t.ok : pr.$impact === 'negative' ? t.err : t.lTextSec};
`
const FactorName = styled.span`font-weight:600;color:${t.lText};`
const FactorDetail = styled.span`color:${t.lTextSec};font-size:12px;margin-inline-start:auto;`

/* ── Print Button ── */
const PrintBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:40px;height:40px;
  border-radius:${t.r.md};border:1px solid ${t.lBorder};background:#fff;
  color:${t.lTextSec};cursor:pointer;transition:all ${t.tr};
  &:hover{border-color:${t.gold};color:${t.gold};}
  @media print{display:none;}
`

/* ── Print Report Header (only visible when printing) ── */
const PrintHeader = styled.div`
  display:none;
  @media print{
    display:flex;align-items:center;justify-content:space-between;
    padding:0 0 16px;margin-bottom:20px;
    border-bottom:2px solid ${t.gold};
    page-break-after:avoid;
  }
`
const PrintLogo = styled.div`
  font-size:20px;font-weight:900;color:${t.gold};font-family:${t.font};
  display:flex;align-items:center;gap:8px;
  @media print{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
`
const PrintMeta = styled.div`
  text-align:left;font-size:9px;color:#666;line-height:1.5;
`

/* ── Copy Investment Report Button ── */
const copyFlash = keyframes`0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)}`
const CopyReportBtn = styled.button<{$copied?:boolean}>`
  display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:12px 18px;
  background:${pr=>pr.$copied?'rgba(16,185,129,0.08)':'linear-gradient(135deg,rgba(212,168,75,0.08),rgba(212,168,75,0.03))'};
  border:1px solid ${pr=>pr.$copied?'rgba(16,185,129,0.25)':t.goldBorder};border-radius:${t.r.md};
  color:${pr=>pr.$copied?t.ok:t.gold};font-size:13px;font-weight:700;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};margin-top:16px;
  ${pr=>pr.$copied?`animation:${copyFlash} 0.3s ease;`:''}
  &:hover{background:${pr=>pr.$copied?'rgba(16,185,129,0.12)':t.goldDim};border-color:${pr=>pr.$copied?t.ok:t.gold};transform:translateY(-1px);box-shadow:${t.sh.sm};}
  @media print{display:none;}
`

/* ── Exit Strategy Scenarios ── */
const ExitCard = styled(AnimatedCard)`
  background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;
  @media print{break-inside:avoid;border:1px solid #ddd;box-shadow:none;}
`
const ExitGrid = styled.div`display:flex;flex-direction:column;gap:8px;margin-top:16px;`
const ExitRow = styled.div<{$highlight?:boolean}>`
  display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;
  padding:12px 16px;border-radius:${t.r.md};
  background:${pr=>pr.$highlight?'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(16,185,129,0.02))':t.lBg};
  border:1px solid ${pr=>pr.$highlight?'rgba(16,185,129,0.2)':t.lBorder};
  transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};transform:translateX(-2px);}
  @media(max-width:639px){grid-template-columns:auto 1fr;gap:8px;padding:10px 12px;}
`
const ExitStageCol = styled.div`display:flex;align-items:center;gap:8px;min-width:0;`
const ExitStageIcon = styled.span`font-size:18px;flex-shrink:0;`
const ExitStageInfo = styled.div`min-width:0;`
const ExitStageName = styled.div`font-size:13px;font-weight:700;color:${t.lText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`
const ExitStageTime = styled.div`font-size:11px;color:${t.lTextSec};display:flex;align-items:center;gap:4px;`
const ExitValueCol = styled.div`text-align:left;
  @media(max-width:639px){grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:4px;border-top:1px solid ${t.lBorder};}
`
const ExitValue = styled.div`font-size:15px;font-weight:800;color:${t.lText};font-family:${t.font};`
const ExitProfit = styled.div<{$color:string}>`font-size:12px;font-weight:700;color:${pr=>pr.$color};display:flex;align-items:center;gap:3px;`
const ExitRoiCol = styled.div`text-align:center;min-width:72px;
  @media(max-width:639px){display:none;}
`
const ExitRoiBadge = styled.div<{$color:string}>`
  display:inline-flex;align-items:center;justify-content:center;
  padding:4px 12px;border-radius:${t.r.full};
  background:${pr=>pr.$color}12;border:1px solid ${pr=>pr.$color}28;
  font-size:13px;font-weight:800;color:${pr=>pr.$color};font-family:${t.font};
`
const ExitAnnualized = styled.div`font-size:10px;color:${t.lTextSec};margin-top:2px;`
const ExitBestBadge = styled.span`
  display:inline-flex;align-items:center;gap:3px;padding:2px 8px;
  background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.04));
  border:1px solid rgba(16,185,129,0.2);border-radius:${t.r.full};
  font-size:10px;font-weight:700;color:${t.ok};white-space:nowrap;
`
const ExitDisclaimer = styled.div`
  font-size:11px;color:${t.lTextSec};line-height:1.6;margin-top:12px;padding:10px 14px;
  background:rgba(245,158,11,0.04);border:1px solid rgba(245,158,11,0.12);border-radius:${t.r.md};
  display:flex;align-items:flex-start;gap:8px;
`

/* ── Neighborhood Development Card ── */
const DevCard = styled(AnimatedCard)`
  background:#fff;border:1px solid ${t.lBorder};border-radius:${t.r.lg};padding:24px;
  @media print{break-inside:avoid;border:1px solid #ddd;box-shadow:none;}
`
const DevSection = styled.div`
  padding:14px 16px;background:${t.lBg};border:1px solid ${t.lBorder};border-radius:${t.r.md};
  transition:all ${t.tr};&:hover{border-color:${t.goldBorder};}
`
const DevSectionTitle = styled.div`
  display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:${t.lText};margin-bottom:8px;
`
const DevSectionText = styled.p`
  font-size:13px;color:${t.lTextSec};line-height:1.8;margin:0;white-space:pre-wrap;
`

/* ── Tax Authority Value Comparison ── */
const TaxCompWrap = styled.div`
  margin-top:16px;padding:14px 16px;
  background:linear-gradient(135deg,rgba(59,130,246,0.04),rgba(59,130,246,0.01));
  border:1px solid rgba(59,130,246,0.15);border-radius:${t.r.md};
`
const TaxCompHeader = styled.div`
  display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;
`
const TaxCompTitle = styled.span`font-size:12px;font-weight:700;color:${t.lTextSec};display:flex;align-items:center;gap:6px;`
const TaxCompDelta = styled.span<{$positive:boolean}>`
  display:inline-flex;align-items:center;gap:3px;padding:3px 10px;
  border-radius:${t.r.full};font-size:11px;font-weight:800;
  background:${pr=>pr.$positive?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)'};
  color:${pr=>pr.$positive?t.ok:t.err};
`
const TaxCompBars = styled.div`display:flex;flex-direction:column;gap:6px;`
const TaxCompBarRow = styled.div`display:flex;align-items:center;gap:10px;`
const TaxCompBarLabel = styled.span`font-size:11px;font-weight:600;color:${t.lTextSec};min-width:65px;`
const TaxCompBarTrack = styled.div`flex:1;height:10px;background:${t.lBorder};border-radius:5px;overflow:hidden;`
const TaxCompBarFill = styled.div<{$pct:number;$color:string}>`
  height:100%;width:${pr=>Math.min(100,pr.$pct)}%;background:${pr=>pr.$color};border-radius:5px;
  transition:width 0.8s cubic-bezier(0.32,0.72,0,1);
`
const TaxCompVal = styled.span<{$color?:string}>`font-size:12px;font-weight:800;color:${pr=>pr.$color||t.lText};font-family:${t.font};min-width:60px;text-align:left;`

/* ── Affordability Widget (side column) ── */
const AffordWrap = styled.div`display:flex;flex-direction:column;gap:12px;`
const AffordInputRow = styled.div`display:flex;align-items:center;gap:8px;direction:rtl;`
const AffordInput = styled.input`
  flex:1;padding:10px 14px;border:1px solid ${t.lBorder};border-radius:${t.r.md};
  font-size:15px;font-weight:700;font-family:${t.font};color:${t.lText};
  background:${t.lBg};direction:ltr;text-align:left;outline:none;
  transition:all ${t.tr};
  &:focus{border-color:${t.goldBorder};box-shadow:0 0 0 3px rgba(212,168,75,0.08);}
  &::placeholder{color:${t.lBorder};font-weight:400;}
`
const AffordCurrency = styled.span`font-size:14px;font-weight:800;color:${t.lTextSec};flex-shrink:0;`
const AffordResultGrid = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:8px;
`
const AffordResultItem = styled.div<{$highlight?:boolean}>`
  display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;
  background:${pr=>pr.$highlight?'rgba(16,185,129,0.06)':t.lBg};
  border:1px solid ${pr=>pr.$highlight?'rgba(16,185,129,0.2)':t.lBorder};
  border-radius:${t.r.md};text-align:center;transition:all ${t.tr};
`
const AffordResultVal = styled.div<{$c?:string}>`font-size:16px;font-weight:800;color:${pr=>pr.$c||t.lText};font-family:${t.font};`
const AffordResultLabel = styled.div`font-size:10px;color:${t.lTextSec};font-weight:600;line-height:1.3;`
const AffordNote = styled.div`font-size:11px;color:${t.lTextSec};line-height:1.5;text-align:center;`

/* ── View on Map Button ── */
const ViewOnMapBtn = styled(Link)`
  display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
  background:linear-gradient(135deg,rgba(212,168,75,0.08),rgba(212,168,75,0.03));
  border:1px solid ${t.goldBorder};border-radius:${t.r.md};
  font-size:13px;font-weight:600;font-family:${t.font};color:${t.gold};
  text-decoration:none!important;cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.goldDim};border-color:${t.gold};transform:translateY(-1px);box-shadow:${t.sh.sm};}
  @media print{display:none;}
`

/* ── Recently Viewed: now uses shared useRecentlyViewed hook ── */

/* ── Mini Map (lazy loaded) ── */
const MiniMapLazy = lazy(() => Promise.all([
  import('react-leaflet'),
  import('react'),
]).then(([leafletMod, reactMod]) => {
  const { MapContainer, TileLayer, Polygon } = leafletMod
  const TILES_MINI = [
    { id: 'street', label: 'מפה', url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png' },
    { id: 'satellite', label: 'לוויין', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  ]
  const MiniMap = ({ plot }: { plot: Plot }) => {
    const center = plotCenter(plot.coordinates)
    const [tileIdx, setTileIdx] = reactMod.useState(0)
    if (!center || !plot.coordinates?.length) return null
    const color = statusColors[plot.status || 'AVAILABLE'] || '#10B981'
    return (
      <MiniMapWrap>
        <MapContainer
          center={[center.lat, center.lng]} zoom={16} zoomControl={false}
          dragging={true} scrollWheelZoom={false} doubleClickZoom={false}
          attributionControl={false}
          style={{ width: '100%', height: '100%', zIndex: 1 }}
        >
          <TileLayer key={TILES_MINI[tileIdx].id} url={TILES_MINI[tileIdx].url} maxZoom={19} />
          <Polygon
            positions={plot.coordinates}
            pathOptions={{ color, weight: 3, fillColor: color, fillOpacity: 0.25 }}
          />
        </MapContainer>
        {/* Top-right: tile toggle */}
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 400, display: 'flex', gap: 4 }}>
          {TILES_MINI.map((tl, i) => (
            <MiniMapToggle key={tl.id} $active={i === tileIdx} onClick={() => setTileIdx(i)}>
              {tl.label}
            </MiniMapToggle>
          ))}
        </div>
        <MiniMapOverlay>
          <MiniMapBtn
            href={`https://waze.com/ul?ll=${center.lat},${center.lng}&navigate=yes`}
            target="_blank" rel="noopener noreferrer"
          >
            <Navigation size={12} /> Waze
          </MiniMapBtn>
          <MiniMapBtn
            href={`https://www.google.com/maps?q=${center.lat},${center.lng}`}
            target="_blank" rel="noopener noreferrer"
          >
            <MapPin size={12} /> Google Maps
          </MiniMapBtn>
          <MiniMapBtn
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center.lat},${center.lng}`}
            target="_blank" rel="noopener noreferrer"
          >
            👁️ Street View
          </MiniMapBtn>
        </MiniMapOverlay>
      </MiniMapWrap>
    )
  }
  return { default: MiniMap }
}))

export default function PlotDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: plot, isLoading, error } = usePlot(id)
  const { isFav, toggle } = useFavorites()
  const { ids: compareIds, toggle: toggleCompare, has: isInCompare } = useCompare()
  const { add: addRecentlyViewed } = useRecentlyViewed()
  const [leadOpen, setLeadOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ltvPct, setLtvPct] = useState(50)
  const [loanYears, setLoanYears] = useState(15)
  const [interestRate, setInterestRate] = useState(6)
  const readingProgress = useReadingProgress()

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

  // Track recently viewed
  useEffect(() => { if (id) addRecentlyViewed(id) }, [id, addRecentlyViewed])

  // Dynamic document title + OG meta tags
  useEffect(() => {
    if (!plot) return
    const d = p(plot), r = roi(plot)
    const title = `גוש ${d.block} חלקה ${plot.number} - ${plot.city} | LandMap Israel`
    const desc = `חלקת קרקע להשקעה ב${plot.city} | ${fmt.compact(d.price)} | ${fmt.num(d.size)} מ״ר | תשואה ${Math.round(r)}% | ציון ${calcScore(plot)}/10`
    const url = window.location.href

    document.title = title
    setOgMeta({
      'og:title': title,
      'og:description': desc,
      'og:url': url,
      'og:type': 'website',
      'og:site_name': 'LandMap Israel',
      'og:locale': 'he_IL',
      'twitter:card': 'summary',
      'twitter:title': title,
      'twitter:description': desc,
    })

    // Set canonical URL (important for SEO — prevents duplicate content issues)
    const canonicalUrl = `${window.location.origin}/plot/${plot.id}`
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    // Set meta description for search engines
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = desc

    return () => {
      document.title = 'LandMap Israel'
      removeOgMeta(['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description'])
      // Reset canonical
      const c = document.querySelector('link[rel="canonical"]')
      if (c) c.setAttribute('href', window.location.origin)
      // Reset meta description
      const m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
      if (m) m.content = 'LandMap Israel — פלטפורמת ההשקעות בקרקעות המובילה בישראל'
    }
  }, [plot])

  const { data: similarPlots = [] } = useSimilarPlots(id)
  const { data: allPlots = [] } = useAllPlots()
  const cityRanking = usePlotCityRanking(plot, allPlots)

  // ALL hooks MUST be before conditional returns (React rules of hooks)
  const risk = useMemo(() => plot ? calcRisk(plot, similarPlots.length > 0 ? [plot, ...similarPlots] : undefined) : { score: 0, level: 'low' as const, label: '', factors: [] }, [plot, similarPlots])
  const locationScore = useMemo(() => plot ? calcLocationScore(plot) : { score: 0, label: '', color: '', factors: [], tags: [] }, [plot])
  const scoreBreakdown = useMemo(() => plot ? calcScoreBreakdown(plot) : { total: 0, factors: [] }, [plot])
  const exitScenarios = useMemo(() => plot ? calcExitScenarios(plot) : null, [plot])
  const [reportCopied, setReportCopied] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')

  // Pre-compute values safely (for hooks that depend on derived data)
  const _d = plot ? p(plot) : null
  const _r = plot ? roi(plot) : 0
  const _timeline = plot ? calcTimeline(plot) : null
  const _hasDevContext = plot ? !!(plot.area_context || plot.nearby_development || plot.nearbyDevelopment) : false

  const sectionIds = useMemo(() => {
    if (!plot || !_d) return ['investment', 'risk']
    const ids = ['investment', 'risk']
    if (exitScenarios) ids.push('exit-strategy')
    if (locationScore.factors.length > 0) ids.push('location')
    if (_hasDevContext) ids.push('neighborhood')
    if (similarPlots.length > 1) ids.push('vs-area')
    if (cityRanking) ids.push('city-ranking')
    if (_timeline) ids.push('timeline')
    if (_d.price > 0) ids.push('mortgage')
    if (similarPlots.length > 0) ids.push('similar')
    return ids
  }, [plot, _d, locationScore.factors.length, similarPlots.length, _timeline, _hasDevContext, exitScenarios, cityRanking])
  const { activeId, showSticky } = useScrollSpy(sectionIds)

  const investmentSummary = useMemo(() => {
    if (!plot || !_d) return ''
    const cagr = calcCAGR(_r, _d.readiness)
    const parts: string[] = []
    const zoningLabel = zoningLabels[_d.zoning] || ''
    if (zoningLabel) parts.push(zoningLabel)
    if (_d.size > 0) parts.push(`${fmt.dunam(_d.size)} דונם`)
    if (_d.price > 0) parts.push(`ב-${fmt.compact(_d.price)}`)
    const summaryParts: string[] = []
    if (parts.length) summaryParts.push(`קרקע ${parts.join(', ')} ב${plot.city}`)
    if (_r > 0) summaryParts.push(`תשואה צפויה ${Math.round(_r)}%`)
    if (cagr) summaryParts.push(`צמיחה ${cagr.cagr}% שנתי על פני ${cagr.years} שנים`)
    return summaryParts.join(' · ')
  }, [plot, _d, _r])

  const waLink = useMemo(() => {
    if (!plot || !_d) return SITE_CONFIG.waLink
    const msg = `היי, מתעניין/ת בחלקה ${plot.number} גוש ${_d.block} ב${plot.city} (${fmt.compact(_d.price)}). אשמח לפרטים נוספים.`
    return `${SITE_CONFIG.waLink}?text=${encodeURIComponent(msg)}`
  }, [plot, _d])

  const taxComparison = useMemo(() => {
    if (!plot || !_d) return null
    const taxVal = (plot.tax_authority_value ?? plot.taxAuthorityValue) as number | undefined
    if (!taxVal || taxVal <= 0 || _d.price <= 0) return null
    const delta = ((_d.price - taxVal) / taxVal) * 100
    const maxVal = Math.max(_d.price, taxVal)
    return { taxVal, delta, pricePct: (_d.price / maxVal) * 100, taxPct: (taxVal / maxVal) * 100 }
  }, [plot, _d])

  if (isLoading) return <PublicLayout><PlotDetailSkeleton /></PublicLayout>
  if (error || !plot) {
    const isNetworkError = error && ('status' in (error as any) ? (error as any).status >= 500 : !navigator.onLine || String(error).includes('fetch') || String(error).includes('network') || String(error).includes('ECONNREFUSED'))
    return (
      <PublicLayout>
        <Center>
          <ErrorCenter>
            <ErrorIcon>{isNetworkError ? '🔌' : '🔍'}</ErrorIcon>
            <ErrorTitle>{isNetworkError ? 'שגיאת חיבור' : 'החלקה לא נמצאה'}</ErrorTitle>
            <ErrorDesc>
              {isNetworkError ? (
                <>השרת אינו זמין כרגע.<br/>נסו לרענן את הדף או חזרו מאוחר יותר.</>
              ) : (
                <>ייתכן שהחלקה הוסרה או שהקישור שגוי.<br/>נסו לחפש חלקה אחרת במפה.</>
              )}
            </ErrorDesc>
            {isNetworkError && (
              <GhostButton onClick={() => window.location.reload()} style={{marginBottom: 8}}>
                <RotateCcw size={14} /> רענון הדף
              </GhostButton>
            )}
            <ErrorBackLink to="/explore">
              <MapPin size={16} /> חזרה למפה
            </ErrorBackLink>
          </ErrorCenter>
        </Center>
      </PublicLayout>
    )
  }

  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const cagr = calcCAGR(r, d.readiness), timeline = calcTimeline(plot), dom = daysOnMarket(d.created), pps = pricePerSqm(plot), ppd = pricePerDunam(plot)
  const recommendation = investmentRecommendation(plot)
  const heroCenter = plotCenter(plot.coordinates)
  const heroSatUrl = heroCenter ? satelliteTileUrl(heroCenter.lat, heroCenter.lng, 16) : null
  const mortgage = d.price > 0 ? calcMonthly(d.price, ltvPct / 100, interestRate / 100, loanYears) : null
  const hasDevContext = !!(plot.area_context || plot.nearby_development || plot.nearbyDevelopment)

  // Section labels for nav
  const sectionLabels: Record<string, { icon: React.ReactNode; label: string }> = {
    investment: { icon: <TrendingUp size={12} />, label: 'ניתוח השקעה' },
    risk: { icon: <AlertTriangle size={12} />, label: 'סיכון' },
    'exit-strategy': { icon: <Milestone size={12} />, label: 'אסטרטגיית יציאה' },
    location: { icon: <Compass size={12} />, label: 'מיקום' },
    neighborhood: { icon: <Construction size={12} />, label: 'סביבה' },
    'vs-area': { icon: <BarChart3 size={12} />, label: 'vs ממוצע' },
    'city-ranking': { icon: <MapPin size={12} />, label: 'דירוג בעיר' },
    timeline: { icon: <Clock size={12} />, label: 'ציר זמן' },
    mortgage: { icon: <Calculator size={12} />, label: 'מחשבון' },
    similar: { icon: <BarChart3 size={12} />, label: 'דומות' },
  }

  // Copy investment report to clipboard
  const copyInvestmentReport = async () => {
    const lines: string[] = [
      `📊 דו"ח השקעה — LandMap Israel`,
      `${'═'.repeat(35)}`,
      ``,
      `🏗️ גוש ${d.block} חלקה ${plot.number} — ${plot.city}`,
      `📅 ${new Date().toLocaleDateString('he-IL')}`,
      ``,
      `💰 מחיר: ${fmt.price(d.price)}`,
    ]
    if (d.size > 0) lines.push(`📐 שטח: ${fmt.num(d.size)} מ"ר (${fmt.dunam(d.size)} דונם)`)
    if (ppd > 0) lines.push(`💵 מחיר/דונם: ₪${fmt.num(ppd)}`)
    if (pps > 0) lines.push(`💵 מחיר/מ"ר: ₪${fmt.num(pps)}`)
    if (r > 0) lines.push(`📈 תשואה צפויה: ${Math.round(r)}%`)
    if (d.projected > 0) lines.push(`🎯 שווי חזוי: ${fmt.price(d.projected)}`)
    if (d.projected > 0 && d.price > 0) lines.push(`💎 רווח צפוי: ${fmt.price(d.projected - d.price)}`)
    if (cagr) lines.push(`📊 צמיחה שנתית (CAGR): ${cagr.cagr}% על פני ${cagr.years} שנים`)
    lines.push(``, `🏆 ציון השקעה: ${score}/10 (${grade.grade})`)
    lines.push(`⚠️ סיכון: ${risk.label} (${risk.score}/10)`)
    if (zoningLabels[d.zoning]) lines.push(`📋 שלב תכנוני: ${zoningLabels[d.zoning]}`)
    if (d.readiness) lines.push(`⏱️ אומדן מוכנות: ${d.readiness}`)
    if (plot.standard22?.value) lines.push(`🛡️ שומת תקן 22: ${fmt.price(plot.standard22.value)}`)
    if (plot.tax_authority_value || plot.taxAuthorityValue) {
      const taxVal = (plot.tax_authority_value ?? plot.taxAuthorityValue) as number
      if (taxVal > 0) lines.push(`🏛️ שומת רשות המיסים: ${fmt.price(taxVal)}`)
    }
    if (locationScore.score > 0) lines.push(`📍 ציון מיקום: ${locationScore.score}/10 (${locationScore.label})`)
    lines.push(``, `🔗 ${window.location.href}`, ``, `— נוצר ע"י LandMap Israel`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setReportCopied(true)
      setTimeout(() => setReportCopied(false), 2500)
    } catch { /* silently fail */ }
  }

  return (
    <PublicLayout>
      <ErrorBoundary>
        <PrintStyles />
        <ReadingProgress $pct={readingProgress} />
        <PlotJsonLd plot={plot} />
        {/* Sticky scroll-spy navigation */}
        <StickyNav $show={showSticky} aria-label="ניווט מהיר">
          <StickyNavLabel>גוש {d.block} · {plot.number}</StickyNavLabel>
          <StickyNavSep />
          {sectionIds.map(sid => (
            <SectionNavBtn key={sid} href={`#${sid}`} $active={activeId === sid}>
              {sectionLabels[sid]?.icon} {sectionLabels[sid]?.label}
            </SectionNavBtn>
          ))}
        </StickyNav>
        <Page data-print-date={new Date().toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' })}>
          <PrintHeader>
            <PrintLogo>🗺️ LandMap Israel</PrintLogo>
            <PrintMeta>
              Investment Report<br/>
              Generated: {new Date().toLocaleDateString('he-IL')}<br/>
              landmap.co.il
            </PrintMeta>
          </PrintHeader>
          <Breadcrumbs plot={plot} />

          {/* Satellite Hero Banner — visual anchor like Madlan property photos */}
          {heroSatUrl && (
            <HeroBanner>
              <HeroBannerImg
                src={heroSatUrl}
                alt={`תצלום לוויין — גוש ${d.block} חלקה ${plot.number}, ${plot.city}`}
                loading="eager"
                decoding="async"
              />
              <HeroBannerOverlay />
              <HeroBannerContent>
                <HeroBannerTitle>
                  <HeroBannerHeadline>גוש {d.block} חלקה {plot.number}</HeroBannerHeadline>
                  <HeroBannerSub>
                    <MapPin size={13} /> {plot.city}
                    {d.size > 0 && <><span>·</span>{fmt.dunam(d.size)} דונם</>}
                    {dom && <><span>·</span>{dom.label}</>}
                  </HeroBannerSub>
                </HeroBannerTitle>
                <HeroBannerBadge $bg={`${recommendation.color}22`} $c={recommendation.color}>
                  {recommendation.emoji} {recommendation.text}
                </HeroBannerBadge>
              </HeroBannerContent>
            </HeroBanner>
          )}

          <TitleRow>
            <TitleLeft>
              <Badges>
                <Badge $color={statusColors[plot.status || 'AVAILABLE']}>{statusLabels[plot.status || 'AVAILABLE'] || plot.status}</Badge>
                <Badge $color={grade.color}>{grade.grade}</Badge>
                <RecoBadge $color={recommendation.color}>{recommendation.emoji} {recommendation.text}</RecoBadge>
                {dom && <Badge $color={dom.color}>{dom.label}</Badge>}
                {(plot.updated_at || plot.updatedAt) && (
                  <UpdatedAtTag title={`עודכן: ${new Date((plot.updated_at || plot.updatedAt) as string).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}>
                    <Clock size={10} /> {fmt.relative((plot.updated_at || plot.updatedAt) as string) || fmt.date((plot.updated_at || plot.updatedAt) as string)}
                  </UpdatedAtTag>
                )}
              </Badges>
              <Title>גוש {d.block} חלקה {plot.number} - {plot.city}</Title>
            </TitleLeft>
            <Actions>
              <ViewOnMapBtn to={`/explore?plotId=${plot.id}`} aria-label="הצג במפה">
                <MapIcon size={16} /> הצג במפה
              </ViewOnMapBtn>
              <IconBtn $active={isFav(plot.id)} onClick={() => toggle(plot.id)} aria-label="מועדפים"><Heart size={20} fill={isFav(plot.id) ? t.gold : 'none'} /></IconBtn>
              <CompareToggleBtn
                $active={isInCompare(plot.id)}
                onClick={() => toggleCompare(plot.id)}
                aria-label={isInCompare(plot.id) ? 'הסר מהשוואה' : 'הוסף להשוואה'}
                title={isInCompare(plot.id) ? 'הסר מהשוואה' : 'הוסף להשוואה'}
              >
                <GitCompareArrows size={20} />
                {compareIds.length > 0 && <CompareBadge>{compareIds.length}</CompareBadge>}
              </CompareToggleBtn>
              <IconBtn onClick={handleShare} aria-label="שיתוף">{copied ? <Check size={20} color={t.ok} /> : <Share2 size={20} />}</IconBtn>
              <PrintBtn onClick={() => window.print()} aria-label="הדפס דו״ח"><Printer size={20} /></PrintBtn>
              <IconBtn aria-label="ניווט" onClick={() => window.open(`https://waze.com/ul?ll=${plot.coordinates?.[0]?.[0]},${plot.coordinates?.[0]?.[1]}&navigate=yes`, '_blank')}><Navigation size={20} /></IconBtn>
            </Actions>
          </TitleRow>

          <Metrics>
            <Metric $delay={0}>
              <MetricVal>{fmt.compact(d.price)}</MetricVal>
              <MetricLabel>מחיר</MetricLabel>
              {similarPlots.length >= 2 && d.price > 0 && (() => {
                const avgPrice = similarPlots.reduce((s, sp) => s + p(sp).price, 0) / similarPlots.length
                if (avgPrice <= 0) return null
                const pct = Math.round(((d.price - avgPrice) / avgPrice) * 100)
                return pct !== 0 ? (
                  <MetricDelta $positive={pct < 0}>
                    {pct < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {pct > 0 ? '+' : ''}{pct}% מהממוצע
                  </MetricDelta>
                ) : null
              })()}
            </Metric>
            <Metric $delay={0.06}><MetricVal>{fmt.dunam(d.size)} דונם</MetricVal><MetricLabel>שטח ({fmt.num(d.size)} מ״ר)</MetricLabel></Metric>
            {ppd > 0 && <Metric $delay={0.12}>
              <MetricVal>{fmt.num(ppd)}</MetricVal>
              <MetricLabel>₪ / דונם</MetricLabel>
              {similarPlots.length >= 2 && (() => {
                const avgPpd = Math.round(similarPlots.reduce((s, sp) => s + pricePerDunam(sp), 0) / similarPlots.length)
                if (avgPpd <= 0) return null
                const pct = Math.round(((ppd - avgPpd) / avgPpd) * 100)
                return pct !== 0 ? (
                  <MetricDelta $positive={pct < 0}>
                    {pct < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {pct > 0 ? '+' : ''}{pct}% מהממוצע
                  </MetricDelta>
                ) : null
              })()}
            </Metric>}
            <Metric $delay={0.18}>
              <MetricVal style={{color:t.ok}}>{fmt.pct(r)}</MetricVal>
              <MetricLabel>ROI צפוי</MetricLabel>
              {similarPlots.length >= 2 && r > 0 && (() => {
                const rois = similarPlots.map(sp => roi(sp)).filter(v => v > 0)
                const avgRoi = rois.length ? rois.reduce((s, v) => s + v, 0) / rois.length : 0
                if (avgRoi <= 0) return null
                const pct = Math.round(((r - avgRoi) / avgRoi) * 100)
                return pct !== 0 ? (
                  <MetricDelta $positive={pct > 0}>
                    {pct > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {pct > 0 ? '+' : ''}{pct}% מהממוצע
                  </MetricDelta>
                ) : null
              })()}
            </Metric>
            <Metric $delay={0.24}><MetricVal style={{color:t.gold}}>{cagr ? `${cagr.cagr}%` : '--'}</MetricVal><MetricLabel>CAGR ({cagr?.years || '-'} שנים)</MetricLabel></Metric>
          </Metrics>

          {/* Investment Summary One-Liner */}
          {investmentSummary && (
            <SummaryBar>
              <SummaryIcon>{grade.grade === 'A+' || grade.grade === 'A' ? '🏆' : grade.grade.startsWith('A') ? '⭐' : '📊'}</SummaryIcon>
              <span>
                {investmentSummary.split(' · ').map((part, i) => (
                  <span key={i}>
                    {i > 0 && <SummaryDot>·</SummaryDot>}
                    {i === 0 ? part : <SummaryHighlight>{part}</SummaryHighlight>}
                  </span>
                ))}
              </span>
              <SummaryActions>
                <SummaryGradeBadge $color={grade.color}>{grade.grade}</SummaryGradeBadge>
              </SummaryActions>
            </SummaryBar>
          )}

          {/* Section Navigation — quick jump to sections */}
          <SectionNav aria-label="ניווט מהיר לחלקים">
            {sectionIds.map(sid => (
              <SectionNavBtn key={sid} href={`#${sid}`} $active={activeId === sid}>
                {sectionLabels[sid]?.icon} {sectionLabels[sid]?.label}
              </SectionNavBtn>
            ))}
          </SectionNav>

          <Grid>
            {/* Main column */}
            <FlexCol>
              <Card $delay={0.1} id="investment">
                <CardTitle><TrendingUp size={18} color={t.gold} /> ניתוח השקעה</CardTitle>
                <Row><Label>מחיר שמאי</Label><Value>{fmt.price(plot.standard22?.value || 0)}</Value></Row>
                <Row><Label>שווי חזוי</Label><Value style={{color:t.ok}}>{fmt.price(d.projected)}</Value></Row>
                <Row><Label>ציון השקעה</Label><Value style={{color:grade.color}}>{score}/10 ({grade.grade})</Value></Row>
                {pps > 0 && <Row><Label>מחיר למ״ר</Label><Value style={{color:t.gold}}>₪{fmt.num(pps)}</Value></Row>}
                {ppd > 0 && <Row><Label>מחיר לדונם</Label><Value style={{color:t.gold}}>₪{fmt.num(ppd)}</Value></Row>}
                <Row><Label>צפיפות</Label><Value>{d.density} יח"ד/דונם</Value></Row>
                <Row><Label>אומדן מוכנות</Label><Value>{d.readiness || '--'}</Value></Row>
                {/* Investment Growth Projection Chart */}
                {d.price > 0 && d.projected > 0 && cagr && (
                  <InvestmentProjectionChart price={d.price} projected={d.projected} years={cagr.years} />
                )}
                {/* Score Breakdown — transparent factor analysis */}
                <ScoreBreakdownWrap>
                  <ScoreBreakdownTitle>
                    🔍 מרכיבי ציון ההשקעה ({score}/10)
                  </ScoreBreakdownTitle>
                  <ScoreBreakdownGrid>
                    {scoreBreakdown.factors.map(f => (
                      <ScoreFactorRow key={f.label}>
                        <ScoreFactorIcon>{f.icon}</ScoreFactorIcon>
                        <ScoreFactorLabel>{f.label}</ScoreFactorLabel>
                        <ScoreFactorBarTrack>
                          <ScoreFactorBarFill $pct={f.maxScore > 0 ? (f.score / f.maxScore) * 100 : 0} $color={grade.color} />
                        </ScoreFactorBarTrack>
                        <ScoreFactorVal>{f.score}/{f.maxScore}</ScoreFactorVal>
                        <ScoreFactorDetail>{f.detail}</ScoreFactorDetail>
                      </ScoreFactorRow>
                    ))}
                  </ScoreBreakdownGrid>
                </ScoreBreakdownWrap>
                {/* Tax Authority Value Comparison */}
                {taxComparison && (
                  <TaxCompWrap>
                    <TaxCompHeader>
                      <TaxCompTitle><Landmark size={14} color="#3B82F6" /> שומת רשות המיסים vs מחיר שוק</TaxCompTitle>
                      <TaxCompDelta $positive={taxComparison.delta <= 0}>
                        {taxComparison.delta <= 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                        {taxComparison.delta > 0 ? '+' : ''}{Math.round(taxComparison.delta)}%
                      </TaxCompDelta>
                    </TaxCompHeader>
                    <TaxCompBars>
                      <TaxCompBarRow>
                        <TaxCompBarLabel>מחיר שוק</TaxCompBarLabel>
                        <TaxCompBarTrack>
                          <TaxCompBarFill $pct={taxComparison.pricePct} $color={t.gold} />
                        </TaxCompBarTrack>
                        <TaxCompVal $color={t.gold}>{fmt.compact(d.price)}</TaxCompVal>
                      </TaxCompBarRow>
                      <TaxCompBarRow>
                        <TaxCompBarLabel>שומת מיסים</TaxCompBarLabel>
                        <TaxCompBarTrack>
                          <TaxCompBarFill $pct={taxComparison.taxPct} $color="#3B82F6" />
                        </TaxCompBarTrack>
                        <TaxCompVal $color="#3B82F6">{fmt.compact(taxComparison.taxVal)}</TaxCompVal>
                      </TaxCompBarRow>
                    </TaxCompBars>
                    <TaxCompNote>
                      {taxComparison.delta > 10
                        ? '⚠️ מחיר השוק גבוה משמעותית משומת המיסים — בדקו שהמחיר מוצדק'
                        : taxComparison.delta < -10
                        ? '✅ מחיר מתחת לשומה — ייתכן שמדובר בהזדמנות'
                        : 'ℹ️ מחיר השוק קרוב לשומת המיסים — תמחור סביר'}
                    </TaxCompNote>
                  </TaxCompWrap>
                )}
                {/* Copy Investment Report */}
                <CopyReportBtn $copied={reportCopied} onClick={copyInvestmentReport}>
                  {reportCopied ? <><Check size={15} /> הדו"ח הועתק!</> : <><ClipboardCopy size={15} /> העתק דו"ח השקעה</>}
                </CopyReportBtn>
              </Card>

              {/* Risk Assessment — like Madlan's risk meter */}
              <RiskCard $delay={0.15} id="risk">
                <CardTitle><AlertTriangle size={18} color={risk.color} /> הערכת סיכון</CardTitle>
                <RiskHeader>
                  <RiskLabel $color={risk.color}>{risk.icon} {risk.label}</RiskLabel>
                  <RiskMeter>
                    <RiskBar $pct={risk.score * 10} $color={risk.color} />
                    <RiskScoreLabel $color={risk.color}>{risk.score}/10</RiskScoreLabel>
                  </RiskMeter>
                </RiskHeader>
                <RiskFactors>
                  {risk.factors.map((f, i) => (
                    <RiskFactor key={i} $impact={f.impact}>
                      <FactorIcon $impact={f.impact}>
                        {f.impact === 'positive' ? '✅' : f.impact === 'negative' ? '⚠️' : 'ℹ️'}
                      </FactorIcon>
                      <FactorName>{f.name}</FactorName>
                      <FactorDetail>{f.detail}</FactorDetail>
                    </RiskFactor>
                  ))}
                </RiskFactors>
              </RiskCard>

              {/* Exit Strategy Scenarios — unique feature */}
              {exitScenarios && exitScenarios.length > 0 && (
                <ExitCard $delay={0.16} id="exit-strategy">
                  <CardTitle><Milestone size={18} color={t.gold} /> אסטרטגיית יציאה — תרחישי מכירה</CardTitle>
                  <ExitIntro>
                    מה יקרה אם תמכרו בכל שלב תכנוני? הנה התרחישים:
                  </ExitIntro>
                  <ExitGrid>
                    {exitScenarios.map((sc, i) => {
                      const isBest = sc.annualized === Math.max(...exitScenarios.map(s => s.annualized))
                      return (
                        <ExitRow key={sc.stage} $highlight={isBest}>
                          <ExitStageCol>
                            <ExitStageIcon>{sc.stageIcon}</ExitStageIcon>
                            <ExitStageInfo>
                              <ExitStageName>
                                {sc.stageLabel}
                                {isBest && <ExitBestBadge style={{ marginInlineStart: 6 }}>⭐ תשואה מיטבית</ExitBestBadge>}
                              </ExitStageName>
                              <ExitStageTime><Clock size={10} /> {sc.yearsLabel}</ExitStageTime>
                            </ExitStageInfo>
                          </ExitStageCol>
                          <ExitValueCol>
                            <ExitValue>{fmt.compact(sc.estimatedValue)}</ExitValue>
                            <ExitProfit $color={sc.color}>
                              <TrendingUp size={11} />+{fmt.compact(sc.profit)} רווח
                            </ExitProfit>
                          </ExitValueCol>
                          <ExitRoiCol>
                            <ExitRoiBadge $color={sc.color}>{sc.roi > 0 ? '+' : ''}{sc.roi}%</ExitRoiBadge>
                            <ExitAnnualized>{sc.annualized}% שנתי</ExitAnnualized>
                          </ExitRoiCol>
                        </ExitRow>
                      )
                    })}
                  </ExitGrid>
                  <ExitDisclaimer>
                    <AlertTriangle size={13} color={t.warn} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      התרחישים מבוססים על נתוני שוק ממוצעים ואינם מהווים הבטחת תשואה.
                      זמני התכנון בפועל תלויים ברשויות התכנון ובגורמים נוספים.
                    </span>
                  </ExitDisclaimer>
                </ExitCard>
              )}

              {/* Location Quality Score — Madlan-style location assessment */}
              {locationScore.factors.length > 0 && (
                <LocationScoreCard $delay={0.17} id="location">
                  <CardTitle><Compass size={18} color={t.gold} /> איכות מיקום</CardTitle>
                  <LocScoreHeader>
                    <LocGauge>
                      <LocGaugeSvg viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r="30" fill="none" stroke={t.lBorder} strokeWidth="6" />
                        <circle cx="36" cy="36" r="30" fill="none" stroke={locationScore.color} strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={`${(locationScore.score / 10) * 188.5} 188.5`}
                          style={{ transition: 'stroke-dasharray 1s ease' }}
                        />
                      </LocGaugeSvg>
                      <LocScoreNum $color={locationScore.color}>{locationScore.score}</LocScoreNum>
                    </LocGauge>
                    <div>
                      <LocScoreLabel $color={locationScore.color}>{locationScore.label}</LocScoreLabel>
                      <LocScoreDesc>דירוג מיקום מבוסס על קרבה למוקדי שירות, ים, שטחים ירוקים ורמת הפיתוח</LocScoreDesc>
                    </div>
                  </LocScoreHeader>
                  <LocFactors>
                    {locationScore.factors.map((f, i) => (
                      <LocFactor key={i}>
                        <LocFactorIcon>{f.icon}</LocFactorIcon>
                        <LocFactorName>{f.name}</LocFactorName>
                        <LocBarTrack>
                          <LocBarFill $pct={f.maxScore > 0 ? (f.score / f.maxScore) * 100 : 0} $color={locationScore.color} />
                        </LocBarTrack>
                        <LocFactorDetail>{f.detail}</LocFactorDetail>
                      </LocFactor>
                    ))}
                  </LocFactors>
                  {locationScore.tags.length > 0 && (
                    <LocationTags>
                      {locationScore.tags.map((tag, i) => (
                        <LocationTag key={i} $color={tag.color}>{tag.icon} {tag.label}</LocationTag>
                      ))}
                    </LocationTags>
                  )}
                </LocationScoreCard>
              )}

              {/* Plot vs Area Average Comparison — Madlan-style */}
              {similarPlots.length > 1 && (
                <div id="vs-area">
                  <PlotVsAreaComparison plot={plot} similarPlots={similarPlots} />
                </div>
              )}

              {/* City Ranking — how this plot ranks in its city */}
              {cityRanking && (
                <Card $delay={0.24} id="city-ranking">
                  <CardTitle><BarChart3 size={18} color={t.gold} /> דירוג ב{cityRanking.city}</CardTitle>
                  <CardSubtitle>
                    מיקום החלקה מתוך {cityRanking.plotCount} חלקות ב{cityRanking.city}
                  </CardSubtitle>
                  <RankGrid>
                    <RankCell $highlight={cityRanking.price.isBelowAvg}>
                      <RankLabel>מחיר</RankLabel>
                      <RankVal $c={cityRanking.price.isBelowAvg ? t.ok : undefined}>
                        {fmt.compact(cityRanking.price.value)}
                      </RankVal>
                      <RankDelta $positive={cityRanking.price.isBelowAvg}>
                        {cityRanking.price.delta > 0 ? '+' : ''}{cityRanking.price.delta}% vs ממוצע
                      </RankDelta>
                      <PercentileBar>
                        <RankBar>
                          <RankBarFill $pct={100} $c={t.lBorder} />
                          <RankBarMarker $pct={cityRanking.price.percentile} />
                        </RankBar>
                        <PercentileLabel>
                          <span>זול</span>
                          <span>אחוזון {cityRanking.price.percentile}</span>
                          <span>יקר</span>
                        </PercentileLabel>
                      </PercentileBar>
                    </RankCell>
                    <RankCell $highlight={cityRanking.roi.isAboveAvg}>
                      <RankLabel>תשואה</RankLabel>
                      <RankVal $c={cityRanking.roi.isAboveAvg ? t.ok : undefined}>
                        {cityRanking.roi.value > 0 ? `+${Math.round(cityRanking.roi.value)}%` : '—'}
                      </RankVal>
                      <RankDelta $positive={cityRanking.roi.isAboveAvg}>
                        {cityRanking.roi.delta > 0 ? '+' : ''}{cityRanking.roi.delta}% vs ממוצע
                      </RankDelta>
                      <PercentileBar>
                        <RankBar>
                          <RankBarFill $pct={100} $c={t.lBorder} />
                          <RankBarMarker $pct={cityRanking.roi.percentile} />
                        </RankBar>
                        <PercentileLabel>
                          <span>נמוך</span>
                          <span>אחוזון {cityRanking.roi.percentile}</span>
                          <span>גבוה</span>
                        </PercentileLabel>
                      </PercentileBar>
                    </RankCell>
                    <RankCell $highlight={cityRanking.pricePerDunam.isBelowAvg}>
                      <RankLabel>₪/דונם</RankLabel>
                      <RankVal $c={cityRanking.pricePerDunam.isBelowAvg ? t.ok : undefined}>
                        ₪{fmt.num(cityRanking.pricePerDunam.value)}
                      </RankVal>
                      <RankDelta $positive={cityRanking.pricePerDunam.isBelowAvg}>
                        {cityRanking.pricePerDunam.delta > 0 ? '+' : ''}{cityRanking.pricePerDunam.delta}% vs ממוצע
                      </RankDelta>
                      <PercentileBar>
                        <RankBar>
                          <RankBarFill $pct={100} $c={t.lBorder} />
                          <RankBarMarker $pct={cityRanking.pricePerDunam.percentile} />
                        </RankBar>
                        <PercentileLabel>
                          <span>זול</span>
                          <span>אחוזון {cityRanking.pricePerDunam.percentile}</span>
                          <span>יקר</span>
                        </PercentileLabel>
                      </PercentileBar>
                    </RankCell>
                  </RankGrid>
                </Card>
              )}

              {timeline && (
                <Card $delay={0.2} id="timeline">
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
                        {c.date && <CommitteeDate>{c.date}</CommitteeDate>}
                      </Value>
                    </Row>
                  ))}
                </Card>
              )}

              {plot.description && (
                <Card $delay={0.35}>
                  <CardTitle><FileText size={18} color={t.gold} /> תיאור</CardTitle>
                  <DescriptionText>{plot.description}</DescriptionText>
                </Card>
              )}

              {/* Neighborhood Development Context — like Madlan's area development info */}
              {(plot.area_context || plot.nearby_development || plot.nearbyDevelopment) && (
                <DevCard $delay={0.37} id="neighborhood">
                  <CardTitle><Construction size={18} color={t.gold} /> סביבה ופיתוח</CardTitle>
                  <FlexCol $gap={12}>
                    {plot.area_context && (plot.area_context as string).trim() && (
                      <DevSection>
                        <DevSectionTitle>
                          <Milestone size={14} color="#8B5CF6" /> הקשר אזורי
                        </DevSectionTitle>
                        <DevSectionText>{plot.area_context as string}</DevSectionText>
                      </DevSection>
                    )}
                    {(plot.nearby_development || plot.nearbyDevelopment) && (
                      <DevSection>
                        <DevSectionTitle>
                          <Building2 size={14} color="#3B82F6" /> פיתוח בסביבה
                        </DevSectionTitle>
                        <DevSectionText>{(plot.nearby_development ?? plot.nearbyDevelopment) as string}</DevSectionText>
                      </DevSection>
                    )}
                  </FlexCol>
                </DevCard>
              )}
            </FlexCol>

            {/* Side column */}
            <FlexCol>
              {/* Investment Highlights — quick snapshot for investors */}
              <HighlightsCard $delay={0.05}>
                <CardTitle style={{marginBottom:12}}>⚡ נקודות מפתח</CardTitle>
                {d.projected > d.price && d.price > 0 && (
                  <HighlightItem>
                    <HighlightIcon>💰</HighlightIcon>
                    <HighlightText>
                      <HighlightLabel>רווח צפוי</HighlightLabel>
                      <HighlightVal $c={t.ok}>+{fmt.compact(d.projected - d.price)}</HighlightVal>
                    </HighlightText>
                  </HighlightItem>
                )}
                {cagr && (
                  <HighlightItem>
                    <HighlightIcon>📈</HighlightIcon>
                    <HighlightText>
                      <HighlightLabel>צמיחה שנתית (CAGR)</HighlightLabel>
                      <HighlightVal $c={t.gold}>{cagr.cagr}% · {cagr.years} שנים</HighlightVal>
                    </HighlightText>
                  </HighlightItem>
                )}
                {ppd > 0 && (
                  <HighlightItem>
                    <HighlightIcon>📐</HighlightIcon>
                    <HighlightText>
                      <HighlightLabel>מחיר לדונם</HighlightLabel>
                      <HighlightVal>₪{fmt.num(ppd)}</HighlightVal>
                    </HighlightText>
                  </HighlightItem>
                )}
                <HighlightItem>
                  <HighlightIcon>🛡️</HighlightIcon>
                  <HighlightText>
                    <HighlightLabel>רמת סיכון</HighlightLabel>
                    <HighlightVal $c={risk.color}>{risk.icon} {risk.label}</HighlightVal>
                  </HighlightText>
                </HighlightItem>
                {zoningLabels[d.zoning] && (
                  <HighlightItem>
                    <HighlightIcon>📋</HighlightIcon>
                    <HighlightText>
                      <HighlightLabel>שלב תכנוני</HighlightLabel>
                      <HighlightVal>{zoningLabels[d.zoning]}</HighlightVal>
                    </HighlightText>
                  </HighlightItem>
                )}
                {estimatedYear(plot) && (
                  <HighlightItem>
                    <HighlightIcon>🏗️</HighlightIcon>
                    <HighlightText>
                      <HighlightLabel>היתר בנייה צפוי</HighlightLabel>
                      <HighlightVal $c={t.gold}>{estimatedYear(plot)!.label}</HighlightVal>
                    </HighlightText>
                  </HighlightItem>
                )}
              </HighlightsCard>

              {/* Contact Agent Card — Madlan-style */}
              <AgentCard $delay={0.07}>
                <AgentCardHeader>
                  <AgentAvatar>LM</AgentAvatar>
                  <AgentInfo>
                    <AgentName>צוות LandMap</AgentName>
                    <AgentRole>
                      מומחי קרקע להשקעה
                      <AgentVerifiedBadge>✓ מאומת</AgentVerifiedBadge>
                    </AgentRole>
                  </AgentInfo>
                </AgentCardHeader>
                <AgentCardBody>
                  <AgentCTARow>
                    <AgentWhatsAppBtn href={waLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={18} /> שלח הודעה
                    </AgentWhatsAppBtn>
                    <AgentPhoneBtn href={`tel:${SITE_CONFIG.phone}`} aria-label="התקשר">
                      <Phone size={18} />
                    </AgentPhoneBtn>
                  </AgentCTARow>
                  <AgentMetaRow>
                    <AgentMetaItem>⏱️ זמן תגובה: <AgentMetaVal>&lt;1 שעה</AgentMetaVal></AgentMetaItem>
                    <AgentMetaItem>⭐ <AgentMetaVal>4.9</AgentMetaVal>/5</AgentMetaItem>
                  </AgentMetaRow>
                </AgentCardBody>
              </AgentCard>

              {/* Mini Map */}
              <Card $delay={0.1}>
                <CardTitle><MapPin size={18} color={t.gold} /> מיקום על המפה</CardTitle>
                <Suspense fallback={<SkeletonPulse $h="260px" style={{borderRadius:t.r.lg}} />}>
                  <MiniMapLazy plot={plot} />
                </Suspense>
              </Card>

              <Card $delay={0.15}>
                <CardTitle><MapPin size={18} color={t.gold} /> פרטי מיקום</CardTitle>
                <Row><Label>עיר</Label><Value>{plot.city}</Value></Row>
                <Row><Label>גוש / חלקה</Label><Value>{d.block} / {plot.number}</Value></Row>
                {/* Nearby Amenities */}
                {(d.seaDist != null || d.parkDist != null || (plot.distance_to_hospital ?? plot.distanceToHospital)) && (
                  <AmenitiesWrap>
                    <AmenitiesTitle>קרבה למוקדי עניין</AmenitiesTitle>
                    <AmenitiesGrid>
                      {d.seaDist != null && d.seaDist > 0 && (
                        <AmenityItem>
                          <AmenityIcon $color="#3B82F6"><Waves size={18} /></AmenityIcon>
                          <div><AmenityLabel>מרחק לים</AmenityLabel><AmenityVal>{fmt.num(d.seaDist)} מ׳</AmenityVal></div>
                        </AmenityItem>
                      )}
                      {d.parkDist != null && d.parkDist > 0 && (
                        <AmenityItem>
                          <AmenityIcon $color="#10B981"><TreePine size={18} /></AmenityIcon>
                          <div><AmenityLabel>מרחק לפארק</AmenityLabel><AmenityVal>{fmt.num(d.parkDist)} מ׳</AmenityVal></div>
                        </AmenityItem>
                      )}
                      {(plot.distance_to_hospital ?? plot.distanceToHospital) != null && (plot.distance_to_hospital ?? plot.distanceToHospital as number) > 0 && (
                        <AmenityItem>
                          <AmenityIcon $color="#EF4444"><Hospital size={18} /></AmenityIcon>
                          <div><AmenityLabel>מרחק לבי״ח</AmenityLabel><AmenityVal>{fmt.num(plot.distance_to_hospital ?? plot.distanceToHospital as number)} מ׳</AmenityVal></div>
                        </AmenityItem>
                      )}
                    </AmenitiesGrid>
                  </AmenitiesWrap>
                )}
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
                  <FlexCol $gap={8}>
                    {plot.documents.map((doc, i) => (
                      <DocItem key={i} href="#"><FileText size={14} color={t.lTextSec} />{doc}</DocItem>
                    ))}
                  </FlexCol>
                </Card>
              ) : null}

              {/* Mortgage Calculator */}
              {d.price > 0 && (
                <Card $delay={0.35} id="mortgage">
                  <CardTitle><Calculator size={18} color={t.gold} /> מחשבון מימון</CardTitle>
                  <CalcWrap>
                    <CalcSliderRow>
                      <CalcSliderLabel>
                        <CalcSliderName>אחוז מימון (LTV)</CalcSliderName>
                        <CalcSliderVal>{ltvPct}%</CalcSliderVal>
                      </CalcSliderLabel>
                      <CalcSlider min={10} max={80} step={5} value={ltvPct}
                        style={{ '--pct': `${((ltvPct - 10) / 70) * 100}%` } as React.CSSProperties}
                        onChange={e => setLtvPct(Number(e.target.value))} />
                    </CalcSliderRow>
                    <CalcSliderRow>
                      <CalcSliderLabel>
                        <CalcSliderName>ריבית שנתית</CalcSliderName>
                        <CalcSliderVal>{interestRate}%</CalcSliderVal>
                      </CalcSliderLabel>
                      <CalcSlider min={2} max={12} step={0.5} value={interestRate}
                        style={{ '--pct': `${((interestRate - 2) / 10) * 100}%` } as React.CSSProperties}
                        onChange={e => setInterestRate(Number(e.target.value))} />
                    </CalcSliderRow>
                    <CalcSliderRow>
                      <CalcSliderLabel>
                        <CalcSliderName>תקופת הלוואה</CalcSliderName>
                        <CalcSliderVal>{loanYears} שנים</CalcSliderVal>
                      </CalcSliderLabel>
                      <CalcSlider min={5} max={30} step={1} value={loanYears}
                        style={{ '--pct': `${((loanYears - 5) / 25) * 100}%` } as React.CSSProperties}
                        onChange={e => setLoanYears(Number(e.target.value))} />
                    </CalcSliderRow>
                    {mortgage && (
                      <CalcResult>
                        <CalcResultItem>
                          <CalcResultVal $gold>{fmt.price(mortgage.monthly)}</CalcResultVal>
                          <CalcResultLabel>החזר חודשי</CalcResultLabel>
                        </CalcResultItem>
                        <CalcResultItem>
                          <CalcResultVal>{fmt.price(mortgage.down)}</CalcResultVal>
                          <CalcResultLabel>הון עצמי</CalcResultLabel>
                        </CalcResultItem>
                        <CalcResultItem>
                          <CalcResultVal>{fmt.price(mortgage.loan)}</CalcResultVal>
                          <CalcResultLabel>סכום הלוואה</CalcResultLabel>
                        </CalcResultItem>
                        <CalcResultItem>
                          <CalcResultVal>{fmt.price(mortgage.monthly * loanYears * 12)}</CalcResultVal>
                          <CalcResultLabel>סה״כ החזר</CalcResultLabel>
                        </CalcResultItem>
                      </CalcResult>
                    )}
                  </CalcWrap>
                </Card>
              )}
              {/* Budget Affordability Widget */}
              {d.price > 0 && (
                <Card $delay={0.38}>
                  <CardTitle><DollarSign size={18} color={t.gold} /> מתאים לתקציב שלך?</CardTitle>
                  <AffordWrap>
                    <AffordInputRow>
                      <AffordCurrency>₪</AffordCurrency>
                      <AffordInput
                        type="text"
                        inputMode="numeric"
                        placeholder="הכנס תקציב..."
                        value={budgetInput}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^\d]/g, '')
                          setBudgetInput(raw ? Number(raw).toLocaleString('he-IL') : '')
                        }}
                        aria-label="תקציב השקעה"
                      />
                    </AffordInputRow>
                    {(() => {
                      const budget = Number((budgetInput || '0').replace(/[^\d]/g, ''))
                      if (budget <= 0) return (
                        <AffordNote>הכנס את סכום ההשקעה שלך לבדיקת כדאיות מהירה</AffordNote>
                      )
                      const canAfford = budget >= d.price
                      const coveragePct = Math.min(100, Math.round((budget / d.price) * 100))
                      const remaining = d.price - budget
                      const projectedReturn = d.projected > 0 && canAfford
                        ? Math.round(((d.projected - d.price) / d.price) * budget)
                        : 0
                      const ltvNeeded = !canAfford ? Math.round(((d.price - budget) / d.price) * 100) : 0
                      return (
                        <>
                          <AffordResultGrid>
                            <AffordResultItem $highlight={canAfford}>
                              <AffordResultVal $c={canAfford ? t.ok : t.warn}>{coveragePct}%</AffordResultVal>
                              <AffordResultLabel>{canAfford ? 'מכסה את המחיר' : 'כיסוי מהמחיר'}</AffordResultLabel>
                            </AffordResultItem>
                            {canAfford ? (
                              <AffordResultItem $highlight>
                                <AffordResultVal $c={t.ok}>+{fmt.compact(projectedReturn)}</AffordResultVal>
                                <AffordResultLabel>רווח צפוי על ההשקעה</AffordResultLabel>
                              </AffordResultItem>
                            ) : (
                              <AffordResultItem>
                                <AffordResultVal $c={t.err}>{fmt.compact(remaining)}</AffordResultVal>
                                <AffordResultLabel>חסר למחיר מלא</AffordResultLabel>
                              </AffordResultItem>
                            )}
                            {!canAfford && (
                              <AffordResultItem>
                                <AffordResultVal>{ltvNeeded}%</AffordResultVal>
                                <AffordResultLabel>מימון נדרש (LTV)</AffordResultLabel>
                              </AffordResultItem>
                            )}
                            {!canAfford && mortgage && (
                              <AffordResultItem>
                                <AffordResultVal $c={t.gold}>{fmt.compact(calcMonthly(d.price, ltvNeeded / 100, interestRate / 100, loanYears)?.monthly || 0)}</AffordResultVal>
                                <AffordResultLabel>החזר חודשי משוער</AffordResultLabel>
                              </AffordResultItem>
                            )}
                          </AffordResultGrid>
                          <AffordNote>
                            {canAfford
                              ? `✅ התקציב שלך מכסה את מחיר החלקה${projectedReturn > 0 ? ` עם רווח צפוי של ${fmt.compact(projectedReturn)}` : ''}`
                              : `💡 עם הון עצמי של ${fmt.compact(budget)} תצטרך מימון של ${ltvNeeded}%`
                            }
                          </AffordNote>
                        </>
                      )
                    })()}
                  </AffordWrap>
                </Card>
              )}
            </FlexCol>
          </Grid>

          {/* Similar Plots */}
          {similarPlots.length > 0 && (
            <SimilarSection id="similar">
              <Card $delay={0.4}>
                <CardTitle><BarChart3 size={18} color={t.gold} /> חלקות דומות באזור</CardTitle>
                <SimilarGrid>
                  {similarPlots.slice(0, 4).map(sp => {
                    const sd = p(sp), sr = roi(sp), sg = getGrade(calcScore(sp)), spps = pricePerSqm(sp)
                    const spCenter = plotCenter(sp.coordinates)
                    const spThumb = spCenter ? satelliteTileUrl(spCenter.lat, spCenter.lng) : null
                    // Price comparison: this plot vs current plot
                    const pricePct = d.price > 0 && sd.price > 0 ? Math.round((sd.price / d.price) * 100) : 0
                    const isPriceLower = sd.price < d.price && sd.price > 0 && d.price > 0
                    return (
                      <SimilarCard key={sp.id} to={`/plot/${sp.id}`}>
                        {spThumb && (
                          <SatThumbWrap>
                            <SatThumbImg src={spThumb} alt={`לוויין — גוש ${sd.block} חלקה ${sp.number}`} loading="lazy" decoding="async" />
                            <SatThumbOverlay />
                            <SimilarThumbOverlay>
                              <SimilarThumbPrice>{fmt.compact(sd.price)}</SimilarThumbPrice>
                              <SimilarThumbGrade $c={sg.color}>{sg.grade}</SimilarThumbGrade>
                            </SimilarThumbOverlay>
                          </SatThumbWrap>
                        )}
                        <SimilarBody>
                        <SimilarTop>
                          <div>
                            <SimilarCity>{sp.city}</SimilarCity>
                            <SimilarBlock>גוש {sd.block} · חלקה {sp.number}</SimilarBlock>
                          </div>
                          {!spThumb && <Badge $color={sg.color} style={{ fontSize: 11 }}>{sg.grade}</Badge>}
                        </SimilarTop>
                        <SimilarMetrics>
                          {!spThumb && <SimilarMetric><DollarSign size={11} /><SimilarVal $gold>{fmt.compact(sd.price)}</SimilarVal></SimilarMetric>}
                          <SimilarMetric><Ruler size={11} /><SimilarVal>{fmt.num(sd.size)} מ״ר</SimilarVal></SimilarMetric>
                          {sr > 0 && <SimilarMetric><TrendingUp size={11} /><SimilarVal style={{ color: t.ok }}>{Math.round(sr)}%</SimilarVal></SimilarMetric>}
                          {spps > 0 && <SimilarMetric>₪/מ״ר <SimilarVal>{fmt.num(spps)}</SimilarVal></SimilarMetric>}
                        </SimilarMetrics>
                        {pricePct > 0 && (
                          <SimilarCompareBar title={`${pricePct}% ממחיר חלקה זו`}>
                            <SimilarCompareSegment $pct={pricePct} $c={isPriceLower ? t.ok : t.warn} />
                            <SimilarCompareLabel>{isPriceLower ? `${100 - pricePct}% זול יותר` : pricePct > 100 ? `${pricePct - 100}% יקר יותר` : 'מחיר דומה'}</SimilarCompareLabel>
                          </SimilarCompareBar>
                        )}
                        </SimilarBody>
                      </SimilarCard>
                    )
                  })}
                </SimilarGrid>
              </Card>
            </SimilarSection>
          )}
        </Page>

        <BottomBar>
          <BarGradeBadge $color={grade.color}>{grade.grade}</BarGradeBadge>
          <BarPrice>{fmt.price(d.price)}</BarPrice>
          {r > 0 && <BarRoiBadge $color={r > 30 ? t.ok : t.warn}><TrendingUp size={11} />+{Math.round(r)}%</BarRoiBadge>}
          {d.projected > d.price && d.price > 0 && <BarProfit>+{fmt.compact(d.projected - d.price)} רווח</BarProfit>}
          <BarSpacer />
          <BarCallBtn href={waLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </BarCallBtn>
          <BarGetInfoBtn onClick={() => setLeadOpen(true)}>קבל פרטים</BarGetInfoBtn>
        </BottomBar>

        <Suspense fallback={null}>
          <LeadModal plot={plot} open={leadOpen} onClose={() => setLeadOpen(false)} />
        </Suspense>
        {/* WhatsApp Floating CTA */}
        <WhatsAppFab
          href={waLink}
          target="_blank" rel="noopener noreferrer"
          aria-label="שלח הודעה בוואטסאפ"
        >
          <MessageCircle size={24} />
        </WhatsAppFab>
        <ScrollToTop threshold={300} />
      </ErrorBoundary>
    </PublicLayout>
  )
}
