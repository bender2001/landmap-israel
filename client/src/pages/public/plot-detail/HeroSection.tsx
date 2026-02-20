import { Suspense, lazy } from 'react'
import type { SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import styled, { keyframes, css } from 'styled-components'
import { MapPin, Heart, Clock, Map as MapIcon } from 'lucide-react'
import { media } from '../../../styles/theme'
import { statusColors, statusLabels, zoningLabels } from '../../../utils/constants'
import { formatDunam, formatRelativeTime, getFreshnessColor } from '../../../utils/format'
import { calcDaysOnMarket } from '../../../utils/investment'
import ZoningProgressBar from '../../../components/ui/ZoningProgressBar'
import DataCompletenessBar from '../../../components/ui/DataCompletenessBar'
import { plotReportIssueLink } from '../../../utils/config'
import { Flag } from 'lucide-react'
import type { Plot } from '../../../types'

const ShareMenu = lazy(() => import('../../../components/ui/ShareMenu'))
const ImageLightbox = lazy(() => import('../../../components/ui/ImageLightbox'))

/* ── Animations ── */
const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`
const bounceInAnim = keyframes`
  0% { transform: scale(0.9); opacity: 0; }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
`

/* ── Styled ── */
const HeroRow = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  ${media.sm} { flex-direction: row; }
`
const HeroTitle = styled.h1`
  font-size: 30px; font-weight: 900; margin-bottom: 12px;
  color: ${({ theme }) => theme.colors.slate[100]};
  ${media.sm} { font-size: 36px; }
`
const GoldGradient = styled.span`
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright});
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
`
const BadgesRow = styled.div`display: flex; flex-wrap: wrap; align-items: center; gap: 8px;`
const CityLabel = styled.span`display: flex; align-items: center; gap: 6px; font-size: 14px; color: ${({ theme }) => theme.colors.slate[400]};`
const InfoChip = styled.span`font-size: 12px; color: ${({ theme }) => theme.colors.slate[400]}; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 8px;`
const InfoChipLight = styled.span`font-size: 12px; color: ${({ theme }) => theme.colors.slate[300]}; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 8px;`
const ZoningChip = styled.span`display: inline-flex; align-items: center; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 8px;`
const StatusBadgeStyled = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 500;
  background: ${({ $color }) => `${$color}14`}; border: 1px solid ${({ $color }) => `${$color}35`}; color: ${({ $color }) => $color};
`
const StatusDot = styled.span<{ $color: string }>`
  width: 8px; height: 8px; border-radius: 50%; background: ${({ $color }) => $color};
  animation: ${pulseAnim} 2s ease-in-out infinite;
`
const FreshnessBadge = styled.span<{ $colorClass: string }>`
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 12px; background: rgba(255,255,255,0.05);
`
const ViewsBadge = styled.span`
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 12px;
  color: #a5b4fc; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
`
const RankBadge = styled.span<{ $tier: 'top' | 'upper' | 'normal' }>`
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500;
  ${({ $tier, theme }) =>
    $tier === 'top' ? css`color: ${theme.colors.gold}; background: rgba(200,148,42,0.1); border: 1px solid rgba(200,148,42,0.25);`
    : $tier === 'upper' ? css`color: ${theme.colors.emerald[400]}; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);`
    : css`color: ${theme.colors.slate[400]}; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);`}
`
const NetRoiBadge = styled.span<{ $tier: 'excellent' | 'good' | 'ok' | 'negative' }>`
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;
  ${({ $tier, theme }) =>
    $tier === 'excellent' ? css`color: ${theme.colors.emerald[400]}; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);`
    : $tier === 'good' ? css`color: ${theme.colors.gold}; background: rgba(200,148,42,0.1); border: 1px solid rgba(200,148,42,0.2);`
    : $tier === 'ok' ? css`color: ${theme.colors.amber[400]}; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2);`
    : css`color: ${theme.colors.red[400]}; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);`}
`
const DomBadge = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 12px;
  background: ${({ $color }) => `${$color}10`}; border: 1px solid ${({ $color }) => `${$color}20`}; color: ${({ $color }) => $color};
`
const PriceChangeBadge = styled.span<{ $direction: 'down' | 'up' }>`
  display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500;
  animation: ${bounceInAnim} 0.4s ease;
  ${({ $direction, theme }) =>
    $direction === 'down'
      ? css`color: ${theme.colors.emerald[400]}; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2);`
      : css`color: ${theme.colors.orange[400]}; background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.2);`}
`
const HeroActions = styled.div`display: flex; align-items: center; gap: 8px; flex-shrink: 0;`
const ShowOnMapBtn = styled(Link)`
  height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 16px; border-radius: 12px;
  background: rgba(200,148,42,0.1); border: 1px solid rgba(200,148,42,0.25);
  color: ${({ theme }) => theme.colors.gold}; font-size: 14px; font-weight: 700; text-decoration: none;
  transition: all 0.2s ease;
  &:hover { background: rgba(200,148,42,0.2); border-color: rgba(200,148,42,0.35); }
`
const SmHiddenSpan = styled.span`display: none; ${media.sm} { display: inline; }`
const SmVisibleSpan = styled.span`${media.sm} { display: none; }`
const FavBtn = styled.button<{ $active: boolean }>`
  width: 40px; height: 40px; border-radius: 12px; border: 1px solid;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease; cursor: pointer;
  ${({ $active }) => $active
    ? css`background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3);`
    : css`background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); &:hover { background: rgba(255,255,255,0.1); }`}
`
const ShareSkeleton = styled.div`
  width: 40px; height: 40px; border-radius: 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  animation: ${pulseAnim} 2s ease-in-out infinite;
`
const ImageGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 32px;
  ${media.sm} { grid-template-columns: repeat(3, 1fr); }
`
const ImageBtn = styled.button<{ $isFirst: boolean }>`
  border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);
  transition: all 0.2s ease; position: relative; cursor: pointer; background: none; padding: 0;
  ${({ $isFirst }) => $isFirst && css`grid-column: span 2; grid-row: span 2;`}
  &:hover { border-color: rgba(200,148,42,0.4); }
`
const PlotImg = styled.img`
  width: 100%; height: 100%; object-fit: cover; transition: all 0.5s ease;
  &:hover { transform: scale(1.05); }
`
const ImagePlaceholder = styled.div`
  position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(135deg, rgba(15,23,42,0.6), rgba(200,148,42,0.05));
`
const ImageCountOverlay = styled.div`
  position: absolute; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 18px;
`
const DataBarWrap = styled.div`margin-bottom: 24px;`
const ReportRow = styled.div`display: flex; align-items: center; justify-content: flex-end; margin-top: 8px;`
const ReportLink = styled.a`
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 11px;
  color: ${({ theme }) => theme.colors.slate[500]}; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; text-decoration: none;
  transition: all 0.2s ease;
  &:hover { color: ${({ theme }) => theme.colors.orange[400]}; border-color: rgba(251,146,60,0.2); background: rgba(251,146,60,0.05); }
`

/* ── Props ── */
interface HeroSectionProps {
  plot: Plot
  blockNumber: string
  sizeSqM: number
  zoningStage: string
  statusColor: string
  netRoi?: number
  investmentRank?: number
  totalRanked?: number
  lastVisitPrice: any
  favorites: any
  totalPrice: number
  images: any[]
  lightboxOpen: boolean
  setLightboxOpen: (v: boolean) => void
  setLightboxIndex: (v: number) => void
}

/* ── Component ── */
export default function HeroSection({
  plot, blockNumber, sizeSqM, zoningStage, statusColor, netRoi,
  investmentRank, totalRanked, lastVisitPrice, favorites, totalPrice,
  images, lightboxOpen, setLightboxOpen, setLightboxIndex,
}: HeroSectionProps) {
  const { formatCurrency } = require('../../../utils/format')

  return (
    <>
      <HeroRow>
        <div>
          <HeroTitle>
            <GoldGradient>\u05D2\u05D5\u05E9</GoldGradient>
            {' '}{blockNumber}{' | '}
            <GoldGradient>\u05D7\u05DC\u05E7\u05D4</GoldGradient>
            {' '}{plot.number}
          </HeroTitle>
          <BadgesRow>
            <CityLabel><MapPin style={{ width: 16, height: 16 }} /> {plot.city}</CityLabel>
            <InfoChip>{formatDunam(sizeSqM)} \u05D3\u05D5\u05E0\u05DD</InfoChip>
            <InfoChipLight>{zoningLabels[zoningStage]}</InfoChipLight>
            {zoningStage && (
              <ZoningChip><ZoningProgressBar currentStage={zoningStage} variant="compact" /></ZoningChip>
            )}
            <StatusBadgeStyled $color={statusColor}>
              <StatusDot $color={statusColor} />
              {statusLabels[plot.status as string]}
            </StatusBadgeStyled>
            {(() => {
              const updatedAt = plot.updated_at ?? plot.updatedAt
              const freshness = formatRelativeTime(updatedAt as string)
              if (!freshness) return null
              const colorClass = getFreshnessColor(updatedAt as string)
              return (
                <FreshnessBadge $colorClass={colorClass} style={{ color: colorClass }}>
                  <Clock style={{ width: 12, height: 12 }} /> \u05E2\u05D5\u05D3\u05DB\u05DF {freshness}
                </FreshnessBadge>
              )
            })()}
            {(plot.views as number) > 0 && <ViewsBadge>\uD83D\uDC41 {plot.views} \u05E6\u05E4\u05D9\u05D5\u05EA</ViewsBadge>}
            {investmentRank != null && totalRanked != null && totalRanked > 0 && (
              <RankBadge
                $tier={investmentRank <= 3 ? 'top' : investmentRank <= Math.ceil(totalRanked / 2) ? 'upper' : 'normal'}
                title={`\u05DE\u05D3\u05D5\u05E8\u05D2 #${investmentRank} \u05DE\u05EA\u05D5\u05DA ${totalRanked} \u05D7\u05DC\u05E7\u05D5\u05EA \u05D6\u05DE\u05D9\u05E0\u05D5\u05EA \u05DC\u05E4\u05D9 \u05E6\u05D9\u05D5\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4`}
              >
                {investmentRank <= 3 ? '\uD83C\uDFC5' : '\uD83D\uDCCA'} #{investmentRank}/{totalRanked}
              </RankBadge>
            )}
            {netRoi != null && (
              <NetRoiBadge
                $tier={netRoi >= 50 ? 'excellent' : netRoi >= 20 ? 'good' : netRoi >= 0 ? 'ok' : 'negative'}
                title={`\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E0\u05D8\u05D5 \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05D4\u05DE\u05D9\u05E1\u05D9\u05DD: ${netRoi}%`}
              >
                \uD83D\uDC8E \u05E0\u05D8\u05D5 {netRoi > 0 ? '+' : ''}{netRoi}%
              </NetRoiBadge>
            )}
            {(() => {
              const dom = calcDaysOnMarket(plot.created_at ?? plot.createdAt)
              if (!dom) return null
              return <DomBadge $color={(dom as any).color}>\uD83D\uDCC5 {(dom as any).label}</DomBadge>
            })()}
            {lastVisitPrice.hasChange && (
              <PriceChangeBadge
                $direction={lastVisitPrice.direction}
                title={`\u05DE\u05D7\u05D9\u05E8 \u05E7\u05D5\u05D3\u05DD: ${formatCurrency(lastVisitPrice.previousPrice)} (${lastVisitPrice.lastVisit?.toLocaleDateString('he-IL')})`}
              >
                {lastVisitPrice.direction === 'down' ? '\uD83D\uDCC9' : '\uD83D\uDCC8'}
                {lastVisitPrice.direction === 'down' ? '\u05D4\u05DE\u05D7\u05D9\u05E8 \u05D9\u05E8\u05D3' : '\u05D4\u05DE\u05D7\u05D9\u05E8 \u05E2\u05DC\u05D4'}
                {' '}{Math.abs(lastVisitPrice.changePct)}% {'\u05DE\u05D0\u05D6 \u05D1\u05D9\u05E7\u05D5\u05E8\u05DA'}
              </PriceChangeBadge>
            )}
          </BadgesRow>
        </div>
        <HeroActions>
          <ShowOnMapBtn to={`/?plot=${plot.id}&city=${encodeURIComponent(plot.city)}`} title="\u05D4\u05E6\u05D2 \u05E2\u05DC \u05D4\u05DE\u05E4\u05D4 \u05D4\u05D0\u05D9\u05E0\u05D8\u05E8\u05D0\u05E7\u05D8\u05D9\u05D1\u05D9\u05EA">
            <MapIcon style={{ width: 16, height: 16 }} />
            <SmHiddenSpan>\u05D4\u05E6\u05D2 \u05D1\u05DE\u05E4\u05D4</SmHiddenSpan>
            <SmVisibleSpan>\uD83D\uDDFA\uFE0F</SmVisibleSpan>
          </ShowOnMapBtn>
          <FavBtn $active={favorites.isFavorite(plot.id)} onClick={() => favorites.toggle(plot.id)}>
            <Heart style={{ width: 16, height: 16, color: favorites.isFavorite(plot.id) ? '#F87171' : '#94A3B8', fill: favorites.isFavorite(plot.id) ? '#F87171' : 'none' }} />
          </FavBtn>
          <Suspense fallback={<ShareSkeleton />}>
            <ShareMenu
              plotTitle={`\u05D2\u05D5\u05E9 ${blockNumber} \u05D7\u05DC\u05E7\u05D4 ${plot.number} - ${plot.city}`}
              plotPrice={formatCurrency(totalPrice)}
              plotUrl={window.location.href}
            />
          </Suspense>
        </HeroActions>
      </HeroRow>

      {/* Images gallery */}
      {images.length > 0 && (
        <ImageGrid>
          {images.map((img: any, i: number) => (
            <ImageBtn
              key={img.id || i}
              $isFirst={i === 0}
              onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
            >
              <PlotImg
                src={img.url}
                alt={img.alt || `\u05D2\u05D5\u05E9 ${blockNumber} \u05D7\u05DC\u05E7\u05D4 ${plot.number} \u2014 \u05EA\u05DE\u05D5\u05E0\u05D4 ${i + 1}`}
                style={{ aspectRatio: i === 0 ? '16/9' : '1/1', opacity: 0, filter: 'blur(8px)', transition: 'opacity 0.5s ease, filter 0.5s ease, transform 0.3s ease' }}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : undefined}
                decoding="async"
                onLoad={(e: SyntheticEvent<HTMLImageElement>) => { (e.target as HTMLImageElement).style.opacity = '1'; (e.target as HTMLImageElement).style.filter = 'blur(0)' }}
                onError={(e: SyntheticEvent<HTMLImageElement>) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                  const parent = (e.target as HTMLImageElement).parentElement
                  if (parent && !parent.querySelector('.img-fallback-placeholder')) {
                    const ph = document.createElement('div')
                    ph.className = 'img-fallback-placeholder'
                    ph.style.cssText = `position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,rgba(200,148,42,0.08),rgba(200,148,42,0.02));`
                    ph.innerHTML = `<span style="font-size:${i === 0 ? '32' : '20'}px;opacity:0.3">\uD83C\uDFD7\uFE0F</span><span style="font-size:10px;color:rgba(148,163,184,0.4)">\u05EA\u05DE\u05D5\u05E0\u05D4 \u05DC\u05D0 \u05D6\u05DE\u05D9\u05E0\u05D4</span>`
                    parent.appendChild(ph)
                  }
                }}
              />
              <ImagePlaceholder />
              {i === Math.min(images.length - 1, 5) && images.length > 6 && (
                <ImageCountOverlay>+{images.length - 6}</ImageCountOverlay>
              )}
            </ImageBtn>
          ))}
        </ImageGrid>
      )}

      {/* Data Completeness */}
      <DataBarWrap>
        <DataCompletenessBar plot={plot} variant="full" />
        <ReportRow>
          <ReportLink href={plotReportIssueLink(plot)} target="_blank" rel="noopener noreferrer" title="\u05D3\u05D5\u05D5\u05D7 \u05E2\u05DC \u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD">
            <Flag style={{ width: 12, height: 12 }} /> \u05D3\u05D5\u05D5\u05D7 \u05E2\u05DC \u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD
          </ReportLink>
        </ReportRow>
      </DataBarWrap>
    </>
  )
}
