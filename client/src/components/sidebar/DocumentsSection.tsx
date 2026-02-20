/**
 * DocumentsSection - Document list
 */
import styled from 'styled-components'
import { FileText, File, FileImage, FileSpreadsheet, Download } from 'lucide-react'
import { theme as themeTokens } from '../../styles/theme'
import { CardLift } from '../../styles/shared'
import { SkeletonPulse } from './shared'

const DocRow = styled.a`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 10px 16px;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.2s;
  ${CardLift}
  &:hover { border-color: rgba(200, 148, 42, 0.2); }
  &:hover .doc-icon { color: ${({ theme }) => theme.colors.gold}; }
  &:hover .doc-name { color: ${({ theme }) => theme.colors.slate[200]}; }
  &:hover .doc-dl { color: ${({ theme }) => theme.colors.gold}; }
`

const DocLegacyRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(10, 22, 40, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 10px 16px;
  cursor: pointer;
  transition: border-color 0.2s;
  ${CardLift}
  &:hover { border-color: rgba(200, 148, 42, 0.2); }
`

function getDocIcon(mimeType: string | undefined) {
  if (!mimeType) return File
  if (mimeType.startsWith('image/')) return FileImage
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet
  return FileText
}

interface DocumentsSectionProps {
  docs: any[]
  isEnriching: boolean
  hasPlotDocuments: boolean
}

export default function DocumentsSection({ docs, isEnriching, hasPlotDocuments }: DocumentsSectionProps) {
  return (
    <>
      {isEnriching && !hasPlotDocuments && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <SkeletonPulse $w="12px" $h="12px" $rounded="9999px" />
          <span style={{ fontSize: 12, color: themeTokens.colors.slate[500] }}>טוען מסמכים...</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {docs.map((doc: any, i: number) => {
          if (typeof doc === 'object' && doc.url) {
            const DocIcon = getDocIcon(doc.mime_type)
            return (
              <DocRow key={doc.id || i} href={doc.url} target="_blank" rel="noopener noreferrer">
                <DocIcon className="doc-icon" style={{ width: 16, height: 16, color: 'rgba(200,148,42,0.6)', flexShrink: 0, transition: 'color 0.2s' }} />
                <span className="doc-name" style={{ fontSize: 14, color: themeTokens.colors.slate[300], flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'color 0.2s' }}>{doc.name || 'מסמך'}</span>
                <Download className="doc-dl" style={{ width: 14, height: 14, color: themeTokens.colors.slate[500], flexShrink: 0, transition: 'color 0.2s' }} />
              </DocRow>
            )
          }
          return (
            <DocLegacyRow key={i}>
              <FileText style={{ width: 16, height: 16, color: 'rgba(200,148,42,0.6)', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: themeTokens.colors.slate[300] }}>{doc}</span>
            </DocLegacyRow>
          )
        })}
      </div>
    </>
  )
}
