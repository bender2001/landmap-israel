import type { Plot } from '../types'

export type { Plot }

export function getPlotPrice(p: Plot): number {
  return p.total_price ?? p.totalPrice ?? 0
}

export function getPlotProjectedValue(p: Plot): number {
  return p.projected_value ?? p.projectedValue ?? 0
}

export function getPlotSize(p: Plot): number {
  return p.size_sqm ?? p.sizeSqM ?? 0
}

export function getPlotBlockNumber(p: Plot): string {
  return p.block_number ?? p.blockNumber ?? ''
}

export function getPlotReadiness(p: Plot): string {
  return p.readiness_estimate ?? p.readinessEstimate ?? ''
}

export function getPlotZoning(p: Plot): string {
  return p.zoning_stage ?? p.zoningStage ?? ''
}

export function getPlotCreatedAt(p: Plot): string | null {
  return p.created_at ?? p.createdAt ?? null
}

export function getPlotUpdatedAt(p: Plot): string | null {
  return p.updated_at ?? p.updatedAt ?? null
}

export interface NormalizedPlot {
  id: string
  number: string
  blockNumber: string
  city: string
  status: string
  totalPrice: number
  projectedValue: number
  sizeSqm: number
  coordinates: [number, number][]
  zoningStage: string
  readinessEstimate: string
  distanceToSea: number | null
  distanceToPark: number | null
  distanceToHospital: number | null
  description: string
  areaContext: string
  nearbyDevelopment: string
  views: number
  isPublished: boolean
  createdAt: string | null
  updatedAt: string | null
  images: unknown[]
  documents: unknown[]
  _investmentScore: number | null
  _grade: string | null
  _roi: number | null
  _score: number | null
  _dealPct: number | null
  _matchReasons: string[] | null
  _raw: Plot
}

export function normalizePlot(raw: Plot | null): NormalizedPlot | null {
  if (!raw) return null

  return {
    id: raw.id,
    number: raw.number ?? '',
    blockNumber: raw.block_number ?? raw.blockNumber ?? '',
    city: raw.city ?? '',
    status: raw.status ?? 'UNKNOWN',
    totalPrice: raw.total_price ?? raw.totalPrice ?? 0,
    projectedValue: raw.projected_value ?? raw.projectedValue ?? 0,
    sizeSqm: raw.size_sqm ?? raw.sizeSqM ?? 0,
    coordinates: (raw.coordinates ?? []) as [number, number][],
    zoningStage: raw.zoning_stage ?? raw.zoningStage ?? '',
    readinessEstimate: raw.readiness_estimate ?? raw.readinessEstimate ?? '',
    distanceToSea: raw.distance_to_sea ?? raw.distanceToSea ?? null,
    distanceToPark: raw.distance_to_park ?? raw.distanceToPark ?? null,
    distanceToHospital: (raw.distance_to_hospital as number | undefined) ?? (raw.distanceToHospital as number | undefined) ?? null,
    description: raw.description ?? '',
    areaContext: (raw.area_context as string | undefined) ?? (raw.areaContext as string | undefined) ?? '',
    nearbyDevelopment: (raw.nearby_development as string | undefined) ?? (raw.nearbyDevelopment as string | undefined) ?? '',
    views: raw.views ?? 0,
    isPublished: (raw.is_published as boolean | undefined) ?? (raw.isPublished as boolean | undefined) ?? false,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
    images: (raw.plot_images as unknown[] | undefined) ?? (raw.images as unknown[] | undefined) ?? [],
    documents: (raw.plot_documents as unknown[] | undefined) ?? (raw.documents as unknown[] | undefined) ?? [],
    _investmentScore: (raw._investmentScore as number | null | undefined) ?? null,
    _grade: (raw._grade as string | null | undefined) ?? null,
    _roi: (raw._roi as number | null | undefined) ?? null,
    _score: (raw._score as number | null | undefined) ?? null,
    _dealPct: (raw._dealPct as number | null | undefined) ?? null,
    _matchReasons: (raw._matchReasons as string[] | null | undefined) ?? null,
    _raw: raw,
  }
}

export interface PlotMetrics {
  roi: number
  grossProfit: number
  pricePerSqm: number
  pricePerDunam: number
  projectedPerSqm: number
  dunam: number
  price: number
  projected: number
  sizeSqm: number
}

export function calcPlotMetrics(p: Plot): PlotMetrics {
  const price = getPlotPrice(p)
  const projected = getPlotProjectedValue(p)
  const sizeSqm = getPlotSize(p)

  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  const grossProfit = projected - price
  const pricePerSqm = sizeSqm > 0 ? Math.round(price / sizeSqm) : 0
  const pricePerDunam = sizeSqm > 0 ? Math.round((price / sizeSqm) * 1000) : 0
  const projectedPerSqm = sizeSqm > 0 ? Math.round(projected / sizeSqm) : 0
  const dunam = sizeSqm > 0 ? sizeSqm / 1000 : 0

  return { roi, grossProfit, pricePerSqm, pricePerDunam, projectedPerSqm, dunam, price, projected, sizeSqm }
}

export interface TransactionCosts {
  purchaseTax: number
  attorneyFees: number
  appraiserFee: number
  registrationFee: number
  total: number
  totalWithPurchase: number
}

export function calcTransactionCosts(totalPrice: number): TransactionCosts {
  const purchaseTax = Math.round(totalPrice * 0.06)
  const attorneyFees = Math.round(totalPrice * 0.0175)
  const appraiserFee = Math.round(Math.min(Math.max(totalPrice * 0.003, 2000), 8000))
  const registrationFee = 167

  const total = purchaseTax + attorneyFees + appraiserFee + registrationFee

  return {
    purchaseTax,
    attorneyFees,
    appraiserFee,
    registrationFee,
    total,
    totalWithPurchase: totalPrice + total,
  }
}

export interface AnnualHoldingCosts {
  arnona: number
  management: number
  opportunityCost: number
  totalAnnual: number
  totalWithOpportunity: number
  arnonaPerSqm: number
}

export function calcAnnualHoldingCosts(
  totalPrice: number,
  sizeSqm: number,
  zoningStage: string
): AnnualHoldingCosts {
  const isAdvancedZoning = ['DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT'].includes(zoningStage)
  const arnonaPerSqm = isAdvancedZoning ? 5 : 2.5
  const arnona = Math.round(sizeSqm * arnonaPerSqm)
  const management = Math.round(sizeSqm * 1.5)
  const opportunityCost = Math.round(totalPrice * 0.08)
  const totalAnnual = arnona + management
  const totalWithOpportunity = totalAnnual + opportunityCost

  return { arnona, management, opportunityCost, totalAnnual, totalWithOpportunity, arnonaPerSqm }
}

export interface ExitCosts {
  bettermentLevy: number
  capitalGains: number
  agentCommission: number
  totalExit: number
  netProfit: number
}

export function calcExitCosts(totalPrice: number, projectedValue: number): ExitCosts {
  const grossProfit = projectedValue - totalPrice
  if (grossProfit <= 0) {
    return { bettermentLevy: 0, capitalGains: 0, agentCommission: 0, totalExit: 0, netProfit: grossProfit }
  }

  const bettermentLevy = Math.round(grossProfit * 0.5)
  const purchaseCosts = Math.round(totalPrice * 0.0775)
  const taxableGain = Math.max(0, grossProfit - bettermentLevy - purchaseCosts)
  const capitalGains = Math.round(taxableGain * 0.25)
  const agentCommission = Math.round(projectedValue * 0.01)
  const totalExit = bettermentLevy + capitalGains + agentCommission
  const netProfit = grossProfit - purchaseCosts - totalExit

  return { bettermentLevy, capitalGains, agentCommission, totalExit, netProfit }
}

export interface InvestmentPnL {
  purchasePrice: number
  projectedValue: number
  holdingYears: number
  transaction: TransactionCosts
  annual: AnnualHoldingCosts
  exit: ExitCosts
  totalHoldingCosts: number
  totalInvestment: number
  grossProfit: number
  netProfit: number
  trueRoi: number
  headlineRoi: number
}

export function calcInvestmentPnL(plot: Plot, holdingYears = 5): InvestmentPnL {
  const price = getPlotPrice(plot)
  const projected = getPlotProjectedValue(plot)
  const sizeSqm = getPlotSize(plot)
  const zoning = getPlotZoning(plot)

  const transaction = calcTransactionCosts(price)
  const annual = calcAnnualHoldingCosts(price, sizeSqm, zoning)
  const exit = calcExitCosts(price, projected)

  const totalHoldingCosts = annual.totalAnnual * holdingYears
  const totalInvestment = transaction.totalWithPurchase + totalHoldingCosts
  const netProfit = exit.netProfit - totalHoldingCosts
  const trueRoi = totalInvestment > 0 ? Math.round((netProfit / totalInvestment) * 100) : 0

  return {
    purchasePrice: price,
    projectedValue: projected,
    holdingYears,
    transaction,
    annual,
    exit,
    totalHoldingCosts,
    totalInvestment,
    grossProfit: projected - price,
    netProfit,
    trueRoi,
    headlineRoi: price > 0 ? Math.round(((projected - price) / price) * 100) : 0,
  }
}
