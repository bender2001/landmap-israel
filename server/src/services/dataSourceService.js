/**
 * dataSourceService.js — Real data integration with Israeli government sources
 *
 * Sources:
 * 1. nadlan.gov.il (נדל"ן נט) — Real estate transaction data from Ministry of Justice
 * 2. GovMap/Mapi (מנהל התכנון) — Planning data, תב"ע plans
 * 3. Tabu (טאבו) — Land registry (mocked — requires paid subscription)
 */

import { supabaseAdmin } from '../config/supabase.js'

// ─── In-memory cache for API responses ─────────────────────────────────
const apiCache = new Map()
const API_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getCached(key) {
  const entry = apiCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > API_CACHE_TTL) {
    apiCache.delete(key)
    return null
  }
  return entry.data
}

function setCache(key, data) {
  if (apiCache.size > 200) {
    const oldest = apiCache.keys().next().value
    apiCache.delete(oldest)
  }
  apiCache.set(key, { data, ts: Date.now() })
}

// ────────────────────────────────────────────────────────────────────────
// 1. NADLAN.GOV.IL — Real Transaction Data
// ────────────────────────────────────────────────────────────────────────

const NADLAN_API = 'https://www.nadlan.gov.il/Nadlan.REST/Main/GetAssestAndDeals'

/**
 * Fetch real estate transactions from nadlan.gov.il for a given city.
 * @param {string} city - Hebrew city name (e.g. "חדרה")
 * @param {number} months - How many months back to look (default 12)
 * @returns {Promise<Array>} Parsed transaction records
 */
export async function fetchRealTransactions(city, months = 12) {
  const cacheKey = `nadlan:${city}:${months}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const body = {
      ObjectID: '',
      CurrentLavel: 1,
      PageNo: 1,
      OrderByRecent: 1,
      PageNo2: 0,
      City: city,
    }

    const response = await fetch(NADLAN_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LandMap-Israel/2.0 (Real Estate Research)',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`Nadlan API returned ${response.status}: ${response.statusText}`)
    }

    const rawData = await response.json()
    const transactions = parseNadlanResponse(rawData, city, months)

    setCache(cacheKey, transactions)
    return transactions
  } catch (error) {
    console.error(`[dataSource] Nadlan fetch failed for ${city}:`, error.message)
    // Return stored DB data as fallback
    return fetchStoredTransactions(city, months)
  }
}

/**
 * Parse the raw response from nadlan.gov.il into our transaction format.
 */
function parseNadlanResponse(rawData, city, months) {
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - months)

  // The API returns data in various formats — handle known structures
  let deals = []

  if (rawData?.AllResults) {
    deals = rawData.AllResults
  } else if (rawData?.ResultsGrid) {
    deals = rawData.ResultsGrid
  } else if (Array.isArray(rawData)) {
    deals = rawData
  } else if (rawData?.Res) {
    deals = Array.isArray(rawData.Res) ? rawData.Res : []
  }

  return deals
    .map(deal => {
      try {
        const dealDate = parseDateField(deal.DEALDATE || deal.DealDate || deal.dealDate)
        if (dealDate && dealDate < cutoffDate) return null

        return {
          city: city,
          address: deal.FULLADRESS || deal.FullAddress || deal.Address || deal.NEWADDRESS || '',
          block_number: String(deal.GUSH || deal.Gush || deal.Block || ''),
          parcel_number: String(deal.HELKA || deal.Helka || deal.Parcel || ''),
          deal_date: dealDate ? dealDate.toISOString().split('T')[0] : null,
          deal_amount: parseInt(deal.DEALAMOUNT || deal.DealAmount || deal.Amount || 0, 10),
          deal_type: mapDealType(deal.DEALNATURE || deal.DealNature || deal.Nature || ''),
          property_type: mapPropertyType(deal.ASSETTYPE || deal.AssetType || deal.Type || ''),
          size_sqm: parseInt(deal.DEELAREA || deal.DealArea || deal.Area || 0, 10),
          rooms: parseFloat(deal.NEWROOMS || deal.Rooms || 0) || null,
          floor: parseInt(deal.FLOORNO || deal.Floor || 0, 10) || null,
          year_built: parseInt(deal.BUILDINGYEAR || deal.BuildYear || 0, 10) || null,
          source: 'nadlan.gov.il',
          source_id: deal.OBJECTID || deal.ObjectId || deal.ID || null,
          raw_data: deal,
        }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .filter(t => t.deal_amount > 0)
}

function parseDateField(dateStr) {
  if (!dateStr) return null
  // Handle /Date(timestamp)/ format from .NET APIs
  const msMatch = dateStr.match?.(/\/Date\((-?\d+)\)\//)
  if (msMatch) return new Date(parseInt(msMatch[1], 10))
  // Handle ISO or regular date strings
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function mapDealType(type) {
  const t = String(type).toLowerCase()
  if (t.includes('מכירה') || t.includes('sale') || t === '1') return 'sale'
  if (t.includes('חכירה') || t.includes('lease') || t === '2') return 'lease'
  if (t.includes('מתנה') || t.includes('gift') || t === '3') return 'gift'
  if (t.includes('ירושה') || t.includes('inherit') || t === '4') return 'inheritance'
  return 'sale'
}

function mapPropertyType(type) {
  const t = String(type).toLowerCase()
  if (t.includes('קרקע') || t.includes('land') || t === '10') return 'land'
  if (t.includes('דירה') || t.includes('apartment') || t === '1') return 'apartment'
  if (t.includes('בית') || t.includes('house') || t === '3') return 'house'
  if (t.includes('מסחרי') || t.includes('commercial') || t === '5') return 'commercial'
  return 'other'
}

/**
 * Fallback: Get transactions stored in our DB.
 */
async function fetchStoredTransactions(city, months) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - months)

    const { data, error } = await supabaseAdmin
      .from('real_transactions')
      .select('*')
      .eq('city', city)
      .gte('deal_date', cutoffDate.toISOString().split('T')[0])
      .order('deal_date', { ascending: false })
      .limit(100)

    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

/**
 * Store fetched transactions in the database (upsert by source_id).
 */
export async function storeTransactions(transactions) {
  if (!transactions || transactions.length === 0) return { stored: 0 }

  try {
    const records = transactions.map(t => ({
      ...t,
      fetched_at: new Date().toISOString(),
    }))

    // Batch insert, skip duplicates via source_id
    let stored = 0
    for (const batch of chunk(records, 50)) {
      const { data, error } = await supabaseAdmin
        .from('real_transactions')
        .upsert(batch, {
          onConflict: 'source_id',
          ignoreDuplicates: true,
        })

      if (!error) stored += batch.length
    }

    // Update data source tracking
    await supabaseAdmin
      .from('data_sources')
      .update({
        last_fetch: new Date().toISOString(),
        last_success: new Date().toISOString(),
        records_count: stored,
      })
      .eq('source_name', 'nadlan.gov.il')

    return { stored }
  } catch (error) {
    console.error('[dataSource] Store transactions failed:', error.message)
    return { stored: 0, error: error.message }
  }
}

// ────────────────────────────────────────────────────────────────────────
// 2. GOVMAP — Planning Data (מנהל התכנון)
// ────────────────────────────────────────────────────────────────────────

const GOVMAP_PLANS_API = 'https://ags.govmap.gov.il/Taba/GetPlansByParams'

/**
 * Fetch planning data (תב"ע) for a block/parcel from GovMap.
 * @param {string} blockNumber - Block number (גוש)
 * @param {string} parcelNumber - Parcel number (חלקה)
 * @returns {Promise<Array>} Parsed planning permits
 */
export async function fetchPlanningData(blockNumber, parcelNumber) {
  const cacheKey = `govmap:${blockNumber}:${parcelNumber}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const params = {
      Ession: '',
      Ession2: '',
      Ession3: '',
      where: '',
      gush: blockNumber,
      helka: parcelNumber || '',
      PlanName: '',
      Status: '',
      Type: '',
      DistrictName: '',
      MuniName: '',
    }

    const response = await fetch(GOVMAP_PLANS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'LandMap-Israel/2.0 (Planning Research)',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`GovMap API returned ${response.status}: ${response.statusText}`)
    }

    const rawData = await response.json()
    const plans = parseGovMapResponse(rawData, blockNumber, parcelNumber)

    setCache(cacheKey, plans)
    return plans
  } catch (error) {
    console.error(`[dataSource] GovMap fetch failed for block ${blockNumber}:`, error.message)
    // Return stored DB data as fallback
    return fetchStoredPlans(blockNumber, parcelNumber)
  }
}

/**
 * Fetch planning data by city name.
 */
export async function fetchPlanningDataByCity(city) {
  const cacheKey = `govmap:city:${city}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const params = {
      Ession: '',
      Ession2: '',
      Ession3: '',
      where: '',
      gush: '',
      helka: '',
      PlanName: '',
      Status: '',
      Type: '',
      DistrictName: '',
      MuniName: city,
    }

    const response = await fetch(GOVMAP_PLANS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      throw new Error(`GovMap API returned ${response.status}`)
    }

    const rawData = await response.json()
    const plans = parseGovMapResponse(rawData)

    setCache(cacheKey, plans)
    return plans
  } catch (error) {
    console.error(`[dataSource] GovMap city fetch failed for ${city}:`, error.message)
    return fetchStoredPlansByCity(city)
  }
}

/**
 * Parse GovMap API response into our planning_permits format.
 */
function parseGovMapResponse(rawData, blockNumber, parcelNumber) {
  let plans = []

  if (rawData?.data) {
    plans = Array.isArray(rawData.data) ? rawData.data : []
  } else if (rawData?.features) {
    plans = rawData.features.map(f => f.attributes || f.properties || f)
  } else if (Array.isArray(rawData)) {
    plans = rawData
  }

  return plans.map(plan => {
    try {
      return {
        plan_number: plan.PL_NUMBER || plan.pl_number || plan.PlanNumber || plan.PLAN_NAME || '',
        plan_name: plan.PL_NAME || plan.pl_name || plan.PlanName || plan.PLAN_DESC || '',
        plan_type: mapPlanType(plan.PL_LANDUSE_TYPE || plan.Type || plan.PLAN_TYPE || ''),
        status: mapPlanStatus(plan.STATION_DESC || plan.Status || plan.PL_STATUS || ''),
        status_date: parseDateField(plan.LAST_UPDATE || plan.StatusDate || plan.UPDATE_DATE)
          ?.toISOString()?.split('T')[0] || null,
        city: plan.PL_AUTHORITY_NAME || plan.MuniName || plan.CITY || '',
        area_description: plan.PL_AREA_DUNAM
          ? `${plan.PL_AREA_DUNAM} דונם`
          : plan.AreaDescription || '',
        total_units: parseInt(plan.PL_HOUSING_UNITS || plan.Units || 0, 10) || null,
        total_area_sqm: parseInt(plan.PL_AREA_DUNAM || 0, 10) * 1000 || null,
        main_uses: parseMainUses(plan.PL_LANDUSE_TYPE || plan.LandUse || ''),
        documents_url: plan.PL_URL || plan.DocumentUrl || null,
        govmap_link: plan.PL_NUMBER
          ? `https://www.govmap.gov.il/?q=${encodeURIComponent(plan.PL_NUMBER)}`
          : null,
        raw_data: plan,
      }
    } catch {
      return null
    }
  }).filter(Boolean)
}

function mapPlanType(type) {
  const t = String(type).toLowerCase()
  if (t.includes('ארצ')) return 'national'       // תב"ע ארצית
  if (t.includes('מחוז')) return 'district'       // תב"ע מחוזית
  if (t.includes('מקומ')) return 'local'          // תב"ע מקומית
  if (t.includes('מפורט')) return 'detailed'      // תב"ע מפורטת
  if (t.includes('נקודת')) return 'point'         // תכנית נקודתית
  return 'other'
}

function mapPlanStatus(status) {
  const s = String(status).toLowerCase()
  if (s.includes('אושר') || s.includes('תוקף') || s.includes('approved')) return 'approved'
  if (s.includes('הפקד') || s.includes('deposited')) return 'deposited'
  if (s.includes('הכנה') || s.includes('preparation')) return 'in_preparation'
  if (s.includes('דיון') || s.includes('discussion')) return 'in_discussion'
  if (s.includes('בוטל') || s.includes('cancelled')) return 'cancelled'
  return 'unknown'
}

function parseMainUses(landUse) {
  const uses = []
  const t = String(landUse).toLowerCase()
  if (t.includes('מגור') || t.includes('resid')) uses.push('residential')
  if (t.includes('מסחר') || t.includes('commercial')) uses.push('commercial')
  if (t.includes('תעשי') || t.includes('industrial')) uses.push('industrial')
  if (t.includes('ציבור') || t.includes('public')) uses.push('public')
  if (t.includes('חקלא') || t.includes('agri')) uses.push('agricultural')
  if (t.includes('תיירות') || t.includes('tourism')) uses.push('tourism')
  if (uses.length === 0) uses.push('mixed')
  return uses
}

/**
 * Fallback: Get plans from DB.
 */
async function fetchStoredPlans(blockNumber, parcelNumber) {
  try {
    // Try finding plans linked to plots with this block/parcel
    let query = supabaseAdmin
      .from('planning_permits')
      .select('*')
      .order('status_date', { ascending: false })
      .limit(20)

    // If we have block info, look for city-based results
    if (blockNumber) {
      const { data: plots } = await supabaseAdmin
        .from('plots')
        .select('city')
        .eq('block_number', blockNumber)
        .limit(1)

      if (plots && plots[0]?.city) {
        query = query.eq('city', plots[0].city)
      }
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

async function fetchStoredPlansByCity(city) {
  try {
    const { data, error } = await supabaseAdmin
      .from('planning_permits')
      .select('*')
      .eq('city', city)
      .order('status_date', { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

/**
 * Store fetched plans in the database.
 */
export async function storePlans(plans) {
  if (!plans || plans.length === 0) return { stored: 0 }

  try {
    const records = plans.map(p => ({
      ...p,
      fetched_at: new Date().toISOString(),
    }))

    let stored = 0
    for (const batch of chunk(records, 50)) {
      const { error } = await supabaseAdmin
        .from('planning_permits')
        .upsert(batch, {
          onConflict: 'plan_number',
          ignoreDuplicates: true,
        })

      if (!error) stored += batch.length
    }

    await supabaseAdmin
      .from('data_sources')
      .update({
        last_fetch: new Date().toISOString(),
        last_success: new Date().toISOString(),
        records_count: stored,
      })
      .eq('source_name', 'govmap.gov.il')

    return { stored }
  } catch (error) {
    console.error('[dataSource] Store plans failed:', error.message)
    return { stored: 0, error: error.message }
  }
}

// ────────────────────────────────────────────────────────────────────────
// 3. TABU (טאבו) — Land Registry (Mocked)
// ────────────────────────────────────────────────────────────────────────
// Note: Actual טאבו access requires a paid subscription to the Israeli
// Land Registry (רשם המקרקעין). This service builds the data model and
// provides a mock integration that can be replaced with the real API.

/**
 * Fetch cadastral data from Tabu (mocked).
 * In production, this would connect to the Tabu online service.
 */
export async function fetchCadastralData(blockNumber, parcelNumber) {
  const cacheKey = `tabu:${blockNumber}:${parcelNumber}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  // Mock response structure matching real Tabu output
  const mockData = {
    block_number: blockNumber,
    parcel_number: parcelNumber,
    sub_parcel: null,
    ownership_type: 'unknown',        // רמ"י / פרטי / unknown
    registration_date: null,
    registry_reference: null,
    area_sqm: null,
    rights: [],
    notes: [],
    is_mock: true,
    disclaimer: 'נתוני טאבו אמיתיים דורשים מנוי בתשלום לרשם המקרקעין. נתונים אלו הם מבנה לדוגמה בלבד.',
  }

  setCache(cacheKey, mockData)
  return mockData
}

// ────────────────────────────────────────────────────────────────────────
// 4. DATA SOURCE STATUS
// ────────────────────────────────────────────────────────────────────────

/**
 * Get the status of all configured data sources.
 */
export async function getDataSourceStatus() {
  try {
    const { data, error } = await supabaseAdmin
      .from('data_sources')
      .select('*')
      .order('source_name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[dataSource] Status fetch failed:', error.message)
    return []
  }
}

// ────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────

/**
 * Split an array into chunks of a given size.
 */
function chunk(arr, size) {
  const chunks = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}
