import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Polygon, Popup, Tooltip, Marker, CircleMarker, Polyline, useMap, useMapEvents, WMSTileLayer } from 'react-leaflet'
import L from 'leaflet'
import { Heart, Phone, Layers, Map as MapIcon, Satellite, Mountain, GitCompareArrows, ExternalLink, Maximize2, Minimize2, Palette, Ruler, Undo2, Trash2, LocateFixed, Copy, Check } from 'lucide-react'
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
  fullscreen?: boolean
  onToggleFullscreen?: () => void
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

// ── User Location (shared state for locate-me) ──
const userPosRef = { current: null as [number, number] | null }

function UserLocation() {
  const map = useMap()
  const [pos, setPos] = useState<[number, number] | null>(null)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => { const loc: [number, number] = [p.coords.latitude, p.coords.longitude]; setPos(loc); userPosRef.current = loc },
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

// ── Distance helpers ──
function haversineDistance(a: L.LatLng, b: L.LatLng): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (b.lat - a.lat) * (Math.PI / 180)
  const dLng = (b.lng - a.lng) * (Math.PI / 180)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * sinDLng * sinDLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} מ׳`
  return `${(meters / 1000).toFixed(2)} ק״מ`
}

// ── Ruler / Distance Measurement Tool (inside MapContainer) ──
function RulerTool({ active, darkMode, onPointsChange }: { active: boolean; darkMode: boolean; onPointsChange?: (count: number) => void }) {
  const map = useMap()
  const [points, setPoints] = useState<L.LatLng[]>([])
  const prevActive = useRef(active)

  // Clear points when deactivated
  useEffect(() => {
    if (prevActive.current && !active) { setPoints([]); onPointsChange?.(0) }
    prevActive.current = active
  }, [active, onPointsChange])

  // Change cursor when ruler is active
  useEffect(() => {
    const container = map.getContainer()
    if (active) {
      container.style.cursor = 'crosshair'
    } else {
      container.style.cursor = ''
    }
    return () => { container.style.cursor = '' }
  }, [active, map])

  // Handle map clicks in ruler mode
  useMapEvents({
    click(e) {
      if (!active) return
      setPoints(prev => {
        const next = [...prev, e.latlng]
        onPointsChange?.(next.length)
        return next
      })
    },
  })

  if (!active || points.length === 0) return null

  // Calculate segment and total distances
  const segments: { from: L.LatLng; to: L.LatLng; distance: number; midpoint: L.LatLng }[] = []
  let totalDistance = 0
  for (let i = 1; i < points.length; i++) {
    const d = haversineDistance(points[i - 1], points[i])
    totalDistance += d
    segments.push({
      from: points[i - 1],
      to: points[i],
      distance: d,
      midpoint: L.latLng(
        (points[i - 1].lat + points[i].lat) / 2,
        (points[i - 1].lng + points[i].lng) / 2,
      ),
    })
  }

  // Point markers
  const pointIcon = (idx: number, total: number) => L.divIcon({
    className: 'ruler-point-marker',
    html: `<div style="
      width:${idx === 0 ? 14 : 12}px;height:${idx === 0 ? 14 : 12}px;border-radius:50%;
      background:${idx === 0 ? '#D4A84B' : idx === total - 1 ? '#EF4444' : '#3B82F6'};
      border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);
      transform:translate(-50%,-50%);
    "></div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

  // Distance label icon for segment midpoints
  const distLabelIcon = (text: string) => L.divIcon({
    className: 'ruler-dist-label',
    html: `<div style="
      display:inline-flex;align-items:center;padding:3px 8px;
      background:${darkMode ? 'rgba(11,17,32,0.92)' : 'rgba(255,255,255,0.95)'};
      backdrop-filter:blur(8px);
      border:1px solid ${darkMode ? 'rgba(212,168,75,0.35)' : 'rgba(0,0,0,0.12)'};
      border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.25);
      font-size:11px;font-weight:700;color:${darkMode ? '#F0C75E' : '#1a1a2e'};
      font-family:'Heebo',sans-serif;white-space:nowrap;
      transform:translate(-50%,-50%);pointer-events:none;
    ">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

  // Total label icon (at last point)
  const totalLabelIcon = (text: string) => L.divIcon({
    className: 'ruler-total-label',
    html: `<div style="
      display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
      background:linear-gradient(135deg,#D4A84B,#F0C75E);
      border-radius:8px;box-shadow:0 3px 12px rgba(212,168,75,0.4);
      font-size:12px;font-weight:800;color:#0B1120;
      font-family:'Heebo',sans-serif;white-space:nowrap;
      transform:translate(-50%,8px);pointer-events:none;
    ">📏 ${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })

  return (
    <>
      {/* Measurement polyline */}
      <Polyline
        positions={points.map(p => [p.lat, p.lng] as [number, number])}
        pathOptions={{
          color: '#D4A84B',
          weight: 3,
          dashArray: '8 6',
          opacity: 0.9,
        }}
      />

      {/* Point markers */}
      {points.map((pt, i) => (
        <Marker key={`ruler-pt-${i}`} position={pt} icon={pointIcon(i, points.length)} interactive={false} />
      ))}

      {/* Segment distance labels */}
      {segments.map((seg, i) => (
        <Marker
          key={`ruler-seg-${i}`}
          position={seg.midpoint}
          icon={distLabelIcon(formatDistance(seg.distance))}
          interactive={false}
        />
      ))}

      {/* Total distance label at last point */}
      {points.length >= 2 && (
        <Marker
          position={points[points.length - 1]}
          icon={totalLabelIcon(`סה״כ: ${formatDistance(totalDistance)}`)}
          interactive={false}
        />
      )}
    </>
  )
}

// ── Map Legend ──
// Legend wrapper with responsive bottom positioning
function LegendBox({ darkMode, children }: { darkMode: boolean; children: React.ReactNode }) {
  return (
    <div className="map-legend-box" style={{
      position: 'absolute', bottom: 48, right: 16, zIndex: t.z.controls,
      background: darkMode ? 'rgba(11,17,32,0.92)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)', borderRadius: t.r.md,
      border: `1px solid ${darkMode ? t.border : t.lBorder}`,
      padding: '8px 12px', direction: 'rtl' as const, boxShadow: t.sh.md,
    }}>
      {children}
    </div>
  )
}

function MapLegend({ colorMode, darkMode }: { colorMode: ColorMode; darkMode: boolean }) {
  const labelColor = darkMode ? t.textDim : t.lTextSec
  const textColor = darkMode ? t.textSec : t.lTextSec

  if (colorMode === 'status') {
    const items = [
      { color: statusColors.AVAILABLE, label: 'זמין' },
      { color: statusColors.IN_PLANNING, label: 'בתכנון' },
      { color: statusColors.RESERVED, label: 'שמור' },
      { color: statusColors.SOLD, label: 'נמכר' },
    ]
    return (
      <LegendBox darkMode={darkMode}>
        <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, marginBottom: 6 }}>
          {COLOR_MODE_LABELS[colorMode]}
        </div>
        {items.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: textColor }}>{item.label}</span>
          </div>
        ))}
      </LegendBox>
    )
  }

  if (colorMode === 'grade') {
    return (
      <LegendBox darkMode={darkMode}>
        <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, marginBottom: 6 }}>
          ציון השקעה
        </div>
        {GRADE_COLORS.filter((_, i) => i % 2 === 0 || i === GRADE_COLORS.length - 1).map(item => (
          <div key={item.grade} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.grade}</span>
            <span style={{ fontSize: 9, color: labelColor }}>{item.label}</span>
          </div>
        ))}
      </LegendBox>
    )
  }

  if (colorMode === 'pps') {
    return (
      <LegendBox darkMode={darkMode}>
        <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, marginBottom: 6 }}>
          ₪/מ״ר
        </div>
        {PPS_COLORS.map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: textColor }}>{item.label}</span>
          </div>
        ))}
      </LegendBox>
    )
  }

  // heatmap mode
  return (
    <LegendBox darkMode={darkMode}>
      <div style={{ fontSize: 10, fontWeight: 700, color: labelColor, marginBottom: 6 }}>
        🔥 מפת חום — מחיר/מ״ר
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: labelColor }}>נמוך</span>
        <div style={{
          flex: 1, height: 8, borderRadius: 4,
          background: 'linear-gradient(to left, #EF4444, #F97316, #F59E0B, #4ADE80, #10B981)',
        }} />
        <span style={{ fontSize: 9, color: labelColor }}>גבוה</span>
      </div>
      <div style={{ fontSize: 9, color: labelColor, textAlign: 'center' }}>
        גודל העיגול = שטח החלקה
      </div>
    </LegendBox>
  )
}

// ── Map Controls Column (Zoom + Layers) ──
function MapControls({ darkMode, tileIdx, setTileIdx, showCadastral, setShowCadastral, showAreas, setShowAreas, switcherOpen, setSwitcherOpen, colorMode, setColorMode, fullscreen, onToggleFullscreen, rulerActive, onToggleRuler, onClearRuler, rulerPoints }: {
  darkMode: boolean; tileIdx: number; setTileIdx: (i: number) => void
  showCadastral: boolean; setShowCadastral: (fn: (v: boolean) => boolean) => void
  showAreas: boolean; setShowAreas: (fn: (v: boolean) => boolean) => void
  switcherOpen: boolean; setSwitcherOpen: (v: boolean) => void
  colorMode: ColorMode; setColorMode: (mode: ColorMode) => void
  fullscreen?: boolean; onToggleFullscreen?: () => void
  rulerActive?: boolean; onToggleRuler?: () => void; onClearRuler?: () => void; rulerPoints?: number
}) {
  const btnStyle = (darkMode: boolean): React.CSSProperties => ({
    width: 40, height: 40, border: `1px solid ${darkMode ? t.goldBorder : t.lBorder}`,
    borderRadius: t.r.md, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: darkMode ? 'rgba(11,17,32,0.88)' : 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)', color: darkMode ? t.gold : t.lText,
    fontSize: 18, fontWeight: 700, transition: `all ${t.tr}`, fontFamily: t.font,
  })
  // Larger touch targets on mobile via CSS media query — inline styles applied conditionally
  const isMobileTouch = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  const mobileBtnStyle = (darkMode: boolean): React.CSSProperties => ({
    ...btnStyle(darkMode),
    ...(isMobileTouch ? { width: 48, height: 48 } : {}),
  })

  return (
    <div style={{ position: 'absolute', bottom: 24, left: 16, zIndex: t.z.controls, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Fullscreen toggle */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          style={{
            ...mobileBtnStyle(darkMode), boxShadow: t.sh.md,
            background: fullscreen
              ? `linear-gradient(135deg,${t.gold},${t.goldBright})`
              : (darkMode ? 'rgba(11,17,32,0.88)' : 'rgba(255,255,255,0.92)'),
            color: fullscreen ? t.bg : (darkMode ? t.gold : t.lText),
            border: fullscreen ? `1px solid ${t.gold}` : `1px solid ${darkMode ? t.goldBorder : t.lBorder}`,
          }}
          aria-label={fullscreen ? 'יציאה ממצב מסך מלא' : 'מסך מלא'}
          title={fullscreen ? 'יציאה ממצב מסך מלא' : 'מסך מלא — הסתר ממשק'}
        >
          {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      )}

      {/* Fit all plots */}
      <button
        onClick={() => {
          if (plotBoundsRef.current?.isValid() && mapRef.current) {
            mapRef.current.flyToBounds(plotBoundsRef.current, { padding: [60, 60], maxZoom: 14, duration: 0.8 })
          }
        }}
        style={{ ...mobileBtnStyle(darkMode), boxShadow: t.sh.md }}
        aria-label="הצג את כל החלקות"
        title="הצג הכל"
      >
        <MapIcon size={16} />
      </button>

      {/* Locate Me — fly to user's current position */}
      <button
        onClick={() => {
          if (userPosRef.current && mapRef.current) {
            mapRef.current.flyTo(userPosRef.current, 15, { duration: 0.8 })
          } else {
            // Request geolocation if not yet available
            navigator.geolocation?.getCurrentPosition(
              pos => {
                const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude]
                userPosRef.current = loc
                mapRef.current?.flyTo(loc, 15, { duration: 0.8 })
              },
              () => {},
              { enableHighAccuracy: true, timeout: 10000 }
            )
          }
        }}
        style={{ ...mobileBtnStyle(darkMode), boxShadow: t.sh.md }}
        aria-label="המיקום שלי"
        title="המיקום שלי — עבור למיקומך הנוכחי"
      >
        <LocateFixed size={16} />
      </button>

      {/* Ruler / Distance measurement */}
      {onToggleRuler && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={onToggleRuler}
            style={{
              ...mobileBtnStyle(darkMode), boxShadow: t.sh.md,
              background: rulerActive
                ? `linear-gradient(135deg,${t.gold},${t.goldBright})`
                : (darkMode ? 'rgba(11,17,32,0.88)' : 'rgba(255,255,255,0.92)'),
              color: rulerActive ? t.bg : (darkMode ? t.gold : t.lText),
              border: rulerActive ? `1px solid ${t.gold}` : `1px solid ${darkMode ? t.goldBorder : t.lBorder}`,
            }}
            aria-label={rulerActive ? 'סגור מדידת מרחק' : 'מדידת מרחק'}
            title={rulerActive ? 'סגור מדידה (ESC)' : 'מדידת מרחק — לחץ על נקודות במפה'}
          >
            <Ruler size={16} />
          </button>
          {/* Clear measurement button (shows when ruler has points) */}
          {rulerActive && (rulerPoints ?? 0) > 0 && onClearRuler && (
            <button
              onClick={onClearRuler}
              style={{
                position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%',
                background: '#EF4444', border: '2px solid ' + (darkMode ? t.bg : '#fff'),
                color: '#fff', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
              }}
              aria-label="נקה מדידה"
              title="נקה מדידה"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      )}

      {/* Zoom buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderRadius: t.r.md, overflow: 'hidden', boxShadow: t.sh.md }}>
        <button onClick={() => mapRef.current?.zoomIn()}
          style={{ ...mobileBtnStyle(darkMode), borderRadius: `${t.r.md} ${t.r.md} 0 0`, borderBottom: 'none' }} aria-label="הגדל">+</button>
        <button onClick={() => mapRef.current?.zoomOut()}
          style={{ ...mobileBtnStyle(darkMode), borderRadius: `0 0 ${t.r.md} ${t.r.md}` }} aria-label="הקטן">−</button>
      </div>

      {/* Color mode toggle */}
      <button
        onClick={() => {
          const modes: ColorMode[] = ['status', 'grade', 'pps', 'heatmap']
          const idx = modes.indexOf(colorMode)
          setColorMode(modes[(idx + 1) % modes.length])
        }}
        style={{
          ...mobileBtnStyle(darkMode), boxShadow: t.sh.md,
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
            ...mobileBtnStyle(darkMode), border: 'none', background: 'transparent',
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
// ── Persisted Map Preferences ──
const MAP_PREFS_KEY = 'landmap_map_prefs'
interface MapPrefs { tileIdx: number; colorMode: ColorMode; showCadastral: boolean; showAreas: boolean }
function loadMapPrefs(): Partial<MapPrefs> {
  try { const raw = localStorage.getItem(MAP_PREFS_KEY); return raw ? JSON.parse(raw) : {} } catch { return {} }
}
function saveMapPrefs(prefs: MapPrefs) {
  try { localStorage.setItem(MAP_PREFS_KEY, JSON.stringify(prefs)) } catch {}
}

function MapArea({ plots, pois, selected, onSelect, onLead, favorites, compare, darkMode = false, filterCity, fullscreen, onToggleFullscreen }: MapProps) {
  const savedPrefs = useMemo(() => loadMapPrefs(), [])
  const [tileIdx, setTileIdxRaw] = useState(savedPrefs.tileIdx ?? 2)
  const [showCadastral, setShowCadastralRaw] = useState(savedPrefs.showCadastral ?? false)
  const [showAreas, setShowAreasRaw] = useState(savedPrefs.showAreas ?? true)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [colorMode, setColorModeRaw] = useState<ColorMode>(savedPrefs.colorMode ?? 'grade')
  const [hoveredPlotId, setHoveredPlotId] = useState<string | null>(null)

  // Wrap setters to persist preferences
  const setTileIdx = useCallback((i: number) => { setTileIdxRaw(i); saveMapPrefs({ tileIdx: i, colorMode, showCadastral, showAreas }) }, [colorMode, showCadastral, showAreas])
  const setColorMode = useCallback((m: ColorMode) => { setColorModeRaw(m); saveMapPrefs({ tileIdx, colorMode: m, showCadastral, showAreas }) }, [tileIdx, showCadastral, showAreas])
  const setShowCadastral = useCallback((fn: (v: boolean) => boolean) => { setShowCadastralRaw(prev => { const next = fn(prev); saveMapPrefs({ tileIdx, colorMode, showCadastral: next, showAreas }); return next }) }, [tileIdx, colorMode, showAreas])
  const setShowAreas = useCallback((fn: (v: boolean) => boolean) => { setShowAreasRaw(prev => { const next = fn(prev); saveMapPrefs({ tileIdx, colorMode, showCadastral, showAreas: next }); return next }) }, [tileIdx, colorMode, showCadastral])
  const prefetch = usePrefetchPlot()
  const [zoom, setZoom] = useState(13)
  const handleZoomChange = useCallback((z: number) => setZoom(z), [])
  const [rulerActive, setRulerActive] = useState(false)
  const [rulerPoints, setRulerPoints] = useState(0)
  const toggleRuler = useCallback(() => {
    setRulerActive(prev => {
      if (prev) setRulerPoints(0)
      return !prev
    })
  }, [])
  const clearRuler = useCallback(() => setRulerPoints(0), [])

  // ESC to exit ruler mode
  useEffect(() => {
    if (!rulerActive) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setRulerActive(false); setRulerPoints(0) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [rulerActive])

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

  const [copiedCoords, setCopiedCoords] = useState<string | null>(null)
  const copyCoordinates = useCallback((lat: number, lng: number, plotId: string) => {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCoords(plotId)
      setTimeout(() => setCopiedCoords(null), 2000)
    }).catch(() => {})
  }, [])

  const renderPopup = useCallback((plot: Plot) => {
    const d = p(plot), r = roi(plot), score = calcScore(plot), grade = getGrade(score), fav = favorites.isFav(plot.id), pps = pricePerSqm(plot), ppd = pricePerDunam(plot)
    const comp = compare?.has(plot.id)
    const zoningStage = zoningPipeline.find(z => z.key === d.zoning)
    const center = plotCenter(plot.coordinates)
    const navLinks = center ? {
      gmaps: `https://www.google.com/maps/@${center.lat},${center.lng},17z`,
      streetView: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${center.lat},${center.lng}`,
      waze: `https://waze.com/ul?ll=${center.lat},${center.lng}&z=17&navigate=yes`,
    } : null
    return (
      <div className="plot-popup" style={{ padding: 0 }}>
        {/* Premium gradient header */}
        <div style={{
          padding: '14px 16px 10px', direction: 'rtl',
          background: `linear-gradient(135deg, ${grade.color}18, ${grade.color}08)`,
          borderBottom: `1px solid ${grade.color}20`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>גוש {d.block} · חלקה {plot.number}</div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                📍 {plot.city}
                {zoningStage && <span style={{ opacity: 0.6 }}>· {zoningStage.icon} {zoningStage.label}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `2.5px solid ${grade.color}`,
                background: `${grade.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 900, color: grade.color,
              }}>{score}</div>
              <span style={{ fontSize: 10, fontWeight: 800, color: grade.color }}>{grade.grade}</span>
            </div>
          </div>
          {/* Status badge */}
          <span className="plot-popup-status" style={{ background: (statusColors[plot.status || ''] || '#888') + '20', color: statusColors[plot.status || ''] || '#888' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
            {statusLabels[plot.status || ''] || plot.status}
          </span>
        </div>
        {/* Data rows */}
        <div style={{ padding: '10px 16px 12px' }}>
          <div className="plot-popup-row"><span className="plot-popup-label">מחיר</span><span className="plot-popup-value" style={{ fontSize: 15, fontWeight: 900 }}>{fmt.compact(d.price)}</span></div>
          <div className="plot-popup-row"><span className="plot-popup-label">שטח</span><span className="plot-popup-value">{fmt.dunam(d.size)} דונם ({fmt.num(d.size)} מ״ר)</span></div>
          {ppd > 0 && <div className="plot-popup-row"><span className="plot-popup-label">₪/דונם</span><span className="plot-popup-value">{fmt.num(ppd)}</span></div>}
          <div className="plot-popup-row"><span className="plot-popup-label">תשואה צפויה</span><span className="plot-popup-value gold">+{fmt.pct(r)}</span></div>

          {/* Navigation quick links row */}
          {navLinks && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: t.textDim, whiteSpace: 'nowrap' }}>ניווט:</span>
              <a href={navLinks.gmaps} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px',
                  background: 'rgba(66,133,244,0.1)', border: '1px solid rgba(66,133,244,0.2)',
                  borderRadius: t.r.full, fontSize: 10, fontWeight: 700, color: '#4285F4',
                  textDecoration: 'none', whiteSpace: 'nowrap', transition: `all ${t.tr}`,
                }}
                title="פתח בגוגל מפות"
              >🗺️ Google</a>
              <a href={navLinks.streetView} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px',
                  background: 'rgba(251,188,5,0.1)', border: '1px solid rgba(251,188,5,0.2)',
                  borderRadius: t.r.full, fontSize: 10, fontWeight: 700, color: '#FBBC05',
                  textDecoration: 'none', whiteSpace: 'nowrap', transition: `all ${t.tr}`,
                }}
                title="צפה ברחוב"
              >👁️ Street View</a>
              <a href={navLinks.waze} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px',
                  background: 'rgba(51,181,229,0.1)', border: '1px solid rgba(51,181,229,0.2)',
                  borderRadius: t.r.full, fontSize: 10, fontWeight: 700, color: '#33B5E5',
                  textDecoration: 'none', whiteSpace: 'nowrap', transition: `all ${t.tr}`,
                }}
                title="נווט עם Waze"
              >🚗 Waze</a>
              <button
                onClick={() => copyCoordinates(center!.lat, center!.lng, plot.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px',
                  background: copiedCoords === plot.id ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                  border: `1px solid ${copiedCoords === plot.id ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.2)'}`,
                  borderRadius: t.r.full, fontSize: 10, fontWeight: 700,
                  color: copiedCoords === plot.id ? '#10B981' : '#94A3B8',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: `all ${t.tr}`,
                  fontFamily: t.font,
                }}
                title={`${center!.lat.toFixed(6)}, ${center!.lng.toFixed(6)}`}
              >
                {copiedCoords === plot.id ? <><Check size={10} /> הועתק!</> : <><Copy size={10} /> קואורדינטות</>}
              </button>
            </div>
          )}

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
      </div>
    )
  }, [favorites, compare, onLead, copiedCoords, copyCoordinates])

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

        {/* Distance ruler tool */}
        <RulerTool active={rulerActive} darkMode={darkMode} onPointsChange={setRulerPoints} />

        {/* Area divisions with price stats + click for detailed area analytics */}
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
          const ppdList = areaPlots.map(pl => pricePerDunam(pl)).filter(v => v > 0)
          const avgPpd = ppdList.length ? Math.round(ppdList.reduce((s, v) => s + v, 0) / ppdList.length) : 0
          const prices = areaPlots.map(pl => p(pl).price).filter(v => v > 0)
          const rois = areaPlots.map(pl => roi(pl)).filter(v => v > 0)
          const avgRoi = rois.length ? Math.round(rois.reduce((s, v) => s + v, 0) / rois.length) : 0
          const minPrice = prices.length ? Math.min(...prices) : 0
          const maxPrice = prices.length ? Math.max(...prices) : 0
          const scores = areaPlots.map(calcScore)
          const avgScore = scores.length ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1) : '—'
          const totalArea = areaPlots.reduce((s, pl) => s + p(pl).size, 0)
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
              {areaPlots.length > 0 && (
                <Popup maxWidth={300} minWidth={260}>
                  <div style={{ padding: 0, direction: 'rtl' }}>
                    <div style={{
                      padding: '12px 16px 8px',
                      background: `linear-gradient(135deg, ${area.color}18, ${area.color}08)`,
                      borderBottom: `1px solid ${area.color}25`,
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: area.color, marginBottom: 2 }}>{area.name}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>
                        {areaPlots.length} חלקות · {(totalArea / 1000).toFixed(1)} דונם
                      </div>
                    </div>
                    <div style={{ padding: '10px 16px 14px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                        <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>₪{avgPps.toLocaleString()}</div>
                          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>ממוצע ₪/מ״ר</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>₪{avgPpd.toLocaleString()}</div>
                          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>ממוצע ₪/דונם</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 800, color: avgRoi > 0 ? '#10B981' : undefined }}>
                            {avgRoi > 0 ? `+${avgRoi}%` : '—'}
                          </div>
                          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>תשואה ממוצעת</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,0,0,0.04)', borderRadius: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>{avgScore}</div>
                          <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>ציון ממוצע</div>
                        </div>
                      </div>
                      {prices.length > 0 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '6px 10px', background: 'rgba(0,0,0,0.03)', borderRadius: 6,
                          fontSize: 11, fontWeight: 600, opacity: 0.8,
                        }}>
                          <span>טווח: {fmt.compact(minPrice)} — {fmt.compact(maxPrice)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              )}
            </Polygon>
          )
        })}

        {/* Plot polygons */}
        {plots.map(plot => {
          if (!plot.coordinates?.length) return null
          const d = p(plot), color = getPolygonColor(plot, colorMode), isSel = selected?.id === plot.id
          const isHov = hoveredPlotId === plot.id && !isSel
          const score = calcScore(plot), grade = getGrade(score)
          const zoningStage = zoningPipeline.find(z => z.key === d.zoning)
          return (
            <Polygon key={plot.id} positions={plot.coordinates} eventHandlers={{
              click: () => onSelect(plot),
              mouseover: () => { prefetch(plot.id); setHoveredPlotId(plot.id) },
              mouseout: () => { if (hoveredPlotId === plot.id) setHoveredPlotId(null) },
            }} pathOptions={{
              color: isSel ? t.gold : isHov ? t.goldBright : color,
              weight: isSel ? 3.5 : isHov ? 3 : 2,
              fillColor: isSel ? t.gold : isHov ? t.goldBright : color,
              fillOpacity: isSel ? 0.4 : isHov ? 0.32 : 0.18,
              className: isSel ? 'plot-selected' : isHov ? 'plot-hovered' : undefined,
            }}>
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

      {/* Ruler active indicator bar */}
      {rulerActive && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: t.z.controls + 1, display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 16px', direction: 'rtl',
          background: darkMode ? 'rgba(11,17,32,0.92)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)', borderRadius: t.r.full,
          border: `1px solid ${t.gold}`, boxShadow: `0 4px 16px rgba(212,168,75,0.25)`,
          fontSize: 12, fontWeight: 700, color: t.gold, fontFamily: t.font,
        }}>
          <Ruler size={14} />
          <span>📏 מצב מדידה — לחץ על נקודות במפה</span>
          <button
            onClick={toggleRuler}
            style={{
              background: 'none', border: `1px solid ${t.goldBorder}`, borderRadius: t.r.sm,
              color: t.gold, cursor: 'pointer', padding: '2px 8px', fontSize: 11,
              fontWeight: 700, fontFamily: t.font,
            }}
          >ESC</button>
        </div>
      )}

      {/* Map Controls Column: Zoom + Layers */}
      <MapControls darkMode={darkMode} tileIdx={tileIdx} setTileIdx={setTileIdx}
        showCadastral={showCadastral} setShowCadastral={setShowCadastral}
        showAreas={showAreas} setShowAreas={setShowAreas}
        switcherOpen={switcherOpen} setSwitcherOpen={setSwitcherOpen}
        colorMode={colorMode} setColorMode={setColorMode}
        fullscreen={fullscreen} onToggleFullscreen={onToggleFullscreen}
        rulerActive={rulerActive} onToggleRuler={toggleRuler}
        onClearRuler={() => { setRulerActive(false); setRulerPoints(0) }}
        rulerPoints={rulerPoints} />
    </div>
  )
}

export default memo(MapArea)
