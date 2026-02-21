import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, Tooltip, Marker, useMap, WMSTileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Heart, Phone, Layers, Map as MapIcon, Satellite, Mountain, GitCompareArrows, ExternalLink } from 'lucide-react'
import { statusColors, statusLabels, fmt, p, roi, calcScore, getGrade, plotCenter, pricePerSqm, zoningLabels } from '../utils'
import { usePrefetchPlot } from '../hooks'
import type { Plot, Poi } from '../types'
import { israelAreas } from '../data'
import { t } from '../theme'

// ── Tile Configs ──
const TILES = [
  { id: 'voyager', label: 'מפה', icon: MapIcon, url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', attr: '&copy; CartoDB' },
  { id: 'satellite', label: 'לוויין', icon: Satellite, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
  { id: 'dark', label: 'כהה', icon: Mountain, url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', attr: '&copy; CartoDB' },
  { id: 'israel', label: 'ישראל', icon: Layers, url: 'https://israelhiking.osm.org.il/Hebrew/Tiles/{z}/{x}/{y}.png', attr: '&copy; Israel Hiking' },
] as const

// ── Props ──
interface MapProps {
  plots: Plot[]
  pois: Poi[]
  selected: Plot | null
  onSelect: (plot: Plot) => void
  onLead: (plot: Plot) => void
  favorites: { isFav: (id: string) => boolean; toggle: (id: string) => void }
  compare?: { has: (id: string) => boolean; toggle: (id: string) => void }
  darkMode?: boolean
}

// ── URL Sync ──
function MapUrlSync() {
  const map = useMap()
  useEffect(() => {
    const restore = () => {
      const h = window.location.hash.replace('#', '').split('/')
      if (h.length >= 3) map.setView([+h[0], +h[1]], +h[2])
    }
    restore()
    const save = () => {
      const c = map.getCenter(), z = map.getZoom()
      window.history.replaceState(null, '', `#${c.lat.toFixed(4)}/${c.lng.toFixed(4)}/${z}`)
    }
    map.on('moveend', save)
    return () => { map.off('moveend', save) }
  }, [map])
  return null
}

// ── Fly to Selected ──
function FlyToSelected({ plot }: { plot: Plot | null }) {
  const map = useMap()
  useEffect(() => {
    if (!plot) return
    const c = plotCenter(plot.coordinates)
    if (c) map.flyTo([c.lat, c.lng], Math.max(map.getZoom(), 15), { duration: 0.8 })
  }, [plot, map])
  return null
}

// ── Auto Fit Bounds ──
function AutoFitBounds({ plots }: { plots: Plot[] }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || !plots.length) return
    const pts = plots.flatMap(pl => (pl.coordinates || []).filter(c => c.length >= 2 && isFinite(c[0]) && isFinite(c[1])))
    if (!pts.length) return
    const bounds = L.latLngBounds(pts.map(c => [c[0], c[1]] as [number, number]))
    if (bounds.isValid()) { map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 }); done.current = true }
  }, [plots, map])
  return null
}

// ── User Location ──
function UserLocation() {
  const map = useMap()
  const [pos, setPos] = useState<[number, number] | null>(null)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setPos([p.coords.latitude, p.coords.longitude]),
      () => {}, { enableHighAccuracy: false, timeout: 8000 }
    )
  }, [])
  if (!pos) return null
  const icon = L.divIcon({ className: 'user-location-marker', html: '<div class="user-dot-outer"><div class="user-dot-inner"></div></div>', iconSize: [22, 22] })
  return <Marker position={pos} icon={icon} />
}

// ── POI Icons ──
const poiIcon = (emoji: string) => L.divIcon({
  className: 'poi-marker', iconSize: [32, 40], iconAnchor: [16, 40],
  html: `<div class="poi-marker-inner"><span class="poi-marker-emoji">${emoji}</span></div>`,
})

// ── Map ref for external zoom control ──
const mapRef = { current: null as L.Map | null }
function MapRefCapture() {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map])
  return null
}

// ── Map Controls Column (Zoom + Layers) ──
function MapControls({ darkMode, tileIdx, setTileIdx, showCadastral, setShowCadastral, showAreas, setShowAreas, switcherOpen, setSwitcherOpen }: {
  darkMode: boolean; tileIdx: number; setTileIdx: (i: number) => void
  showCadastral: boolean; setShowCadastral: (fn: (v: boolean) => boolean) => void
  showAreas: boolean; setShowAreas: (fn: (v: boolean) => boolean) => void
  switcherOpen: boolean; setSwitcherOpen: (v: boolean) => void
}) {
  const btnStyle = (darkMode: boolean): React.CSSProperties => ({
    width: 40, height: 40, border: `1px solid ${darkMode ? t.goldBorder : t.lBorder}`,
    borderRadius: t.r.md, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: darkMode ? 'rgba(11,17,32,0.88)' : 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)', color: darkMode ? t.gold : t.lText,
    fontSize: 18, fontWeight: 700, transition: `all ${t.tr}`, fontFamily: t.font,
  })

  return (
    <div style={{ position: 'absolute', bottom: 24, left: 16, zIndex: t.z.controls, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Zoom buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: t.r.md, overflow: 'hidden', boxShadow: t.sh.md }}>
        <button onClick={() => mapRef.current?.zoomIn()}
          style={{ ...btnStyle(darkMode), borderRadius: `${t.r.md} ${t.r.md} 0 0`, borderBottom: 'none' }} aria-label="הגדל">+</button>
        <button onClick={() => mapRef.current?.zoomOut()}
          style={{ ...btnStyle(darkMode), borderRadius: `0 0 ${t.r.md} ${t.r.md}` }} aria-label="הקטן">−</button>
      </div>

      {/* Layer button */}
      <div style={{
        borderRadius: t.r.md, overflow: 'hidden', boxShadow: t.sh.md,
        background: darkMode ? 'rgba(11,17,32,0.88)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)', border: `1px solid ${darkMode ? t.goldBorder : t.lBorder}`,
        transition: `all ${t.tr}`,
      }}>
        {!switcherOpen ? (
          <button onClick={() => setSwitcherOpen(true)} style={{
            ...btnStyle(darkMode), border: 'none', background: 'transparent',
          }} aria-label="שכבות מפה">
            <Layers size={18} />
          </button>
        ) : (
          <div style={{ padding: 10, minWidth: 240 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: darkMode ? t.textSec : t.lTextSec }}>שכבות</span>
              <button onClick={() => setSwitcherOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: darkMode ? t.textDim : t.lTextSec, fontSize: 16 }}>&times;</button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {TILES.map((tl, i) => {
                const Icon = tl.icon; const active = i === tileIdx
                return (
                  <button key={tl.id} onClick={() => setTileIdx(i)} style={{
                    width: 52, height: 44, borderRadius: t.r.sm, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 2, transition: `all ${t.tr}`,
                    border: active ? `2px solid ${t.gold}` : `1px solid ${darkMode ? t.border : t.lBorder}`,
                    background: active ? t.goldDim : 'transparent', boxShadow: active ? t.sh.glow : 'none',
                  }}>
                    <Icon size={14} color={active ? t.gold : (darkMode ? t.textSec : t.lTextSec)} />
                    <span style={{ fontSize: 8, fontWeight: 600, color: active ? t.gold : (darkMode ? t.textDim : t.lTextSec) }}>{tl.label}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 2px', fontSize: 12, color: darkMode ? t.textSec : t.lTextSec, fontWeight: 500 }}>
                <input type="checkbox" checked={showCadastral} onChange={() => setShowCadastral((v: boolean) => !v)} style={{ accentColor: t.gold }} />
                גוש/חלקה
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 2px', fontSize: 12, color: darkMode ? t.textSec : t.lTextSec, fontWeight: 500 }}>
                <input type="checkbox" checked={showAreas} onChange={() => setShowAreas((v: boolean) => !v)} style={{ accentColor: t.gold }} />
                אזורים
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ──
function MapArea({ plots, pois, selected, onSelect, onLead, favorites, compare, darkMode = false }: MapProps) {
  const [tileIdx, setTileIdx] = useState(0)
  const [showCadastral, setShowCadastral] = useState(false)
  const [showAreas, setShowAreas] = useState(true)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const prefetch = usePrefetchPlot()

  const tile = TILES[tileIdx]
  const center = useMemo<[number, number]>(() => {
    if (selected) { const c = plotCenter(selected.coordinates); if (c) return [c.lat, c.lng] }
    return [32.44, 34.88]
  }, [selected])

  const renderPopup = useCallback((plot: Plot) => {
    const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score), fav = favorites.isFav(plot.id), pps = pricePerSqm(plot)
    const comp = compare?.has(plot.id)
    return (
      <div className="plot-popup">
        <div className="plot-popup-header">
          <span className="plot-popup-title">גוש {d.block} | חלקה {plot.number}</span>
          <span className="plot-popup-status" style={{ background: (statusColors[plot.status || ''] || '#888') + '20', color: statusColors[plot.status || ''] || '#888' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {statusLabels[plot.status || ''] || plot.status}
          </span>
        </div>
        <div className="plot-popup-row"><span className="plot-popup-label">מחיר</span><span className="plot-popup-value">{fmt.compact(d.price)}</span></div>
        <div className="plot-popup-row"><span className="plot-popup-label">שטח</span><span className="plot-popup-value">{fmt.dunam(d.size)} דונם</span></div>
        {pps > 0 && <div className="plot-popup-row"><span className="plot-popup-label">₪/מ״ר</span><span className="plot-popup-value">{fmt.num(pps)}</span></div>}
        <div className="plot-popup-row"><span className="plot-popup-label">תשואה צפויה</span><span className="plot-popup-value gold">+{fmt.pct(r)}</span></div>
        <div className="plot-popup-row"><span className="plot-popup-label">ציון השקעה</span><span className="plot-popup-value" style={{ color: grade.color }}>{grade.grade}</span></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="plot-popup-cta" style={{ flex: 1 }} onClick={() => onLead(plot)}>
            <Phone size={13} /> קבל פרטים
          </button>
          <a
            href={`/plot/${plot.id}`}
            onClick={(e) => { e.preventDefault(); window.location.href = `/plot/${plot.id}` }}
            style={{ width: 36, height: 36, border: `1px solid ${t.border}`, borderRadius: t.r.sm, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: `all ${t.tr}`, textDecoration: 'none' }}
            title="עמוד מלא"
          >
            <ExternalLink size={15} color={t.textDim} />
          </a>
          <button
            onClick={() => favorites.toggle(plot.id)}
            style={{ width: 36, height: 36, border: `1px solid ${fav ? t.gold : t.border}`, borderRadius: t.r.sm, background: fav ? t.goldDim : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: `all ${t.tr}` }}
          >
            <Heart size={16} fill={fav ? t.gold : 'none'} color={fav ? t.gold : t.textDim} />
          </button>
          {compare && (
            <button
              onClick={() => compare.toggle(plot.id)}
              style={{ width: 36, height: 36, border: `1px solid ${comp ? t.gold : t.border}`, borderRadius: t.r.sm, background: comp ? t.goldDim : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: `all ${t.tr}` }}
              title={comp ? 'הסר מהשוואה' : 'הוסף להשוואה'}
            >
              <GitCompareArrows size={15} color={comp ? t.gold : t.textDim} />
            </button>
          )}
        </div>
      </div>
    )
  }, [favorites, compare, onLead])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} className={darkMode ? 'dark' : ''}>
      <MapContainer center={center} zoom={13} zoomControl={false} style={{ width: '100%', height: '100%', zIndex: t.z.map }}
        attributionControl={false}>
        <TileLayer url={tile.url} attribution={tile.attr} maxZoom={19} />

        {showCadastral && (
          <WMSTileLayer url="https://open.govmap.gov.il/geoserver/opendata/wms" layers="opendata:PARCEL_ALL"
            transparent={true} format="image/png" opacity={0.5} />
        )}

        <MapRefCapture />
        <MapUrlSync />
        <FlyToSelected plot={selected} />
        <AutoFitBounds plots={plots} />
        <UserLocation />

        {/* Area divisions */}
        {showAreas && israelAreas.map(area => (
          <Polygon key={area.name} positions={area.bounds} pathOptions={{ color: area.color, weight: 1.5, fillColor: area.color, fillOpacity: 0.06, dashArray: '6 4' }}>
            <Tooltip permanent direction="center" className="price-tooltip">
              <span style={{ fontSize: 11, fontWeight: 700, color: area.color }}>{area.name}</span>
            </Tooltip>
          </Polygon>
        ))}

        {/* Plot polygons */}
        {plots.map(plot => {
          if (!plot.coordinates?.length) return null
          const d = p(plot), color = statusColors[plot.status || ''] || '#10B981', isSel = selected?.id === plot.id
          const score = calcScore(plot), grade = getGrade(score)
          return (
            <Polygon key={plot.id} positions={plot.coordinates} eventHandlers={{
              click: () => onSelect(plot),
              mouseover: () => prefetch(plot.id),
            }} pathOptions={{ color, weight: isSel ? 3.5 : 2, fillColor: color, fillOpacity: isSel ? 0.35 : 0.18 }}>
              <Tooltip className="price-tooltip plot-tooltip-rich" direction="top" offset={[0, -8]} opacity={1}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{fmt.short(d.price)}</span>
                  <span style={{ width: 1, height: 10, background: 'currentColor', opacity: 0.2 }} />
                  <span style={{ fontSize: 10, opacity: 0.7 }}>{fmt.dunam(d.size)} ד׳</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: grade.color }}>{grade.grade}</span>
                </span>
              </Tooltip>
              <Popup maxWidth={280} minWidth={240}>{renderPopup(plot)}</Popup>
            </Polygon>
          )
        })}

        {/* POI markers */}
        {pois.map(poi => (
          <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={poiIcon(poi.icon || '📍')}>
            <Tooltip className="price-tooltip">{poi.name}</Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* Vignette overlay */}
      <div className="map-vignette" />

      {/* Map Controls Column: Zoom + Layers */}
      <MapControls darkMode={darkMode} tileIdx={tileIdx} setTileIdx={setTileIdx}
        showCadastral={showCadastral} setShowCadastral={setShowCadastral}
        showAreas={showAreas} setShowAreas={setShowAreas}
        switcherOpen={switcherOpen} setSwitcherOpen={setSwitcherOpen} />
    </div>
  )
}

export default memo(MapArea)
