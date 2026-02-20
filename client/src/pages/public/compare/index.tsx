import { useMemo, useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import styled, { css } from 'styled-components'
import { BarChart3, Map, MapPin, TrendingUp, Share2, Printer, Check, Copy } from 'lucide-react'
import { usePlotsBatch } from '../../../hooks/usePlots'
import { statusColors, statusLabels } from '../../../utils/constants'
import { formatCurrency } from '../../../utils/format'
import { calcInvestmentScore } from '../../../utils/investment'
import { getPlotPrice, getPlotProjectedValue, getPlotSize } from '../../../utils/plot'
import { useMetaTags } from '../../../hooks/useSEO'
import PublicNav from '../../../components/PublicNav'
import PublicFooter from '../../../components/PublicFooter'
import BackToTopButton from '../../../components/ui/BackToTopButton'
import Breadcrumb from '../../../components/ui/Breadcrumb'
import Spinner from '../../../components/ui/Spinner'
import { media } from '../../../styles/theme'
import { PageWrapper } from '../../../styles/shared'
import type { Plot } from '../../../types'

import CompareTable from './CompareTable'
import CompareBarChart from './CompareBarChart'
import CompareRadar from './CompareRadar'
import WinnerSummary from './WinnerSummary'
import NetProfitAnalysis from './NetProfitAnalysis'
import RiskReturnScatter from './RiskReturnScatter'

/* ── Styled ── */
const ComparePageWrapper = styled(PageWrapper)`min-height: 100vh; background: ${({ theme }) => theme.colors.bg}; direction: rtl;`
const ContentArea = styled.div`padding: 112px 16px 64px;`
const ContentContainer = styled.div`max-width: 960px; margin: 0 auto;`
const PageHeader = styled.div`display: flex; align-items: center; gap: 12px; margin-bottom: 32px;`
const HeaderIconBox = styled.div`width: 48px; height: 48px; border-radius: ${({ theme }) => theme.radii.xxl}; background: ${({ theme }) => theme.colors.primaryLight}; border: 1px solid ${({ theme }) => theme.colors.border}; display: flex; align-items: center; justify-content: center;`
const HeaderTextBlock = styled.div`flex: 1;`
const HeaderTitle = styled.h1`font-size: 24px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const HeaderSubtitle = styled.p`font-size: 14px; color: ${({ theme }) => theme.colors.textSecondary};`
const ActionsRow = styled.div`display: flex; align-items: center; gap: 8px;`
const ActionButton = styled.button<{ $active?: boolean }>`
  display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 14px; font-weight: 500; cursor: pointer; transition: all ${({ theme }) => theme.transitions.normal};
  ${({ $active, theme }) => $active
    ? css`background: ${theme.colors.emerald[50]}; border: 1px solid ${theme.colors.emerald[200]}; color: ${theme.colors.emerald[600]};`
    : css`background: ${theme.colors.bgSecondary}; border: 1px solid ${theme.colors.border}; color: ${theme.colors.textSecondary}; &:hover { background: ${theme.colors.bgTertiary}; border-color: ${theme.colors.primary}; color: ${theme.colors.primary}; }`}
`
const ActionButtonLabel = styled.span`display: none; ${media.sm} { display: inline; }`
const WhatsAppLink = styled.a`
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  background: rgba(37,211,102,0.08); border: 1px solid rgba(37,211,102,0.2);
  border-radius: ${({ theme }) => theme.radii.lg}; transition: all ${({ theme }) => theme.transitions.normal};
  &:hover { background: rgba(37,211,102,0.16); }
`
const LoadingWrap = styled.div`display: flex; align-items: center; justify-content: center; padding: 80px 0;`
const EmptyPanel = styled.div`background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.xl}; padding: 48px; text-align: center;`
const EmptyIcon = styled(BarChart3)`width: 64px; height: 64px; color: ${({ theme }) => theme.colors.slate[300]}; margin: 0 auto 16px;`
const EmptyTitle = styled.h2`font-size: 20px; font-weight: 700; color: ${({ theme }) => theme.colors.text}; margin-bottom: 8px;`
const EmptyDesc = styled.p`color: ${({ theme }) => theme.colors.textSecondary}; margin-bottom: 24px;`
const BackToMapLink = styled(Link)`display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: ${({ theme }) => theme.gradients.primary}; border-radius: ${({ theme }) => theme.radii.lg}; color: ${({ theme }) => theme.colors.white}; font-weight: 700; text-decoration: none;`
const CardPanelPadded = styled.div`background: ${({ theme }) => theme.colors.bg}; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: ${({ theme }) => theme.radii.xl}; margin-bottom: 24px; padding: 24px;`
const SectionTitleText = styled.h3`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.text};`
const BottomToolbar = styled.div`display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 24px;`
const ToolbarButton = styled.button<{ $active?: boolean; $whatsapp?: boolean }>`
  display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 14px; cursor: pointer; transition: all ${({ theme }) => theme.transitions.normal};
  ${({ $active, $whatsapp, theme }) => {
    if ($active) return css`background: ${theme.colors.emerald[50]}; border: 1px solid ${theme.colors.emerald[200]}; color: ${theme.colors.emerald[600]};`
    if ($whatsapp) return css`background: rgba(37,211,102,0.06); border: 1px solid rgba(37,211,102,0.15); color: #25d366; &:hover { background: rgba(37,211,102,0.14); }`
    return css`background: ${theme.colors.bgSecondary}; border: 1px solid ${theme.colors.border}; color: ${theme.colors.text}; &:hover { border-color: ${theme.colors.primary}; color: ${theme.colors.primary}; }`
  }}
`

/* ── Component ── */
export default function Compare() {
  useMetaTags({ title: '\u05D4\u05E9\u05D5\u05D5\u05D0\u05EA \u05D7\u05DC\u05E7\u05D5\u05EA \u2014 LandMap Israel', description: '\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DE\u05E4\u05D5\u05E8\u05D8\u05EA \u05D1\u05D9\u05DF \u05D7\u05DC\u05E7\u05D5\u05EA \u05E7\u05E8\u05E7\u05E2.', url: `${window.location.origin}/compare` })

  const [searchParams, setSearchParams] = useSearchParams()
  const plotIds = useMemo(() => {
    const fromUrl = (searchParams.get('plots') || '').split(',').filter(Boolean)
    if (fromUrl.length > 0) return fromUrl
    try { const stored = JSON.parse(localStorage.getItem('landmap_compare') || '[]'); return Array.isArray(stored) ? stored.filter(Boolean) : [] } catch { return [] }
  }, [searchParams])

  useEffect(() => { if (plotIds.length > 0 && !searchParams.get('plots')) setSearchParams({ plots: plotIds.join(',') }, { replace: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: plots = [], isLoading } = usePlotsBatch(plotIds)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleShareComparison = useCallback(() => {
    const url = `${window.location.origin}/compare?plots=${plotIds.join(',')}`
    navigator.clipboard.writeText(url).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500) }).catch(() => {})
  }, [plotIds])

  const removeFromCompare = useCallback((plotId: string) => {
    const next = plotIds.filter(id => id !== plotId)
    try { localStorage.setItem('landmap_compare', JSON.stringify(next)) } catch {}
    next.length > 0 ? setSearchParams({ plots: next.join(',') }, { replace: true }) : setSearchParams({}, { replace: true })
  }, [plotIds, setSearchParams])

  const clearAll = useCallback(() => {
    try { localStorage.setItem('landmap_compare', '[]') } catch {}
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const bestValue = (getter: (p: Plot) => number | null | undefined, mode: 'max' | 'min' = 'max') => {
    const values = plots.map(getter).filter((v): v is number => v != null)
    if (values.length === 0) return null
    return mode === 'max' ? Math.max(...values) : Math.min(...values)
  }

  return (
    <ComparePageWrapper>
      <PublicNav />
      <ContentArea>
        <ContentContainer>
          <Breadcrumb items={[{ label: '\u05DE\u05E4\u05D4', to: '/' }, { label: '\u05D4\u05E9\u05D5\u05D5\u05D0\u05EA \u05D7\u05DC\u05E7\u05D5\u05EA' }]} style={{ marginBottom: 16 }} />
          <PageHeader>
            <HeaderIconBox><BarChart3 style={{ width: 24, height: 24, color: '#1A73E8' }} /></HeaderIconBox>
            <HeaderTextBlock>
              <HeaderTitle>\u05D4\u05E9\u05D5\u05D5\u05D0\u05EA \u05D7\u05DC\u05E7\u05D5\u05EA</HeaderTitle>
              <HeaderSubtitle>{plots.length > 0 ? `${plots.length} \u05D7\u05DC\u05E7\u05D5\u05EA \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4` : '\u05D1\u05D7\u05E8\u05D5 \u05D7\u05DC\u05E7\u05D5\u05EA \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4'}</HeaderSubtitle>
            </HeaderTextBlock>
            {plots.length >= 2 && (
              <ActionsRow data-print-hide>
                <ActionButton onClick={() => window.print()}><Printer style={{ width: 16, height: 16 }} /><ActionButtonLabel>\u05D4\u05D3\u05E4\u05E1</ActionButtonLabel></ActionButton>
                <ActionButton $active={linkCopied} onClick={handleShareComparison}>
                  {linkCopied ? <Check style={{ width: 16, height: 16 }} /> : <Share2 style={{ width: 16, height: 16 }} />}
                  <ActionButtonLabel>{linkCopied ? '\u05D4\u05D5\u05E2\u05EA\u05E7!' : '\u05E9\u05EA\u05E3 \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4'}</ActionButtonLabel>
                </ActionButton>
              </ActionsRow>
            )}
          </PageHeader>

          {isLoading ? (
            <LoadingWrap><Spinner style={{ width: 40, height: 40, color: '#1A73E8' }} /></LoadingWrap>
          ) : plots.length === 0 ? (
            <EmptyPanel>
              <EmptyIcon /><EmptyTitle>\u05D0\u05D9\u05DF \u05D7\u05DC\u05E7\u05D5\u05EA \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4</EmptyTitle>
              <EmptyDesc>\u05D1\u05D7\u05E8\u05D5 \u05E2\u05D3 3 \u05D7\u05DC\u05E7\u05D5\u05EA \u05DE\u05D4\u05DE\u05E4\u05D4 \u05DC\u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DE\u05E7\u05D9\u05E4\u05D4</EmptyDesc>
              <BackToMapLink to="/"><Map style={{ width: 20, height: 20 }} />\u05D7\u05D6\u05E8\u05D4 \u05DC\u05DE\u05E4\u05D4</BackToMapLink>
            </EmptyPanel>
          ) : (
            <>
              {plots.length >= 2 && <WinnerSummary plots={plots} />}
              {plots.length >= 1 && <NetProfitAnalysis plots={plots} />}
              {plots.length >= 2 && (
                <>
                  <CompareRadar plots={plots} />
                  <RiskReturnScatter plots={plots} />
                  <CardPanelPadded>
                    <SectionTitleText style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <TrendingUp style={{ width: 16, height: 16, color: '#1A73E8' }} /> \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4 \u05DE\u05E1\u05E4\u05E8\u05D9\u05EA
                    </SectionTitleText>
                    <CompareBarChart plots={plots} label="\u05DE\u05D7\u05D9\u05E8 (\u05E0\u05DE\u05D5\u05DA \u05D9\u05D5\u05EA\u05E8 = \u05D8\u05D5\u05D1 \u05D9\u05D5\u05EA\u05E8)" getter={(p) => (p.total_price ?? p.totalPrice) as number | undefined} formatter={formatCurrency} mode="lower-better" />
                    <CompareBarChart plots={plots} label="\u05EA\u05E9\u05D5\u05D0\u05D4 \u05E6\u05E4\u05D5\u05D9\u05D4 (%)" getter={(p) => { const price = (p.total_price ?? p.totalPrice ?? 0) as number; const proj = (p.projected_value ?? p.projectedValue ?? 0) as number; return price > 0 ? Math.round(((proj - price) / price) * 100) : 0 }} unit="%" mode="higher-better" />
                    <CompareBarChart plots={plots} label="\u05E9\u05D8\u05D7 (\u05DE\u05F4\u05E8)" getter={(p) => (p.size_sqm ?? p.sizeSqM) as number | undefined} unit=" \u05DE\u05F4\u05E8" mode="higher-better" />
                    <CompareBarChart plots={plots} label="\u05DE\u05D7\u05D9\u05E8 \u05DC\u05DE\u05F4\u05E8 (\u05E0\u05DE\u05D5\u05DA = \u05D8\u05D5\u05D1)" getter={(p) => { const price = (p.total_price ?? p.totalPrice ?? 0) as number; const size = (p.size_sqm ?? p.sizeSqM ?? 1) as number; return Math.round(price / size) }} formatter={(v: number) => `\u20AA${v.toLocaleString()}`} mode="lower-better" />
                    <CompareBarChart plots={plots} label="\u05E6\u05D9\u05D5\u05DF \u05D4\u05E9\u05E7\u05E2\u05D4" getter={(p) => calcInvestmentScore(p)} unit="/10" mode="higher-better" />
                  </CardPanelPadded>
                </>
              )}
              <CompareTable plots={plots} removeFromCompare={removeFromCompare} clearAll={clearAll} bestValue={bestValue} />
              <BottomToolbar>
                <ToolbarButton $active={linkCopied} onClick={() => { navigator.clipboard.writeText(window.location.href).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }).catch(() => {}) }}>
                  {linkCopied ? <Check style={{ width: 16, height: 16 }} /> : <Copy style={{ width: 16, height: 16 }} />}
                  {linkCopied ? '\u05D4\u05D5\u05E2\u05EA\u05E7!' : '\u05E9\u05EA\u05E3 \u05D4\u05E9\u05D5\u05D5\u05D0\u05D4'}
                </ToolbarButton>
                <ToolbarButton onClick={() => window.print()}><Printer style={{ width: 16, height: 16 }} />\u05D4\u05D3\u05E4\u05E1 \u05D3\u05D5\u05D7</ToolbarButton>
              </BottomToolbar>
            </>
          )}
        </ContentContainer>
      </ContentArea>
      <BackToTopButton />
      <PublicFooter />
    </ComparePageWrapper>
  )
}
