/**
 * DataDisclaimer.jsx — Prominent disclaimer about data sources
 *
 * Shows attribution to government sources, investment warnings,
 * and last update dates. Required for legal compliance.
 */

import { AlertTriangle, Shield, ExternalLink, Info } from 'lucide-react'

const DATA_SOURCES = [
  {
    name: 'נדל"ן נט',
    nameEn: 'nadlan.gov.il',
    org: 'משרד המשפטים',
    url: 'https://www.nadlan.gov.il/',
    type: 'עסקאות נדל"ן',
    color: '#C8942A',
  },
  {
    name: 'מנהל התכנון',
    nameEn: 'govmap.gov.il',
    org: 'משרד הפנים',
    url: 'https://www.govmap.gov.il/',
    type: 'תכניות בניין עיר',
    color: '#3B82F6',
  },
  {
    name: 'רשם המקרקעין',
    nameEn: 'tabu.gov.il',
    org: 'משרד המשפטים',
    url: 'https://www.gov.il/he/departments/topics/tabu-online',
    type: 'רישום טאבו',
    color: '#A855F7',
  },
]

export default function DataDisclaimer({
  variant = 'full', // 'full' | 'compact' | 'inline'
  lastUpdate = null,
  className = '',
}) {
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 text-[9px] text-slate-500 ${className}`}>
        <Info className="w-3 h-3 flex-shrink-0" />
        <span>
          נתונים ממקורות ממשלתיים. אינו מהווה ייעוץ השקעות.
          {lastUpdate && <span className="mr-1">עודכן: {lastUpdate}</span>}
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-amber-500/5 border border-amber-500/15 rounded-xl p-3 ${className}`}>
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-amber-300 font-medium">
              נתונים ממקורות ממשלתיים — לצורכי מידע בלבד
            </p>
            <p className="text-[9px] text-slate-500 mt-1">
              נדל"ן נט (nadlan.gov.il) · מנהל התכנון (govmap.gov.il) · אינו מהווה ייעוץ השקעות
            </p>
            {lastUpdate && (
              <p className="text-[8px] text-slate-600 mt-1">עדכון אחרון: {lastUpdate}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <div className={`bg-gradient-to-b from-navy-light/60 to-navy-light/40 border border-white/5 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-200">מקורות מידע ואחריות</h3>
          <p className="text-[10px] text-slate-500">שקיפות מלאה על מקורות הנתונים</p>
        </div>
      </div>

      {/* Data Sources */}
      <div className="p-4 space-y-3">
        {DATA_SOURCES.map((source) => (
          <div key={source.nameEn} className="flex items-start gap-3">
            <div
              className="w-1 h-8 rounded-full flex-shrink-0 mt-0.5"
              style={{ background: source.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-200">{source.name}</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[9px] hover:text-gold/80 transition-colors"
                  style={{ color: source.color }}
                >
                  {source.nameEn}
                  <ExternalLink className="w-2 h-2" />
                </a>
              </div>
              <p className="text-[10px] text-slate-500">{source.org} · {source.type}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimers */}
      <div className="p-4 pt-0 space-y-3">
        {/* Investment warning */}
        <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-red-300 font-medium">אין זה ייעוץ השקעות</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                המידע המוצג באתר הינו לצורכי מידע כללי בלבד ואינו מהווה המלצה, חוות דעת,
                או ייעוץ לרכישת נכסים. כל החלטת השקעה צריכה להתבצע לאחר התייעצות עם
                אנשי מקצוע מוסמכים — עו"ד, שמאי, יועץ מס ויועץ השקעות.
              </p>
            </div>
          </div>
        </div>

        {/* Data accuracy */}
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] text-blue-300 font-medium">דיוק הנתונים</p>
              <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                הנתונים מגיעים ממקורות ממשלתיים ציבוריים. ייתכנו אי-דיוקים, עיכובים
                בעדכון, או חוסרים. אין אנו אחראים לטעויות במידע.
                לאימות סופי — פנו ישירות למקורות הרשמיים.
              </p>
            </div>
          </div>
        </div>

        {/* Last update */}
        {lastUpdate && (
          <p className="text-[9px] text-slate-600 text-center">
            עדכון אחרון: {lastUpdate}
          </p>
        )}
      </div>
    </div>
  )
}
