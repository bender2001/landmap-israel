import { useState, useCallback, useEffect } from 'react'
import { useMap, Polyline, Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { Ruler, X } from 'lucide-react'

/**
 * Haversine distance between two lat/lng points in meters.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} ק"מ`
  return `${Math.round(meters)} מ'`
}

function totalDistance(points) {
  let total = 0
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i - 1][0], points[i - 1][1],
      points[i][0], points[i][1]
    )
  }
  return total
}

const dotIcon = L.divIcon({
  className: '',
  html: '<div style="width:10px;height:10px;background:#C8942A;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
})

function RulerLayer({ points, onAddPoint, onClear }) {
  const map = useMap()

  useEffect(() => {
    const handler = (e) => {
      onAddPoint([e.latlng.lat, e.latlng.lng])
    }
    map.on('click', handler)
    map.getContainer().style.cursor = 'crosshair'
    return () => {
      map.off('click', handler)
      map.getContainer().style.cursor = ''
    }
  }, [map, onAddPoint])

  // ESC to exit ruler
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClear()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClear])

  if (points.length === 0) return null

  const total = totalDistance(points)

  return (
    <>
      {points.length >= 2 && (
        <Polyline
          positions={points}
          pathOptions={{
            color: '#C8942A',
            weight: 3,
            dashArray: '8 6',
            opacity: 0.9,
          }}
        />
      )}
      {points.map((pt, i) => (
        <Marker key={i} position={pt} icon={dotIcon} interactive={false}>
          {i === points.length - 1 && points.length >= 2 && (
            <Tooltip permanent direction="top" offset={[0, -8]} className="ruler-tooltip">
              {formatDistance(total)}
            </Tooltip>
          )}
        </Marker>
      ))}
      {/* Segment labels for multi-point */}
      {points.length > 2 &&
        points.slice(1, -1).map((pt, i) => {
          const segDist = haversineDistance(
            points[i][0], points[i][1],
            pt[0], pt[1]
          )
          return (
            <Marker key={`seg-${i}`} position={pt} icon={dotIcon} interactive={false}>
              <Tooltip permanent direction="bottom" offset={[0, 8]} className="ruler-tooltip">
                {formatDistance(segDist)}
              </Tooltip>
            </Marker>
          )
        })}
    </>
  )
}

export default function MapRuler() {
  const [isActive, setIsActive] = useState(false)
  const [points, setPoints] = useState([])

  const handleAddPoint = useCallback((pt) => {
    setPoints((prev) => [...prev, pt])
  }, [])

  const handleClear = useCallback(() => {
    setPoints([])
    setIsActive(false)
  }, [])

  const handleToggle = useCallback(() => {
    if (isActive) {
      handleClear()
    } else {
      setIsActive(true)
      setPoints([])
    }
  }, [isActive, handleClear])

  const handleUndo = useCallback(() => {
    setPoints((prev) => prev.slice(0, -1))
  }, [])

  return (
    <>
      {/* Toggle button */}
      <div className="absolute bottom-52 sm:bottom-44 left-4 z-[1000] pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <button
            onClick={handleToggle}
            className={`glass-panel w-9 h-9 flex items-center justify-center transition-colors ${
              isActive ? 'border-gold/40 bg-gold/10' : 'hover:border-gold/20'
            }`}
            style={{ minWidth: 44, minHeight: 44 }}
            title={isActive ? 'סגור מדידה' : 'מדידת מרחק'}
            aria-label={isActive ? 'סגור מדידה' : 'מדידת מרחק'}
          >
            {isActive ? (
              <X className="w-4 h-4 text-gold" />
            ) : (
              <Ruler className="w-4 h-4 text-gold" />
            )}
          </button>
          {isActive && points.length > 0 && (
            <button
              onClick={handleUndo}
              className="glass-panel w-9 h-9 flex items-center justify-center hover:border-gold/20 transition-colors text-[10px] text-slate-300 font-bold"
              style={{ minWidth: 44, minHeight: 44 }}
              title="בטל נקודה אחרונה"
            >
              ↩
            </button>
          )}
        </div>
      </div>

      {/* Instructions badge */}
      {isActive && points.length === 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="glass-panel px-4 py-2 text-xs text-slate-300 text-center">
            <span className="text-gold font-bold">📏 מצב מדידה</span> — לחץ על המפה למדוד מרחק
          </div>
        </div>
      )}

      {/* Ruler layer inside map */}
      {isActive && (
        <RulerLayer
          points={points}
          onAddPoint={handleAddPoint}
          onClear={handleClear}
        />
      )}
    </>
  )
}
