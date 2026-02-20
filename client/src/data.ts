import type { Plot, Poi, ChatMessage } from './types'

export const plots: Plot[] = [
  {
    id: 'plot-1', blockNumber: '10006', number: '168', city: 'חדרה',
    created_at: '2026-02-10T10:00:00Z', updated_at: '2026-02-17T14:30:00Z',
    sizeSqM: 2011, status: 'AVAILABLE', totalPrice: 400000, taxAuthorityValue: 350000,
    projectedValue: 1200000, zoningStage: 'DETAILED_PLAN_PREP', readinessEstimate: '3-5 שנים',
    coordinates: [[32.4505,34.8735],[32.4505,34.8755],[32.4495,34.8755],[32.4495,34.8735]],
    documents: ['תוכנית 302-0340539', 'נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה 168 ממוקמת 500 מטר מקו החוף במתחם רובע הים חדרה — פרויקט הדגל היוקרתי של העיר עם כ-10,000 יח"ד, שדרת מלונאות וטיילת חוף.',
    areaContext: 'מתחם רובע הים — גישה ישירה לפארק נחל חדרה ולמרכז הרפואי הלל יפה.',
    distanceToSea: 500, distanceToPark: 300, distanceToHospital: 2500, densityUnitsPerDunam: 15,
    committees: { national: { status: 'approved', label: 'ועדה ארצית', date: '2023-06' }, district: { status: 'approved', label: 'ועדה מחוזית', date: '2024-01' }, local: { status: 'in_preparation', label: 'ועדה מקומית', date: null } },
    standard22: { appraiser: 'רו"ח משה לוי', date: '2024-03', value: 380000, methodology: 'גישת ההשוואה + היוון הכנסות' },
  },
  {
    id: 'plot-2', blockNumber: '7842', number: '54', city: 'נתניה',
    created_at: '2026-01-20T08:00:00Z', updated_at: '2026-02-15T11:00:00Z',
    sizeSqM: 1500, status: 'RESERVED', totalPrice: 520000, taxAuthorityValue: 480000,
    projectedValue: 1800000, zoningStage: 'MASTER_PLAN_APPROVED', readinessEstimate: '3-5 שנים',
    coordinates: [[32.3330,34.8570],[32.3330,34.8595],[32.3315,34.8595],[32.3315,34.8570]],
    documents: ['תוכנית נת/620', 'נסח טאבו', 'חוות דעת שמאי', 'סקר סביבתי'],
    description: 'חלקה 54 בגוש 7842 בצפון נתניה. תוכנית מתאר מאושרת עם ייעוד למגורים צפוף. מיקום אסטרטגי.',
    areaContext: 'צפון נתניה — אזור ביקוש גבוה למגורים.',
    distanceToSea: 800, distanceToPark: 450, distanceToHospital: 3200, densityUnitsPerDunam: 18,
    committees: { national: { status: 'approved', label: 'ועדה ארצית', date: '2023-03' }, district: { status: 'approved', label: 'ועדה מחוזית', date: '2023-11' }, local: { status: 'pending', label: 'ועדה מקומית', date: null } },
    standard22: { appraiser: 'שמאי יעקב כהן', date: '2024-05', value: 510000, methodology: 'גישת ההשוואה' },
  },
  {
    id: 'plot-3', blockNumber: '10234', number: '23', city: 'קיסריה',
    created_at: '2025-12-01T09:00:00Z', updated_at: '2026-02-10T16:00:00Z',
    sizeSqM: 3200, status: 'AVAILABLE', totalPrice: 280000, taxAuthorityValue: 220000,
    projectedValue: 950000, zoningStage: 'AGRICULTURAL', readinessEstimate: '5+ שנים',
    coordinates: [[32.5000,34.8870],[32.5000,34.8905],[32.4980,34.8905],[32.4980,34.8870]],
    documents: ['נסח טאבו', 'חוות דעת שמאי'],
    description: 'חלקה 23 בקיסריה — קרקע חקלאית גדולה עם פוטנציאל ארוך טווח. מיקום יוקרתי.',
    areaContext: 'קיסריה — אזור חקלאי יוקרתי, קרקע מיועדת לפיתוח עתידי.',
    distanceToSea: 1200, distanceToPark: 600, distanceToHospital: 5000, densityUnitsPerDunam: 8,
    committees: { national: { status: 'in_discussion', label: 'ועדה ארצית', date: null }, district: { status: 'not_started', label: 'ועדה מחוזית', date: null }, local: { status: 'not_started', label: 'ועדה מקומית', date: null } },
    standard22: { appraiser: 'שמאי דוד אברהם', date: '2024-01', value: 250000, methodology: 'גישת ההשוואה + שיטת החילוץ' },
  },
]

export const pois: Poi[] = [
  { id: 'poi-1', name: 'הים התיכון', lat: 32.4510, lng: 34.8680, type: 'nature', icon: '🌊' },
  { id: 'poi-2', name: 'פארק נחל חדרה', lat: 32.4530, lng: 34.8760, type: 'nature', icon: '🌳' },
  { id: 'poi-3', name: 'מרכז רפואי הלל יפה', lat: 32.4440, lng: 34.8900, type: 'health', icon: '🏥' },
]

export const chatMessages: Record<string, ChatMessage[]> = {
  'plot-1': [
    { role: 'assistant', content: 'חלקה 168 בגוש 10006, חדרה. ~2 דונם, 500 מטר מהחוף. ועדה ארצית ומחוזית אישרו. פוטנציאל +200% באופק 3-5 שנים.' },
    { role: 'assistant', content: 'המלצה: הזדמנות טובה עם סיכון נמוך. שווי שמאי ₪380K — קרוב למחיר.' },
  ],
  'plot-2': [
    { role: 'assistant', content: 'חלקה 54 בגוש 7842, נתניה. תוכנית מתאר מאושרת — סיכון מופחת. צפיפות 18 יח"ד/דונם. פוטנציאל +246%.' },
    { role: 'assistant', content: 'מתאימה למשקיעים המחפשים איזון סיכון-תשואה. אופק 3-5 שנים.' },
  ],
  'plot-3': [
    { role: 'assistant', content: 'חלקה 23 בקיסריה. קרקע חקלאית 3.2 דונם. מחיר כניסה ~88 ₪/מ"ר. פוטנציאל +239%. אופק 5+ שנים.' },
    { role: 'assistant', content: 'למשקיעים עם סבלנות. המחיר הנמוך נקודת כניסה אטרקטיבית.' },
  ],
}
export const defaultChat: ChatMessage[] = [
  { role: 'assistant', content: 'שלום! אני היועץ הדיגיטלי שלך. בחרו חלקה על המפה לניתוח.' },
]

// Israeli area boundaries (simplified GeoJSON-like) for map overlay
export const israelAreas = [
  { name: 'חדרה', center: [32.44, 34.88] as [number, number], bounds: [[32.42,34.84],[32.42,34.92],[32.47,34.92],[32.47,34.84]] as [number, number][], color: '#3B82F6' },
  { name: 'נתניה', center: [32.33, 34.86] as [number, number], bounds: [[32.30,34.83],[32.30,34.89],[32.36,34.89],[32.36,34.83]] as [number, number][], color: '#8B5CF6' },
  { name: 'קיסריה', center: [32.50, 34.89] as [number, number], bounds: [[32.48,34.86],[32.48,34.92],[32.52,34.92],[32.52,34.86]] as [number, number][], color: '#10B981' },
  { name: 'הרצליה', center: [32.16, 34.79] as [number, number], bounds: [[32.14,34.77],[32.14,34.81],[32.18,34.81],[32.18,34.77]] as [number, number][], color: '#F59E0B' },
  { name: 'כפר סבא', center: [32.18, 34.91] as [number, number], bounds: [[32.16,34.88],[32.16,34.94],[32.20,34.94],[32.20,34.88]] as [number, number][], color: '#EC4899' },
]
