import { useMemo } from 'react'
import styled from 'styled-components'
import { theme } from '../../styles/theme'

const Spark = styled.svg`
  display: inline-block;
`

export interface PriceSparklineProps {
  currentPrice: number
  projectedValue?: number
  className?: string
}

export function PriceSparkline({ currentPrice, projectedValue, className }: PriceSparklineProps) {
  const points = useMemo(() => {
    if (!currentPrice || currentPrice <= 0) return null
    const proj = projectedValue || currentPrice
    const trend = (proj - currentPrice) / currentPrice

    const steps = 5
    const values: number[] = []
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      const progress = t * t * (3 - 2 * t)
      const noise = Math.sin(i * 2.1) * 0.03
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
  const color = isUp ? theme.colors.emerald : theme.colors.red
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <Spark width="48" height="16" viewBox="0 0 48 16" className={className} aria-label={isUp ? '\u05DE\u05D2\u05DE\u05EA \u05E2\u05DC\u05D9\u05D9\u05D4' : '\u05DE\u05D2\u05DE\u05EA \u05D9\u05E8\u05D9\u05D3\u05D4'}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2" fill={color} />
    </Spark>
  )
}
