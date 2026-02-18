import { Waves, TreePine, Hospital, Bus, Train, GraduationCap, ShoppingBag, Shield } from 'lucide-react'
import { calcRiskLevel } from '../../utils/formatters'

/**
 * LocationScore — visual connectivity/accessibility score for a plot.
 * Shows how well-connected the location is based on proximity to key amenities.
 * Inspired by Madlan's neighborhood quality scores and Walk Score.
 *
 * Displays:
 * - Overall location score (1-10) with category breakdown
 * - Individual proximity metrics (sea, park, hospital, transit, education, commerce)
 * - Investment risk level badge
 *
 * New amenity fields (distance_to_bus, distance_to_train, distance_to_school,
 * distance_to_shopping) render only when data is present — zero breaking change.
 */

/**
 * Quality thresholds per amenity type — different amenities have different
 * expectations. Being 3km from a bus stop is "far" but 3km from a hospital is "good".
 */
const QUALITY_THRESHOLDS = {
  default:  { excellent: 1, good: 3, fair: 6 },
  bus:      { excellent: 0.3, good: 0.8, fair: 1.5 },
  train:    { excellent: 1, good: 3, fair: 7 },
  park:     { excellent: 0.5, good: 1, fair: 3 },
  hospital: { excellent: 2, good: 5, fair: 10 },
  school:   { excellent: 0.5, good: 1.5, fair: 3 },
  shopping: { excellent: 0.5, good: 1.5, fair: 4 },
  sea:      { excellent: 1, good: 3, fair: 6 },
}

function getQuality(distance, type = 'default') {
  const t = QUALITY_THRESHOLDS[type] || QUALITY_THRESHOLDS.default
  if (distance <= t.excellent) return 'מעולה'
  if (distance <= t.good) return 'טוב'
  if (distance <= t.fair) return 'סביר'
  return 'רחוק'
}

function ProximityBar({ icon: Icon, label, distance, maxKm = 10, color, qualityType = 'default' }) {
  if (!distance && distance !== 0) return null
  const pct = Math.max(5, Math.min(100, (1 - distance / maxKm) * 100))
  const displayDist = distance < 1 ? `${Math.round(distance * 1000)}מ׳` : `${distance.toFixed(1)} ק״מ`
  const quality = getQuality(distance, qualityType)

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

/**
 * Score calculation config per amenity — weight determines how much each factor
 * contributes to the overall location score. Israel-specific weighting:
 * sea proximity is premium, transit is critical for land investment value.
 */
const SCORE_CONFIG = [
  { field: 'sea',      weight: 1.2, thresholds: [1, 3, 6] },   // 0-1=10, 1-3=7, 3-6=4, 6+=2
  { field: 'park',     weight: 0.8, thresholds: [0.5, 1, 3] },
  { field: 'hospital', weight: 0.7, thresholds: [2, 5, 10] },
  { field: 'bus',      weight: 1.0, thresholds: [0.3, 0.8, 1.5] },
  { field: 'train',    weight: 1.1, thresholds: [1, 3, 7] },    // Train proximity is key value driver
  { field: 'school',   weight: 0.6, thresholds: [0.5, 1.5, 3] },
  { field: 'shopping', weight: 0.5, thresholds: [0.5, 1.5, 4] },
]

function calcProximityScore(distance, thresholds) {
  if (distance == null) return null
  if (distance <= thresholds[0]) return 10
  if (distance <= thresholds[1]) return 7
  if (distance <= thresholds[2]) return 4
  return 2
}

/**
 * Category breakdown — groups amenities into meaningful categories
 * for the score header display (like Madlan's category scores).
 */
const CATEGORIES = [
  { id: 'nature',    label: 'טבע וסביבה', emoji: '🌿', fields: ['sea', 'park'] },
  { id: 'services',  label: 'שירותים',    emoji: '🏥', fields: ['hospital', 'school', 'shopping'] },
  { id: 'transport', label: 'תחבורה',     emoji: '🚌', fields: ['bus', 'train'] },
]

export default function LocationScore({ plot, allPlots }) {
  const distanceToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distanceToPark = plot.distance_to_park ?? plot.distanceToPark
  const distanceToHospital = plot.distance_to_hospital ?? plot.distanceToHospital
  const distanceToBus = plot.distance_to_bus ?? plot.distanceToBus
  const distanceToTrain = plot.distance_to_train ?? plot.distanceToTrain
  const distanceToSchool = plot.distance_to_school ?? plot.distanceToSchool
  const distanceToShopping = plot.distance_to_shopping ?? plot.distanceToShopping

  // Map field names to values
  const distances = {
    sea: distanceToSea,
    park: distanceToPark,
    hospital: distanceToHospital,
    bus: distanceToBus,
    train: distanceToTrain,
    school: distanceToSchool,
    shopping: distanceToShopping,
  }

  // Calculate overall location score (1-10) using weighted average of all available metrics
  const hasData = Object.values(distances).some(d => d != null)

  let locationScore = null
  let categoryScores = {}
  if (hasData) {
    let totalScore = 0
    let totalWeight = 0

    for (const cfg of SCORE_CONFIG) {
      const dist = distances[cfg.field]
      const score = calcProximityScore(dist, cfg.thresholds)
      if (score != null) {
        totalScore += score * cfg.weight
        totalWeight += cfg.weight
      }
    }

    locationScore = totalWeight > 0 ? Math.max(1, Math.min(10, Math.round(totalScore / totalWeight))) : null

    // Calculate per-category scores for the breakdown display
    for (const cat of CATEGORIES) {
      let catTotal = 0, catWeight = 0
      for (const field of cat.fields) {
        const cfg = SCORE_CONFIG.find(c => c.field === field)
        if (!cfg) continue
        const score = calcProximityScore(distances[field], cfg.thresholds)
        if (score != null) {
          catTotal += score * cfg.weight
          catWeight += cfg.weight
        }
      }
      if (catWeight > 0) {
        categoryScores[cat.id] = Math.max(1, Math.min(10, Math.round(catTotal / catWeight)))
      }
    }
  }

  if (!hasData && !allPlots) return null

  const scoreColor = locationScore >= 8 ? '#22C55E' : locationScore >= 6 ? '#84CC16' : locationScore >= 4 ? '#F59E0B' : '#EF4444'
  const scoreLabel = locationScore >= 8 ? 'מיקום מעולה' : locationScore >= 6 ? 'מיקום טוב' : locationScore >= 4 ? 'מיקום סביר' : 'מיקום מרוחק'

  const hasCategoryScores = Object.keys(categoryScores).length > 1

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
          <div className="flex-1">
            <div className="text-xs font-bold text-slate-200">{scoreLabel}</div>
            <div className="text-[10px] text-slate-500">ציון מיקום ונגישות (1-10)</div>
          </div>
        </div>
      )}

      {/* Category score breakdown — mini bar chart like Madlan's neighborhood categories */}
      {hasCategoryScores && (
        <div className="flex items-center gap-2 pb-1">
          {CATEGORIES.map(cat => {
            const score = categoryScores[cat.id]
            if (score == null) return null
            const catColor = score >= 8 ? '#22C55E' : score >= 6 ? '#84CC16' : score >= 4 ? '#F59E0B' : '#EF4444'
            return (
              <div
                key={cat.id}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border"
                style={{ background: `${catColor}08`, borderColor: `${catColor}18` }}
                title={`${cat.label}: ${score}/10`}
              >
                <span className="text-[10px]">{cat.emoji}</span>
                <span className="text-[9px] text-slate-400">{cat.label}</span>
                <span className="text-[10px] font-bold" style={{ color: catColor }}>{score}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Proximity bars — grouped by category for clarity */}
      <div className="space-y-2.5">
        {/* Nature & Environment */}
        <ProximityBar
          icon={Waves}
          label="מרחק לים"
          distance={distanceToSea}
          maxKm={8}
          color="#3B82F6"
          qualityType="sea"
        />
        <ProximityBar
          icon={TreePine}
          label="מרחק לפארק"
          distance={distanceToPark}
          maxKm={5}
          color="#22C55E"
          qualityType="park"
        />

        {/* Transit — key Madlan feature: public transport accessibility */}
        <ProximityBar
          icon={Bus}
          label="תחנת אוטובוס"
          distance={distanceToBus}
          maxKm={3}
          color="#8B5CF6"
          qualityType="bus"
        />
        <ProximityBar
          icon={Train}
          label="תחנת רכבת"
          distance={distanceToTrain}
          maxKm={10}
          color="#06B6D4"
          qualityType="train"
        />

        {/* Services */}
        <ProximityBar
          icon={Hospital}
          label="מרחק לביה״ח"
          distance={distanceToHospital}
          maxKm={15}
          color="#EF4444"
          qualityType="hospital"
        />
        <ProximityBar
          icon={GraduationCap}
          label="מוסד חינוך"
          distance={distanceToSchool}
          maxKm={5}
          color="#F59E0B"
          qualityType="school"
        />
        <ProximityBar
          icon={ShoppingBag}
          label="מרכז מסחרי"
          distance={distanceToShopping}
          maxKm={6}
          color="#EC4899"
          qualityType="shopping"
        />
      </div>

      {/* Risk assessment */}
      <RiskBadge plot={plot} allPlots={allPlots} />
    </div>
  )
}
