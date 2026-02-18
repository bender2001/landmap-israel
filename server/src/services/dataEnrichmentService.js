/**
 * dataEnrichmentService.js — Enriches plot data from multiple government sources
 *
 * Orchestrates data from nadlan.gov.il, GovMap, and Tabu to provide
 * comprehensive investment intelligence for each plot.
 */

import { supabaseAdmin } from '../config/supabase.js'
import {
  fetchRealTransactions,
  storeTransactions,
  fetchPlanningData,
  storePlans,
  fetchCadastralData,
} from './dataSourceService.js'

/**
 * Enrich a plot with data from all available government sources.
 *
 * 1. Fetches nearby real transactions from nadlan.gov.il
 * 2. Fetches planning data from GovMap for the plot's block/parcel
 * 3. Fetches cadastral data from Tabu (mocked)
 * 4. Stores enriched data in DB and links to the plot
 * 5. Updates plot analytics fields with computed averages
 *
 * @param {string} plotId - UUID of the plot to enrich
 * @returns {Promise<Object>} Enrichment results summary
 */
export async function enrichPlotFromSources(plotId) {
  const startTime = Date.now()
  const results = {
    plotId,
    transactions: { fetched: 0, stored: 0, linked: 0 },
    plans: { fetched: 0, stored: 0, linked: 0 },
    cadastral: null,
    analytics: null,
    errors: [],
    durationMs: 0,
  }

  try {
    // 1. Fetch the plot details
    const { data: plot, error: plotError } = await supabaseAdmin
      .from('plots')
      .select('*')
      .eq('id', plotId)
      .single()

    if (plotError || !plot) {
      throw new Error(`Plot not found: ${plotId}`)
    }

    const city = plot.city
    const blockNumber = plot.block_number
    const parcelNumber = plot.number

    // 2. Fetch & store real transactions from nadlan.gov.il
    try {
      const transactions = await fetchRealTransactions(city, 24) // last 2 years
      results.transactions.fetched = transactions.length

      if (transactions.length > 0) {
        const storeResult = await storeTransactions(transactions)
        results.transactions.stored = storeResult.stored

        // Link nearby transactions to this plot
        const linked = await linkTransactionsToPlot(plotId, city, blockNumber, parcelNumber)
        results.transactions.linked = linked
      }
    } catch (error) {
      results.errors.push(`transactions: ${error.message}`)
    }

    // 3. Fetch & store planning data from GovMap
    try {
      const plans = await fetchPlanningData(blockNumber, parcelNumber)
      results.plans.fetched = plans.length

      if (plans.length > 0) {
        const storeResult = await storePlans(plans)
        results.plans.stored = storeResult.stored

        // Link relevant plans to this plot
        const linked = await linkPlansToPlot(plotId, blockNumber, parcelNumber, city)
        results.plans.linked = linked
      }
    } catch (error) {
      results.errors.push(`plans: ${error.message}`)
    }

    // 4. Fetch cadastral data (mocked)
    try {
      results.cadastral = await fetchCadastralData(blockNumber, parcelNumber)
    } catch (error) {
      results.errors.push(`cadastral: ${error.message}`)
    }

    // 5. Compute and update analytics
    try {
      const analytics = await computePlotAnalytics(plotId, city)
      results.analytics = analytics
    } catch (error) {
      results.errors.push(`analytics: ${error.message}`)
    }

  } catch (error) {
    results.errors.push(`enrichment: ${error.message}`)
  }

  results.durationMs = Date.now() - startTime
  return results
}

/**
 * Link transactions from the same city/block to a plot.
 * Assigns a distance estimate based on block proximity.
 */
async function linkTransactionsToPlot(plotId, city, blockNumber, parcelNumber) {
  try {
    // Get transactions in the same city
    const { data: transactions, error } = await supabaseAdmin
      .from('real_transactions')
      .select('id, block_number, parcel_number')
      .eq('city', city)
      .limit(200)

    if (error || !transactions) return 0

    const links = transactions.map(t => {
      // Estimate distance based on block proximity
      let distance = 2000 // default 2km for same city
      if (t.block_number === blockNumber) {
        distance = t.parcel_number === parcelNumber ? 0 : 100 // same block = ~100m
      } else if (t.block_number) {
        const blockDiff = Math.abs(parseInt(t.block_number, 10) - parseInt(blockNumber, 10))
        distance = Math.min(5000, blockDiff * 200) // rough estimate
      }

      return {
        plot_id: plotId,
        transaction_id: t.id,
        distance_meters: distance,
      }
    })

    if (links.length === 0) return 0

    // Upsert links (ignore duplicates)
    const { error: linkError } = await supabaseAdmin
      .from('plot_transactions')
      .upsert(links, { onConflict: 'plot_id,transaction_id', ignoreDuplicates: true })

    if (linkError) {
      console.error('[enrichment] Link transactions failed:', linkError.message)
      return 0
    }

    return links.length
  } catch (error) {
    console.error('[enrichment] linkTransactionsToPlot error:', error.message)
    return 0
  }
}

/**
 * Link relevant planning permits to a plot.
 */
async function linkPlansToPlot(plotId, blockNumber, parcelNumber, city) {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from('planning_permits')
      .select('id, city, plan_number')
      .eq('city', city)
      .limit(100)

    if (error || !plans) return 0

    const links = plans.map(p => ({
      plot_id: plotId,
      plan_id: p.id,
      relevance: p.city === city ? 'nearby' : 'regional',
    }))

    if (links.length === 0) return 0

    const { error: linkError } = await supabaseAdmin
      .from('plot_plans')
      .upsert(links, { onConflict: 'plot_id,plan_id', ignoreDuplicates: true })

    if (linkError) {
      console.error('[enrichment] Link plans failed:', linkError.message)
      return 0
    }

    return links.length
  } catch (error) {
    console.error('[enrichment] linkPlansToPlot error:', error.message)
    return 0
  }
}

/**
 * Compute analytics from linked transactions.
 * Returns average prices, trends, and market metrics.
 */
async function computePlotAnalytics(plotId, city) {
  try {
    // Get linked transactions with recent data
    const { data: linkedTx, error } = await supabaseAdmin
      .from('plot_transactions')
      .select(`
        distance_meters,
        real_transactions (
          deal_amount, deal_date, size_sqm, property_type, price_per_sqm
        )
      `)
      .eq('plot_id', plotId)
      .order('distance_meters', { ascending: true })
      .limit(50)

    if (error || !linkedTx || linkedTx.length === 0) {
      return { message: 'No linked transactions for analytics' }
    }

    // Filter valid transactions
    const validTx = linkedTx
      .map(lt => ({
        ...lt.real_transactions,
        distance: lt.distance_meters,
      }))
      .filter(t => t && t.deal_amount > 0 && t.size_sqm > 0)

    if (validTx.length === 0) {
      return { message: 'No valid transactions for analytics' }
    }

    // Compute metrics
    const landTx = validTx.filter(t => t.property_type === 'land')
    const txForCalc = landTx.length >= 3 ? landTx : validTx

    const avgPriceSqm = Math.round(
      txForCalc.reduce((sum, t) => sum + (t.deal_amount / t.size_sqm), 0) / txForCalc.length
    )
    const medianPriceSqm = median(txForCalc.map(t => t.deal_amount / t.size_sqm))
    const minPriceSqm = Math.round(Math.min(...txForCalc.map(t => t.deal_amount / t.size_sqm)))
    const maxPriceSqm = Math.round(Math.max(...txForCalc.map(t => t.deal_amount / t.size_sqm)))
    const avgDealAmount = Math.round(
      txForCalc.reduce((sum, t) => sum + t.deal_amount, 0) / txForCalc.length
    )

    // Nearby transactions (within 500m)
    const nearbyTx = validTx.filter(t => t.distance <= 500)
    const nearbyAvgPriceSqm = nearbyTx.length > 0
      ? Math.round(nearbyTx.reduce((sum, t) => sum + (t.deal_amount / t.size_sqm), 0) / nearbyTx.length)
      : null

    const analytics = {
      total_transactions: validTx.length,
      land_transactions: landTx.length,
      nearby_transactions: nearbyTx.length,
      avg_price_per_sqm: avgPriceSqm,
      median_price_per_sqm: Math.round(medianPriceSqm),
      min_price_per_sqm: minPriceSqm,
      max_price_per_sqm: maxPriceSqm,
      avg_deal_amount: avgDealAmount,
      nearby_avg_price_per_sqm: nearbyAvgPriceSqm,
      last_computed: new Date().toISOString(),
    }

    return analytics
  } catch (error) {
    console.error('[enrichment] computePlotAnalytics error:', error.message)
    return { error: error.message }
  }
}

/**
 * Get nearby transactions for a specific plot (for the frontend).
 */
export async function getNearbyTransactions(plotId, radius = 1000) {
  try {
    const { data, error } = await supabaseAdmin
      .from('plot_transactions')
      .select(`
        distance_meters,
        real_transactions (*)
      `)
      .eq('plot_id', plotId)
      .lte('distance_meters', radius)
      .order('distance_meters', { ascending: true })
      .limit(30)

    if (error) throw error

    return (data || []).map(pt => ({
      ...pt.real_transactions,
      distance_meters: pt.distance_meters,
    }))
  } catch (error) {
    console.error('[enrichment] getNearbyTransactions error:', error.message)
    return []
  }
}

/**
 * Get plans linked to a specific plot.
 */
export async function getPlotPlans(plotId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('plot_plans')
      .select(`
        relevance,
        planning_permits (*)
      `)
      .eq('plot_id', plotId)
      .order('relevance')
      .limit(20)

    if (error) throw error

    return (data || []).map(pp => ({
      ...pp.planning_permits,
      relevance: pp.relevance,
    }))
  } catch (error) {
    console.error('[enrichment] getPlotPlans error:', error.message)
    return []
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function median(arr) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}
