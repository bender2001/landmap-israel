import type { RoiStage, ZoningPipelineStage } from '../utils/constants'
import type { PlotStatusKey, ZoningStageKey } from '../utils/constants'

export { PlotStatus, ZoningStage, statusColors, statusLabels, zoningLabels } from '../utils/constants'
export type { PlotStatusKey, PlotStatusValue, ZoningStageKey, ZoningStageValue } from '../utils/constants'

export const roiStages: RoiStage[] = [
  { label: 'קרקע חקלאית ללא תוכנית', pricePerSqM: 1140, isCurrent: false },
  { label: 'הפקדה ופרסום תוכנית מתאר', pricePerSqM: 2285, isCurrent: false },
  { label: 'אישור תוכנית מתאר', pricePerSqM: 3428, isCurrent: false },
  { label: 'הכנת תוכנית מפורטת', pricePerSqM: 4800, isCurrent: true },
  { label: 'הפקדת תוכנית מפורטת', pricePerSqM: 6720, isCurrent: false },
  { label: 'אישור תוכנית מפורטת', pricePerSqM: 10100, isCurrent: false },
  { label: 'מכרז יזמים', pricePerSqM: 11500, isCurrent: false },
  { label: 'היתר בנייה', pricePerSqM: 12000, isCurrent: false },
]

export const zoningPipelineStages: ZoningPipelineStage[] = [
  { key: 'AGRICULTURAL', label: 'קרקע חקלאית', icon: '🌾' },
  { key: 'MASTER_PLAN_DEPOSIT', label: 'הפקדת תוכנית מתאר', icon: '📋' },
  { key: 'MASTER_PLAN_APPROVED', label: 'אישור תוכנית מתאר', icon: '✅' },
  { key: 'DETAILED_PLAN_PREP', label: 'הכנת תוכנית מפורטת', icon: '📐' },
  { key: 'DETAILED_PLAN_DEPOSIT', label: 'הפקדת תוכנית מפורטת', icon: '📋' },
  { key: 'DETAILED_PLAN_APPROVED', label: 'תוכנית מפורטת מאושרת', icon: '✅' },
  { key: 'DEVELOPER_TENDER', label: 'מכרז יזמים', icon: '🏗️' },
  { key: 'BUILDING_PERMIT', label: 'היתר בנייה', icon: '🏠' },
]

type CommitteeStatus = 'approved' | 'in_preparation' | 'pending' | 'in_discussion' | 'not_started'

interface Committee {
  status: CommitteeStatus
  label: string
  date: string | null
}

interface Standard22 {
  appraiser: string
  date: string
  value: number
  methodology: string
}

export interface MockPlot {
  id: string
  blockNumber: string
  created_at: string
  updated_at: string
  number: string
  city: string
  sizeSqM: number
  status: PlotStatusKey
  totalPrice: number
  taxAuthorityValue: number
  projectedValue: number
  zoningStage: ZoningStageKey
  ripeness: string
  coordinates: [number, number][]
  documents: string[]
  description: string
  areaContext: string
  readinessEstimate: string
  nearbyDevelopment: string
  distanceToSea: number
  distanceToPark: number
  distanceToHospital: number
  densityUnitsPerDunam: number
  committees: {
    national: Committee
    district: Committee
    local: Committee
  }
  standard22: Standard22
}

export const plots: MockPlot[] = [
  {
    id: 'plot-1',
    blockNumber: '10006',
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-17T14:30:00Z',
    number: '168',
    city: 'חדרה',
    sizeSqM: 2011,
    status: 'AVAILABLE',
    totalPrice: 400000,
    taxAuthorityValue: 350000,
    projectedValue: 1200000,
    zoningStage: 'DETAILED_PLAN_PREP',
    ripeness: '3-5',
    coordinates: [
      [32.4505, 34.8735],
      [32.4505, 34.8755],
      [32.4495, 34.8755],
      [32.4495, 34.8735],
    ],
    documents: ['תוכנית 302-0340539', 'נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה 168 ממוקמת 500 מטר מקו החוף במתחם רובע הים חדרה (עיר ימים) — פרויקט הדגל היוקרתי של העיר. התוכנית כוללת כ-10,000 יח"ד, שדרת מלונאות, טיילת חוף באורך 1.5 ק"מ ופארקים ציבוריים. השכונה תוכננה ע"י האדריכל טומס לייטרסדורף ז"ל, מתכנן שכונת עיר ימים בנתניה. צפיפות של 15 יח"ד לדונם עם פוטנציאל תשואה משמעותי.',
    areaContext: 'אתה נמצא בחדרה, במתחם רובע הים המתפתח — השכונה תשתרע לאורך רצועת החוף מגבעת אולגה בדרום ועד נחל חדרה בצפון. גישה ישירה לפארק נחל חדרה ולמרכז הרפואי הלל יפה. השכונה צפויה למשוך אוכלוסיה במדרג חברתי-כלכלי גבוה.',
    readinessEstimate: '3-5 שנים',
    nearbyDevelopment: 'שכונת מגורים חדשה בבנייה 800 מטר צפונה, מתחם מסחרי בתכנון 1.2 ק"מ דרומה.',
    distanceToSea: 500,
    distanceToPark: 300,
    distanceToHospital: 2500,
    densityUnitsPerDunam: 15,
    committees: {
      national: { status: 'approved', label: 'ועדה ארצית', date: '2023-06' },
      district: { status: 'approved', label: 'ועדה מחוזית', date: '2024-01' },
      local: { status: 'in_preparation', label: 'ועדה מקומית', date: null },
    },
    standard22: {
      appraiser: 'רו"ח משה לוי',
      date: '2024-03',
      value: 380000,
      methodology: 'גישת ההשוואה + גישת היוון ההכנסות',
    },
  },
  {
    id: 'plot-2',
    blockNumber: '7842',
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-02-15T11:00:00Z',
    number: '54',
    city: 'נתניה',
    sizeSqM: 1500,
    status: 'RESERVED',
    totalPrice: 520000,
    taxAuthorityValue: 480000,
    projectedValue: 1800000,
    zoningStage: 'MASTER_PLAN_APPROVED',
    ripeness: '3-5',
    coordinates: [
      [32.3330, 34.8570],
      [32.3330, 34.8595],
      [32.3315, 34.8595],
      [32.3315, 34.8570],
    ],
    documents: ['תוכנית נת/620', 'נסח טאבו', 'חוות דעת שמאי', 'סקר סביבתי'],
    description: 'חלקה 54 בגוש 7842 נמצאת באזור הצפוני של נתניה, קרוב לשכונת פולג. תוכנית מתאר מאושרת עם ייעוד למגורים צפוף. מיקום אסטרטגי עם נגישות מצוינת לצירי תנועה ראשיים.',
    areaContext: 'אתה נמצא בנתניה, באזור הצפוני של העיר קרוב לשכונת פולג המתפתחת. אזור עם ביקוש גבוה למגורים צפופים ונגישות מצוינת לצירי תנועה ראשיים.',
    readinessEstimate: '3-5 שנים',
    nearbyDevelopment: 'שכונת פולג החדשה בשלבי אכלוס מתקדמים, מתחם עסקים ומסחר בבנייה פעילה 600 מטר מערבה.',
    distanceToSea: 800,
    distanceToPark: 450,
    distanceToHospital: 3200,
    densityUnitsPerDunam: 18,
    committees: {
      national: { status: 'approved', label: 'ועדה ארצית', date: '2023-03' },
      district: { status: 'approved', label: 'ועדה מחוזית', date: '2023-11' },
      local: { status: 'pending', label: 'ועדה מקומית', date: null },
    },
    standard22: {
      appraiser: 'שמאי יעקב כהן',
      date: '2024-05',
      value: 510000,
      methodology: 'גישת ההשוואה',
    },
  },
  {
    id: 'plot-3',
    blockNumber: '10234',
    created_at: '2025-12-01T09:00:00Z',
    updated_at: '2026-02-10T16:00:00Z',
    number: '23',
    city: 'קיסריה',
    sizeSqM: 3200,
    status: 'AVAILABLE',
    totalPrice: 280000,
    taxAuthorityValue: 220000,
    projectedValue: 950000,
    zoningStage: 'AGRICULTURAL',
    ripeness: '5+',
    coordinates: [
      [32.5000, 34.8870],
      [32.5000, 34.8905],
      [32.4980, 34.8905],
      [32.4980, 34.8870],
    ],
    documents: ['נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה 23 בקיסריה - קרקע חקלאית בשטח גדול עם פוטנציאל ארוך טווח. האזור מיועד לפיתוח עתידי בהתאם לתוכנית מתאר ארצית. מיקום יוקרתי בסמיכות לקיסריה.',
    areaContext: 'אתה נמצא בקיסריה, באזור חקלאי יוקרתי בסמיכות לאזור התעשייה והמגורים של קיסריה. הקרקע מיועדת לפיתוח עתידי בהתאם לתוכנית מתאר ארצית.',
    readinessEstimate: '5+ שנים',
    nearbyDevelopment: 'פארק הייטק קיסריה פעיל 2 ק"מ דרומה, אזור מגורים חדש בשלבי תכנון ראשוניים 1.5 ק"מ מזרחה.',
    distanceToSea: 1200,
    distanceToPark: 600,
    distanceToHospital: 5000,
    densityUnitsPerDunam: 8,
    committees: {
      national: { status: 'in_discussion', label: 'ועדה ארצית', date: null },
      district: { status: 'not_started', label: 'ועדה מחוזית', date: null },
      local: { status: 'not_started', label: 'ועדה מקומית', date: null },
    },
    standard22: {
      appraiser: 'שמאי דוד אברהם',
      date: '2024-01',
      value: 250000,
      methodology: 'גישת ההשוואה + שיטת החילוץ',
    },
  },
]

export interface PointOfInterest {
  name: string
  coordinates: [number, number]
  icon: string
}

export const pointsOfInterest: PointOfInterest[] = [
  { name: 'הים התיכון', coordinates: [32.4510, 34.8680], icon: '🌊' },
  { name: 'פארק נחל חדרה', coordinates: [32.4530, 34.8760], icon: '🌳' },
  { name: 'מרכז רפואי הלל יפה', coordinates: [32.4440, 34.8900], icon: '🏥' },
]

export interface ChatMessage {
  role: 'assistant' | 'user'
  content: string
}

export const aiChatMessages: Record<string, ChatMessage[]> = {
  'plot-1': [
    { role: 'assistant', content: 'שלום! אני היועץ הדיגיטלי שלך. בואו נדבר על חלקה 168 בגוש 10006, חדרה. מדובר בחלקה בשטח של כ-2 דונם הממוקמת 500 מטר בלבד מקו החוף במתחם רובע הים.' },
    { role: 'assistant', content: 'מבחינת התקדמות הוועדות: הוועדה הארצית אישרה (יוני 2023), הוועדה המחוזית אישרה (ינואר 2024), והוועדה המקומית בשלבי הכנה. זה סימן חיובי להתקדמות התכנון.' },
    { role: 'assistant', content: 'ניתוח תשואה: מחיר נוכחי של כ-199 ש"ח למ"ר (כ-400,000 ש"ח) וערך חזוי של כ-597 ש"ח למ"ר בשלב מתקדם (תוכנית מפורטת מאושרת). פוטנציאל לתשואה של עד 200% באופק של 3-5 שנים.' },
    { role: 'assistant', content: 'צפיפות של 15 יח"ד לדונם מעידה על ביקוש גבוה באזור. עם קרבה לים ופארק, המיקום אטרקטיבי מאוד למגורים.' },
    { role: 'assistant', content: 'המלצה שלי: חלקה זו מהווה הזדמנות השקעה טובה עם פרופיל סיכון נמוך. שווי השמאי (תקן 22) מעריך את הקרקע ב-380,000 ש"ח, קרוב למחיר המבוקש. מומלץ למשקיעים עם אופק השקעה של 3-5 שנים.' },
  ],
  'plot-2': [
    { role: 'assistant', content: 'שלום! בואו נסקור את חלקה 54 בגוש 7842, נתניה. מדובר במיקום אסטרטגי בצפון נתניה, קרוב לשכונת פולג המתפתחת.' },
    { role: 'assistant', content: 'נקודת חוזק: תוכנית המתאר כבר מאושרת, מה שמפחית משמעותית את הסיכון. הייעוד למגורים צפופים עם צפיפות של 18 יח"ד לדונם מציע אופק עלייה משמעותי.' },
    { role: 'assistant', content: 'תחזית צמיחה: ערך חזוי של 1,800,000 ש"ח מול מחיר נוכחי של 520,000 ש"ח – פוטנציאל לתשואה של כ-246%. נתניה נחשבת לאחד מאזורי הביקוש הגבוהים במרכז הארץ.' },
    { role: 'assistant', content: 'לוח זמנים: השלב הבא הוא אישור הוועדה המקומית והכנת תוכנית מפורטת. מעריך שהתהליך ייקח כ-3-5 שנים עד למימוש מלא. חשוב לקחת בחשבון את עלויות ההיטל והמיסים.' },
    { role: 'assistant', content: 'סיכום: חלקה זו מתאימה למשקיעים המחפשים איזון בין סיכון לתשואה פוטנציאלית. הנגישות לצירי תנועה ראשיים והקרבה לים מחזקות את האטרקטיביות.' },
  ],
  'plot-3': [
    { role: 'assistant', content: 'שלום! בואו נבחן את חלקה 23 בגוש 10234, קיסריה. מדובר בקרקע חקלאית בשטח של 3.2 דונם במיקום יוקרתי.' },
    { role: 'assistant', content: 'פוטנציאל ארוך טווח: המעבר מקרקע חקלאית למגורים הוא ארוך ומורכב, אך התשואה הפוטנציאלית היא משמעותית – עלייה של עד 239% מהמחיר הנוכחי.' },
    { role: 'assistant', content: 'יתרון המיקום: קיסריה היא אחד המיקומים היוקרתיים בישראל. ערך הקרקע באזור זה צפוי לעלות משמעותית כאשר התכנון יתקדם. מחיר כניסה נמוך יחסית – רק כ-88 ש"ח למ"ר.' },
    { role: 'assistant', content: 'הערכת סיכונים: הוועדה הארצית בשלבי דיון, ועדות מחוזית ומקומית טרם החלו. אופק ההשקעה מוערך ב-5+ שנים, מה שהופך את זה להשקעה לטווח ארוך.' },
    { role: 'assistant', content: 'סיכום: השקעה בקרקע חקלאית בקיסריה מתאימה למשקיעים עם אופק ארוך וסבלנות גבוהה לאי-וודאות תכנונית. המחיר הנמוך מהווה נקודת כניסה אטרקטיבית.' },
  ],
}

export const defaultChatMessages: ChatMessage[] = [
  { role: 'assistant', content: 'שלום! אני היועץ הדיגיטלי שלך להשקעות בקרקעות. בחרו חלקה על המפה כדי לקבל ניתוח מפורט.' },
  { role: 'assistant', content: 'אני יכול לספק מידע על פוטנציאל השקעה, מצב תכנוני, התקדמות ועדות, ונתוני שוק לכל חלקה.' },
  { role: 'assistant', content: 'המערכת כוללת נתונים על 3 חלקות באזורי חדרה, נתניה וקיסריה. לחצו על חלקה לקבלת ניתוח מקיף.' },
  { role: 'assistant', content: 'בקרוב תוכלו לשוחח איתי בצ\'אט ולקבל תשובות מותאמות אישית.' },
]

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value)
}
