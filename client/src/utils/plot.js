/**
 * Plot data normalization utility.
 *
 * The Supabase DB uses snake_case columns (total_price, block_number, size_sqm),
 * while some client-side code and API transformations use camelCase (totalPrice, blockNumber, sizeSqM).
 * Every component currently does `p.total_price ?? p.totalPrice` — a massive DRY violation
 * that's error-prone and hard to maintain.
 *
 * This module provides:
 * - `normalizePlot(raw)` — converts a raw plot object to a standardized shape
 * - `getPlotPrice(p)` / `getPlotSize(p)` — safe field accessors
 * - `calcPlotMetrics(p)` — derived investment metrics (ROI, price/sqm, CAGR, etc.)
 *
 * Usage:
 *   import { normalizePlot, getPlotPrice, calcPlotMetrics } from '../utils/plot'
 *   const plot = normalizePlot(rawApiData)
 *   const { roi, pricePerSqm, pricePerDunam } = calcPlotMetrics(plot)
 *
 * Incremental adoption: components can use individual getters without full normalization.
 */

// ─── Safe field accessors ─────────────────────────────────────────────
// Use these for quick access without full normalization.
// Each handles both snake_case (DB) and camelCase (JS) field names.

export function getPlotPrice(p) {
  return p.total_price ?? p.totalPrice ?? 0
}

export function getPlotProjectedValue(p) {
  return p.projected_value ?? p.projectedValue ?? 0
}

export function getPlotSize(p) {
  return p.size_sqm ?? p.sizeSqM ?? 0
}

export function getPlotBlockNumber(p) {
  return p.block_number ?? p.blockNumber ?? ''
}

export function getPlotReadiness(p) {
  return p.readiness_estimate ?? p.readinessEstimate ?? ''
}

export function getPlotZoning(p) {
  return p.zoning_stage ?? p.zoningStage ?? ''
}

export function getPlotCreatedAt(p) {
  return p.created_at ?? p.createdAt ?? null
}

export function getPlotUpdatedAt(p) {
  return p.updated_at ?? p.updatedAt ?? null
}

// ─── Full normalization ───────────────────────────────────────────────
// Converts a raw API/DB plot object to a standardized shape.
// Returns a new object with camelCase keys and sensible defaults.
// The original object is NOT mutated.

export function normalizePlot(raw) {
  if (!raw) return null

  return {
    // Identity
    id: raw.id,
    number: raw.number ?? '',
    blockNumber: raw.block_number ?? raw.blockNumber ?? '',
    city: raw.city ?? '',
    status: raw.status ?? 'UNKNOWN',

    // Financial
    totalPrice: raw.total_price ?? raw.totalPrice ?? 0,
    projectedValue: raw.projected_value ?? raw.projectedValue ?? 0,

    // Physical
    sizeSqm: raw.size_sqm ?? raw.sizeSqM ?? 0,
    coordinates: raw.coordinates ?? [],

    // Planning
    zoningStage: raw.zoning_stage ?? raw.zoningStage ?? '',
    readinessEstimate: raw.readiness_estimate ?? raw.readinessEstimate ?? '',

    // Proximity
    distanceToSea: raw.distance_to_sea ?? raw.distanceToSea ?? null,
    distanceToPark: raw.distance_to_park ?? raw.distanceToPark ?? null,
    distanceToHospital: raw.distance_to_hospital ?? raw.distanceToHospital ?? null,

    // Content
    description: raw.description ?? '',
    areaContext: raw.area_context ?? raw.areaContext ?? '',
    nearbyDevelopment: raw.nearby_development ?? raw.nearbyDevelopment ?? '',

    // Metadata
    views: raw.views ?? 0,
    isPublished: raw.is_published ?? raw.isPublished ?? false,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,

    // Relations
    images: raw.plot_images ?? raw.images ?? [],
    documents: raw.plot_documents ?? raw.documents ?? [],

    // Server-computed fields (may not always be present)
    _investmentScore: raw._investmentScore ?? null,
    _grade: raw._grade ?? null,
    _roi: raw._roi ?? null,
    _score: raw._score ?? null,
    _dealPct: raw._dealPct ?? null,
    _matchReasons: raw._matchReasons ?? null,

    // Keep original reference for any fields we haven't mapped
    _raw: raw,
  }
}

// ─── Derived metrics ──────────────────────────────────────────────────
// Compute standard investment metrics from a plot (normalized or raw).

export function calcPlotMetrics(p) {
  const price = getPlotPrice(p)
  const projected = getPlotProjectedValue(p)
  const sizeSqm = getPlotSize(p)

  const roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  const grossProfit = projected - price
  const pricePerSqm = sizeSqm > 0 ? Math.round(price / sizeSqm) : 0
  const pricePerDunam = sizeSqm > 0 ? Math.round((price / sizeSqm) * 1000) : 0
  const projectedPerSqm = sizeSqm > 0 ? Math.round(projected / sizeSqm) : 0
  const dunam = sizeSqm > 0 ? sizeSqm / 1000 : 0

  return {
    roi,
    grossProfit,
    pricePerSqm,
    pricePerDunam,
    projectedPerSqm,
    dunam,
    price,
    projected,
    sizeSqm,
  }
}

// ─── Israeli real estate cost calculations ────────────────────────────
// Standard cost breakdown for land investment in Israel.
// These are estimates — actual costs depend on specific circumstances.

/**
 * Calculate one-time transaction costs for purchasing land in Israel.
 *
 * Includes:
 * - Purchase tax (mas rechisha) — 6% for investment land
 * - Attorney fees — ~1.5% + VAT (~1.75% total)
 * - Appraiser fees — fixed estimate
 * - Registration fees — minimal
 */
export function calcTransactionCosts(totalPrice) {
  const purchaseTax = Math.round(totalPrice * 0.06)
  const attorneyFees = Math.round(totalPrice * 0.0175)
  const appraiserFee = Math.round(Math.min(Math.max(totalPrice * 0.003, 2000), 8000))
  const registrationFee = 167 // Fixed Tabu fee (2024 rates)

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

/**
 * Calculate estimated annual holding costs for land in Israel.
 *
 * Agricultural/undeveloped land has significantly lower costs than built property:
 * - Arnona (municipal tax) — minimal for agricultural land (~₪2-5/sqm/year)
 * - Land management — fencing, clearing, security if needed
 * - Opportunity cost — what the capital could earn elsewhere (stock market ~8% avg)
 *
 * These costs reduce the effective ROI and are often overlooked by novice investors.
 */
export function calcAnnualHoldingCosts(totalPrice, sizeSqm, zoningStage) {
  // Arnona rates vary by municipality and zoning stage.
  // Agricultural land: ~₪2-4/sqm/year
  // Land with approved plans: ~₪4-8/sqm/year (higher municipal assessment)
  const isAdvancedZoning = ['DETAILED_PLAN_APPROVED', 'DEVELOPER_TENDER', 'BUILDING_PERMIT'].includes(zoningStage)
  const arnonaPerSqm = isAdvancedZoning ? 5 : 2.5
  const arnona = Math.round(sizeSqm * arnonaPerSqm)

  // Land management — basic maintenance (clearing, fencing upkeep)
  // Roughly ₪1-2/sqm/year for medium plots
  const managementPerSqm = 1.5
  const management = Math.round(sizeSqm * managementPerSqm)

  // Opportunity cost — what the invested capital would earn in S&P 500 (historical ~8%)
  const opportunityCostRate = 0.08
  const opportunityCost = Math.round(totalPrice * opportunityCostRate)

  const totalAnnual = arnona + management
  const totalWithOpportunity = totalAnnual + opportunityCost

  return {
    arnona,
    management,
    opportunityCost,
    totalAnnual,           // Direct cash costs only
    totalWithOpportunity,  // Including opportunity cost
    arnonaPerSqm,
  }
}

/**
 * Calculate exit costs (selling) for land in Israel.
 *
 * - Betterment levy (hetel hashbacha) — 50% of value increase due to zoning changes
 * - Capital gains tax (mas shevach) — 25% on profit after deductions
 * - Selling agent commission — ~1-2% if using an agent
 */
export function calcExitCosts(totalPrice, projectedValue) {
  const grossProfit = projectedValue - totalPrice
  if (grossProfit <= 0) {
    return { bettermentLevy: 0, capitalGains: 0, agentCommission: 0, totalExit: 0, netProfit: grossProfit }
  }

  const bettermentLevy = Math.round(grossProfit * 0.5)
  const purchaseCosts = Math.round(totalPrice * 0.0775)
  const taxableGain = Math.max(0, grossProfit - bettermentLevy - purchaseCosts)
  const capitalGains = Math.round(taxableGain * 0.25)
  const agentCommission = Math.round(projectedValue * 0.01) // 1% selling agent

  const totalExit = bettermentLevy + capitalGains + agentCommission
  const netProfit = grossProfit - purchaseCosts - totalExit

  return {
    bettermentLevy,
    capitalGains,
    agentCommission,
    totalExit,
    netProfit,
  }
}

/**
 * Complete investment P&L (Profit & Loss) statement.
 *
 * Combines transaction costs, holding costs, and exit costs into a single
 * financial summary. The "true ROI" accounts for ALL costs — not just
 * the headline price vs projected value.
 *
 * @param {object} plot - Plot object (normalized or raw)
 * @param {number} holdingYears - Expected holding period in years
 * @returns {object} Complete P&L breakdown
 */
export function calcInvestmentPnL(plot, holdingYears = 5) {
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
    // Inputs
    purchasePrice: price,
    projectedValue: projected,
    holdingYears,

    // Costs
    transaction,
    annual,
    exit,
    totalHoldingCosts,
    totalInvestment,

    // Results
    grossProfit: projected - price,
    netProfit,
    trueRoi,     // After ALL costs
    headlineRoi: price > 0 ? Math.round(((projected - price) / price) * 100) : 0,
  }
}
