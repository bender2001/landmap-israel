import styled from 'styled-components'
import { MapPin, ExternalLink, Waves, TreePine, Hospital, Navigation } from 'lucide-react'
import { media } from '../../../styles/theme'
import { plotCenter, calcCommuteTimes } from '../../../utils/geo'
import MiniMap from '../../../components/ui/MiniMap'
import type { Plot, CommuteTime } from '../../../types'

/* ── Styled ── */
const LocationSection = styled.div`margin-bottom: 32px;`
const LocationHeader = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;`
const LocationTitle = styled.h2`font-size: 16px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[100]}; display: flex; align-items: center; gap: 8px;`
const ExternalLinks = styled.div`display: flex; align-items: center; gap: 8px;`
const ExtLink = styled.a`
  display: flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[400]}; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; text-decoration: none;
  transition: all 0.2s ease;
  &:hover { color: ${({ theme }) => theme.colors.gold}; border-color: rgba(200,148,42,0.2); background: rgba(200,148,42,0.05); }
`
const WazeLink = styled(ExtLink)`
  &:hover { color: #33CCFF; border-color: rgba(51,204,255,0.2); background: rgba(51,204,255,0.05); }
`
const ProximityChips = styled.div`display: flex; flex-wrap: wrap; gap: 12px;`
const ProximityChip = styled.div<{ $borderColor: string }>`
  display: flex; align-items: center; gap: 8px;
  background: rgba(15,23,42,0.4); border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: 12px; padding: 10px 16px; font-size: 14px; color: ${({ theme }) => theme.colors.slate[300]};
`
const Panel = styled.div`background: rgba(15,23,42,0.4); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 20px;`
const CommutePanel = styled(Panel)``
const CommuteHeading = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 12px;`
const CommuteGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;
  ${media.sm} { grid-template-columns: repeat(3, 1fr); }
`
const CommuteCard = styled.a`
  display: flex; align-items: center; gap: 10px;
  background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 10px 12px; text-decoration: none;
  transition: all 0.2s ease;
  &:hover { border-color: rgba(99,102,241,0.2); background: rgba(99,102,241,0.05); }
`
const CommuteCityName = styled.div`font-size: 12px; font-weight: 500; color: ${({ theme }) => theme.colors.slate[300]}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
const CommuteDuration = styled.div`font-size: 10px; color: ${({ theme }) => theme.colors.slate[500]};`
const CompareTitle = styled.h2`font-size: 14px; font-weight: 700; color: ${({ theme }) => theme.colors.slate[200]};`
const NearbyDevIconBox = styled.div`
  width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
`
const Disclaimer = styled.p`font-size: 9px; color: ${({ theme }) => theme.colors.slate[600]}; margin-top: 12px;`

/* ── Props ── */
interface LocationDetailsProps {
  plot: Plot
  distanceToSea?: number
  distanceToPark?: number
  distanceToHospital?: number
}

/* ── Component ── */
export default function LocationDetails({ plot, distanceToSea, distanceToPark, distanceToHospital }: LocationDetailsProps) {
  return (
    <>
      {/* Location mini-map */}
      {plot.coordinates && plot.coordinates.length >= 3 && (
        <LocationSection id="section-location">
          <LocationHeader>
            <LocationTitle>
              <MapPin style={{ width: 16, height: 16, color: '#C8942A' }} />
              \u05DE\u05D9\u05E7\u05D5\u05DD \u05D4\u05D7\u05DC\u05E7\u05D4
            </LocationTitle>
            {(() => {
              const valid = plot.coordinates!.filter((c: any) => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
              if (valid.length === 0) return null
              const lat = (valid.reduce((s: number, c: any) => s + c[0], 0) / valid.length).toFixed(6)
              const lng = (valid.reduce((s: number, c: any) => s + c[1], 0) / valid.length).toFixed(6)
              return (
                <ExternalLinks>
                  <ExtLink href={`https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m4!1e1!3m2!1s!2e0`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink style={{ width: 12, height: 12 }} /> Street View
                  </ExtLink>
                  <ExtLink href={`https://www.google.com/maps?q=${lat},${lng}&z=17`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink style={{ width: 12, height: 12 }} /> Google Maps
                  </ExtLink>
                  <WazeLink href={`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`} target="_blank" rel="noopener noreferrer">
                    <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.54 6.63c-1.19-4.28-5.37-6.2-9.26-5.62C6.6 1.74 3.56 5.24 3.06 9.86c-.46 4.2 1.26 7.3 4.33 8.94.15.08.2.2.18.37-.04.47-.09.93-.14 1.4-.04.43.27.65.63.44.5-.29.98-.6 1.47-.9.16-.1.31-.12.49-.08.65.14 1.3.21 1.97.19 4.26-.12 8.24-3.19 9.12-7.49.3-1.47.28-2.9-.03-4.32zm-8.29 8.93c-.64.02-1.16-.5-1.16-1.13 0-.61.5-1.13 1.14-1.14.63 0 1.15.52 1.15 1.14 0 .62-.5 1.12-1.13 1.13zm3.98 0c-.63.02-1.15-.5-1.16-1.12 0-.63.51-1.14 1.14-1.15.64 0 1.15.52 1.15 1.14 0 .62-.5 1.12-1.13 1.13zm-7.96 0c-.63.02-1.15-.5-1.16-1.12-.01-.63.51-1.14 1.14-1.15.64 0 1.16.51 1.16 1.13 0 .63-.51 1.13-1.14 1.14z"/>
                    </svg>
                    Waze
                  </WazeLink>
                </ExternalLinks>
              )
            })()}
          </LocationHeader>
          <MiniMap coordinates={plot.coordinates} status={plot.status} city={plot.city} height="280px" interactive={true} />
        </LocationSection>
      )}

      {/* Proximity chips */}
      <ProximityChips>
        {distanceToSea != null && (
          <ProximityChip $borderColor="rgba(59,130,246,0.15)">
            <Waves style={{ width: 16, height: 16, color: '#60A5FA' }} /> {distanceToSea} \u05DE\u05F3 \u05DE\u05D4\u05D9\u05DD
          </ProximityChip>
        )}
        {distanceToPark != null && (
          <ProximityChip $borderColor="rgba(34,197,94,0.15)">
            <TreePine style={{ width: 16, height: 16, color: '#4ADE80' }} /> {distanceToPark} \u05DE\u05F3 \u05DE\u05E4\u05D0\u05E8\u05E7
          </ProximityChip>
        )}
        {distanceToHospital != null && (
          <ProximityChip $borderColor="rgba(239,68,68,0.15)">
            <Hospital style={{ width: 16, height: 16, color: '#F87171' }} /> {distanceToHospital} \u05DE\u05F3 \u05DE\u05D1\u05D9"\u05D7
          </ProximityChip>
        )}
      </ProximityChips>

      {/* Commute Times */}
      {(() => {
        const center = plotCenter(plot.coordinates)
        if (!center) return null
        const commutes = calcCommuteTimes(center.lat, center.lng) as CommuteTime[]
        if (!commutes || commutes.length === 0) return null
        return (
          <CommutePanel>
            <CommuteHeading>
              <NearbyDevIconBox style={{ background: 'rgba(99,102,241,0.15)' }}>
                <Navigation style={{ width: 14, height: 14, color: '#818CF8' }} />
              </NearbyDevIconBox>
              <CompareTitle>\u05D6\u05DE\u05E0\u05D9 \u05E0\u05E1\u05D9\u05E2\u05D4 \u05DE\u05E9\u05D5\u05E2\u05E8\u05D9\u05DD</CompareTitle>
            </CommuteHeading>
            <CommuteGrid>
              {commutes.slice(0, 6).map((c: CommuteTime) => (
                <CommuteCard key={c.city} href={c.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{c.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <CommuteCityName>{c.city}</CommuteCityName>
                    <CommuteDuration>~{c.drivingMinutes} \u05D3\u05E7\u05F3 \u00B7 {c.distanceKm} \u05E7\u05F4\u05DE</CommuteDuration>
                  </div>
                </CommuteCard>
              ))}
            </CommuteGrid>
            <Disclaimer>* \u05D4\u05E2\u05E8\u05DB\u05D4 \u05E2\u05DC \u05D1\u05E1\u05D9\u05E1 \u05DE\u05E8\u05D7\u05E7 \u05D0\u05D5\u05D5\u05D9\u05E8\u05D9 \u00D7 1.35. \u05D6\u05DE\u05E0\u05D9 \u05E0\u05E1\u05D9\u05E2\u05D4 \u05D1\u05E4\u05D5\u05E2\u05DC \u05EA\u05DC\u05D5\u05D9\u05D9\u05DD \u05D1\u05EA\u05E0\u05D5\u05E2\u05D4 \u05D5\u05D1\u05E0\u05EA\u05D9\u05D1.</Disclaimer>
          </CommutePanel>
        )
      })()}
    </>
  )
}
