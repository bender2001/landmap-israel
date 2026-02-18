import { useMemo } from 'react'

/**
 * Tiny inline SVG sparkline showing price trend direction.
 * Generates a simple 5-point trend based on current price and projected value,
 * simulating historical price movement (similar to Madlan's trend indicators).
 */
export default function PriceSparkline({ currentPrice, projectedValue, className = '' }) {
  const points = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null
    const proj = projectedValue || currentPrice
    const trend = (proj - currentPrice) / currentPrice

    // Generate 5 points simulating price trajectory
    const steps = 5
    const values = []
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      // Slight S-curve with some variance
      const progress = t * t * (3 - 2 * t) // smoothstep
      const noise = Math.sin(i * 2.1) * 0.03 // subtle wave
      values.push(currentPrice * (1 + trend * progress + noise))
    }

    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1

    const w = 48
    const h = 16
    const padding = 1

    return values.map((v, i) => ({
      x: padding + (i / (steps - 1)) * (w - padding * 2),
      y: padding + (1 - (v - min) / range) * (h - padding * 2),
    }))
  }, [currentPrice, projectedValue])

  if (!points) return null

  const isUp = (projectedValue || 0) >= (currentPrice || 0)
  const color = isUp ? '#22C55E' : '#EF4444'
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <svg
      width="48"
      height="16"
      viewBox="0 0 48 16"
      className={`inline-block ${className}`}
      aria-label={isUp ? 'מגמת עלייה' : 'מגמת ירידה'}
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill={color}
      />
    </svg>
  )
}
