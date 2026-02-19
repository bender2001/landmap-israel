// ─── Enums ───
export const PlotStatus = {
  AVAILABLE: 'AVAILABLE',
  SOLD: 'SOLD',
  RESERVED: 'RESERVED',
  IN_PLANNING: 'IN_PLANNING',
} as const

export type PlotStatusKey = keyof typeof PlotStatus
export type PlotStatusValue = (typeof PlotStatus)[PlotStatusKey]

export const ZoningStage = {
  AGRICULTURAL: 'AGRICULTURAL',
  MASTER_PLAN_DEPOSIT: 'MASTER_PLAN_DEPOSIT',
  MASTER_PLAN_APPROVED: 'MASTER_PLAN_APPROVED',
  DETAILED_PLAN_PREP: 'DETAILED_PLAN_PREP',
  DETAILED_PLAN_DEPOSIT: 'DETAILED_PLAN_DEPOSIT',
  DETAILED_PLAN_APPROVED: 'DETAILED_PLAN_APPROVED',
  DEVELOPER_TENDER: 'DEVELOPER_TENDER',
  BUILDING_PERMIT: 'BUILDING_PERMIT',
} as const

export type ZoningStageKey = keyof typeof ZoningStage
export type ZoningStageValue = (typeof ZoningStage)[ZoningStageKey]

// ─── Status / Zoning Labels & Colors ───
export const statusColors: Record<PlotStatusKey, string> = {
  AVAILABLE: '#22C55E',
  SOLD: '#EF4444',
  RESERVED: '#F59E0B',
  IN_PLANNING: '#8B5CF6',
}

export const statusLabels: Record<PlotStatusKey, string> = {
  AVAILABLE: 'זמין',
  SOLD: 'נמכר',
  RESERVED: 'שמור',
  IN_PLANNING: 'בתכנון',
}

export const zoningLabels: Record<ZoningStageKey, string> = {
  AGRICULTURAL: 'קרקע חקלאית',
  MASTER_PLAN_DEPOSIT: 'הפקדת תוכנית מתאר',
  MASTER_PLAN_APPROVED: 'תוכנית מתאר מאושרת',
  DETAILED_PLAN_PREP: 'הכנת תוכנית מפורטת',
  DETAILED_PLAN_DEPOSIT: 'הפקדת תוכנית מפורטת',
  DETAILED_PLAN_APPROVED: 'תוכנית מפורטת מאושרת',
  DEVELOPER_TENDER: 'מכרז יזמים',
  BUILDING_PERMIT: 'היתר בנייה',
}

// ─── ROI Stages ───
export interface RoiStage {
  label: string
  pricePerSqM: number
  isCurrent: boolean
}

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

// ─── Zoning Pipeline Stages ───
export interface ZoningPipelineStage {
  key: ZoningStageKey
  label: string
  icon: string
}

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

// ─── Lead status labels ───
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'closed'

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  qualified: 'מתאים',
  converted: 'הומר',
  lost: 'אבוד',
  closed: 'נסגר',
}

export const leadStatusColors: Record<LeadStatus, string> = {
  new: '#3B82F6',
  contacted: '#F59E0B',
  qualified: '#8B5CF6',
  converted: '#22C55E',
  lost: '#EF4444',
  closed: '#6B7280',
}
