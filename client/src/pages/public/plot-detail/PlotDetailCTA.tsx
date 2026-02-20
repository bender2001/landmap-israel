import { Suspense, lazy } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { MessageCircle, BarChart, Printer, Copy, Check, FileText, MapPin, GitCompareArrows, ArrowUp } from 'lucide-react'
import { media } from '../../../styles/theme'
import { plotInquiryLink, plotTelegramLink } from '../../../utils/config'
import { WidgetErrorBoundary } from '../../../components/ui/ErrorBoundaries'
import type { Plot } from '../../../types'

const LeadModal = lazy(() => import('../../../components/LeadModal'))
const MobilePlotActionBar = lazy(() => import('../../../components/ui/MobilePlotActionBar'))
const QuickInquiryTemplates = lazy(() => import('../../../components/ui/QuickInquiryTemplates'))
const BackToTopButton = lazy(() => import('../../../components/ui/BackToTopButton'))
const ImageLightbox = lazy(() => import('../../../components/ui/ImageLightbox'))
const DataDisclaimer = lazy(() => import('../../../components/DataDisclaimer'))

const fadeInAnim = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`

const StickyCTA = styled.div`
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  background: rgba(10,22,40,0.9); backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255,255,255,0.1); padding: 12px 16px;
`
const StickyCtaInner = styled.div`max-width: 896px; margin: 0 auto; display: flex; gap: 8px;`
const MainCtaBtn = styled.button`
  flex: 1; padding: 14px 0;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright}, ${({ theme }) => theme.colors.gold});
  border-radius: 16px; color: ${({ theme }) => theme.colors.navy}; font-weight: 800; font-size: 16px;
  border: none; cursor: pointer; box-shadow: 0 4px 6px rgba(200,148,42,0.3); transition: all 0.2s ease;
  &:hover { box-shadow: 0 10px 15px rgba(200,148,42,0.3); }
`
const WACTABtn = styled.a`
  width: 48px; display: flex; align-items: center; justify-content: center;
  background: #25D366; border-radius: 16px; transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(37,211,102,0.2); text-decoration: none;
  ${media.sm} { width: 56px; } &:hover { background: #20BD5A; }
`
const TelegramCTABtn = styled.a`
  display: none; width: 56px; align-items: center; justify-content: center;
  background: #229ED9; border-radius: 16px; transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(34,158,217,0.2); text-decoration: none;
  ${media.sm} { display: flex; } &:hover { background: #1A8BC7; }
`
const IconCTABtn = styled.button<{ $active?: boolean; $activeColor?: string; $activeBorder?: string }>`
  width: 48px; display: flex; align-items: center; justify-content: center;
  border-radius: 16px; transition: all 0.2s ease; cursor: pointer;
  ${media.sm} { width: 56px; }
  ${({ $active, $activeColor, $activeBorder }) => $active
    ? css`background: ${$activeColor || 'rgba(139,92,246,0.3)'}; border: 1px solid ${$activeBorder || 'rgba(139,92,246,0.5)'};`
    : css`background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); &:hover { background: rgba(255,255,255,0.1); border-color: rgba(200,148,42,0.2); }`}
`
const HiddenSmFlex = styled(IconCTABtn)`display: none; ${media.sm} { display: flex; }`
const CompareIndicator = styled.div`max-width: 896px; margin: 8px auto 0;`
const CompareIndicatorLink = styled(Link)`
  display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px;
  background: rgba(124,58,237,0.2); border: 1px solid rgba(139,92,246,0.3); border-radius: 12px;
  color: #c4b5fd; font-size: 14px; font-weight: 500; text-decoration: none;
  transition: background 0.2s ease; &:hover { background: rgba(124,58,237,0.3); }
`
const QuickInquiryWrap = styled.div`max-width: 896px; margin: 24px auto 80px; padding: 0 16px; ${media.sm} { padding: 0 24px; }`
const DisclaimerWrap = styled.div`max-width: 896px; margin: 0 auto; padding: 0 16px 32px;`
const FloatingBtns = styled.div`position: fixed; bottom: 80px; right: 16px; z-index: 50; display: flex; flex-direction: column; gap: 8px; animation: ${fadeInAnim} 0.3s ease;`
const FloatingBtn = styled.button<{ $bg: string; $borderColor: string }>`
  width: 40px; height: 40px; border-radius: 12px; background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $borderColor }) => $borderColor}; display: flex; align-items: center;
  justify-content: center; cursor: pointer; transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0,0,0,0.15); backdrop-filter: blur(4px); &:hover { opacity: 0.9; }
`

interface PlotDetailCTAProps {
  plot: Plot; id: string; isLeadModalOpen: boolean; setIsLeadModalOpen: (v: boolean) => void
  linkCopied: boolean; handleCopyLink: () => void; handleCopyInvestmentCard: () => void
  handlePrintReport: () => void; toggleCompare: (id: string) => void; compareIds: string[]
  showScrollTop: boolean; scrollToTop: () => void; favorites: any
  lightboxOpen: boolean; setLightboxOpen: (v: boolean) => void; lightboxIndex: number; images: any[]
}

export default function PlotDetailCTA({
  plot, id, isLeadModalOpen, setIsLeadModalOpen, linkCopied, handleCopyLink,
  handleCopyInvestmentCard, handlePrintReport, toggleCompare, compareIds,
  showScrollTop, scrollToTop, favorites, lightboxOpen, setLightboxOpen, lightboxIndex, images,
}: PlotDetailCTAProps) {
  const navigate = useNavigate()
  return (
    <>
      <QuickInquiryWrap>
        <WidgetErrorBoundary name="\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05E4\u05E0\u05D9\u05D9\u05D4">
          <Suspense fallback={null}><QuickInquiryTemplates plot={plot} /></Suspense>
        </WidgetErrorBoundary>
      </QuickInquiryWrap>

      <StickyCTA>
        <StickyCtaInner>
          <MainCtaBtn onClick={() => setIsLeadModalOpen(true)}>\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05DC\u05E4\u05E8\u05D8\u05D9\u05DD \u05DE\u05DC\u05D0\u05D9\u05DD</MainCtaBtn>
          <WACTABtn href={plotInquiryLink(plot)} target="_blank" rel="noopener noreferrer" aria-label="\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05D1-WhatsApp">
            <MessageCircle style={{ width: 20, height: 20, color: '#fff' }} />
          </WACTABtn>
          <TelegramCTABtn href={plotTelegramLink(plot)} target="_blank" rel="noopener noreferrer" aria-label="\u05E6\u05D5\u05E8 \u05E7\u05E9\u05E8 \u05D1\u05D8\u05DC\u05D2\u05E8\u05DD">
            <svg style={{ width: 20, height: 20, color: '#fff' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          </TelegramCTABtn>
          <IconCTABtn onClick={() => toggleCompare(id)} $active={compareIds.includes(id)} $activeColor="rgba(124,58,237,0.3)" $activeBorder="rgba(139,92,246,0.5)">
            <BarChart style={{ width: 20, height: 20, color: compareIds.includes(id) ? '#c4b5fd' : '#94A3B8' }} />
          </IconCTABtn>
          <IconCTABtn onClick={handlePrintReport}><Printer style={{ width: 20, height: 20, color: '#94A3B8' }} /></IconCTABtn>
          <IconCTABtn onClick={handleCopyLink} $active={linkCopied} $activeColor="rgba(34,197,94,0.15)" $activeBorder="rgba(34,197,94,0.3)">
            {linkCopied ? <Check style={{ width: 20, height: 20, color: '#4ADE80' }} /> : <Copy style={{ width: 20, height: 20, color: '#94A3B8' }} />}
          </IconCTABtn>
          <HiddenSmFlex onClick={handleCopyInvestmentCard}><FileText style={{ width: 20, height: 20, color: '#94A3B8' }} /></HiddenSmFlex>
          <IconCTABtn onClick={() => navigate(`/?plot=${id}`)}><MapPin style={{ width: 20, height: 20, color: '#C8942A' }} /></IconCTABtn>
        </StickyCtaInner>
        {compareIds.length > 0 && (
          <CompareIndicator>
            <CompareIndicatorLink to="/compare"><GitCompareArrows style={{ width: 16, height: 16 }} />\u05D4\u05E9\u05D5\u05D5\u05D4 {compareIds.length} \u05D7\u05DC\u05E7\u05D5\u05EA</CompareIndicatorLink>
          </CompareIndicator>
        )}
      </StickyCTA>

      <DisclaimerWrap>
        <Suspense fallback={null}>
          <WidgetErrorBoundary name="DataDisclaimer" silent>
            <DataDisclaimer variant="compact" lastUpdate={plot.updated_at ? new Date((plot.updated_at ?? plot.updatedAt) as string).toLocaleDateString('he-IL') : null} />
          </WidgetErrorBoundary>
        </Suspense>
      </DisclaimerWrap>

      <FloatingBtns>
        <FloatingBtn $bg="rgba(59,130,246,0.2)" $borderColor="rgba(59,130,246,0.3)" onClick={() => window.history.length > 2 ? navigate(-1) : navigate(`/?plot=${id}`)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#60A5FA' }}>
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
          </svg>
        </FloatingBtn>
        {showScrollTop && <FloatingBtn $bg="rgba(200,148,42,0.2)" $borderColor="rgba(200,148,42,0.3)" onClick={scrollToTop}><ArrowUp style={{ width: 16, height: 16, color: '#C8942A' }} /></FloatingBtn>}
      </FloatingBtns>

      <Suspense fallback={null}><MobilePlotActionBar plot={plot} isFavorite={favorites?.favorites?.includes(id)} onToggleFavorite={favorites?.toggle} /></Suspense>
      <Suspense fallback={null}><LeadModal isOpen={isLeadModalOpen} onClose={() => setIsLeadModalOpen(false)} plot={plot} /></Suspense>
      {images.length > 0 && <Suspense fallback={null}><ImageLightbox images={images} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} /></Suspense>}
      <Suspense fallback={null}><BackToTopButton /></Suspense>
    </>
  )
}
