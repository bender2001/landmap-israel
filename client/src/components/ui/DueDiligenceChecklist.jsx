import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, ClipboardCheck, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react'

const CHECKLIST_ITEMS = [
  {
    id: 'tabu_extract',
    label: 'נסח טאבו',
    description: 'הוצאת נסח טאבו עדכני מרשם המקרקעין',
    link: 'https://www.gov.il/he/departments/topics/tabu-online',
    category: 'legal',
  },
  {
    id: 'land_registry',
    label: 'בדיקת בעלות',
    description: 'אימות בעלות על הקרקע ובדיקת שעבודים/עיקולים',
    category: 'legal',
  },
  {
    id: 'zoning_check',
    label: 'בדיקת ייעוד קרקע',
    description: 'אימות ייעוד הקרקע בוועדה המקומית לתכנון ובנייה',
    link: 'https://www.govmap.gov.il',
    category: 'planning',
  },
  {
    id: 'taba_plan',
    label: 'תוכנית בניין עיר (תב״ע)',
    description: 'בדיקת תב"ע החלה על החלקה וזכויות בנייה',
    category: 'planning',
  },
  {
    id: 'betterment_levy',
    label: 'היטל השבחה',
    description: 'בדיקת חבות היטל השבחה צפוי בעירייה',
    category: 'financial',
  },
  {
    id: 'tax_authority',
    label: 'שומת מס שבח',
    description: 'בדיקת שומת מס שבח צפויה ברשות המיסים',
    category: 'financial',
  },
  {
    id: 'infrastructure',
    label: 'תשתיות',
    description: 'בדיקת חיבור לתשתיות: מים, חשמל, ביוב, כבישים',
    category: 'physical',
  },
  {
    id: 'site_visit',
    label: 'ביקור בשטח',
    description: 'ביקור פיזי בחלקה ובדיקת הסביבה',
    category: 'physical',
  },
  {
    id: 'appraiser',
    label: 'שמאי מקרקעין',
    description: 'קבלת חוות דעת שמאי מוסמך',
    category: 'professional',
  },
  {
    id: 'lawyer',
    label: 'עורך דין מקרקעין',
    description: 'ייעוץ וליווי משפטי של עו"ד המתמחה במקרקעין',
    category: 'professional',
  },
]

const CATEGORIES = {
  legal: { label: 'משפטי', emoji: '⚖️' },
  planning: { label: 'תכנון', emoji: '📐' },
  financial: { label: 'פיננסי', emoji: '💰' },
  physical: { label: 'פיזי', emoji: '🏗️' },
  professional: { label: 'מקצועי', emoji: '👨‍💼' },
}

function getStorageKey(plotId) {
  return `landmap_dd_${plotId}`
}

export default function DueDiligenceChecklist({ plotId }) {
  const [checked, setChecked] = useState({})
  const [isExpanded, setIsExpanded] = useState(false)

  // Load from localStorage
  useEffect(() => {
    if (!plotId) return
    try {
      const saved = JSON.parse(localStorage.getItem(getStorageKey(plotId)) || '{}')
      setChecked(saved)
    } catch {
      setChecked({})
    }
  }, [plotId])

  const toggle = useCallback((itemId) => {
    setChecked(prev => {
      const next = { ...prev, [itemId]: !prev[itemId] }
      try {
        localStorage.setItem(getStorageKey(plotId), JSON.stringify(next))
      } catch {}
      return next
    })
  }, [plotId])

  const completedCount = CHECKLIST_ITEMS.filter(item => checked[item.id]).length
  const totalCount = CHECKLIST_ITEMS.length
  const progressPct = Math.round((completedCount / totalCount) * 100)
  const isComplete = completedCount === totalCount

  // Group by category
  const grouped = {}
  for (const item of CHECKLIST_ITEMS) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }

  return (
    <div className="bg-navy-light/40 border border-white/5 rounded-xl overflow-hidden mt-3 mb-3">
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isComplete ? 'bg-emerald-500/20' : 'bg-gold/15'
        }`}>
          <ClipboardCheck className={`w-4 h-4 ${isComplete ? 'text-emerald-400' : 'text-gold'}`} />
        </div>
        <div className="flex-1 text-right">
          <div className="text-xs font-medium text-slate-200">בדיקת נאותות (Due Diligence)</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{completedCount}/{totalCount} שלבים הושלמו</div>
        </div>
        {/* Progress ring */}
        <div className="relative w-9 h-9 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={isComplete ? '#22C55E' : '#C8942A'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${progressPct * 0.942} 100`}
              className="transition-all duration-500"
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${
            isComplete ? 'text-emerald-400' : 'text-gold'
          }`}>
            {progressPct}%
          </span>
        </div>
        {isExpanded
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        }
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3 animate-fade-in">
          {completedCount === 0 && (
            <div className="flex items-center gap-2 text-[10px] text-orange-400/80 bg-orange-500/5 border border-orange-500/10 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              <span>מומלץ להשלים את כל שלבי הבדיקה לפני רכישה</span>
            </div>
          )}

          {Object.entries(grouped).map(([catKey, items]) => {
            const cat = CATEGORIES[catKey]
            return (
              <div key={catKey}>
                <div className="text-[10px] text-slate-500 font-medium mb-1.5 flex items-center gap-1">
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </div>
                <div className="space-y-1">
                  {items.map(item => {
                    const isDone = !!checked[item.id]
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start gap-2.5 rounded-lg px-3 py-2 cursor-pointer transition-all ${
                          isDone ? 'bg-emerald-500/5' : 'hover:bg-white/[0.02]'
                        }`}
                        onClick={() => toggle(item.id)}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium ${isDone ? 'text-emerald-400 line-through opacity-70' : 'text-slate-300'}`}>
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{item.description}</div>
                        </div>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                            title="פתח קישור"
                          >
                            <ExternalLink className="w-3 h-3 text-slate-500 hover:text-gold" />
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {isComplete && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>כל שלבי הבדיקה הושלמו! ✨</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
