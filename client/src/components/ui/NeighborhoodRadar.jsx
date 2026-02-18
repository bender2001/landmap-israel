import { calcInvestmentScore } from '../../utils/formatters'

export default function NeighborhoodRadar({ distanceToSea, distanceToPark, distanceToHospital, roi, investmentScore, className = '' }) {
  const seaScore = distanceToSea != null ? Math.max(0, Math.min(10, 10 - distanceToSea / 500)) : null
  const parkScore = distanceToPark != null ? Math.max(0, Math.min(10, 10 - distanceToPark / 300)) : null
  const hospitalScore = distanceToHospital != null ? Math.max(0, Math.min(10, 10 - distanceToHospital / 1000)) : null
  const roiScore = Math.max(0, Math.min(10, roi / 30))
  const invScore = investmentScore || 5

  const dimensions = [
    { label: '🌊 ים', score: seaScore },
    { label: '🌳 פארק', score: parkScore },
    { label: '🏥 בי״ח', score: hospitalScore },
    { label: '📈 ROI', score: roiScore },
    { label: '⭐ השקעה', score: invScore },
  ].filter(d => d.score != null)

  if (dimensions.length < 3) return null

  const cx = 80, cy = 80, r = 60
  const n = dimensions.length
  const angleStep = (2 * Math.PI) / n
  const startAngle = -Math.PI / 2

  const getPoint = (i, val) => {
    const angle = startAngle + i * angleStep
    const dist = (val / 10) * r
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) }
  }

  const gridLevels = [2, 4, 6, 8, 10]
  const overallScore = Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length * 10) / 10

  return (
    <div className={`bg-navy-light/40 border border-white/5 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-slate-100">ציון שכונה</h3>
        <span className={`text-lg font-black ${overallScore >= 7 ? 'text-emerald-400' : overallScore >= 4 ? 'text-gold' : 'text-orange-400'}`}>
          {overallScore}/10
        </span>
      </div>
      <svg viewBox="0 0 160 160" className="w-full max-w-[220px] mx-auto">
        {gridLevels.map(level => {
          const points = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, level)
            return `${p.x},${p.y}`
          }).join(' ')
          return <polygon key={level} points={points} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        })}
        {dimensions.map((_, i) => {
          const p = getPoint(i, 10)
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        })}
        <polygon
          points={dimensions.map((d, i) => { const p = getPoint(i, d.score); return `${p.x},${p.y}` }).join(' ')}
          fill="rgba(200,148,42,0.15)"
          stroke="#C8942A"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {dimensions.map((d, i) => {
          const p = getPoint(i, d.score)
          return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#C8942A" stroke="#1a1a2e" strokeWidth="1" />
        })}
        {dimensions.map((d, i) => {
          const p = getPoint(i, 12.5)
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="text-[8px] fill-slate-400">
              {d.label}
            </text>
          )
        })}
      </svg>
      <div className="space-y-1.5 mt-3">
        {dimensions.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-12 text-left flex-shrink-0">{d.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(d.score / 10) * 100}%`,
                  background: d.score >= 7 ? '#22C55E' : d.score >= 4 ? '#C8942A' : '#F59E0B',
                }}
              />
            </div>
            <span className="text-[10px] text-slate-400 w-6 text-right">{d.score.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
