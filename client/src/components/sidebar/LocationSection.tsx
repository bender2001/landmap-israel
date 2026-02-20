/**
 * LocationSection - Distance chips, commute times, nearby POIs, external map links
 */
import { useMemo } from 'react'
import styled from 'styled-components'
import { Waves, TreePine, Hospital, MapPin, Navigation, ExternalLink, Eye, FileText } from 'lucide-react'
import { DistanceChip, IconBox } from '../ds'
import { plotCenter, calcCommuteTimes, calcPlotPerimeter } from '../../utils/geo'
import { useNearbyPois } from '../../hooks/usePlots'
import { SectionWrap } from '../ds'
import { theme as themeTokens } from '../../styles/theme'
import { CardLift } from '../../styles/shared'
import { SkeletonPulse, StaggerIn } from './shared'

/* ── Styled ────────────────────────────────────────────────── */

const ExternalLinkChip = styled.a<{ $borderColor: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(to right, rgba(10,22,40,0.5), rgba(10,22,40,0.6));
  border: 1px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 8px 16px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.slate[300]};
  text-decoration: none;
  transition: border-color 0.2s ease;
  ${CardLift}
  &:hover { border-color: rgba(200, 148, 42, 0.3); }
`

const CommuteLink = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.lg};
  text-decoration: none;
  transition: all 0.2s;
  &:hover { border-color: rgba(200, 148, 42, 0.2); background: rgba(255, 255, 255, 0.04); }
`

const CommuteExtIcon = styled(ExternalLink)`
  width: 10px;
  height: 10px;
  color: ${({ theme }) => theme.colors.slate[600]};
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.2s;
`

const PoiCategoryCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 12px;
`

const POI_CATEGORY_CONFIG: Record<string, any> = {
  'school': { emoji: '🏫', label: 'חינוך', color: '#3B82F6' },
  'education': { emoji: '🏫', label: 'חינוך', color: '#3B82F6' },
  'transit': { emoji: '🚌', label: 'תחבורה', color: '#8B5CF6' },
  'bus': { emoji: '🚌', label: 'תחבורה', color: '#8B5CF6' },
  'train': { emoji: '🚆', label: 'רכבת', color: '#8B5CF6' },
  'park': { emoji: '🌳', label: 'פארקים', color: '#22C55E' },
  'hospital': { emoji: '🏥', label: 'בריאות', color: '#EF4444' },
  'health': { emoji: '🏥', label: 'בריאות', color: '#EF4444' },
  'shopping': { emoji: '🛒', label: 'קניות', color: '#F59E0B' },
  'commercial': { emoji: '🏬', label: 'מסחרי', color: '#F59E0B' },
  'synagogue': { emoji: '🕍', label: 'בתי כנסת', color: '#C8942A' },
  'restaurant': { emoji: '🍽️', label: 'מסעדות', color: '#F97316' },
  'sport': { emoji: '\u26BD', label: 'ספורט', color: '#06B6D4' },
  'government': { emoji: '🏛️', label: 'ממשלתי', color: '#64748B' },
}

/* ── Commute times sub-component ───────────────────────────── */

function CommuteTimesSection({ coordinates }: { coordinates: any[] }) {
  const commutes = useMemo(() => {
    const center = plotCenter(coordinates)
    if (!center) return []
    return calcCommuteTimes(center.lat, center.lng)
  }, [coordinates])

  if (commutes.length === 0) return null

  const getTimeColor = (min: number) => { if (min <= 30) return '#22C55E'; if (min <= 60) return '#EAB308'; if (min <= 90) return '#F97316'; return '#EF4444' }
  const formatTime = (min: number) => { if (min < 60) return `${min} דק׳`; const h = Math.floor(min / 60); const m = min % 60; return m > 0 ? `${h} שע׳ ${m} דק׳` : `${h} שע׳` }

  return (
    <SectionWrap style={{ marginTop: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Navigation style={{ width: 14, height: 14, color: themeTokens.colors.gold }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: themeTokens.colors.slate[200] }}>זמני נסיעה משוערים</span>
        <span style={{ fontSize: 9, color: themeTokens.colors.slate[600], marginRight: 'auto' }}>🚗 ממוצע</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {commutes.slice(0, 6).map((c: any) => (
          <CommuteLink key={c.city} href={c.googleMapsUrl} target="_blank" rel="noopener noreferrer" title={`~${c.distanceKm} ק״מ`}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{c.emoji}</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 10, color: themeTokens.colors.slate[400], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.city}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: getTimeColor(c.drivingMinutes) }}>{formatTime(c.drivingMinutes)}</span>
                <span style={{ fontSize: 8, color: themeTokens.colors.slate[600] }}>{c.distanceKm} ק״מ</span>
              </div>
            </div>
            <CommuteExtIcon />
          </CommuteLink>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 8, color: themeTokens.colors.slate[600], textAlign: 'center' }}>* הערכה בלבד — זמני נסיעה משתנים לפי תנועה ומסלול</div>
    </SectionWrap>
  )
}

/* ── Nearby POIs sub-component ─────────────────────────────── */

function NearbyPoisSection({ plotId }: { plotId: string }) {
  const { data, isLoading } = useNearbyPois(plotId)
  const pois = data?.pois || []
  const categories = data?.categories || {}

  if (isLoading) {
    return (
      <div style={{ marginTop: 16, padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <SkeletonPulse $w="16px" $h="16px" $rounded="9999px" />
          <SkeletonPulse $w="96px" $h="12px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <SkeletonPulse key={i} $h="32px" $rounded="8px" />)}
        </div>
      </div>
    )
  }

  if (!pois || pois.length === 0) return null

  const groupedEntries = Object.entries(categories)
    .map(([cat, items]: [string, any]) => {
      const config = POI_CATEGORY_CONFIG[cat.toLowerCase()] || { emoji: '📍', label: cat, color: '#94A3B8' }
      return { key: cat, config, items: items.slice(0, 3) }
    })
    .sort((a: any, b: any) => b.items.length - a.items.length)
    .slice(0, 6)

  return (
    <div style={{ marginTop: 16 }} dir="rtl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <IconBox $bg="rgba(59,130,246,0.15)" $size={28}><MapPin style={{ width: 14, height: 14, color: '#60A5FA' }} /></IconBox>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: themeTokens.colors.slate[200], margin: 0 }}>מה בסביבה</h4>
        <span style={{ fontSize: 10, color: themeTokens.colors.slate[500], marginRight: 'auto' }}>{pois.length} נקודות עניין</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groupedEntries.map(({ key, config, items }: any) => (
          <PoiCategoryCard key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{config.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: config.color }}>{config.label}</span>
              <span style={{ fontSize: 9, color: themeTokens.colors.slate[600] }}>({items.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((poi: any, i: number) => (
                <div key={poi.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, gap: 8 }}>
                  <span style={{ color: themeTokens.colors.slate[400], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{poi.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {poi.walk_min && poi.walk_min <= 30 && <span style={{ fontSize: 9, color: 'rgba(52,211,153,0.8)', whiteSpace: 'nowrap' }}>🚶{poi.walk_label}</span>}
                    {poi.walk_min && poi.walk_min > 30 && poi.drive_min && <span style={{ fontSize: 9, color: 'rgba(96,165,250,0.8)', whiteSpace: 'nowrap' }}>🚗{poi.drive_label}</span>}
                    <span style={{ color: themeTokens.colors.slate[600], fontWeight: 500, whiteSpace: 'nowrap', fontSize: 10 }}>{poi.distance_m < 1000 ? `${poi.distance_m}מ׳` : `${poi.distance_km}ק״מ`}</span>
                  </div>
                </div>
              ))}
            </div>
          </PoiCategoryCard>
        ))}
      </div>
      {pois.length > 0 && data?.plotCenter && (
        <a href={`https://www.google.com/maps/search/nearby+amenities/@${data.plotCenter.lat},${data.plotCenter.lng},15z`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: '8px 0', fontSize: 10, color: themeTokens.colors.slate[500], textDecoration: 'none' }}>
          <ExternalLink style={{ width: 12, height: 12 }} /><span>הצג ב-Google Maps</span>
        </a>
      )}
    </div>
  )
}

/* ── Main export ───────────────────────────────────────────── */

interface LocationSectionProps {
  plot: any
  distanceToSea: number | undefined
  distanceToPark: number | undefined
  distanceToHospital: number | undefined
  blockNumber: string
}

export default function LocationSection({ plot, distanceToSea, distanceToPark, distanceToHospital, blockNumber }: LocationSectionProps) {
  const center = plotCenter(plot.coordinates)
  const perimeter = useMemo(() => calcPlotPerimeter(plot.coordinates), [plot.coordinates])

  return (
    <>
      {/* Distance chips */}
      <StaggerIn $delay={3} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        {perimeter && (
          <DistanceChip $borderColor="rgba(200,148,42,0.15)" title={`היקף: ${perimeter.toLocaleString()} מטר`}>
            <IconBox $bg="rgba(200,148,42,0.15)" $size={24}><span style={{ color: themeTokens.colors.gold, fontSize: 11 }}>📐</span></IconBox>
            היקף: {perimeter >= 1000 ? `${(perimeter / 1000).toFixed(1)} ק״מ` : `${perimeter} מ׳`}
          </DistanceChip>
        )}
        {distanceToSea != null && (
          <DistanceChip $borderColor="rgba(59,130,246,0.15)"><IconBox $bg="rgba(59,130,246,0.15)" $size={24}><Waves style={{ width: 14, height: 14, color: '#60A5FA' }} /></IconBox>{distanceToSea} מ׳ מהים</DistanceChip>
        )}
        {distanceToPark != null && (
          <DistanceChip $borderColor="rgba(34,197,94,0.15)"><IconBox $bg="rgba(34,197,94,0.15)" $size={24}><TreePine style={{ width: 14, height: 14, color: '#4ADE80' }} /></IconBox>{distanceToPark} מ׳ מפארק</DistanceChip>
        )}
        {distanceToHospital != null && (
          <DistanceChip $borderColor="rgba(239,68,68,0.15)"><IconBox $bg="rgba(239,68,68,0.15)" $size={24}><Hospital style={{ width: 14, height: 14, color: '#F87171' }} /></IconBox>{distanceToHospital} מ׳ מבי&quot;ח</DistanceChip>
        )}
      </StaggerIn>

      {/* External Map Links */}
      {center && (
        <StaggerIn $delay={3} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <ExternalLinkChip $borderColor="rgba(234,179,8,0.15)" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center.lat},${center.lng}`} target="_blank" rel="noopener noreferrer">
            <IconBox $bg="rgba(234,179,8,0.15)" $size={24}><Eye style={{ width: 14, height: 14, color: '#FACC15' }} /></IconBox>Street View<ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
          </ExternalLinkChip>
          <ExternalLinkChip $borderColor="rgba(59,130,246,0.15)" href={`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`} target="_blank" rel="noopener noreferrer">
            <IconBox $bg="rgba(59,130,246,0.15)" $size={24}><MapPin style={{ width: 14, height: 14, color: '#60A5FA' }} /></IconBox>Google Maps<ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
          </ExternalLinkChip>
          <ExternalLinkChip $borderColor="rgba(6,182,212,0.15)" href={`https://www.waze.com/ul?ll=${center.lat},${center.lng}&navigate=yes`} target="_blank" rel="noopener noreferrer">
            <IconBox $bg="rgba(6,182,212,0.15)" $size={24}><Navigation style={{ width: 14, height: 14, color: '#22D3EE' }} /></IconBox>Waze<ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
          </ExternalLinkChip>
        </StaggerIn>
      )}

      {/* Government Registry Links */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <ExternalLinkChip $borderColor="rgba(99,102,241,0.15)" href="https://www.gov.il/he/departments/topics/tabu-online" target="_blank" rel="noopener noreferrer">
          <IconBox $bg="rgba(99,102,241,0.15)" $size={24}><FileText style={{ width: 14, height: 14, color: '#818CF8' }} /></IconBox>טאבו (גוש {blockNumber})<ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
        </ExternalLinkChip>
        <ExternalLinkChip $borderColor="rgba(20,184,166,0.15)" href="https://ims.gov.il/he/LandRegistration" target="_blank" rel="noopener noreferrer">
          <IconBox $bg="rgba(20,184,166,0.15)" $size={24}><MapPin style={{ width: 14, height: 14, color: '#2DD4BF' }} /></IconBox>מנהל מקרקעין<ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
        </ExternalLinkChip>
        <ExternalLinkChip $borderColor="rgba(245,158,11,0.15)" href={`https://www.govmap.gov.il/?lat=${(center?.lat ?? 32.45).toFixed(5)}&lon=${(center?.lng ?? 34.87).toFixed(5)}&z=15`} target="_blank" rel="noopener noreferrer">
          <IconBox $bg="rgba(245,158,11,0.15)" $size={24}><MapPin style={{ width: 14, height: 14, color: '#FBBF24' }} /></IconBox>GovMap<ExternalLink style={{ width: 10, height: 10, color: themeTokens.colors.slate[500] }} />
        </ExternalLinkChip>
      </div>

      {/* POIs */}
      <div id="section-nearby-pois">
        <NearbyPoisSection plotId={plot.id} />
      </div>

      {/* Commute Times */}
      {plot.coordinates && plot.coordinates.length >= 3 && (
        <CommuteTimesSection coordinates={plot.coordinates} />
      )}
    </>
  )
}
