import { Waves, TreePine, Hospital, Bus, Shield } from 'lucide-react'
import { calcRiskLevel } from '../../utils/formatters'

/**
 * LocationScore — visual connectivity/accessibility score for a plot.
 * Shows how well-connected the location is based on proximity to key amenities.
 * Inspired by Madlan's neighborhood quality scores and Walk Score.
 *
 * Displays:
 * - Overall location score (1-10)
 * - Individual proximity metrics (sea, park, hospital)
 * - Investment risk level badge
 */

function ProximityBar({ icon: Icon, label, distance, maxKm = 10, color }) {
  if (!distance && distance !== 0) return null
  const pct = Math.max(5, Math.min(100, (1 - distance / maxKm) * 100))
  const displayDist = distance < 1 ? `${Math.round(distance * 1000)}מ׳` : `${distance.toFixed(1)} ק״מ`
  const quality = distance <= 1 ? 'מעולה' : distance <= 3 ? 'טוב' : distance <= 6 ? 'סביר' : 'רחוק'

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-slate-400">{label}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500">{displayDist}</span>
            <span
              className="text-[8px] font-bold px-1.5 py-0.5 rounded"
              style={{
                color,
                background: `${color}15`,
              }}
            >
              {quality}
            </span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}60, ${color})`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function RiskBadge({ plot, allPlots }) {
  const risk = calcRiskLevel(plot, allPlots)
  if (!risk) return null

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl p-2.5 border"
      style={{
        background: `${risk.color}08`,
        borderColor: `${risk.color}20`,
      }}
    >
      <span className="text-base flex-shrink-0 mt-0.5">{risk.emoji}</span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold" style={{ color: risk.color }}>
            {risk.label}
          </span>
          {/* Risk level dots */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{
                  background: i <= risk.level ? risk.color : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
        </div>
        {risk.factors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {risk.factors.map((factor, i) => (
              <span
                key={i}
                className="text-[9px] text-slate-500 bg-white/[0.03] px-1.5 py-0.5 rounded"
              >
                {factor}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LocationScore({ plot, allPlots }) {
  const distanceToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distanceToPark = plot.distance_to_park ?? plot.distanceToPark
  const distanceToHospital = plot.distance_to_hospital ?? plot.distanceToHospital

  // Calculate overall location score (1-10)
  const hasData = distanceToSea != null || distanceToPark != null || distanceToHospital != null

  let locationScore = null
  if (hasData) {
    let totalScore = 0
    let factors = 0

    if (distanceToSea != null) {
      // Sea: 0-1km = 10, 1-3km = 7, 3-6km = 4, 6+ = 2
      const seaScore = distanceToSea <= 1 ? 10 : distanceToSea <= 3 ? 7 : distanceToSea <= 6 ? 4 : 2
      totalScore += seaScore * 1.2 // Sea proximity weighted higher (premium factor in Israel)
      factors += 1.2
    }

    if (distanceToPark != null) {
      const parkScore = distanceToPark <= 0.5 ? 10 : distanceToPark <= 1 ? 8 : distanceToPark <= 3 ? 5 : 2
      totalScore += parkScore
      factors += 1
    }

    if (distanceToHospital != null) {
      const hospScore = distanceToHospital <= 2 ? 10 : distanceToHospital <= 5 ? 7 : distanceToHospital <= 10 ? 4 : 2
      totalScore += hospScore * 0.8 // Hospital slightly less weight
      factors += 0.8
    }

    locationScore = factors > 0 ? Math.max(1, Math.min(10, Math.round(totalScore / factors))) : null
  }

  if (!hasData && !allPlots) return null

  const scoreColor = locationScore >= 8 ? '#22C55E' : locationScore >= 6 ? '#84CC16' : locationScore >= 4 ? '#F59E0B' : '#EF4444'
  const scoreLabel = locationScore >= 8 ? 'מיקום מעולה' : locationScore >= 6 ? 'מיקום טוב' : locationScore >= 4 ? 'מיקום סביר' : 'מיקום מרוחק'

  return (
    <div className="space-y-3">
      {/* Location score header */}
      {locationScore && (
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg"
            style={{ background: `${scoreColor}18`, color: scoreColor, border: `1px solid ${scoreColor}30` }}
          >
            {locationScore}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-200">{scoreLabel}</div>
            <div className="text-[10px] text-slate-500">ציון מיקום ונגישות (1-10)</div>
          </div>
        </div>
      )}

      {/* Proximity bars */}
      <div className="space-y-2.5">
        <ProximityBar
          icon={Waves}
          label="מרחק לים"
          distance={distanceToSea}
          maxKm={8}
          color="#3B82F6"
        />
        <ProximityBar
          icon={TreePine}
          label="מרחק לפארק"
          distance={distanceToPark}
          maxKm={5}
          color="#22C55E"
        />
        <ProximityBar
          icon={Hospital}
          label="מרחק לביה״ח"
          distance={distanceToHospital}
          maxKm={15}
          color="#EF4444"
        />
      </div>

      {/* Risk assessment */}
      <RiskBadge plot={plot} allPlots={allPlots} />
    </div>
  )
}
