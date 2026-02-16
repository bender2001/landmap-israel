import { useState, useRef, useEffect, useCallback } from 'react'
import { X, MapPin, TrendingUp, Waves, TreePine, Hospital, Shield, CheckCircle2, BarChart3, FileText, ChevronDown, Clock, Award, DollarSign, AlertTriangle, Building2, Hourglass, Phone, MessageCircle } from 'lucide-react'
import { statusColors, statusLabels, zoningLabels, zoningPipelineStages, roiStages } from '../utils/constants'
import { formatCurrency } from '../utils/formatters'

function SectionIcon({ icon: Icon, className = '' }) {
  return (
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gold/15 ${className}`}>
      <Icon className="w-4 h-4 text-gold" />
    </div>
  )
}

function CollapsibleSection({ number, icon, title, children, animClass = '' }) {
  const [isOpen, setIsOpen] = useState(true)
  const contentRef = useRef(null)
  const [maxHeight, setMaxHeight] = useState('2000px')

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(isOpen ? `${contentRef.current.scrollHeight + 20}px` : '0px')
    }
  }, [isOpen])

  return (
    <div className={animClass}>
      <div
        className="section-header"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className="section-number">{number}</span>
        <SectionIcon icon={icon} />
        <h3 className="text-base font-bold text-slate-100 flex-1">{title}</h3>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 section-chevron ${!isOpen ? 'collapsed' : ''}`}
        />
      </div>
      <div
        ref={contentRef}
        className="section-collapse"
        style={{ maxHeight: isOpen ? maxHeight : '0px', opacity: isOpen ? 1 : 0 }}
      >
        <div className="pb-2">{children}</div>
      </div>
    </div>
  )
}

const committeeStatusConfig = {
  approved: {
    icon: CheckCircle2,
    bg: 'bg-green-500/20',
    border: 'border-green-500/50',
    text: 'text-green-400',
    label: 'אושר',
  },
  pending: {
    icon: Clock,
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/50',
    text: 'text-yellow-400',
    label: 'ממתין',
  },
  in_preparation: {
    icon: Clock,
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/50',
    text: 'text-blue-400',
    label: 'בהכנה',
  },
  in_discussion: {
    icon: Clock,
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/50',
    text: 'text-purple-400',
    label: 'בדיון',
  },
  not_started: {
    icon: null,
    bg: 'bg-slate-500/20',
    border: 'border-slate-500/50',
    text: 'text-slate-400',
    label: 'טרם החל',
  },
}

const committeeLevels = [
  { key: 'national', label: 'ארצית' },
  { key: 'district', label: 'מחוזית' },
  { key: 'local', label: 'מקומית' },
]

export default function SidebarDetails({ plot, onClose, onOpenLeadModal }) {
  const scrollRef = useRef(null)
  const [scrollShadow, setScrollShadow] = useState({ top: false, bottom: false })

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    setScrollShadow({
      top: scrollTop > 10,
      bottom: scrollTop + clientHeight < scrollHeight - 10,
    })
  }, [])

  useEffect(() => {
    handleScroll()
  }, [plot, handleScroll])

  if (!plot) return null

  // Handle both snake_case (API) and camelCase (legacy) field names
  const totalPrice = plot.total_price ?? plot.totalPrice
  const projectedValue = plot.projected_value ?? plot.projectedValue
  const sizeSqM = plot.size_sqm ?? plot.sizeSqM
  const blockNumber = plot.block_number ?? plot.blockNumber
  const zoningStage = plot.zoning_stage ?? plot.zoningStage
  const readinessEstimate = plot.readiness_estimate ?? plot.readinessEstimate
  const distanceToSea = plot.distance_to_sea ?? plot.distanceToSea
  const distanceToPark = plot.distance_to_park ?? plot.distanceToPark
  const distanceToHospital = plot.distance_to_hospital ?? plot.distanceToHospital
  const densityUnitsPerDunam = plot.density_units_per_dunam ?? plot.densityUnitsPerDunam
  const areaContext = plot.area_context ?? plot.areaContext
  const nearbyDevelopment = plot.nearby_development ?? plot.nearbyDevelopment
  const taxAuthorityValue = plot.tax_authority_value ?? plot.taxAuthorityValue
  const standard22 = plot.standard22 ?? plot.standard_22

  const statusColor = statusColors[plot.status]
  const roi = Math.round((projectedValue - totalPrice) / totalPrice * 100)
  const pricePerDunam = formatCurrency(Math.round(totalPrice / sizeSqM * 1000))
  const bettermentLevy = formatCurrency(Math.round((projectedValue - totalPrice) * 0.5))

  const currentStageIndex = zoningPipelineStages.findIndex((s) => s.key === zoningStage)

  let sectionNum = 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[50]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="sidebar-panel fixed top-0 right-0 h-full w-[480px] max-w-full z-[60] bg-navy border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
        dir="rtl"
      >
        {/* Mobile drag handle */}
        <div className="sidebar-drag-handle">
          <div className="sidebar-drag-handle-bar" />
        </div>

        {/* Gold accent bar */}
        <div
          className="h-[3px] flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #C8942A, #E5B94E, #F0D078, #E5B94E, #C8942A)' }}
        />

        {/* Map preview area */}
        <div className="h-36 bg-navy-mid relative overflow-hidden flex-shrink-0">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(200,148,42,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,148,42,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-gold animate-pulse-gold" />
            <span className="text-xs text-gold/80 mt-2">
              גוש {blockNumber} | {plot.city}
            </span>
          </div>
          <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-navy to-transparent" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-start p-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black">
              <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">גוש</span>
              {' '}{blockNumber}{' | '}
              <span className="bg-gradient-to-r from-gold to-gold-bright bg-clip-text text-transparent">חלקה</span>
              {' '}{plot.number}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                {sizeSqM.toLocaleString()} מ&quot;ר
              </span>
              <span className="text-xs text-slate-300 bg-white/5 px-2.5 py-1 rounded-lg">
                {zoningLabels[zoningStage]}
              </span>
              {densityUnitsPerDunam && (
                <span className="text-xs text-gold bg-gold/10 px-2.5 py-1 rounded-lg">
                  {densityUnitsPerDunam} יח&quot;ד/דונם
                </span>
              )}
              {/* Status badge */}
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: statusColor + '14',
                  border: `1px solid ${statusColor}35`,
                  color: statusColor,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: statusColor }}
                />
                {statusLabels[plot.status]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:rotate-90 transition-all duration-300 flex items-center justify-center flex-shrink-0"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative" ref={scrollRef} onScroll={handleScroll}>
          {/* Scroll shadows */}
          <div className={`scroll-shadow-top ${scrollShadow.top ? 'visible' : ''}`} />
          <div className={`scroll-shadow-bottom ${scrollShadow.bottom ? 'visible' : ''}`} />

          <div className="px-6 pb-6">
            {/* Description */}
            {plot.description && (
              <p className="text-sm text-slate-300 leading-relaxed mb-1 animate-stagger-1">{plot.description}</p>
            )}

            {/* Area Context */}
            {(areaContext || nearbyDevelopment) && (
              <div className="bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-white/5 rounded-2xl p-4 mt-3 animate-stagger-2">
                {areaContext && (
                  <div className="flex gap-3 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gold" />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{areaContext}</p>
                  </div>
                )}
                {nearbyDevelopment && (
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{nearbyDevelopment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Distance chips */}
            <div className="flex flex-wrap gap-2.5 mt-3 animate-stagger-3">
              {distanceToSea != null && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-blue-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 card-lift">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Waves className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  {distanceToSea} מ׳ מהים
                </div>
              )}
              {distanceToPark != null && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-green-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 card-lift">
                  <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center">
                    <TreePine className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  {distanceToPark} מ׳ מפארק
                </div>
              )}
              {distanceToHospital != null && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-navy-light/50 to-navy-light/60 border border-red-500/15 rounded-xl px-4 py-2 text-xs text-slate-300 card-lift">
                  <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center">
                    <Hospital className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  {distanceToHospital} מ׳ מבי&quot;ח
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              className="h-px my-6"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(200,148,42,0.2) 20%, rgba(200,148,42,0.35) 50%, rgba(200,148,42,0.2) 80%, transparent)' }}
            />

            {/* Committee Status Timeline */}
            {plot.committees && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={Award}
                title="סטטוס ועדות"
                animClass="animate-stagger-4"
              >
                <div className="space-y-0 mb-2">
                  {committeeLevels.map((level, i) => {
                    const committee = plot.committees[level.key]
                    const status = committee?.status || 'not_started'
                    const config = committeeStatusConfig[status] || committeeStatusConfig.not_started
                    const StatusIcon = config.icon
                    return (
                      <div key={level.key} className="flex items-start gap-3 relative">
                        {/* Connecting line */}
                        {i < committeeLevels.length - 1 && (
                          <div className="absolute right-[15px] top-8 w-0.5 h-8 bg-white/10" />
                        )}
                        {/* Circle indicator */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0 ${config.bg} ${config.border}`}>
                          {StatusIcon ? (
                            <StatusIcon className={`w-4 h-4 ${config.text}`} />
                          ) : (
                            <span className={`text-sm ${config.text}`}>—</span>
                          )}
                        </div>
                        {/* Label & status */}
                        <div className="pb-4">
                          <div className="font-medium text-slate-200 text-sm">{level.label}</div>
                          <div className={`text-xs ${config.text}`}>{config.label}</div>
                          {committee?.date && (
                            <div className="text-xs text-slate-500 mt-0.5">{committee.date}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CollapsibleSection>
            )}

            {/* Standard 22 */}
            {standard22 && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={Award}
                title="הערכת שמאי - תקן 22"
                animClass="animate-stagger-5"
              >
                <div className="bg-gradient-to-r from-gold/5 to-gold/10 border border-gold/20 rounded-2xl p-4 mb-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">שמאי</div>
                      <div className="text-sm text-slate-200 font-medium">{standard22.appraiser}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">תאריך</div>
                      <div className="text-sm text-slate-200 font-medium">{standard22.date}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">שווי מוערך</div>
                      <div className="text-sm text-slate-200 font-medium">{formatCurrency(standard22.value)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">מתודולוגיה</div>
                      <div className="text-sm text-slate-200 font-medium">{standard22.methodology}</div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}

            {/* Financial Valuation Engine */}
            <CollapsibleSection
              number={`0${++sectionNum}`}
              icon={TrendingUp}
              title="נתונים פיננסיים"
              animClass="animate-stagger-6"
            >
              <div className="grid grid-cols-3 gap-3 mb-3">
                {/* Asked price */}
                <div className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center bg-gradient-to-b from-blue-500/15 to-blue-500/8 border border-blue-500/20 relative overflow-hidden card-lift">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600" />
                  <div className="text-[10px] text-slate-400">מחיר מבוקש</div>
                  <div className="text-lg font-bold" style={{ color: '#60A5FA' }}>{formatCurrency(totalPrice)}</div>
                  <div className="text-[10px] text-slate-500">{pricePerDunam} / דונם</div>
                </div>
                {/* Projected value */}
                <div className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center bg-gradient-to-b from-emerald-500/15 to-emerald-500/8 border border-emerald-500/20 relative overflow-hidden card-lift">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
                  <div className="text-[10px] text-slate-400">שווי צפוי</div>
                  <div className="text-lg font-bold" style={{ color: '#6EE7A0' }}>{formatCurrency(projectedValue)}</div>
                  <div className="text-[10px] text-slate-500">בסיום תהליך</div>
                </div>
                {/* ROI */}
                <div className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center bg-gradient-to-b from-gold/15 to-gold/8 border border-gold/20 relative overflow-hidden card-lift">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold to-gold-bright" />
                  <div className="text-[10px] text-slate-400">תשואה צפויה</div>
                  <div className="text-lg font-bold" style={{ color: '#E5B94E' }}>{roi}%</div>
                  <div className="text-[10px] text-slate-500">ROI</div>
                </div>
              </div>

              {/* Tax authority comparison */}
              {taxAuthorityValue && (
                <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mt-3 mb-3">
                  <div className="text-xs text-slate-300">
                    שווי רשות המיסים: {formatCurrency(taxAuthorityValue)}
                  </div>
                  {totalPrice < taxAuthorityValue && (
                    <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      מחיר אטרקטיבי! מתחת לשווי רשות המיסים
                    </div>
                  )}
                  <div className="text-xs text-slate-400 mt-1">
                    היטל השבחה משוער: {bettermentLevy}
                  </div>
                </div>
              )}

              {/* Associated Costs */}
              <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-3.5 h-3.5 text-gold" />
                  <span className="text-xs font-medium text-slate-200">עלויות נלוות משוערות</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">מס רכישה (6%)</span>
                    <span className="text-slate-300">{formatCurrency(Math.round(totalPrice * 0.06))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">שכ&quot;ט עו&quot;ד (~1.5%+מע&quot;מ)</span>
                    <span className="text-slate-300">{formatCurrency(Math.round(totalPrice * 0.0175))}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">היטל השבחה משוער</span>
                    <span className="text-slate-300">{bettermentLevy}</span>
                  </div>
                  <div className="h-px bg-white/5 my-1" />
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">סה&quot;כ עלות כוללת (ללא היטל)</span>
                    <span className="text-gold">{formatCurrency(Math.round(totalPrice * 1.0775))}</span>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            {/* ROI Stages - Appreciation Path */}
            <CollapsibleSection
              number={`0${++sectionNum}`}
              icon={BarChart3}
              title="צפי השבחה לפי שלבי תכנון"
              animClass="animate-stagger-7"
            >
              <div className="bg-navy-light/40 border border-white/5 rounded-xl p-3 mb-2">
                <div className="space-y-1">
                  {roiStages.map((stage, i) => {
                    const isCurrentStage = i === currentStageIndex
                    const isPast = i < currentStageIndex
                    const maxPrice = roiStages[roiStages.length - 1].pricePerSqM
                    const barWidth = (stage.pricePerSqM / maxPrice) * 100
                    return (
                      <div key={i} className={`flex items-center gap-2 py-1 rounded-lg ${isCurrentStage ? 'bg-gold/5 -mx-1 px-1' : ''}`}>
                        <div className="w-[90px] flex-shrink-0">
                          <span className={`text-[10px] leading-tight ${isCurrentStage ? 'text-gold font-bold' : isPast ? 'text-green-400/70' : 'text-slate-500'}`}>
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${barWidth}%`,
                              background: isCurrentStage
                                ? 'linear-gradient(90deg, #C8942A, #E5B94E)'
                                : isPast
                                  ? 'rgba(34,197,94,0.4)'
                                  : 'rgba(148,163,184,0.15)',
                            }}
                          />
                        </div>
                        <span className={`text-[10px] w-14 text-left flex-shrink-0 ${isCurrentStage ? 'text-gold font-bold' : isPast ? 'text-green-400/70' : 'text-slate-500'}`}>
                          {stage.pricePerSqM.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                  <div className="text-[9px] text-slate-500 text-left mt-1">* ש&quot;ח למ&quot;ר (הערכה ממוצעת)</div>
                </div>
              </div>
            </CollapsibleSection>

            {/* Divider */}
            <div
              className="h-px my-6"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(200,148,42,0.2) 20%, rgba(200,148,42,0.35) 50%, rgba(200,148,42,0.2) 80%, transparent)' }}
            />

            {/* Zoning Pipeline */}
            <CollapsibleSection
              number={`0${++sectionNum}`}
              icon={MapPin}
              title="צינור תכנוני"
              animClass="animate-stagger-8"
            >
              {readinessEstimate && (
                <div className="flex items-center gap-2 mb-4 bg-gradient-to-r from-gold/5 to-gold/10 border border-gold/20 rounded-xl px-4 py-2.5">
                  <Hourglass className="w-4 h-4 text-gold flex-shrink-0" />
                  <span className="text-sm text-slate-300">מוכנות לבנייה:</span>
                  <span className="text-sm font-bold text-gold">{readinessEstimate}</span>
                </div>
              )}
              <div className="space-y-0 mb-2">
                {zoningPipelineStages.map((stage, i) => {
                  const isCompleted = i < currentStageIndex
                  const isCurrent = i === currentStageIndex
                  const isFuture = i > currentStageIndex

                  return (
                    <div
                      key={stage.key}
                      className={`flex items-center gap-3 py-2 transition ${
                        isFuture ? 'opacity-50' : 'opacity-100'
                      } ${isCurrent ? 'bg-gold/5 -mx-2 px-2 rounded-xl' : ''}`}
                    >
                      <span className="text-lg w-7 text-center flex-shrink-0">{stage.icon}</span>
                      <span
                        className={`text-sm ${
                          isCompleted
                            ? 'text-green-400'
                            : isCurrent
                              ? 'text-gold font-bold'
                              : 'text-slate-500'
                        }`}
                      >
                        {stage.label}
                      </span>
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mr-auto" />}
                      {isCurrent && (
                        <span className="mr-auto text-[10px] text-gold bg-gold/10 px-2 py-0.5 rounded-full">נוכחי</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </CollapsibleSection>

            {/* Documents */}
            {plot.documents && plot.documents.length > 0 && (
              <CollapsibleSection
                number={`0${++sectionNum}`}
                icon={FileText}
                title="מסמכים ותוכניות"
              >
                <div className="space-y-2 mb-2">
                  {plot.documents.map((doc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-navy-light/40 border border-white/5 rounded-xl px-4 py-2.5 hover:border-gold/20 transition-colors cursor-pointer group card-lift"
                    >
                      <FileText className="w-4 h-4 text-gold/60 group-hover:text-gold transition-colors flex-shrink-0" />
                      <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">{doc}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>
        </div>

        {/* Sticky CTA footer */}
        <div className="sidebar-cta-footer">
          <button
            onClick={onOpenLeadModal}
            className="cta-shimmer relative overflow-hidden w-full py-3.5 px-6 bg-gradient-to-r from-gold via-gold-bright to-gold rounded-2xl text-navy font-extrabold text-base shadow-lg shadow-gold/30 hover:shadow-xl hover:shadow-gold/40 hover:-translate-y-px transition-all duration-300"
          >
            צור קשר לפרטים מלאים
          </button>
          <div className="flex gap-2 mt-2.5">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-600/30 transition-colors">
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm font-medium hover:bg-blue-600/30 transition-colors">
              <Phone className="w-4 h-4" />
              התקשר
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
