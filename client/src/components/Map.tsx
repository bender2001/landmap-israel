import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, Tooltip, Marker, CircleMarker, useMap, WMSTileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Heart, Phone, Layers, Map as MapIcon, Satellite, Mountain, GitCompareArrows, ExternalLink, Maximize2, Palette } from 'lucide-react'
import { statusColors, statusLabels, fmt, p, roi, calcScore, getGrade, plotCenter, pricePerSqm, pricePerDunam, zoningLabels, zoningPipeline, daysOnMarket } from '../utils'
import { usePrefetchPlot } from '../hooks'
import type { Plot, Poi } from '../types'
import { israelAreas } from '../data'
import { t } from '../theme'

// ── Color Modes ──
type ColorMode = 'status' | 'grade' | 'pps' | 'heatmap'

const GRADE_COLORS = [
  { grade: 'A+', color: '#10B981', label: 'מצוין+' },
  { grade: 'A', color: '#10B981', label: 'מצוין' },
  { grade: 'A-', color: '#4ADE80', label: 'טוב מאוד' },
  { grade: 'B+', color: '#84CC16', label: 'טוב' },
  { grade: 'B', color: '#F59E0B', label: 'סביר' },
  { grade: 'B-', color: '#F97316', label: 'מתחת לממוצע' },
  { grade: 'C', color: '#EF4444', label: 'חלש' },
]

const PPS_COLORS = [
  { min: 0, max: 500, color: '#10B981', label: 'עד ₪500' },
  { min: 500, max: 1000, color: '#4ADE80', label: '₪500–1K' },
  { min: 1000, max: 2000, color: '#84CC16', label: '₪1K–2K' },
  { min: 2000, max: 4000, color: '#F59E0B', label: '₪2K–4K' },
  { min: 4000, max: 8000, color: '#F97316', label: '₪4K–8K' },
  { min: 8000, max: Infinity, color: '#EF4444', label: '₪8K+' },
]

// ── Heatmap Gradient (low→high: green→yellow→red) ──
const HEATMAP_STOPS = [
  { pct: 0, r: 16, g: 185, b: 129 },   // #10B981 green
  { pct: 0.25, r: 74, g: 222, b: 128 }, // #4ADE80
  { pct: 0.5, r: 245, g: 158, b: 11 },  // #F59E0B yellow
  { pct: 0.75, r: 249, g: 115, b: 22 }, // #F97316 orange
  { pct: 1, r: 239, g: 68, b: 68 },     // #EF4444 red
]

function heatmapColor(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio))
  let lo = HEATMAP_STOPS[0], hi = HEATMAP_STOPS[HEATMAP_STOPS.length - 1]
  for (let i = 0; i < HEATMAP_STOPS.length - 1; i++) {
    if (t >= HEATMAP_STOPS[i].pct && t <= HEATMAP_STOPS[i + 1].pct) {
      lo = HEATMAP_STOPS[i]; hi = HEATMAP_STOPS[i + 1]; break
    }
  }
  const f = lo.pct === hi.pct ? 0 : (t - lo.pct) / (hi.pct - lo.pct)
  const r = Math.round(lo.r + (hi.r - lo.r) * f)
  const g = Math.round(lo.g + (hi.g - lo.g) * f)
  const b = Math.round(lo.b + (hi.b - lo.b) * f)
  return `rgb(${r},${g},${b})`
}

function getPolygonColor(plot: Plot, mode: ColorMode): string {
  if (mode === 'grade') {
    const score = calcScore(plot)
    return getGrade(score).color
  }
  if (mode === 'pps') {
    const pps = pricePerSqm(plot)
    if (pps <= 0) return '#64748B'
    const tier = PPS_COLORS.find(t => pps >= t.min && pps < t.max)
    return tier?.color || '#EF4444'
  }
  if (mode === 'heatmap') {
    return '#64748B' // polygon border only, circles handle color
  }
  return statusColors[plot.status || ''] || '#10B981'
}

const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  status: 'סטטוס',
  grade: 'ציון השקעה',
  pps: '₪/מ״ר',
  heatmap: 'מפת חום',
}

// ── Tile Configs ──
const TILES = [
  { id: 'voyager', label: 'מפה', icon: MapIcon, url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', attr: '&copy; CartoDB' },
  { id: 'satellite', label: 'לוויין', icon: Satellite, url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
  { id: 'dark', label: 'כהה', icon: Mountain, url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png', attr: '&copy; CartoDB' },
  { id: 'israel', label: 'ישראל', icon: Layers, url: 'https://israelhiking.osm.org.il/Hebrew/Tiles/{z}/{x}/{y}.png', attr: '&copy; Israel Hiking' },
] as const

// ── City-Aware Fit Bounds ──
function CityFitBounds({ plots, filterCity }: { plots: Plot[]; filterCity?: string }) {
  const map = useMap()
  const prevCity = useRef<string | undefined>(undefined)

  useEffect(() => {
    // Only re-fit when filterCity actually changes (not on initial mount)
    if (filterCity === prevCity.current) return
    prevCity.current = filterCity
    if (!filterCity || filterCity === 'all') return
    if (!plots.length) return

    const pts = plots.flatMap(pl =>
      (pl.coordinates || []).filter(c => c.length >= 2 && isFinite(c[0]) && isFinite(c[1]))
    )
    if (!pts.length) return
    const bounds = L.latLngBounds(pts.map(c => [c[0], c[1]] as [number, number]))
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 0.8 })
    }
  }, [plots, filterCity, map])

  return null
}

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
  filterCity?: string
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
const plotBoundsRef = { current: null as L.LatLngBounds | null }
function MapRefCapture() {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map])
  return null
}

// ── Track plot bounds (inside MapContainer) ──
function PlotBoundsTracker({ plots }: { plots: Plot[] }) {
  useEffect(() => {
    if (!plots.length) return
    const pts = plots.flatMap(pl => (pl.coordinates || []).filter(c => c.length >= 2 && isFinite(c[0]) && isFinite(c[1])))
    if (pts.length) {
      plotBoundsRef.current = L.latLngBounds(pts.map(c => [c[0], c[1]] as [number, number]))
    }
  }, [plots])
  return null
}

// ── Map Legend ──
function MapLegend({ colorMode, darkMode }: { colorMode: ColorMode; darkMode: boolean }) {
  if (colorMode === 'status') {
    const items = [
      { color: statusColors.AVAILABLE, label: 'זמין' },
      { color: statusColors.IN_PLANNING, label: 'בתכנון' },
      { color: statusColors.RESERVED, label: 'שמור' },
      { color: statusColors.SOLD, label: 'נמכר' },
    ]
    return (
      <div style={{
        position: 'absolute', bottom: 48, right: 16, zIndex: t.z.controls,
        background: darkMode ? 'rgba(11,17,32,0.92)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)', borderRadius: t.r.md,
        border: `1px solid ${darkMode ? t.border : t.lBorder}`,
        padding: '8px 12px', direction: 'rtl', boxShadow: t.sh.md,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: darkMode ? t.textDim : t.lTextSec, marginBottom: 6 }}>
          {COLOR_MODE_LABELS[colorMode]}
        </div>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: darkMode ? t.textSec : t.lTextSec }}>{item.label}</span>
          </div>
        ))}
      </div>
    )
  }

  if (colorMode === 'grade') {
    return (
      <div style={{
        position: 'absolute', bottom: 48, right: 16, zIndex: t.z.controls,
        background: darkMode ? 'rgba(11,17,32,0.92)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)', borderRadius: t.r.md,
        border: `1px solid ${darkMode ? t.border : t.lBorder}`,
        padding: '8px 12px', direction: 'rtl', boxShadow: t.sh.md,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: darkMode ? t.textDim : t.lTextSec, marginBottom: 6 }}>
          ציון השקעה
        </div>
        {GRADE_COLORS.filter((_, i) => i % 2 === 0 || i === GRADE_COLORS.length - 1).map(item => (
          <div key={item.grade} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.grade}</span>
            <span style={{ fontSize: 9, color: darkMode ? t.textDim : t.lTextSec }}>{item.label}</span>
          </div>
        ))}
      </div>
    )
  }

  // pps mode
  if (colorMode === 'pps') {
    return (
      <div style={{
        position: 'absolute', bottom: 48, right: 16, zIndex: t.z.controls,
        background: darkMode ? 'rgba(11,17,32,0.92)' : 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)', borderRadius: t.r.md,
        border: `1px solid ${darkMode ? t.border : t.lBorder}`,
        padding: '8px 12px', direction: 'rtl', boxShadow: t.sh.md,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: darkMode ? t.textDim : t.lTextSec, marginBottom: 6 }}>
          ₪/מ״ר
        </div>
        {PPS_COLORS.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: darkMode ? t.textSec : t.lTextSec }}>{item.label}</span>
          </div>
        ))}
      </div>
    )
  }

  // heatmap mode
  return (
    <div style={{
      position: 'absolute', bottom: 48, right: 16, zIndex: t.z.controls,
      background: darkMode ? 'rgba(11,17,32,0.92)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)', borderRadius: t.r.md,
      border: `1px solid ${darkMode ? t.border : t.lBorder}`,
      padding: '8px 12px', direction: 'rtl', boxShadow: t.sh.md,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: darkMode ? t.textDim : t.lTextSec, marginBottom: 6 }}>
        🔥 מפת חום — מחיר/מ״ר
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: darkMode ? t.textDim : t.lTextSec }}>נמוך</span>
        <div style={{
          flex: 1, height: 8, borderRadius: 4,
          background: 'linear-gradient(to left, #EF4444, #F97316, #F59E0B, #4ADE80, #10B981)',
        }} />
        <span style={{ fontSize: 9, color: darkMode ? t.textDim : t.lTextSec }}>גבוה</span>
      </div>
      <div style={{ fontSize: 9, color: darkMode ? t.textDim : t.lTextSec, textAlign: 'center' }}>
        גודל העיגול = שטח החלקה
      </div>
    </div>
  )
}

// ── Map Controls Column (Zoom + Layers) ──
function MapControls({ darkMode, tileIdx, setTileIdx, showCadastral, setShowCadastral, showAreas, setShowAreas, switcherOpen, setSwitcherOpen, colorMode, setColorMode }: {
  darkMode: boolean; tileIdx: number; setTileIdx: (i: number) => void
  showCadastral: boolean; setShowCadastral: (fn: (v: boolean) => boolean) => void
  showAreas: boolean; setShowAreas: (fn: (v: boolean) => boolean) => void
  switcherOpen: boolean; setSwitcherOpen: (v: boolean) => void
  colorMode: ColorMode; setColorMode: (mode: ColorMode) => void
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
      {/* Fit all plots */}
      <button
        onClick={() => {
          if (plotBoundsRef.current?.isValid() && mapRef.current) {
            mapRef.current.flyToBounds(plotBoundsRef.current, { padding: [60, 60], maxZoom: 14, duration: 0.8 })
          }
        }}
        style={{ ...btnStyle(darkMode), boxShadow: t.sh.md }}
        aria-label="הצג את כל החלקות"
        title="הצג הכל"
      >
        <Maximize2 size={16} />
      </button>

      {/* Zoom buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: t.r.md, overflow: 'hidden', boxShadow: t.sh.md }}>
        <button onClick={() => mapRef.current?.zoomIn()}
          style={{ ...btnStyle(darkMode), borderRadius: `${t.r.md} ${t.r.md} 0 0`, borderBottom: 'none' }} aria-label="הגדל">+</button>
        <button onClick={() => mapRef.current?.zoomOut()}
          style={{ ...btnStyle(darkMode), borderRadius: `0 0 ${t.r.md} ${t.r.md}` }} aria-label="הקטן">−</button>
      </div>

      {/* Color mode toggle */}
      <button
        onClick={() => {
          const modes: ColorMode[] = ['status', 'grade', 'pps', 'heatmap']
          const idx = modes.indexOf(colorMode)
          setColorMode(modes[(idx + 1) % modes.length])
        }}
        style={{
          ...btnStyle(darkMode), boxShadow: t.sh.md,
          position: 'relative',
        }}
        aria-label={`צביעה לפי: ${COLOR_MODE_LABELS[colorMode]}`}
        title={`צביעה: ${COLOR_MODE_LABELS[colorMode]}`}
      >
        <Palette size={16} />
        <span style={{
          position: 'absolute', top: -6, right: -6,
          fontSize: 8, fontWeight: 800, padding: '1px 5px',
          borderRadius: t.r.full, background: `linear-gradient(135deg,${t.gold},${t.goldBright})`,
          color: t.bg, lineHeight: '14px', whiteSpace: 'nowrap',
        }}>
          {colorMode === 'status' ? 'S' : colorMode === 'grade' ? 'A' : colorMode === 'pps' ? '₪' : '🔥'}
        </span>
      </button>

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

// ── Zoom Tracker ──
function ZoomTracker({ onChange }: { onChange: (z: number) => void }) {
  const map = useMap()
  useEffect(() => {
    onChange(map.getZoom())
    const handler = () => onChange(map.getZoom())
    map.on('zoomend', handler)
    return () => { map.off('zoomend', handler) }
  }, [map, onChange])
  return null
}

// ── Main Component ──
function MapArea({ plots, pois, selected, onSelect, onLead, favorites, compare, darkMode = false, filterCity }: MapProps) {
  const [tileIdx, setTileIdx] = useState(2) // default to dark tiles for cohesive dark UI
  const [showCadastral, setShowCadastral] = useState(false)
  const [showAreas, setShowAreas] = useState(true)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [colorMode, setColorMode] = useState<ColorMode>('grade')
  const prefetch = usePrefetchPlot()
  const [zoom, setZoom] = useState(13)
  const handleZoomChange = useCallback((z: number) => setZoom(z), [])

  const tile = TILES[tileIdx]
  const center = useMemo<[number, number]>(() => {
    if (selected) { const c = plotCenter(selected.coordinates); if (c) return [c.lat, c.lng] }
    return [32.44, 34.88]
  }, [selected])

  // Heatmap data: compute PPS range across all plots for color normalization
  const heatmapData = useMemo(() => {
    if (colorMode !== 'heatmap') return null
    const ppsList = plots.map(pl => ({ plot: pl, pps: pricePerSqm(pl), size: p(pl).size, center: plotCenter(pl.coordinates) }))
      .filter(d => d.pps > 0 && d.center)
    if (!ppsList.length) return null
    const minPps = Math.min(...ppsList.map(d => d.pps))
    const maxPps = Math.max(...ppsList.map(d => d.pps))
    const range = maxPps - minPps || 1
    const maxSize = Math.max(...ppsList.map(d => d.size))
    return ppsList.map(d => ({
      ...d,
      ratio: (d.pps - minPps) / range,
      // Radius: proportional to sqrt(area) for visual fairness, range 15-60
      radius: Math.max(15, Math.min(60, 15 + (Math.sqrt(d.size) / Math.sqrt(maxSize || 1)) * 45)),
    }))
  }, [plots, colorMode])

  const renderPopup = useCallback((plot: Plot) => {
    const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score), fav = favorites.isFav(plot.id), pps = pricePerSqm(plot), ppd = pricePerDunam(plot)
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
        <div className="plot-popup-row"><span className="plot-popup-label">שטח</span><span className="plot-popup-value">{fmt.dunam(d.size)} דונם ({fmt.num(d.size)} מ״ר)</span></div>
        {ppd > 0 && <div className="plot-popup-row"><span className="plot-popup-label">₪/דונם</span><span className="plot-popup-value">{fmt.num(ppd)}</span></div>}
        <div className="plot-popup-row"><span className="plot-popup-label">תשואה צפויה</span><span className="plot-popup-value gold">+{fmt.pct(r)}</span></div>
        <div className="plot-popup-row">
          <span className="plot-popup-label">ציון השקעה</span>
          <span className="plot-popup-value" style={{ color: grade.color, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', border: `2px solid ${grade.color}`, fontSize: 10, fontWeight: 800 }}>{score}</span>
            {grade.grade}
          </span>
        </div>
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
        <CityFitBounds plots={plots} filterCity={filterCity} />
        <UserLocation />
        <PlotBoundsTracker plots={plots} />
        <ZoomTracker onChange={handleZoomChange} />

        {/* Area divisions with price stats */}
        {showAreas && israelAreas.map(area => {
          const areaPlots = plots.filter(pl => {
            const c = plotCenter(pl.coordinates)
            if (!c) return false
            const [minLat, minLng] = area.bounds[0]
            const [maxLat, maxLng] = area.bounds[2]
            return c.lat >= minLat && c.lat <= maxLat && c.lng >= minLng && c.lng <= maxLng
          })
          const ppsList = areaPlots.map(pl => pricePerSqm(pl)).filter(v => v > 0)
          const avgPps = ppsList.length ? Math.round(ppsList.reduce((s, v) => s + v, 0) / ppsList.length) : 0
          return (
            <Polygon key={area.name} positions={area.bounds} pathOptions={{ color: area.color, weight: 1.5, fillColor: area.color, fillOpacity: 0.06, dashArray: '6 4' }}>
              <Tooltip permanent direction="center" className="price-tooltip">
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: area.color }}>{area.name}</span>
                  {avgPps > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.75 }}>
                      ₪{avgPps.toLocaleString()}/מ״ר
                    </span>
                  )}
                  {areaPlots.length > 0 && (
                    <span style={{ fontSize: 9, opacity: 0.45 }}>{areaPlots.length} חלקות</span>
                  )}
                </span>
              </Tooltip>
            </Polygon>
          )
        })}

        {/* Plot polygons */}
        {plots.map(plot => {
          if (!plot.coordinates?.length) return null
          const d = p(plot), color = getPolygonColor(plot, colorMode), isSel = selected?.id === plot.id
          const score = calcScore(plot), grade = getGrade(score)
          const zoningStage = zoningPipeline.find(z => z.key === d.zoning)
          return (
            <Polygon key={plot.id} positions={plot.coordinates} eventHandlers={{
              click: () => onSelect(plot),
              mouseover: () => prefetch(plot.id),
            }} pathOptions={{ color, weight: isSel ? 3.5 : 2, fillColor: color, fillOpacity: isSel ? 0.35 : 0.18 }}>
              <Tooltip className="price-tooltip plot-tooltip-rich" direction="top" offset={[0, -8]} opacity={1}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{fmt.short(d.price)}</span>
                    <span style={{ width: 1, height: 10, background: 'currentColor', opacity: 0.2 }} />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>{fmt.dunam(d.size)} ד׳</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: grade.color }}>{grade.grade}</span>
                  </span>
                  {zoningStage && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, opacity: 0.65 }}>
                      <span>{zoningStage.icon}</span>
                      <span>{zoningStage.label}</span>
                    </span>
                  )}
                </span>
              </Tooltip>
              <Popup maxWidth={280} minWidth={240}>{renderPopup(plot)}</Popup>
            </Polygon>
          )
        })}

        {/* Heatmap circle overlay */}
        {colorMode === 'heatmap' && heatmapData && heatmapData.map(d => (
          <CircleMarker
            key={`heat-${d.plot.id}`}
            center={[d.center!.lat, d.center!.lng]}
            radius={d.radius}
            pathOptions={{
              color: heatmapColor(d.ratio),
              weight: 1,
              fillColor: heatmapColor(d.ratio),
              fillOpacity: 0.45,
              opacity: 0.7,
            }}
            eventHandlers={{ click: () => onSelect(d.plot) }}
          >
            <Tooltip className="price-tooltip" direction="top" offset={[0, -8]} opacity={1}>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontWeight: 700 }}>₪{d.pps.toLocaleString()}/מ״ר</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{d.plot.city} · {fmt.dunam(d.size)} ד׳</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>{fmt.short(p(d.plot).price)}</span>
              </span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Permanent price labels at medium-high zoom */}
        {zoom >= 14 && plots.map(plot => {
          if (!plot.coordinates?.length) return null
          const c = plotCenter(plot.coordinates)
          if (!c) return null
          const d = p(plot), grade = getGrade(calcScore(plot))
          const icon = L.divIcon({
            className: 'plot-price-label',
            html: `<div class="ppl-inner"><span class="ppl-price">${fmt.short(d.price)}</span><span class="ppl-sep">·</span><span class="ppl-grade" style="color:${grade.color}">${grade.grade}</span></div>`,
            iconSize: [90, 28],
            iconAnchor: [45, 14],
          })
          return <Marker key={`price-${plot.id}`} position={[c.lat, c.lng]} icon={icon} interactive={false} />
        })}

        {/* New listing badges + hot deal badges */}
        {zoom >= 13 && plots.map(plot => {
          const dom = daysOnMarket(p(plot).created)
          const score = calcScore(plot)
          const isNew = dom && dom.days <= 7
          const isHot = score >= 9
          if (!isNew && !isHot) return null
          const c = plotCenter(plot.coordinates)
          if (!c) return null
          const label = isNew ? 'חדש ✨' : '🔥 HOT'
          const cls = isNew ? 'pnb-inner' : 'pnb-inner pnb-hot'
          const icon = L.divIcon({
            className: 'plot-new-badge',
            html: `<div class="${cls}">${label}</div>`,
            iconSize: [52, 20],
            iconAnchor: [26, 32],
          })
          return <Marker key={`badge-${plot.id}`} position={[c.lat, c.lng]} icon={icon} interactive={false} />
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

      {/* Map Legend */}
      <MapLegend colorMode={colorMode} darkMode={darkMode} />

      {/* Map Controls Column: Zoom + Layers */}
      <MapControls darkMode={darkMode} tileIdx={tileIdx} setTileIdx={setTileIdx}
        showCadastral={showCadastral} setShowCadastral={setShowCadastral}
        showAreas={showAreas} setShowAreas={setShowAreas}
        switcherOpen={switcherOpen} setSwitcherOpen={setSwitcherOpen}
        colorMode={colorMode} setColorMode={setColorMode} />
    </div>
  )
}

export default memo(MapArea)
