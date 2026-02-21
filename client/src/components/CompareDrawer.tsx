import { memo, useMemo, useCallback, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { X, TrendingUp, TrendingDown, MapPin, Ruler, DollarSign, BarChart3, ExternalLink, Star, Shield, Clock, Award } from 'lucide-react'
import { t, mobile } from '../theme'
import { p, roi, fmt, calcScore, getGrade, pricePerSqm, statusLabels, statusColors, zoningLabels, calcCAGR, calcTimeline, calcRisk } from '../utils'
import { GoldButton, Badge } from './UI'
import type { Plot } from '../types'

/* ── Animations ── */
const slideUp = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const fadeIn = keyframes`from{opacity:0}to{opacity:1}`

/* ── Styled ── */
const Backdrop = styled.div<{ $open: boolean }>`
  position:fixed;inset:0;z-index:${t.z.modal};
  background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);
  opacity:${pr => pr.$open ? 1 : 0};pointer-events:${pr => pr.$open ? 'auto' : 'none'};
  transition:opacity 0.3s;animation:${pr => pr.$open ? fadeIn : 'none'} 0.3s;
`
const Panel = styled.div<{ $open: boolean }>`
  position:fixed;bottom:0;left:0;right:0;z-index:${t.z.modal + 1};
  max-height:85vh;overflow-y:auto;direction:rtl;
  background:${t.bg};border-top:3px solid ${t.gold};
  border-radius:${t.r.xl} ${t.r.xl} 0 0;box-shadow:${t.sh.xl};
  transform:translateY(${pr => pr.$open ? '0' : '100%'});
  transition:transform 0.4s cubic-bezier(0.32,0.72,0,1);
  ${pr => pr.$open && css`animation:${slideUp} 0.4s cubic-bezier(0.32,0.72,0,1);`}
`
const Header = styled.div`
  position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;
  padding:16px 24px;background:${t.surface};border-bottom:1px solid ${t.border};
`
const Title = styled.h2`
  font-size:18px;font-weight:800;color:${t.text};margin:0;font-family:${t.font};
  display:flex;align-items:center;gap:10px;
`
const CloseBtn = styled.button`
  display:flex;align-items:center;justify-content:center;width:36px;height:36px;
  border-radius:${t.r.sm};background:transparent;border:1px solid ${t.border};
  color:${t.textSec};cursor:pointer;transition:all ${t.tr};
  &:hover{background:${t.hover};color:${t.text};border-color:${t.goldBorder};}
`
const Grid = styled.div<{ $cols: number }>`
  display:grid;grid-template-columns:180px repeat(${pr => pr.$cols}, 1fr);
  ${mobile}{grid-template-columns:120px repeat(${(pr: any) => pr.$cols}, 1fr);}
`
const HeaderCell = styled.div<{ $best?: boolean }>`
  padding:14px 16px;text-align:center;border-bottom:1px solid ${t.border};
  border-left:1px solid ${t.border};background:${pr => pr.$best ? t.goldDim : t.surface};
  ${pr => pr.$best && css`border-bottom:2px solid ${t.gold};`}
  ${mobile}{padding:10px 8px;}
`
const PlotName = styled.div`font-size:14px;font-weight:800;color:${t.text};font-family:${t.font};`
const PlotCity = styled.div`font-size:11px;color:${t.textSec};margin-top:2px;`
const GradeCircle = styled.div<{ $c: string }>`
  display:inline-flex;align-items:center;justify-content:center;
  width:36px;height:36px;border-radius:50%;margin:6px auto 0;
  background:${pr => pr.$c}18;border:2px solid ${pr => pr.$c};
  font-size:14px;font-weight:900;color:${pr => pr.$c};
`
const LabelCell = styled.div`
  padding:10px 16px;font-size:12px;font-weight:600;color:${t.textDim};
  border-bottom:1px solid ${t.border};display:flex;align-items:center;gap:6px;
  background:${t.surface};
  ${mobile}{padding:8px 10px;font-size:11px;}
`
const ValueCell = styled.div<{ $best?: boolean; $highlight?: string }>`
  padding:10px 16px;text-align:center;font-size:13px;font-weight:600;
  color:${pr => pr.$highlight || t.text};border-bottom:1px solid ${t.border};
  border-left:1px solid ${t.border};
  background:${pr => pr.$best ? t.goldDim : 'transparent'};
  ${mobile}{padding:8px 10px;font-size:12px;}
`
const WinnerBadge = styled.span`
  display:inline-flex;align-items:center;gap:4px;
  padding:2px 8px;border-radius:${t.r.full};
  background:${t.goldDim};border:1px solid ${t.goldBorder};
  font-size:10px;font-weight:700;color:${t.gold};margin-top:4px;
`
const Footer = styled.div`
  padding:16px 24px;border-top:1px solid ${t.border};
  display:flex;align-items:center;justify-content:center;gap:12px;background:${t.surface};
`
const FooterLink = styled.a`
  display:inline-flex;align-items:center;gap:4px;padding:8px 16px;
  background:transparent;border:1px solid ${t.border};border-radius:${t.r.md};
  color:${t.textSec};font-size:12px;font-weight:600;font-family:${t.font};
  cursor:pointer;transition:all ${t.tr};text-decoration:none;
  &:hover{border-color:${t.goldBorder};color:${t.gold};background:${t.goldDim};}
`
const EmptyCompare = styled.div`
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;padding:60px 24px;text-align:center;
`

interface CompareDrawerProps {
  open: boolean
  onClose: () => void
  plots: Plot[]
  allPlots: Plot[]
}

/** Find which plot "wins" a metric (lower = better for price, higher = better for ROI, etc.) */
function findBest(plots: Plot[], getValue: (pl: Plot) => number, lowerIsBetter = false): string | null {
  if (plots.length < 2) return null
  let bestId = plots[0].id
  let bestVal = getValue(plots[0])
  for (let i = 1; i < plots.length; i++) {
    const v = getValue(plots[i])
    if (lowerIsBetter ? v < bestVal : v > bestVal) {
      bestVal = v
      bestId = plots[i].id
    }
  }
  return bestId
}

function CompareDrawer({ open, onClose, plots, allPlots }: CompareDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [open])

  const metrics = useMemo(() => {
    if (!plots.length) return null
    const data = plots.map(pl => {
      const d = p(pl)
      const r = roi(pl)
      const score = calcScore(pl)
      const grade = getGrade(score)
      const pps = pricePerSqm(pl)
      const cagr = calcCAGR(r, d.readiness)
      const tl = calcTimeline(pl)
      const risk = calcRisk(pl, allPlots)
      return { pl, d, r, score, grade, pps, cagr, tl, risk }
    })

    // Find winners for each metric
    const bestPrice = findBest(plots, pl => p(pl).price, true)
    const bestPps = findBest(plots, pricePerSqm, true)
    const bestRoi = findBest(plots, roi)
    const bestScore = findBest(plots, calcScore)
    const bestSize = findBest(plots, pl => p(pl).size)

    return { data, bestPrice, bestPps, bestRoi, bestScore, bestSize }
  }, [plots, allPlots])

  if (!plots.length) return null

  const cols = plots.length

  return (
    <>
      <Backdrop $open={open} onClick={onClose} />
      <Panel $open={open} role="dialog" aria-label="השוואת חלקות">
        <Header>
          <Title><BarChart3 size={20} color={t.gold} /> השוואת {plots.length} חלקות</Title>
          <CloseBtn onClick={onClose} aria-label="סגור"><X size={18} /></CloseBtn>
        </Header>

        {metrics ? (
          <>
            <Grid $cols={cols}>
              {/* Header row */}
              <LabelCell style={{ background: t.bg, borderBottom: `2px solid ${t.border}` }}>
                <Award size={14} color={t.gold} /> מדד
              </LabelCell>
              {metrics.data.map(({ pl, grade, score }) => (
                <HeaderCell key={pl.id} $best={pl.id === metrics.bestScore}>
                  <PlotName>חלקה {pl.number}</PlotName>
                  <PlotCity>גוש {p(pl).block} · {pl.city}</PlotCity>
                  <GradeCircle $c={grade.color}>{grade.grade}</GradeCircle>
                  {pl.id === metrics.bestScore && <WinnerBadge><Star size={10} /> מומלץ</WinnerBadge>}
                </HeaderCell>
              ))}

              {/* Status */}
              <LabelCell><Badge $color={t.info} style={{ fontSize: 10, padding: '1px 6px' }}>סטטוס</Badge></LabelCell>
              {metrics.data.map(({ pl }) => (
                <ValueCell key={pl.id}>
                  <Badge $color={statusColors[pl.status || 'AVAILABLE']} style={{ fontSize: 11 }}>
                    {statusLabels[pl.status || 'AVAILABLE']}
                  </Badge>
                </ValueCell>
              ))}

              {/* Price */}
              <LabelCell><DollarSign size={13} color={t.textDim} /> מחיר</LabelCell>
              {metrics.data.map(({ pl, d }) => (
                <ValueCell key={pl.id} $best={pl.id === metrics.bestPrice} $highlight={pl.id === metrics.bestPrice ? t.ok : undefined}>
                  {fmt.compact(d.price)}
                </ValueCell>
              ))}

              {/* Size */}
              <LabelCell><Ruler size={13} color={t.textDim} /> שטח (מ״ר)</LabelCell>
              {metrics.data.map(({ pl, d }) => (
                <ValueCell key={pl.id} $best={pl.id === metrics.bestSize}>
                  {fmt.num(d.size)}
                </ValueCell>
              ))}

              {/* Price per sqm */}
              <LabelCell><DollarSign size={13} color={t.textDim} /> ₪/מ״ר</LabelCell>
              {metrics.data.map(({ pl, pps }) => (
                <ValueCell key={pl.id} $best={pl.id === metrics.bestPps} $highlight={pl.id === metrics.bestPps ? t.ok : undefined}>
                  {pps > 0 ? fmt.num(pps) : '—'}
                </ValueCell>
              ))}

              {/* ROI */}
              <LabelCell><TrendingUp size={13} color={t.textDim} /> תשואה צפויה</LabelCell>
              {metrics.data.map(({ pl, r }) => (
                <ValueCell key={pl.id} $best={pl.id === metrics.bestRoi} $highlight={pl.id === metrics.bestRoi ? t.ok : r > 0 ? t.gold : t.err}>
                  {r > 0 ? `+${fmt.pct(r)}` : fmt.pct(r)}
                </ValueCell>
              ))}

              {/* Score */}
              <LabelCell><Star size={13} color={t.textDim} /> ציון השקעה</LabelCell>
              {metrics.data.map(({ pl, score, grade }) => (
                <ValueCell key={pl.id} $best={pl.id === metrics.bestScore} $highlight={grade.color}>
                  {score}/10 ({grade.grade})
                </ValueCell>
              ))}

              {/* CAGR */}
              <LabelCell><TrendingUp size={13} color={t.textDim} /> CAGR</LabelCell>
              {metrics.data.map(({ pl, cagr }) => (
                <ValueCell key={pl.id} $highlight={cagr ? t.ok : t.textDim}>
                  {cagr ? `${cagr.cagr}% (${cagr.years}y)` : '—'}
                </ValueCell>
              ))}

              {/* Zoning Stage */}
              <LabelCell><Clock size={13} color={t.textDim} /> שלב תכנון</LabelCell>
              {metrics.data.map(({ pl, d }) => (
                <ValueCell key={pl.id}>
                  {zoningLabels[d.zoning] || d.zoning || '—'}
                </ValueCell>
              ))}

              {/* Timeline remaining */}
              <LabelCell><Clock size={13} color={t.textDim} /> נותרו (חודשים)</LabelCell>
              {metrics.data.map(({ pl, tl }) => (
                <ValueCell key={pl.id} $highlight={tl && tl.remaining <= 12 ? t.ok : tl && tl.remaining > 36 ? t.warn : undefined}>
                  {tl ? `${tl.remaining}` : '—'}
                </ValueCell>
              ))}

              {/* Risk */}
              <LabelCell><Shield size={13} color={t.textDim} /> סיכון</LabelCell>
              {metrics.data.map(({ pl, risk }) => (
                <ValueCell key={pl.id} $highlight={risk?.color}>
                  {risk ? `${risk.label} (${risk.score}/10)` : '—'}
                </ValueCell>
              ))}

              {/* Distance to sea */}
              <LabelCell><MapPin size={13} color={t.textDim} /> מרחק מהים</LabelCell>
              {metrics.data.map(({ pl, d }) => (
                <ValueCell key={pl.id}>
                  {d.seaDist != null ? `${fmt.num(d.seaDist)} מ׳` : '—'}
                </ValueCell>
              ))}
            </Grid>

            {/* Footer with links to full pages */}
            <Footer>
              {plots.map(pl => (
                <FooterLink key={pl.id} href={`/plot/${pl.id}`}>
                  <ExternalLink size={12} /> חלקה {pl.number}
                </FooterLink>
              ))}
            </Footer>
          </>
        ) : (
          <EmptyCompare>
            <BarChart3 size={40} color={t.textDim} />
            <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>אין חלקות להשוואה</div>
            <div style={{ fontSize: 13, color: t.textSec }}>הוסיפו לפחות 2 חלקות להשוואה מהמפה</div>
          </EmptyCompare>
        )}
      </Panel>
    </>
  )
}

export default memo(CompareDrawer)
