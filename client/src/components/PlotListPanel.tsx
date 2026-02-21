import { memo, useCallback, useMemo, useRef, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { List, X, MapPin, TrendingUp, TrendingDown, Ruler, ChevronRight, ChevronLeft, BarChart3, ArrowDown, ArrowUp, Minus, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t, mobile } from '../theme'
import { p, roi, fmt, calcScore, getGrade, pricePerSqm, statusColors, statusLabels, daysOnMarket, pricePosition, calcAggregateStats } from '../utils'
import type { Plot } from '../types'

/* ── Animations ── */
const slideIn = keyframes`from{transform:translateX(-100%);opacity:0}to{transform:translateX(0);opacity:1}`
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`

/* ── Styled ── */
const Overlay = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.sidebar - 2};
  background:rgba(0,0,0,0.3);backdrop-filter:blur(2px);
  opacity:${pr => pr.$open ? 1 : 0};pointer-events:${pr => pr.$open ? 'auto' : 'none'};
  transition:opacity 0.3s;display:none;
  ${mobile}{display:block;}
`

const Panel = styled.aside<{ $open: boolean }>`
  position:fixed;top:0;left:0;bottom:0;z-index:${t.z.sidebar - 1};
  width:340px;max-width:calc(100vw - 48px);
  background:${t.surface};border-right:1px solid ${t.border};
  display:flex;flex-direction:column;
  transform:translateX(${pr => pr.$open ? '0' : '-100%'});
  transition:transform 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:${t.sh.xl};
  ${mobile}{width:100vw;max-width:100vw;}
`

const GoldBar = styled.div`height:2px;background:linear-gradient(90deg,transparent,${t.gold},${t.goldBright},${t.gold},transparent);flex-shrink:0;`

const Header = styled.div`
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;border-bottom:1px solid ${t.border};
  direction:rtl;flex-shrink:0;
`

const Title = styled.h3`
  font-size:15px;font-weight:700;color:${t.text};margin:0;
  display:flex;align-items:center;gap:8px;font-family:${t.font};
`

const Count = styled.span`
  font-size:12px;font-weight:700;color:${t.gold};
  background:${t.goldDim};padding:2px 8px;border-radius:${t.r.full};
`

const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:30px;height:30px;
  border-radius:${t.r.sm};background:transparent;border:1px solid ${t.border};
  color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`

const Body = styled.div`
  flex:1;overflow-y:auto;padding:8px;direction:rtl;
  scroll-behavior:smooth;
`

const EmptyState = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:48px 24px;text-align:center;color:${t.textDim};gap:12px;
`

/* ── Plot Item ── */
const ItemWrap = styled.button<{ $active: boolean; $i: number }>`
  display:flex;flex-direction:column;width:100%;padding:12px 14px;margin-bottom:6px;
  background:${pr => pr.$active ? t.goldDim : t.bg};
  border:1px solid ${pr => pr.$active ? t.goldBorder : t.border};
  border-radius:${t.r.md};cursor:pointer;font-family:${t.font};direction:rtl;
  text-align:right;transition:all ${t.tr};
  animation:${fadeIn} 0.3s ease-out both;
  animation-delay:${pr => Math.min(pr.$i * 0.03, 0.5)}s;
  &:hover{background:${t.hover};border-color:${t.goldBorder};transform:translateX(-2px);}
  ${pr => pr.$active && `box-shadow:inset 3px 0 0 ${t.gold};`}
`

const ItemTop = styled.div`display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;`

const ItemCity = styled.span`font-size:14px;font-weight:700;color:${t.text};`

const ItemBadge = styled.span<{ $c: string }>`
  font-size:10px;font-weight:700;padding:1px 7px;border-radius:${t.r.full};
  color:${pr => pr.$c};background:${pr => pr.$c}18;
`

const ItemGrade = styled.span<{ $c: string }>`
  font-size:11px;font-weight:800;padding:2px 6px;border-radius:${t.r.sm};
  color:${pr => pr.$c};border:1px solid ${pr => pr.$c}44;background:${t.bg};
`

const ItemBlock = styled.div`font-size:11px;color:${t.textDim};margin-bottom:8px;`

const Metrics = styled.div`display:flex;align-items:center;gap:12px;`

const Metric = styled.div`
  display:flex;align-items:center;gap:4px;font-size:12px;color:${t.textSec};
  svg{flex-shrink:0;color:${t.textDim};}
`

const MetricVal = styled.span<{ $gold?: boolean }>`font-weight:700;color:${pr => pr.$gold ? t.gold : t.text};`

const ItemDom = styled.span<{ $c: string }>`
  font-size:10px;font-weight:600;color:${pr => pr.$c};margin-inline-start:auto;
`

const DetailLink = styled.button`
  display:flex;align-items:center;justify-content:center;width:28px;height:28px;
  border-radius:${t.r.sm};border:1px solid ${t.border};background:transparent;
  color:${t.textDim};cursor:pointer;transition:all ${t.tr};flex-shrink:0;
  margin-inline-start:auto;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`

/* ── Price Position Badge ── */
const PricePosTag = styled.span<{ $c: string }>`
  display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;
  padding:1px 7px;border-radius:${t.r.full};color:${pr => pr.$c};
  background:${pr => pr.$c}12;border:1px solid ${pr => pr.$c}28;
  white-space:nowrap;
`

/* ── Summary Stats Bar ── */
const SummaryBar = styled.div`
  display:grid;grid-template-columns:repeat(3,1fr);gap:1px;
  padding:0;margin:0;border-bottom:1px solid ${t.border};
  background:${t.border};flex-shrink:0;
`
const SummaryStat = styled.div`
  display:flex;flex-direction:column;align-items:center;gap:2px;
  padding:10px 8px;background:${t.surface};
`
const SummaryStatVal = styled.div`font-size:14px;font-weight:800;color:${t.gold};font-family:${t.font};`
const SummaryStatLabel = styled.div`font-size:9px;font-weight:600;color:${t.textDim};text-transform:uppercase;letter-spacing:0.3px;`

/* ── Toggle Button (always visible) ── */
const ToggleBtn = styled.button<{ $open: boolean }>`
  position:fixed;top:50%;left:${pr => pr.$open ? '340px' : '0'};
  z-index:${t.z.sidebar - 1};transform:translateY(-50%);
  width:28px;height:64px;
  background:${t.surface};border:1px solid ${t.goldBorder};
  border-left:${pr => pr.$open ? 'none' : `1px solid ${t.goldBorder}`};
  border-radius:${pr => pr.$open ? `0 ${t.r.sm} ${t.r.sm} 0` : `0 ${t.r.sm} ${t.r.sm} 0`};
  color:${t.gold};cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:all 0.35s cubic-bezier(0.32,0.72,0,1);
  box-shadow:${t.sh.md};
  &:hover{background:${t.goldDim};width:32px;}
  ${mobile}{
    top:auto;bottom:70px;left:8px;
    width:44px;height:44px;border-radius:${t.r.full};
    transform:none;border:1px solid ${t.goldBorder};
  }
`

/* ── Component ── */
interface Props {
  plots: Plot[]
  selected: Plot | null
  onSelect: (plot: Plot) => void
  open: boolean
  onToggle: () => void
}

function PlotItem({ plot, active, index, onClick, allPlots, onDetailClick }: {
  plot: Plot; active: boolean; index: number; onClick: () => void; allPlots: Plot[]; onDetailClick: (id: string) => void
}) {
  const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score)
  const status = (plot.status || 'AVAILABLE') as string
  const sColor = statusColors[status] || t.gold
  const dom = daysOnMarket(d.created)
  const pos = pricePosition(plot, allPlots)

  return (
    <ItemWrap $active={active} $i={index} onClick={onClick} aria-label={`חלקה ${plot.number} גוש ${d.block}`}>
      <ItemTop>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ItemCity>{plot.city}</ItemCity>
          <ItemBadge $c={sColor}>{statusLabels[status] || status}</ItemBadge>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {pos && (
            <PricePosTag $c={pos.color}>
              {pos.direction === 'below' ? <ArrowDown size={9} /> : pos.direction === 'above' ? <ArrowUp size={9} /> : <Minus size={9} />}
              {pos.label}
            </PricePosTag>
          )}
          <ItemGrade $c={grade.color}>{grade.grade}</ItemGrade>
        </div>
      </ItemTop>
      <ItemBlock>גוש {d.block} · חלקה {plot.number}</ItemBlock>
      <Metrics>
        <Metric>
          <MapPin size={12} />
          <MetricVal $gold>{d.price > 0 ? fmt.compact(d.price) : '—'}</MetricVal>
        </Metric>
        <Metric>
          <Ruler size={12} />
          <MetricVal>{d.size > 0 ? `${fmt.num(d.size)} מ״ר` : '—'}</MetricVal>
        </Metric>
        {r > 0 && (
          <Metric>
            <TrendingUp size={12} />
            <MetricVal style={{ color: t.ok }}>{Math.round(r)}%</MetricVal>
          </Metric>
        )}
        {dom && <ItemDom $c={dom.color}>{dom.label}</ItemDom>}
        <DetailLink
          onClick={(e) => { e.stopPropagation(); onDetailClick(plot.id) }}
          title="עמוד מלא"
          aria-label={`פתח עמוד מלא עבור חלקה ${plot.number}`}
        >
          <ExternalLink size={13} />
        </DetailLink>
      </Metrics>
    </ItemWrap>
  )
}

function PlotListPanel({ plots, selected, onSelect, open, onToggle }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const stats = useMemo(() => calcAggregateStats(plots), [plots])
  const goToDetail = useCallback((id: string) => navigate(`/plot/${id}`), [navigate])

  // Scroll to active item
  useEffect(() => {
    if (!selected || !open || !bodyRef.current) return
    const idx = plots.findIndex(pl => pl.id === selected.id)
    if (idx < 0) return
    const item = bodyRef.current.children[idx] as HTMLElement
    if (item) item.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selected, open, plots])

  return (
    <>
      <Overlay $open={open} onClick={onToggle} />
      <ToggleBtn $open={open} onClick={onToggle} aria-label={open ? 'סגור רשימה' : 'פתח רשימה'}>
        {open ? <ChevronLeft size={16} /> : <List size={18} />}
      </ToggleBtn>
      <Panel $open={open}>
        <GoldBar />
        <Header>
          <Title>
            <List size={16} color={t.gold} />
            חלקות
            <Count>{plots.length}</Count>
          </Title>
          <CloseBtn onClick={onToggle} aria-label="סגור"><X size={16} /></CloseBtn>
        </Header>
        {/* Summary stats bar */}
        {stats && plots.length > 0 && (
          <SummaryBar>
            <SummaryStat>
              <SummaryStatVal>{fmt.compact(stats.avgPrice)}</SummaryStatVal>
              <SummaryStatLabel>מחיר ממוצע</SummaryStatLabel>
            </SummaryStat>
            <SummaryStat>
              <SummaryStatVal>{fmt.num(stats.avgPps)}</SummaryStatVal>
              <SummaryStatLabel>₪/מ״ר ממוצע</SummaryStatLabel>
            </SummaryStat>
            <SummaryStat>
              <SummaryStatVal style={{ color: stats.avgRoi > 0 ? t.ok : t.textSec }}>{stats.avgRoi}%</SummaryStatVal>
              <SummaryStatLabel>תשואה ממוצעת</SummaryStatLabel>
            </SummaryStat>
          </SummaryBar>
        )}
        <Body ref={bodyRef}>
          {plots.length === 0 ? (
            <EmptyState>
              <MapPin size={32} />
              <span style={{ fontSize: 14 }}>לא נמצאו חלקות</span>
              <span style={{ fontSize: 12 }}>נסו לשנות את הסינון</span>
            </EmptyState>
          ) : (
            plots.map((plot, i) => (
              <PlotItem
                key={plot.id}
                plot={plot}
                active={selected?.id === plot.id}
                index={i}
                onClick={() => onSelect(plot)}
                allPlots={plots}
                onDetailClick={goToDetail}
              />
            ))
          )}
        </Body>
      </Panel>
    </>
  )
}

export default memo(PlotListPanel)
