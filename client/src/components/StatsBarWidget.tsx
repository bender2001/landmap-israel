import { memo } from 'react'
import styled, { keyframes } from 'styled-components'
import { Eye, TrendingUp, TrendingDown, Clock, BarChart3, Keyboard } from 'lucide-react'
import { t, mobile } from '../theme'
import { fmt } from '../utils'
import type { Plot } from '../types'

/* ── Stats Bar Widget ── */
export interface StatsBarData {
  avgPrice: number
  avgPricePerSqm: number
  totalPortfolioValue: number
  avgSize: number
  avgRoi: number
}

export interface StatsBarWidgetProps {
  filtered: Plot[]
  avg: { price: number; size: number; roi: number; pricePerSqm: number }
  visibleInViewport: number
  totalPortfolioValue: number
  statsBarData: StatsBarData
  marketMomentum: 'up' | 'down' | 'stable'
  portfolioQuality: string
  apiLatency: { latencyMs: number | null; label: string | null; color: string | null }
  dataSource: 'api' | 'demo'
  sse: { connected: boolean }
  dataFreshness: { lastFetched: number | null; relativeTime: string }
  isRefreshing: boolean
  refreshData: () => void
  onShortcutsOpen: () => void
}

const Stats = styled.div`
  position:absolute;bottom:0;left:0;right:0;z-index:${t.z.filter};
  display:flex;align-items:center;justify-content:center;gap:24px;padding:8px 16px;
  background:${t.glass};backdrop-filter:blur(12px);border-top:1px solid ${t.border};
  font-size:12px;color:${t.textSec};direction:rtl;
  ${mobile}{bottom:56px;gap:10px;font-size:11px;padding:6px 10px;
    justify-content:flex-start;overflow-x:auto;-webkit-overflow-scrolling:touch;
    scrollbar-width:none;&::-webkit-scrollbar{display:none;}
    mask-image:linear-gradient(to left, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);
    -webkit-mask-image:linear-gradient(to left, transparent 0, black 12px, black calc(100% - 12px), transparent 100%);}
`

const Stat = styled.span`display:flex;align-items:center;gap:4px;flex-shrink:0;white-space:nowrap;`
const Val = styled.span`color:${t.goldBright};font-weight:700;`
const ValOk = styled(Val)`color:${t.ok};`
const Demo = styled.span`padding:2px 8px;border-radius:${t.r.full};background:${t.goldDim};color:${t.gold};font-size:10px;font-weight:600;`

const livePulse = keyframes`0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}`
const LiveDot = styled.span<{$c:string}>`
  display:inline-block;width:6px;height:6px;border-radius:50%;background:${pr=>pr.$c};
  animation:${livePulse} 2s ease-in-out infinite;flex-shrink:0;
`

const LiveBadge = styled.span<{$connected:boolean}>`
  display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:${t.r.full};
  background:${pr=>pr.$connected?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.08)'};
  color:${pr=>pr.$connected?t.ok:t.err};font-size:10px;font-weight:600;
  border:1px solid ${pr=>pr.$connected?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.15)'};
  transition:all 0.3s;
`

const ShortcutsHint = styled.button`
  display:flex;align-items:center;gap:4px;background:none;border:none;
  color:${t.textDim};font-size:10px;font-family:${t.font};cursor:pointer;
  padding:2px 6px;border-radius:${t.r.sm};transition:all ${t.tr};
  &:hover{color:${t.gold};background:rgba(212,168,75,0.05);}
`

export const StatsBarWidget = memo<StatsBarWidgetProps>(({
  filtered,
  avg,
  visibleInViewport,
  totalPortfolioValue,
  statsBarData,
  marketMomentum,
  portfolioQuality,
  apiLatency,
  dataSource,
  sse,
  dataFreshness,
  isRefreshing,
  refreshData,
  onShortcutsOpen
}) => {
  return (
    <Stats>
      <Stat>
        <Eye size={12} />
        <Val>{fmt.compact(visibleInViewport)}</Val>/{fmt.compact(filtered.length)} נראות
      </Stat>

      <Stat>
        <BarChart3 size={12} />
        ממוצע <Val>{fmt.compact(avg.price)}</Val>
      </Stat>

      <Stat>
        {marketMomentum === 'up' ? <TrendingUp size={12} color={t.ok} /> : 
         marketMomentum === 'down' ? <TrendingDown size={12} color={t.err} /> : 
         <BarChart3 size={12} />}
        <span>שוק {marketMomentum === 'up' ? 'עולה' : marketMomentum === 'down' ? 'יורד' : 'יציב'}</span>
      </Stat>

      {totalPortfolioValue > 0 && (
        <Stat>
          <BarChart3 size={12} />
          תיק השקעות <ValOk>{fmt.compact(totalPortfolioValue)}</ValOk>
        </Stat>
      )}

      {portfolioQuality && typeof portfolioQuality === 'object' && 'grade' in portfolioQuality ? (
        <Stat>
          <span>איכות <Val style={{ color: portfolioQuality.grade?.color || t.goldBright }}>{portfolioQuality.grade?.grade || '—'}</Val> ({portfolioQuality.avg}/10)</span>
        </Stat>
      ) : portfolioQuality ? (
        <Stat>
          <span>איכות {String(portfolioQuality)}</span>
        </Stat>
      ) : null}

      {/* API Latency */}
      {apiLatency.label && (
        <Stat>
          <span style={{ color: apiLatency.color || t.textSec }}>
            {apiLatency.label}
          </span>
        </Stat>
      )}

      {/* Data Source & Freshness */}
      {dataSource === 'demo' ? (
        <Stat><Demo>דמו</Demo></Stat>
      ) : (
        <Stat>
          <LiveBadge $connected={sse.connected}>
            <LiveDot $c={sse.connected ? t.ok : t.err} />
            {sse.connected ? 'חי' : 'לא מחובר'}
          </LiveBadge>
          {dataFreshness.lastFetched && (
            <>
              <Clock size={12} />
              <span>עודכן {dataFreshness.relativeTime}</span>
              {isRefreshing && <span>מרענן...</span>}
            </>
          )}
        </Stat>
      )}

      {/* Keyboard Shortcuts Hint */}
      <ShortcutsHint onClick={onShortcutsOpen} aria-label="קיצורי מקלדת">
        <Keyboard size={12} />
        <span>?</span>
      </ShortcutsHint>
    </Stats>
  )
})

StatsBarWidget.displayName = 'StatsBarWidget'

export default StatsBarWidget