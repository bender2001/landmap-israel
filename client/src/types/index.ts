// ─── Core domain types ───

export interface Plot {
  id: string
  number: string
  city: string
  block_number?: string
  blockNumber?: string
  total_price?: number
  totalPrice?: number
  projected_value?: number
  projectedValue?: number
  size_sqm?: number
  sizeSqM?: number
  status?: string
  lat?: number
  lng?: number
  coordinates?: [number, number][]
  zoning_stage?: string
  zoningStage?: string
  readiness_estimate?: string
  readinessEstimate?: string
  views?: number
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  distance_to_sea?: number
  distanceToSea?: number
  distance_to_park?: number
  distanceToPark?: number
  density_units_per_dunam?: number
  densityUnitsPerDunam?: number
  description?: string
  [key: string]: unknown
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

export interface Filters {
  search: string
  city: string
  status: string
  zoningStage: string
  priceMin: number | null
  priceMax: number | null
  areaMin: number | null
  areaMax: number | null
  sortBy: string
}

export interface Lead {
  id: string
  plot_id: string
  name: string
  phone: string
  email?: string
  message?: string
  status: string
  created_at: string
}

export interface Poi {
  id: string
  name: string
  type: string
  lat: number
  lng: number
  description?: string
  [key: string]: unknown
}

export interface MarketOverview {
  total_plots: number
  avg_price: number
  avg_size_sqm: number
  cities: string[]
  [key: string]: unknown
}

export interface MarketCompareData {
  city: string
  avg_price: number
  total_plots: number
  [key: string]: unknown
}

export interface MarketTrend {
  date: string
  avg_price: number
  volume: number
  [key: string]: unknown
}

export interface PriceHistoryEntry {
  date: string
  price: number
  [key: string]: unknown
}

export interface NewListing {
  id: string
  city: string
  total_price: number
  created_at: string
  [key: string]: unknown
}

// ─── Investment-related types ───

export interface InvestmentGrade {
  grade: string
  color: string
  bg: string
  tier: string
}

export interface CAGRResult {
  cagr: number
  years: number
}

export interface DaysOnMarket {
  days: number
  label: string
  color: string
}

export interface ScoreLabel {
  label: string
  color: string
}

export interface MonthlyPaymentOptions {
  ltv?: number
  annualRate?: number
  years?: number
}

export interface MonthlyPaymentResult {
  monthly: number
  downPayment: number
  loanAmount: number
  totalInterest: number
  rate: number
  years: number
  ltv: number
}

export interface InvestmentVerdict {
  emoji: string
  label: string
  description: string
  color: string
  tier: string
}

export interface RiskLevel {
  level: 1 | 2 | 3 | 4 | 5
  label: string
  color: string
  emoji: string
  score: number
  factors: string[]
}

export interface DemandVelocity {
  velocity: number
  label: string
  emoji: string
  color: string
  tier: string
}

export interface CategoryBadge {
  label: string
  emoji: string
  color: string
}

export interface BestInCategoryEntry {
  badges: CategoryBadge[]
}

export interface BuildableValue {
  pricePerBuildableSqm: number
  totalBuildableArea: number
  estimatedUnits: number
  pricePerUnit: number
  efficiencyRatio: number
  density: number
}

export interface TimelineStage {
  key: string
  label: string
  icon: string
  durationMonths: number
  status: 'completed' | 'current' | 'future'
}

export interface InvestmentTimeline {
  stages: TimelineStage[]
  totalMonths: number
  elapsedMonths: number
  remainingMonths: number
  progressPct: number
  currentStage: Omit<TimelineStage, 'status'>
  estimatedYear: number
}

export interface PercentileDimension {
  value: number
  label: string
  cheaperThan?: number
  biggerThan?: number
  betterThan?: number
}

export interface PlotPercentiles {
  price: PercentileDimension | null
  size: PercentileDimension | null
  roi: PercentileDimension | null
  priceSqm: PercentileDimension | null
}

export interface AlternativeReturn {
  label: string
  emoji: string
  rate: number
  futureValue: number
  profit: number
  color: string
}

export interface AlternativeReturns {
  bank: AlternativeReturn
  stock: AlternativeReturn
  land: AlternativeReturn
  years: number
  inflationRate: number
  realReturns: { bank: number; stock: number; land: number }
}

// ─── Geo types ───

export interface LatLng {
  lat: number
  lng: number
}

export interface TravelTime {
  walkMin: number
  driveMin: number
  walkLabel: string
  driveLabel: string
}

export interface CommuteTime {
  city: string
  emoji: string
  distanceKm: number
  drivingMinutes: number
  googleMapsUrl: string
}

// ─── Score breakdown types ───

export interface ScoreFactor {
  key: string
  label: string
  emoji: string
  score: number
  maxPoints: number
  points: number
  explanation: string
  color: string
}

export interface InvestmentScoreBreakdown {
  total: number
  grade: InvestmentGrade
  factors: ScoreFactor[]
}

export interface ScoreBreakdownContext {
  areaAvgPriceSqm?: number
  totalPlots?: number
}

export interface NarrativeContext {
  areaAvgPriceSqm?: number
  cityName?: string
}

// ─── Plot utility types ───

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

export interface TransactionCosts {
  purchaseTax: number
  attorneyFees: number
  appraiserFee: number
  registrationFee: number
  total: number
  totalWithPurchase: number
}

export interface AnnualHoldingCosts {
  arnona: number
  management: number
  opportunityCost: number
  totalAnnual: number
  totalWithOpportunity: number
  arnonaPerSqm: number
}

export interface ExitCosts {
  bettermentLevy: number
  capitalGains: number
  agentCommission: number
  totalExit: number
  netProfit: number
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
