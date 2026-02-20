import { MapContainer, TileLayer, Polygon, Popup, Tooltip, Marker, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { Heart, Phone, Eye } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels, fmt, p, roi, calcScore, getGrade, plotCenter } from '../utils'
import { usePrefetchPlot } from '../hooks'
import type { Plot, Poi } from '../types'

// ── URL Hash Sync ──
function MapUrlSync() {
  const map = useMap()
  const ready = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const hash = window.location.hash
    const m = hash.match(/#map=(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/)
    if (m) {
      const [, z, la, ln] = m.map(Number)
      if (isFinite(z) && isFinite(la) && isFinite(ln)) map.setView([la, ln], z, { animate: false })
    }
    const t = setTimeout(() => { ready.current = true }, 2000)
    return () => clearTimeout(t)
  }, [map])

  useEffect(() => {
    const update = () => {
      if (!ready.current) return
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        const c = map.getCenter()
        const h = `#map=${map.getZoom()}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}`
        if (window.location.hash !== h) window.history.replaceState(null, '', h)
      }, 600)
    }
    map.on('moveend', update).on('zoomend', update)
    return () => { map.off('moveend', update).off('zoomend', update); if (timer.current) clearTimeout(timer.current) }
  }, [map])

  return null
}

// ── Fly to Selected ──
function FlyTo({ plot }: { plot: Plot | null }) {
  const map = useMap()
  useEffect(() => {
    if (!plot?.coordinates?.length) return
    const center = plotCenter(plot.coordinates)
    if (center) map.flyTo([center.lat, center.lng], 15, { duration: 1 })
  }, [plot, map])
  return null
}

// ── Auto Fit Bounds ──
function AutoFit({ plots }: { plots: Plot[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || !plots.length) return
    const coords: [number, number][] = []
    plots.forEach(pl => pl.coordinates?.forEach(c => {
      if (c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) coords.push(c)
    }))
    if (coords.length < 2) return
    const bounds = L.latLngBounds(coords)
    if (bounds.isValid()) { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true }); fitted.current = true }
  }, [plots, map])
  return null
}

// ── City Filter Bounds ──
function CityBounds({ plots }: { plots: Plot[] }) {
  const map = useMap()
  const prevHash = useRef<string>('')
  const init = useRef(false)

  useEffect(() => {
    if (!plots.length) return
    const hash = [...new Set(plots.map(pp => pp.city).filter(Boolean))].sort().join(',')
    if (!init.current) { prevHash.current = hash; init.current = true; return }
    if (hash === prevHash.current) return
    prevHash.current = hash
    const coords: [number, number][] = []
    plots.forEach(pl => pl.coordinates?.forEach(c => {
      if (c.length >= 2 && isFinite(c[0]) && isFinite(c[1])) coords.push(c)
    }))
    if (coords.length < 2) return
    const bounds = L.latLngBounds(coords)
    if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 15, duration: 1 })
  }, [plots, map])

  return null
}

// ── Polygon Tooltip ──
function PriceTooltip({ plot }: { plot: Plot }) {
  const { price } = p(plot)
  const score = calcScore(plot)
  const grade = getGrade(score)
  return (
    <Tooltip className="price-tooltip" permanent direction="center" offset={[0, 0]}>
      <span>{fmt.short(price)}</span>
      <span style={{ fontSize: 8, color: grade.color, fontWeight: 800 }}>{grade.grade}</span>
    </Tooltip>
  )
}

// ── Popup Content ──
function PlotPopup({ plot, onLead, onFav, isFav }: { plot: Plot; onLead: () => void; onFav: () => void; isFav: boolean }) {
  const d = p(plot)
  const plotRoi = roi(plot)
  const status = plot.status || 'AVAILABLE'
  const color = statusColors[status] || '#10B981'

  return (
    <div className="plot-popup">
      <div className="plot-popup-header">
        <span className="plot-popup-title">גוש {d.block} | חלקה {plot.number}</span>
        <span className="plot-popup-status" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
          {statusLabels[status] || status}
        </span>
      </div>
      <div className="plot-popup-row">
        <span className="plot-popup-label">מחיר</span>
        <span className="plot-popup-value gold">{fmt.price(d.price)}</span>
      </div>
      <div className="plot-popup-row">
        <span className="plot-popup-label">שטח</span>
        <span className="plot-popup-value">{fmt.dunam(d.size)} דונם</span>
      </div>
      <div className="plot-popup-row">
        <span className="plot-popup-label">תשואה צפויה</span>
        <span className="plot-popup-value" style={{ color: '#10B981' }}>+{fmt.pct(plotRoi)}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button className="plot-popup-cta" onClick={onLead}><Phone size={13} /> קבל פרטים</button>
        <button
          onClick={onFav}
          style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 8,
            border: `1px solid ${isFav ? '#EF444440' : 'rgba(212,168,75,0.2)'}`,
            background: isFav ? '#EF444418' : 'rgba(212,168,75,0.06)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Heart size={14} fill={isFav ? '#EF4444' : 'none'} color={isFav ? '#EF4444' : '#94A3B8'} />
        </button>
      </div>
    </div>
  )
}

// ── POI Markers ──
function PoiMarkers({ pois }: { pois: Poi[] }) {
  return (
    <>
      {pois.map(poi => {
        const icon = L.divIcon({
          className: 'poi-marker',
          html: `<div class="poi-marker-inner"><span class="poi-marker-emoji">${(poi as any).icon || '📍'}</span><span class="poi-marker-label">${poi.name}</span></div>`,
          iconSize: [60, 40],
          iconAnchor: [30, 20],
        })
        return <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icon} />
      })}
    </>
  )
}

// ── Main Map Component ──
interface MapProps {
  plots: Plot[]
  pois: Poi[]
  selected: Plot | null
  onSelect: (plot: Plot) => void
  onLead: (plot: Plot) => void
  favorites: { isFav: (id: string) => boolean; toggle: (id: string) => void }
}

function MapArea({ plots, pois, selected, onSelect, onLead, favorites }: MapProps) {
  const prefetch = usePrefetchPlot()
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setUserLoc([pos.coords.latitude, pos.coords.longitude]),
      () => {}, { timeout: 8000, maximumAge: 300000 }
    )
  }, [])

  const userIcon = useMemo(() => L.divIcon({
    className: 'user-location-marker',
    html: '<div class="user-dot-outer"><div class="user-dot-inner"></div></div>',
    iconSize: [22, 22], iconAnchor: [11, 11],
  }), [])

  return (
    <MapContainer
      center={[32.35, 34.88]}
      zoom={10}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
      />

      <ZoomControl position="bottomright" />
      <MapUrlSync />
      <AutoFit plots={plots} />
      <CityBounds plots={plots} />
      <FlyTo plot={selected} />

      {plots.map(plot => {
        const coords = plot.coordinates
        if (!coords?.length) return null
        const status = plot.status || 'AVAILABLE'
        const color = statusColors[status] || '#10B981'
        const isSelected = selected?.id === plot.id

        return (
          <Polygon
            key={plot.id}
            positions={coords as [number, number][]}
            pathOptions={{
              color,
              weight: isSelected ? 3 : 2,
              fillColor: color,
              fillOpacity: isSelected ? 0.35 : 0.2,
            }}
            eventHandlers={{
              click: () => onSelect(plot),
              mouseover: () => prefetch(plot.id),
            }}
          >
            <PriceTooltip plot={plot} />
            <Popup>
              <PlotPopup
                plot={plot}
                onLead={() => onLead(plot)}
                onFav={() => favorites.toggle(plot.id)}
                isFav={favorites.isFav(plot.id)}
              />
            </Popup>
          </Polygon>
        )
      })}

      <PoiMarkers pois={pois} />

      {userLoc && <Marker position={userLoc} icon={userIcon} />}

      <div className="map-vignette" />
    </MapContainer>
  )
}

export default memo(MapArea)
