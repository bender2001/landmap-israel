import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowRight, Heart, Navigation, MapPin, FileText, Calendar, Building2, Landmark, Clock, TrendingUp, TrendingDown, Shield, Share2, Copy, Check, Waves, TreePine, Hospital, Calculator, DollarSign, Percent, BarChart3, Ruler, Printer, AlertTriangle, Map as MapIcon, MessageCircle, Compass, ClipboardCopy, Construction, Milestone } from 'lucide-react'
import { t, sm, md, lg, fadeInUp } from '../theme'
import { usePlot, useFavorites, useSimilarPlots, useRecentlyViewed } from '../hooks'
import { Spinner, GoldButton, GhostButton, Badge, ErrorBoundary, AnimatedCard, ScrollToTop } from '../components/UI'
import { PublicLayout } from '../components/Layout'
import { p, roi, fmt, calcScore, calcScoreBreakdown, getGrade, calcCAGR, calcMonthly, calcTimeline, statusLabels, statusColors, zoningLabels, daysOnMarket, zoningPipeline, pricePerSqm, pricePerDunam, plotCenter, calcRisk, calcLocationScore, setOgMeta, removeOgMeta, SITE_CONFIG } from '../utils'
import type { RiskAssessment } from '../utils'
import type { Plot } from '../types'

const LeadModal = lazy(() => import('../components/LeadModal'))

/* ── styled ── */
const Back = styled(Link)`display:inline-flex;align-items:center;gap:6px;color:${t.lTextSec};font-size:13px;font-weight:500;margin-bottom:16px;text-decoration:none!important;transition:color ${t.tr};&:hover{color:${t.gold};}`

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

const Center = styled.div`display:flex;align-items:center;justify-content:center;min-height:60vh;`

/* ── Reading Progress Bar ── */
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

/* ── Similar Plots ── */
const SimilarGrid = styled.div`display:grid;grid-template-columns:1fr;gap:12px;${sm}{grid-template-columns:repeat(2,1fr);}`
const SimilarCard = styled(Link)`
  display:flex;flex-direction:column;gap:8px;padding:14px;
  background:${t.lBg};border:1px solid ${t.lBorder};border-radius:${t.r.md};
  text-decoration:none!important;color:inherit;transition:all ${t.tr};
  &:hover{border-color:${t.goldBorder};box-shadow:${t.sh.sm};transform:translateY(-2px);}
`
const SimilarTop = styled.div`display:flex;align-items:center;justify-content:space-between;gap:8px;`
const SimilarCity = styled.span`font-size:13px;font-weight:700;color:${t.lText};`
const SimilarBlock = styled.span`font-size:11px;color:${t.lTextSec};`
const SimilarMetrics = styled.div`display:flex;align-items:center;gap:10px;flex-wrap:wrap;`
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
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <ChartValueLabel>📈 צמיחה שנתית: <span style={{ color: t.gold, fontWeight: 800 }}>{(cagr * 100).toFixed(1)}%</span></ChartValueLabel>
        <ChartValueLabel $gold>+{fmt.compact(projected - price)} רווח צפוי</ChartValueLabel>
      </div>
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
      <div style={{ fontSize: 12, color: t.lTextSec, marginTop: -8, marginBottom: 8 }}>
        בהשוואה ל-{allPlots.length - 1} חלקות דומות ב{plot.city}
      </div>
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

    return () => {
      document.title = 'LandMap Israel'
      removeOgMeta(['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description'])
    }
  }, [plot])

  const { data: similarPlots = [] } = useSimilarPlots(id)

  if (isLoading) return <PublicLayout><PlotDetailSkeleton /></PublicLayout>
  if (error || !plot) return (
    <PublicLayout>
      <Center>
        <div style={{ textAlign:'center', direction:'rtl', padding:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
          <h2 style={{ fontSize:24, fontWeight:800, color:t.lText, marginBottom:8, fontFamily:t.font }}>החלקה לא נמצאה</h2>
          <p style={{ fontSize:14, color:t.lTextSec, marginBottom:24, lineHeight:1.6 }}>
            ייתכן שהחלקה הוסרה או שהקישור שגוי.<br/>נסו לחפש חלקה אחרת במפה.
          </p>
          <Link to="/explore" style={{
            display:'inline-flex', alignItems:'center', gap:8, padding:'12px 28px',
            background:`linear-gradient(135deg,${t.gold},${t.goldBright})`, color:t.bg,
            borderRadius:t.r.full, fontWeight:700, fontSize:15, fontFamily:t.font,
            textDecoration:'none', transition:`all ${t.tr}`,
          }}>
            <MapPin size={16} /> חזרה למפה
          </Link>
        </div>
      </Center>
    </PublicLayout>
  )

  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const cagr = calcCAGR(r, d.readiness), timeline = calcTimeline(plot), dom = daysOnMarket(d.created), pps = pricePerSqm(plot), ppd = pricePerDunam(plot)
  const mortgage = d.price > 0 ? calcMonthly(d.price, ltvPct / 100, interestRate / 100, loanYears) : null
  const risk = useMemo(() => calcRisk(plot, similarPlots.length > 0 ? [plot, ...similarPlots] : undefined), [plot, similarPlots])
  const locationScore = useMemo(() => calcLocationScore(plot), [plot])
  const scoreBreakdown = useMemo(() => calcScoreBreakdown(plot), [plot])

  // Section IDs for scroll-spy
  const hasDevContext = !!(plot.area_context || plot.nearby_development || plot.nearbyDevelopment)
  const sectionIds = useMemo(() => {
    const ids = ['investment', 'risk']
    if (locationScore.factors.length > 0) ids.push('location')
    if (hasDevContext) ids.push('neighborhood')
    if (similarPlots.length > 1) ids.push('vs-area')
    if (timeline) ids.push('timeline')
    if (d.price > 0) ids.push('mortgage')
    if (similarPlots.length > 0) ids.push('similar')
    return ids
  }, [locationScore.factors.length, similarPlots.length, timeline, d.price, hasDevContext])
  const { activeId, showSticky } = useScrollSpy(sectionIds)

  // Section labels for nav
  const sectionLabels: Record<string, { icon: React.ReactNode; label: string }> = {
    investment: { icon: <TrendingUp size={12} />, label: 'ניתוח השקעה' },
    risk: { icon: <AlertTriangle size={12} />, label: 'סיכון' },
    location: { icon: <Compass size={12} />, label: 'מיקום' },
    neighborhood: { icon: <Construction size={12} />, label: 'סביבה' },
    'vs-area': { icon: <BarChart3 size={12} />, label: 'vs ממוצע' },
    timeline: { icon: <Clock size={12} />, label: 'ציר זמן' },
    mortgage: { icon: <Calculator size={12} />, label: 'מחשבון' },
    similar: { icon: <BarChart3 size={12} />, label: 'דומות' },
  }

  // Investment summary text
  const investmentSummary = useMemo(() => {
    const parts: string[] = []
    const zoningLabel = zoningLabels[d.zoning] || ''
    if (zoningLabel) parts.push(zoningLabel)
    if (d.size > 0) parts.push(`${fmt.dunam(d.size)} דונם`)
    if (d.price > 0) parts.push(`ב-${fmt.compact(d.price)}`)
    const summaryParts: string[] = []
    if (parts.length) summaryParts.push(`קרקע ${parts.join(', ')} ב${plot.city}`)
    if (r > 0) summaryParts.push(`תשואה צפויה ${Math.round(r)}%`)
    if (cagr) summaryParts.push(`צמיחה ${cagr.cagr}% שנתי על פני ${cagr.years} שנים`)
    return summaryParts.join(' · ')
  }, [plot, d, r, cagr])

  // WhatsApp link with plot context
  const waLink = useMemo(() => {
    const msg = `היי, מתעניין/ת בחלקה ${plot.number} גוש ${d.block} ב${plot.city} (${fmt.compact(d.price)}). אשמח לפרטים נוספים.`
    return `${SITE_CONFIG.waLink}?text=${encodeURIComponent(msg)}`
  }, [plot, d])

  // Copy investment report to clipboard
  const [reportCopied, setReportCopied] = useState(false)
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

  // Tax authority value comparison data
  const taxComparison = useMemo(() => {
    const taxVal = (plot.tax_authority_value ?? plot.taxAuthorityValue) as number | undefined
    if (!taxVal || taxVal <= 0 || d.price <= 0) return null
    const delta = ((d.price - taxVal) / taxVal) * 100
    const maxVal = Math.max(d.price, taxVal)
    return { taxVal, delta, pricePct: (d.price / maxVal) * 100, taxPct: (taxVal / maxVal) * 100 }
  }, [plot, d.price])

  return (
    <PublicLayout>
      <ErrorBoundary>
        <ReadingProgress $pct={readingProgress} />
        <PlotJsonLd plot={plot} />
        {/* Sticky scroll-spy navigation */}
        <StickyNav $show={showSticky} aria-label="ניווט מהיר">
          <span style={{ fontSize: 13, fontWeight: 800, color: t.lText, whiteSpace: 'nowrap', marginInlineEnd: 8, fontFamily: t.font }}>
            גוש {d.block} · {plot.number}
          </span>
          <span style={{ width: 1, height: 20, background: t.lBorder, flexShrink: 0 }} />
          {sectionIds.map(sid => (
            <SectionNavBtn key={sid} href={`#${sid}`} $active={activeId === sid}>
              {sectionLabels[sid]?.icon} {sectionLabels[sid]?.label}
            </SectionNavBtn>
          ))}
        </StickyNav>
        <Page>
          <PrintHeader>
            <PrintLogo>🗺️ LandMap Israel</PrintLogo>
            <PrintMeta>
              Investment Report<br/>
              Generated: {new Date().toLocaleDateString('he-IL')}<br/>
              landmap.co.il
            </PrintMeta>
          </PrintHeader>
          <Breadcrumbs plot={plot} />

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
              <ViewOnMapBtn to={`/explore?plotId=${plot.id}`} aria-label="הצג במפה">
                <MapIcon size={16} /> הצג במפה
              </ViewOnMapBtn>
              <IconBtn $active={isFav(plot.id)} onClick={() => toggle(plot.id)} aria-label="מועדפים"><Heart size={20} fill={isFav(plot.id) ? t.gold : 'none'} /></IconBtn>
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
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, color: pct < 0 ? t.ok : t.err }}>
                    {pct < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {pct > 0 ? '+' : ''}{pct}% מהממוצע
                  </div>
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
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, color: pct < 0 ? t.ok : t.err }}>
                    {pct < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {pct > 0 ? '+' : ''}{pct}% מהממוצע
                  </div>
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
                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, color: pct > 0 ? t.ok : t.err }}>
                    {pct > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {pct > 0 ? '+' : ''}{pct}% מהממוצע
                  </div>
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
                {investmentSummary.split(' · ').map((part, i, arr) => (
                  <span key={i}>
                    {i > 0 && <span style={{ color: t.lBorder, margin: '0 6px' }}>·</span>}
                    {i === 0 ? part : <SummaryHighlight>{part}</SummaryHighlight>}
                  </span>
                ))}
              </span>
              <span style={{ marginInlineStart: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '3px 10px', borderRadius: t.r.full,
                  background: `${grade.color}18`, border: `1px solid ${grade.color}30`,
                  fontSize: 13, fontWeight: 800, color: grade.color,
                }}>{grade.grade}</span>
              </span>
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
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
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
                    <div style={{ fontSize: 11, color: t.lTextSec, marginTop: 8, lineHeight: 1.5 }}>
                      {taxComparison.delta > 10
                        ? '⚠️ מחיר השוק גבוה משמעותית משומת המיסים — בדקו שהמחיר מוצדק'
                        : taxComparison.delta < -10
                        ? '✅ מחיר מתחת לשומה — ייתכן שמדובר בהזדמנות'
                        : 'ℹ️ מחיר השוק קרוב לשומת המיסים — תמחור סביר'}
                    </div>
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
                    <span style={{ fontSize: 12, fontWeight: 800, color: risk.color, minWidth: 28, textAlign: 'center' }}>{risk.score}/10</span>
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
                </Card>
              )}

              {/* Neighborhood Development Context — like Madlan's area development info */}
              {(plot.area_context || plot.nearby_development || plot.nearbyDevelopment) && (
                <DevCard $delay={0.37} id="neighborhood">
                  <CardTitle><Construction size={18} color={t.gold} /> סביבה ופיתוח</CardTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                  </div>
                </DevCard>
              )}
            </div>

            {/* Side column */}
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
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
                  <div style={{marginTop:12}}>
                    <div style={{fontSize:12,fontWeight:700,color:t.lTextSec,marginBottom:10}}>קרבה למוקדי עניין</div>
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
                  </div>
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
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {plot.documents.map((doc, i) => (
                      <DocItem key={i} href="#"><FileText size={14} color={t.lTextSec} />{doc}</DocItem>
                    ))}
                  </div>
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
            </div>
          </Grid>

          {/* Similar Plots */}
          {similarPlots.length > 0 && (
            <div style={{ marginTop: 32 }} id="similar">
              <Card $delay={0.4}>
                <CardTitle><BarChart3 size={18} color={t.gold} /> חלקות דומות באזור</CardTitle>
                <SimilarGrid>
                  {similarPlots.slice(0, 4).map(sp => {
                    const sd = p(sp), sr = roi(sp), sg = getGrade(calcScore(sp)), spps = pricePerSqm(sp)
                    return (
                      <SimilarCard key={sp.id} to={`/plot/${sp.id}`}>
                        <SimilarTop>
                          <div>
                            <SimilarCity>{sp.city}</SimilarCity>
                            <SimilarBlock>גוש {sd.block} · חלקה {sp.number}</SimilarBlock>
                          </div>
                          <Badge $color={sg.color} style={{ fontSize: 11 }}>{sg.grade}</Badge>
                        </SimilarTop>
                        <SimilarMetrics>
                          <SimilarMetric><DollarSign size={11} /><SimilarVal $gold>{fmt.compact(sd.price)}</SimilarVal></SimilarMetric>
                          <SimilarMetric><Ruler size={11} /><SimilarVal>{fmt.num(sd.size)} מ״ר</SimilarVal></SimilarMetric>
                          {sr > 0 && <SimilarMetric><TrendingUp size={11} /><SimilarVal style={{ color: t.ok }}>{Math.round(sr)}%</SimilarVal></SimilarMetric>}
                          {spps > 0 && <SimilarMetric>₪/מ״ר <SimilarVal>{fmt.num(spps)}</SimilarVal></SimilarMetric>}
                        </SimilarMetrics>
                      </SimilarCard>
                    )
                  })}
                </SimilarGrid>
              </Card>
            </div>
          )}
        </Page>

        <BottomBar>
          <BarGradeBadge $color={grade.color}>{grade.grade}</BarGradeBadge>
          <BarPrice>{fmt.price(d.price)}</BarPrice>
          <span style={{ flex: 1 }} />
          <BarCallBtn href={waLink} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </BarCallBtn>
          <GoldButton onClick={() => setLeadOpen(true)} style={{padding:'12px 32px',borderRadius:t.r.full}}>קבל פרטים</GoldButton>
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
