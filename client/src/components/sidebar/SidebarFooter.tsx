/**
 * SidebarFooter - CTA buttons, share, compare, print report
 */
import { useState, useCallback, lazy, Suspense } from 'react'
import styled from 'styled-components'
import { BarChart, Printer, Clipboard, Check, Share2 } from 'lucide-react'
import ShareMenu from '../ui/ShareMenu'
import { formatCurrency, formatDunam } from '../../utils/format'
import { generatePlotSummary } from '../../utils/investment'
import { plotInquiryLink } from '../../utils/config'
import { plotCenter, calcCommuteTimes } from '../../utils/geo'
import { calcInvestmentPnL } from '../../utils/plot'
import { calcCAGR, calcAlternativeReturns } from '../../utils/investment'
import { statusLabels, zoningLabels } from '../../utils/constants'
import { theme as themeTokens } from '../../styles/theme'

const QuickInquiryTemplates = lazy(() => import('../ui/QuickInquiryTemplates'))

/* ── Styled ────────────────────────────────────────────────── */

const InquiryWrap = styled.div`
  flex-shrink: 0;
  padding: 8px 16px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(4px);
`

const CtaFooter = styled.div`
  flex-shrink: 0;
  padding: 10px 16px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 22, 40, 0.9);
  backdrop-filter: blur(12px);
`

const CtaButton = styled.button`
  flex: 1;
  padding: 14px 24px;
  background: linear-gradient(to right, ${({ theme }) => theme.colors.gold}, ${({ theme }) => theme.colors.goldBright}, ${({ theme }) => theme.colors.gold});
  border-radius: 16px;
  border: none;
  color: ${({ theme }) => theme.colors.navy};
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(200, 148, 42, 0.3);
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  &:hover { box-shadow: 0 10px 15px rgba(200, 148, 42, 0.4); transform: translateY(-1px); }
`

const ShareBtn = styled.a<{ $bg: string; $shadow: string }>`
  flex-shrink: 0;
  width: 48px;
  padding: 14px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $bg }) => $bg};
  border-radius: 16px;
  text-decoration: none;
  box-shadow: 0 4px 6px ${({ $shadow }) => $shadow};
  transition: all 0.3s;
  &:hover { filter: brightness(1.1); transform: translateY(-1px); }
`

const SmallActionBtn = styled.button<{ $active?: boolean }>`
  flex-shrink: 0;
  width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) => $active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'};
  border-radius: ${({ theme }) => theme.radii.xl};
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(200, 148, 42, 0.2); }
`

const CompareBtn = styled.button<{ $active?: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ $active }) => $active ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.3)'};
  background: ${({ $active }) => $active ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)'};
  color: ${({ $active }) => $active ? '#D8B4FE' : '#A78BFA'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(139, 92, 246, 0.3); }
`

/* ── Component ─────────────────────────────────────────────── */

interface SidebarFooterProps {
  plot: any
  onOpenLeadModal: () => void
  compareIds: string[]
  onToggleCompare?: (id: string) => void
  totalPrice: number
  projectedValue: number
  sizeSqM: number
  roi: number
  blockNumber: string
  readinessEstimate: string | undefined
}

export default function SidebarFooter({ plot, onOpenLeadModal, compareIds, onToggleCompare, totalPrice, projectedValue, sizeSqM, roi, blockNumber, readinessEstimate }: SidebarFooterProps) {
  const [summaryCopied, setSummaryCopied] = useState(false)

  const handlePrintReport = useCallback(() => {
    if (!plot) return
    const price = totalPrice
    const proj = projectedValue
    const size = sizeSqM
    const zoning = plot.zoning_stage ?? plot.zoningStage
    const readiness = readinessEstimate
    const ctx = plot.area_context ?? plot.areaContext ?? ''
    const nearby = plot.nearby_development ?? plot.nearbyDevelopment ?? ''

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8">
      <title>דו״ח השקעה - גוש ${blockNumber} חלקה ${plot.number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        h1 { font-size: 24px; margin-bottom: 4px; color: #1a1a2e; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
        .section { margin-bottom: 24px; }
        .section h2 { font-size: 16px; color: #C8942A; border-bottom: 2px solid #C8942A; padding-bottom: 6px; margin-bottom: 12px; }
        .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 12px; }
        .card .label { font-size: 11px; color: #888; margin-bottom: 4px; }
        .card .value { font-size: 18px; font-weight: 700; }
        .card .value.gold { color: #C8942A; }
        .card .value.green { color: #22C55E; }
        .card .value.blue { color: #3B82F6; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
        .row:last-child { border-bottom: none; }
        .row .label { color: #666; }
        .row .val { font-weight: 600; }
        .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
        .desc { font-size: 13px; color: #444; margin-bottom: 16px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>🏗️ דו״ח השקעה — גוש ${blockNumber} | חלקה ${plot.number}</h1>
      <div class="subtitle">${plot.city} \u2022 ${new Date().toLocaleDateString('he-IL')}</div>
      ${plot.description ? `<p class="desc">${plot.description}</p>` : ''}
      ${ctx ? `<p class="desc">📍 ${ctx}</p>` : ''}
      ${nearby ? `<p class="desc">🏗️ ${nearby}</p>` : ''}
      <div class="section">
        <h2>נתונים פיננסיים</h2>
        <div class="grid3">
          <div class="card"><div class="label">מחיר מבוקש</div><div class="value blue">${formatCurrency(price)}</div></div>
          <div class="card"><div class="label">שווי צפוי</div><div class="value green">${formatCurrency(proj)}</div></div>
          <div class="card"><div class="label">תשואה צפויה</div><div class="value gold">+${roi}%</div></div>
        </div>
      </div>
      <div class="section">
        <h2>פרטי חלקה</h2>
        <div class="row"><span class="label">שטח</span><span class="val">${(size / 1000).toFixed(1)} דונם (${size.toLocaleString()} מ״ר)</span></div>
        <div class="row"><span class="label">מחיר למ״ר</span><span class="val">${formatCurrency(Math.round(price / size))}</span></div>
        <div class="row"><span class="label">סטטוס</span><span class="val">${statusLabels[plot.status] || plot.status}</span></div>
        <div class="row"><span class="label">ייעוד קרקע</span><span class="val">${zoningLabels[zoning] || zoning}</span></div>
      </div>
      <div class="footer">
        <div>LandMap Israel — מפת קרקעות להשקעה</div>
        <div>הופק ב-${new Date().toLocaleDateString('he-IL')} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
        <div style="margin-top:8px;font-size:10px">\u26A0️ מסמך זה הינו לצרכי מידע בלבד ואינו מהווה ייעוץ השקעות</div>
      </div></body></html>`)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }, [plot, totalPrice, projectedValue, sizeSqM, roi, blockNumber, readinessEstimate])

  return (
    <>
      <InquiryWrap>
        <Suspense fallback={null}><QuickInquiryTemplates plot={plot} /></Suspense>
      </InquiryWrap>

      <CtaFooter>
        <div style={{ display: 'flex', gap: 8 }}>
          <CtaButton onClick={onOpenLeadModal} aria-label="צור קשר לפרטים מלאים על החלקה">צור קשר לפרטים מלאים</CtaButton>
          <ShareBtn $bg="#25D366" $shadow="rgba(37,211,102,0.2)" href={plotInquiryLink(plot)} target="_blank" rel="noopener noreferrer" title="WhatsApp">
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </ShareBtn>
          <ShareBtn $bg="#0088cc" $shadow="rgba(0,136,204,0.2)" href={`https://t.me/share/url?url=${encodeURIComponent(`${window.location.origin}/plot/${plot.id}`)}&text=${encodeURIComponent(`🏗️ גוש ${blockNumber} חלקה ${plot.number} | ${plot.city}\n💰 ${formatCurrency(totalPrice)} \u00B7 תשואה +${roi}%\n📐 ${formatDunam(sizeSqM)} דונם`)}`} target="_blank" rel="noopener noreferrer" title="שתף בטלגרם">
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          </ShareBtn>
          <ShareBtn $bg="rgba(100,116,139,0.8)" $shadow="rgba(100,116,139,0.2)" href={`mailto:?subject=${encodeURIComponent(`🏗️ הזדמנות השקעה — גוש ${blockNumber} חלקה ${plot.number} | ${plot.city}`)}&body=${encodeURIComponent(`שלום,\n\nמצאתי חלקה מעניינת להשקעה:\n\n📍 גוש ${blockNumber} | חלקה ${plot.number} | ${plot.city}\n💰 מחיר: ${formatCurrency(totalPrice)}\n📐 שטח: ${formatDunam(sizeSqM)} דונם\n📈 תשואה צפויה: +${roi}%\n\n🔗 צפה בפרטים מלאים:\n${window.location.origin}/plot/${plot.id}\n\n— LandMap Israel`)}`} title="שלח במייל">
            <svg style={{ width: 20, height: 20 }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
          </ShareBtn>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <SmallActionBtn onClick={handlePrintReport} title="הדפס דו״ח השקעה">
            <Printer style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />
          </SmallActionBtn>
          <SmallActionBtn $active={summaryCopied} onClick={() => {
            const summary = generatePlotSummary(plot)
            navigator.clipboard.writeText(summary).then(() => { setSummaryCopied(true); setTimeout(() => setSummaryCopied(false), 2500) }).catch(() => {})
          }} title="העתק סיכום השקעה">
            {summaryCopied ? <Check style={{ width: 16, height: 16, color: '#34D399' }} /> : <Clipboard style={{ width: 16, height: 16, color: themeTokens.colors.slate[400] }} />}
          </SmallActionBtn>
          <ShareMenu plotTitle={`גוש ${blockNumber} חלקה ${plot.number} - ${plot.city}`} plotPrice={formatCurrency(totalPrice)} plotUrl={`${window.location.origin}/?plot=${plot.id}`} style={{ flex: 1 }} />
          {onToggleCompare && (
            <CompareBtn $active={compareIds.includes(plot.id)} onClick={() => onToggleCompare(plot.id)}>
              <BarChart style={{ width: 16, height: 16 }} />{compareIds.includes(plot.id) ? 'בהשוואה \u2713' : 'השווה'}
            </CompareBtn>
          )}
        </div>
      </CtaFooter>
    </>
  )
}
