import styled, { keyframes } from 'styled-components'
import { media } from '../../../styles/theme'
import Spinner from '../../../components/ui/Spinner'
import PublicNav from '../../../components/PublicNav'

/* ── Animations ── */
const pulseAnim = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`

/* ── Styled ── */
const PageWrap = styled.div`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.colors.navy};
  direction: rtl;
`

const ContentZone = styled.div`
  position: relative;
  z-index: 10;
  padding-top: 80px;
  padding-bottom: 112px;
`

const MaxWidth = styled.div`
  max-width: 896px;
  margin: 0 auto;
  padding-left: 16px;
  padding-right: 16px;
  ${media.sm} { padding-left: 24px; padding-right: 24px; }
`

const SkeletonBar = styled.div<{ $w?: string; $h?: string; $delay?: string }>`
  height: ${({ $h }) => $h || '12px'};
  width: ${({ $w }) => $w || '100%'};
  border-radius: 4px;
  background: rgba(51, 65, 85, 0.5);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  ${({ $delay }) => $delay && `animation-delay: ${$delay};`}
`

const SkeletonBox = styled.div<{ $h?: string; $delay?: string }>`
  height: ${({ $h }) => $h || '128px'};
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  ${({ $delay }) => $delay && `animation-delay: ${$delay};`}
`

const SkeletonGrid3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
`

const SkeletonCardWrap = styled.div<{ $bgColor: string; $delay?: string }>`
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: ${({ $bgColor }) => $bgColor};
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  ${({ $delay }) => $delay && `animation-delay: ${$delay};`}
`

const SkeletonTwoCols = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 32px;
  ${media.lg} { grid-template-columns: repeat(2, 1fr); }
`

const MapSkeleton = styled.div`
  height: 280px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  animation: ${pulseAnim} 2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
  margin-bottom: 32px;
`

const MapGridOverlay = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image:
    linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px);
  background-size: 40px 40px;
`

const MapCenter = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

/* ── Component ── */
export default function PlotDetailSkeleton() {
  return (
    <PageWrap>
      <PublicNav />
      <ContentZone>
        <MaxWidth>
          {/* Breadcrumb skeleton */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <SkeletonBar $w="64px" $h="12px" />
            <SkeletonBar $w="8px" $h="12px" style={{ opacity: 0.3 } as any} />
            <SkeletonBar $w="48px" $h="12px" $delay="0.1s" />
            <SkeletonBar $w="8px" $h="12px" style={{ opacity: 0.3 } as any} />
            <SkeletonBar $w="112px" $h="12px" $delay="0.2s" />
          </div>

          {/* Hero header skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 32 }}>
            <div>
              <SkeletonBar $w="288px" $h="36px" style={{ borderRadius: 8, marginBottom: 12 } as any} />
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <SkeletonBar $w="80px" $h="24px" style={{ borderRadius: 8 } as any} />
                <SkeletonBar $w="96px" $h="24px" $delay="0.15s" style={{ borderRadius: 8 } as any} />
                <SkeletonBar $w="112px" $h="24px" $delay="0.25s" style={{ borderRadius: 8 } as any} />
                <SkeletonBar $w="64px" $h="24px" $delay="0.35s" style={{ borderRadius: 9999 } as any} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SkeletonBar $w="40px" $h="40px" style={{ borderRadius: 12 } as any} />
              <SkeletonBar $w="40px" $h="40px" style={{ borderRadius: 12 } as any} />
            </div>
          </div>

          {/* Map skeleton */}
          <MapSkeleton>
            <MapGridOverlay />
            <MapCenter>
              <Spinner style={{ width: 32, height: 32, color: 'rgba(200, 148, 42, 0.4)' } as any} />
            </MapCenter>
          </MapSkeleton>

          {/* Financial cards skeleton */}
          <SkeletonGrid3>
            {[
              { bg: 'rgba(59, 130, 246, 0.05)', delay: '0s' },
              { bg: 'rgba(16, 185, 129, 0.05)', delay: '0.1s' },
              { bg: 'rgba(200, 148, 42, 0.05)', delay: '0.2s' },
            ].map(({ bg, delay }, i) => (
              <SkeletonCardWrap key={i} $bgColor={bg} $delay={delay}>
                <SkeletonBar $w="64px" $h="12px" />
                <SkeletonBar $w="112px" $h="28px" />
                <SkeletonBar $w="80px" $h="12px" />
              </SkeletonCardWrap>
            ))}
          </SkeletonGrid3>

          {/* Two-column skeleton */}
          <SkeletonTwoCols>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SkeletonBox $h="128px" />
              <SkeletonBox $h="192px" $delay="0.15s" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SkeletonBox $h="256px" $delay="0.1s" />
              <SkeletonBox $h="160px" $delay="0.25s" />
            </div>
          </SkeletonTwoCols>
        </MaxWidth>
      </ContentZone>
    </PageWrap>
  )
}
