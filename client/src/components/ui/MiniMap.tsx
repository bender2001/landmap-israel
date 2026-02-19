import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { MapContainer, TileLayer, Polygon, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ExternalLink, Eye, Map as MapIcon } from 'lucide-react'
import { statusColors } from '../../utils/constants'
import { plotCenter as computeCenter } from '../../utils/geo'
import { theme } from '../../styles/theme'

type Coordinates = [number, number][]

interface MiniMapProps {
  coordinates?: Coordinates
  status?: string
  city?: string
  className?: string
  interactive?: boolean
  height?: string
  showStreetViewToggle?: boolean
}

const pinIcon = L.divIcon({
  className: 'mini-map-pin',
  html: '<div style="width:24px;height:24px;background:#C8942A;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center"><div style="width:6px;height:6px;background:#fff;border-radius:50%"></div></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const Wrapper = styled.div`
  position: relative;
  border-radius: ${theme.radii.xxl};
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
`

const Toggle = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 20;
  display: flex;
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(10px);
  border-radius: ${theme.radii.md};
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 500;
  background: ${({ $active }) => ($active ? 'rgba(200,148,42,0.2)' : 'transparent')};
  color: ${({ $active }) => ($active ? theme.colors.gold : theme.colors.slate[400])};
  border: none;
  cursor: pointer;
  transition: ${theme.transitions.normal};

  &:hover {
    color: ${theme.colors.slate[200]};
  }
`

const StreetViewFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: 0;
`

const StyledMap = styled(MapContainer)`
  height: 100%;
  width: 100%;
  background: ${theme.colors.navy};
`

const OverlayGradient = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(10, 22, 40, 0.6), transparent 60%);
`

const NavLinks = styled.div`
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: ${theme.transitions.normal};

  ${Wrapper}:hover & {
    opacity: 1;
  }
`

const NavLink = styled.a<{ $accent?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${theme.radii.lg};
  font-size: 11px;
  color: ${theme.colors.slate[300]};
  transition: ${theme.transitions.normal};

  &:hover {
    border-color: ${({ $accent }) => ($accent ? `${$accent}30` : `${theme.colors.gold}30`)};
    color: ${({ $accent }) => $accent || theme.colors.gold};
  }
`

const CityBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  padding: 4px 10px;
  background: rgba(10, 22, 40, 0.7);
  backdrop-filter: blur(10px);
  border-radius: ${theme.radii.md};
  font-size: 11px;
  color: ${theme.colors.slate[300]};
  border: 1px solid rgba(255, 255, 255, 0.1);
`

const FitBounds = ({ bounds }: { bounds: L.LatLngBounds | null }) => {
  const map = useMap()
  useMemo(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16, animate: false })
    }
  }, [bounds, map])
  return null
}

export default function MiniMap({
  coordinates,
  status,
  city,
  className = '',
  interactive = false,
  height = '200px',
  showStreetViewToggle = false,
}: MiniMapProps) {
  const [viewMode, setViewMode] = useState<'map' | 'streetview'>('map')

  const validCoords = useMemo(() => {
    if (!coordinates || !Array.isArray(coordinates)) return []
    return coordinates.filter(
      c => Array.isArray(c) && c.length >= 2 && isFinite(c[0]) && isFinite(c[1])
    )
  }, [coordinates])

  const center = useMemo<[number, number]>(() => {
    const c = computeCenter(coordinates || [])
    return c ? [c.lat, c.lng] : [32.45, 34.87]
  }, [coordinates])

  const bounds = useMemo(() => {
    if (validCoords.length < 2) return null
    return L.latLngBounds(validCoords)
  }, [validCoords])

  const color = statusColors[status || ''] || theme.colors.gold

  if (validCoords.length === 0) return null

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${center[0]},${center[1]}`
  const streetViewEmbedUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${center[0]},${center[1]}&cbp=11,0,0,0,0&ie=UTF8&source=embed&output=svembed`

  return (
    <Wrapper className={className} style={{ height }}>
      {showStreetViewToggle && (
        <Toggle>
          <ToggleButton $active={viewMode === 'map'} onClick={() => setViewMode('map')} title="מפה">
            <MapIcon size={12} />
            מפה
          </ToggleButton>
          <ToggleButton
            $active={viewMode === 'streetview'}
            onClick={() => setViewMode('streetview')}
            title="Street View"
          >
            <Eye size={12} />
            רחוב
          </ToggleButton>
        </Toggle>
      )}

      {viewMode === 'streetview' && showStreetViewToggle ? (
        <StreetViewFrame
          src={streetViewEmbedUrl}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Street View"
        />
      ) : (
        <StyledMap
          center={center}
          zoom={15}
          zoomControl={false}
          dragging={interactive}
          touchZoom={interactive}
          doubleClickZoom={interactive}
          scrollWheelZoom={interactive}
          boxZoom={false}
          keyboard={false}
          attributionControl={false}
        >
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png" opacity={0.7} />
          {bounds && <FitBounds bounds={bounds} />}
          {validCoords.length >= 3 && (
            <Polygon
              positions={validCoords}
              pathOptions={{
                color: '#fff',
                fillColor: color,
                fillOpacity: 0.5,
                weight: 2,
              }}
            />
          )}
          <Marker position={center} icon={pinIcon} />
        </StyledMap>
      )}

      <OverlayGradient />

      <NavLinks>
        <NavLink href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} />
          מפה
        </NavLink>
        <NavLink
          href={`https://www.waze.com/ul?ll=${center[0]},${center[1]}&navigate=yes&zoom=17`}
          target="_blank"
          rel="noopener noreferrer"
          $accent="#33CCFF"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.54 6.63c-1.19-4.28-5.37-6.2-9.26-5.62C6.6 1.74 3.56 5.24 3.06 9.86c-.46 4.2 1.26 7.3 4.33 8.94.15.08.2.2.18.37-.04.47-.09.93-.14 1.4-.04.43.27.65.63.44.5-.29.98-.6 1.47-.9.16-.1.31-.12.49-.08.65.14 1.3.21 1.97.19 4.26-.12 8.24-3.19 9.12-7.49.3-1.47.28-2.9-.03-4.32z" />
          </svg>
          Waze
        </NavLink>
      </NavLinks>

      {city && <CityBadge>📍 {city}</CityBadge>}
    </Wrapper>
  )
}
