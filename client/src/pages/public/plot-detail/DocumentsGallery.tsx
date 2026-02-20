import { Suspense, lazy } from 'react'
import styled, { keyframes } from 'styled-components'
import { FileText, Download, File, FileImage, FileSpreadsheet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { WidgetErrorBoundary } from '../../../components/ui/ErrorBoundaries'
import type { Plot } from '../../../types'

const DueDiligenceChecklist = lazy(() => import('../../../components/ui/DueDiligenceChecklist'))

const pulseAnim = keyframes`0%,100%{opacity:1}50%{opacity:0.6}`
const spinAnim = keyframes`to{transform:rotate(360deg)}`
const SkeletonWrap = styled.div<{ $height?: string }>`height: ${({ $height }) => $height || '128px'}; border-radius: 16px; background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); animation: ${pulseAnim} 2s ease-in-out infinite; position: relative; overflow: hidden;`
const SkeletonSpinner = styled.div`position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;`
const SpinnerCircle = styled.div`width: 20px; height: 20px; border-radius: 50%; border: 2px solid rgba(200,148,42,0.3); border-top-color: ${({ theme }) => theme.colors.gold}; animation: ${spinAnim} 0.8s linear infinite;`
function SectionSkeleton({ height }: { height?: string }) { return <SkeletonWrap $height={height}><SkeletonSpinner><SpinnerCircle /></SkeletonSpinner></SkeletonWrap> }

const DetailSection = styled.div`background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;`
const PanelTitle = styled.h2`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[100]}; margin-bottom: 12px;`
const NarrativeIconBox = styled.div`width: 28px; height: 28px; border-radius: 8px; background: rgba(200,148,42,0.15); display: flex; align-items: center; justify-content: center;`
const DocsCountPill = styled.span`font-size: 10px; color: ${({ theme }) => theme.colors.slate[500]}; background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 9999px;`
const DocRow = styled.a`
  display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px 16px;
  text-decoration: none; transition: all 0.2s ease;
  &:hover { border-color: rgba(200,148,42,0.2); background: rgba(200,148,42,0.05); }
`
const DocRowStatic = styled.div`display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 12px 16px;`
const DocName = styled.div`font-size: 14px; color: ${({ theme }) => theme.colors.slate[300]}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const DocType = styled.div`font-size: 10px; color: ${({ theme }) => theme.colors.slate[600]}; margin-top: 2px;`

function getDocIcon(mimeType?: string): LucideIcon {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return FileText
}

interface DocumentsGalleryProps { plot: Plot; plotId: string }

export default function DocumentsGallery({ plot, plotId }: DocumentsGalleryProps) {
  const docs: any[] | null = (plot as any).plot_documents?.length ? (plot as any).plot_documents : (plot as any).documents?.length ? (plot as any).documents : null

  return (
    <>
      {docs && (
        <DetailSection id="section-documents">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <NarrativeIconBox><FileText style={{ width: 14, height: 14, color: '#C8942A' }} /></NarrativeIconBox>
            <PanelTitle style={{ marginBottom: 0 }}>\u05DE\u05E1\u05DE\u05DB\u05D9\u05DD \u05D5\u05EA\u05D5\u05DB\u05E0\u05D9\u05D5\u05EA</PanelTitle>
            <DocsCountPill>{docs.length}</DocsCountPill>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map((doc: any, i: number) => {
              if (typeof doc === 'object' && doc.url) {
                const DocIcon = getDocIcon(doc.mime_type)
                return (
                  <DocRow key={doc.id || i} href={doc.url} target="_blank" rel="noopener noreferrer">
                    <DocIcon style={{ width: 20, height: 20, color: 'rgba(200,148,42,0.6)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <DocName>{doc.name || '\u05DE\u05E1\u05DE\u05DA'}</DocName>
                      {doc.mime_type && <DocType>{doc.mime_type.includes('pdf') ? 'PDF' : doc.mime_type.includes('image') ? '\u05EA\u05DE\u05D5\u05E0\u05D4' : doc.mime_type.includes('spread') || doc.mime_type.includes('excel') ? '\u05D2\u05D9\u05DC\u05D9\u05D5\u05DF' : '\u05DE\u05E1\u05DE\u05DA'}</DocType>}
                    </div>
                    <Download style={{ width: 16, height: 16, color: '#64748B', flexShrink: 0 }} />
                  </DocRow>
                )
              }
              return <DocRowStatic key={i}><FileText style={{ width: 20, height: 20, color: 'rgba(200,148,42,0.6)', flexShrink: 0 }} /><DocName>{doc}</DocName></DocRowStatic>
            })}
          </div>
        </DetailSection>
      )}
      <WidgetErrorBoundary name="\u05E8\u05E9\u05D9\u05DE\u05EA \u05D1\u05D3\u05D9\u05E7\u05EA \u05E0\u05D0\u05D5\u05EA\u05D5\u05EA">
        <Suspense fallback={<SectionSkeleton height="160px" />}>
          <DueDiligenceChecklist plotId={plotId} />
        </Suspense>
      </WidgetErrorBoundary>
    </>
  )
}
