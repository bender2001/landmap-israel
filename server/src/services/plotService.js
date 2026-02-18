import { supabaseAdmin } from '../config/supabase.js'

/**
 * Compute an investment score (1-10) for a plot — server-side equivalent
 * of the client's calcInvestmentScore(). Running this server-side:
 * - Eliminates redundant client computation on every render cycle
 * - Enables server-side sort by score (new sort=score-desc option)
 * - Makes scores available to SEO bots, OG generators, and webhooks
 */
function computeInvestmentScore(plot) {
  const price = plot.total_price || 0
  const projected = plot.projected_value || 0
  const roi = price > 0 ? ((projected - price) / price) * 100 : 0
  const readiness = plot.readiness_estimate || ''

  // ROI component (0-4 points): 50%=1, 100%=2, 150%=3, 200%+=4
  const roiScore = Math.min(4, roi / 50)

  // Zoning progress component (0-3 points)
  const ZONING_ORDER = [
    'AGRICULTURAL', 'MASTER_PLAN_DEPOSIT', 'MASTER_PLAN_APPROVED',
    'DETAILED_PLAN_PREP', 'DETAILED_PLAN_DEPOSIT', 'DETAILED_PLAN_APPROVED',
    'DEVELOPER_TENDER', 'BUILDING_PERMIT',
  ]
  const zoning = plot.zoning_stage || 'AGRICULTURAL'
  const zoningIdx = ZONING_ORDER.indexOf(zoning)
  const zoningScore = zoningIdx >= 0 ? (zoningIdx / (ZONING_ORDER.length - 1)) * 3 : 0

  // Readiness component (0-3 points): shorter = better
  let readinessScore = 1.5
  if (readiness.includes('1-3')) readinessScore = 3
  else if (readiness.includes('3-5')) readinessScore = 2
  else if (readiness.includes('5+')) readinessScore = 0.5

  const raw = roiScore + zoningScore + readinessScore
  return Math.max(1, Math.min(10, Math.round(raw)))
}

/**
 * Convert a 1-10 score to an S&P-style letter grade.
 */
function computeGrade(score) {
  if (score >= 9) return 'A+'
  if (score >= 8) return 'A'
  if (score >= 7) return 'A-'
  if (score >= 6) return 'B+'
  if (score >= 5) return 'B'
  if (score >= 4) return 'B-'
  if (score >= 3) return 'C+'
  return 'C'
}

/**
 * Enrich an array of plots with computed investment metrics.
 * Adds _investmentScore, _grade, and _roi fields to each plot.
 */
function enrichPlotsWithScores(plots) {
  if (!plots || plots.length === 0) return plots
  for (const p of plots) {
    const price = p.total_price || 0
    const projected = p.projected_value || 0
    p._investmentScore = computeInvestmentScore(p)
    p._grade = computeGrade(p._investmentScore)
    p._roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  }
  return plots
}

export async function getPublishedPlots(filters = {}) {
  // Support count-only mode for pagination metadata
  const countOnly = filters._countOnly === true

  let query = supabaseAdmin
    .from('plots')
    .select(countOnly ? 'id' : '*, plot_images(id, url, alt)', countOnly ? { count: 'exact', head: true } : undefined)
    .eq('is_published', true)

  if (filters.city && filters.city !== 'all') {
    query = query.eq('city', filters.city)
  }
  if (filters.priceMin) {
    query = query.gte('total_price', Number(filters.priceMin))
  }
  if (filters.priceMax) {
    query = query.lte('total_price', Number(filters.priceMax))
  }
  if (filters.sizeMin) {
    query = query.gte('size_sqm', Number(filters.sizeMin) * 1000)
  }
  if (filters.sizeMax) {
    query = query.lte('size_sqm', Number(filters.sizeMax) * 1000)
  }
  if (filters.ripeness && filters.ripeness !== 'all') {
    query = query.eq('ripeness', filters.ripeness)
  }
  if (filters.status) {
    const statuses = filters.status.split(',')
    query = query.in('status', statuses)
  }

  // Zoning stage filter — supports comma-separated values for multi-select
  if (filters.zoning && filters.zoning !== 'all') {
    const stages = filters.zoning.split(',').filter(Boolean)
    if (stages.length === 1) {
      query = query.eq('zoning_stage', stages[0])
    } else if (stages.length > 1) {
      query = query.in('zoning_stage', stages)
    }
  }

  // Server-side text search — searches block_number, number, city, description
  if (filters.q && filters.q.trim()) {
    // Sanitize: escape special PostgREST/SQL chars to prevent injection
    const q = filters.q.trim()
      .replace(/[%_\\]/g, c => `\\${c}`)  // escape SQL wildcards
      .replace(/[,()]/g, '')               // strip PostgREST operators
      .slice(0, 100)                       // limit length
    if (q.length > 0) {
      query = query.or(
        `block_number.ilike.%${q}%,number.ilike.%${q}%,city.ilike.%${q}%,description.ilike.%${q}%`
      )
    }
  }

  // Server-side sorting — apply user's sort as PRIMARY order.
  // Previously, `order('created_at')` was applied first, making user sort a secondary
  // (invisible) tiebreaker since created_at is unique. Now user sort comes first,
  // with created_at as a stable secondary sort for ties.
  if (filters.sort) {
    switch (filters.sort) {
      case 'price-asc': query = query.order('total_price', { ascending: true }); break
      case 'price-desc': query = query.order('total_price', { ascending: false }); break
      case 'size-asc': query = query.order('size_sqm', { ascending: true }); break
      case 'size-desc': query = query.order('size_sqm', { ascending: false }); break
      case 'updated-desc': query = query.order('updated_at', { ascending: false, nullsFirst: false }); break
      // ROI and price-per-sqm require computed columns — handled client-side
    }
    // Secondary sort: newest first within same price/size tier
    query = query.order('created_at', { ascending: false })
  } else {
    // Default: newest listings first
    query = query.order('created_at', { ascending: false })
  }

  // Pagination support
  if (filters.limit) {
    const limit = Math.min(parseInt(filters.limit) || 50, 200)
    const offset = parseInt(filters.offset) || 0
    query = query.range(offset, offset + limit - 1)
  }

  if (countOnly) {
    const { count, error } = await query
    if (error) throw error
    return count
  }

  const { data, error } = await query
  if (error) throw error

  // Enrich with server-computed investment metrics
  enrichPlotsWithScores(data)

  // Post-fetch sorts for computed fields that can't be done in SQL
  if (filters.sort === 'score-desc' && data) {
    data.sort((a, b) => (b._investmentScore || 0) - (a._investmentScore || 0))
  } else if (filters.sort === 'roi-desc' && data) {
    data.sort((a, b) => (b._roi || 0) - (a._roi || 0))
  } else if (filters.sort === 'roi-asc' && data) {
    data.sort((a, b) => (a._roi || 0) - (b._roi || 0))
  } else if (filters.sort === 'cagr-desc' && data) {
    // CAGR sort: annualized return considering holding period.
    // More meaningful than raw ROI — a 200% ROI over 10 years (CAGR 11.6%)
    // is worse than 100% ROI over 3 years (CAGR 26%). Investors prefer CAGR.
    data.sort((a, b) => {
      const getCagr = (p) => {
        const price = p.total_price || 0
        const proj = p.projected_value || 0
        if (price <= 0 || proj <= price) return 0
        const readiness = p.readiness_estimate || ''
        let years = 5
        if (readiness.includes('1-3')) years = 2
        else if (readiness.includes('3-5')) years = 4
        else if (readiness.includes('5+')) years = 7
        return (Math.pow(proj / price, 1 / years) - 1) * 100
      }
      return getCagr(b) - getCagr(a)
    })
  }

  return data
}

export async function getPlotById(id) {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .select(`
      *,
      plot_documents(*),
      plot_images(*)
    `)
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (error) throw error

  // Enrich single plot with computed metrics
  if (data) {
    const price = data.total_price || 0
    const projected = data.projected_value || 0
    data._investmentScore = computeInvestmentScore(data)
    data._grade = computeGrade(data._investmentScore)
    data._roi = price > 0 ? Math.round(((projected - price) / price) * 100) : 0
  }

  return data
}

// Admin-specific: no is_published filter, includes images & docs
export async function getPlotByIdAdmin(id) {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .select(`
      *,
      plot_documents(*),
      plot_images(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getAllPlots() {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createPlot(plotData) {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .insert(plotData)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePlot(id, plotData) {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .update({ ...plotData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePlot(id) {
  const { error } = await supabaseAdmin
    .from('plots')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Fetch multiple plots by their IDs in a single query.
 * Used by the Compare page to avoid loading the entire dataset.
 * Returns full plot data with images (same as getPlotById but batched).
 * @param {string[]} ids - Array of plot UUIDs (max 10)
 * @returns {Promise<Array>} Array of plot objects
 */
export async function getPlotsByIds(ids) {
  if (!ids || ids.length === 0) return []
  // Limit to 10 to prevent abuse
  const safeIds = ids.slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('plots')
    .select('*, plot_images(id, url, alt)')
    .eq('is_published', true)
    .in('id', safeIds)

  if (error) throw error
  return data || []
}

// Lightweight aggregate stats for published plots
export async function getPlotStats() {
  const { data, error } = await supabaseAdmin
    .from('plots')
    .select('status, total_price, projected_value, size_sqm, city')
    .eq('is_published', true)

  if (error) throw error
  if (!data || data.length === 0) return { total: 0, cities: [], byStatus: {}, avgRoi: 0, totalArea: 0 }

  const byStatus = {}
  const citySet = new Set()
  let totalPrice = 0
  let totalProj = 0
  let totalArea = 0

  for (const p of data) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1
    if (p.city) citySet.add(p.city)
    totalPrice += p.total_price || 0
    totalProj += p.projected_value || 0
    totalArea += p.size_sqm || 0
  }

  const avgRoi = totalPrice > 0 ? Math.round(((totalProj - totalPrice) / totalPrice) * 100) : 0

  // Per-city breakdown with avg price/sqm
  const byCity = {}
  for (const p of data) {
    const city = p.city || 'אחר'
    if (!byCity[city]) byCity[city] = { count: 0, totalPrice: 0, totalArea: 0, totalProj: 0 }
    byCity[city].count += 1
    byCity[city].totalPrice += p.total_price || 0
    byCity[city].totalArea += p.size_sqm || 0
    byCity[city].totalProj += p.projected_value || 0
  }
  const cityStats = Object.entries(byCity).map(([city, s]) => ({
    city,
    count: s.count,
    avgPricePerSqm: s.totalArea > 0 ? Math.round(s.totalPrice / s.totalArea) : 0,
    avgRoi: s.totalPrice > 0 ? Math.round(((s.totalProj - s.totalPrice) / s.totalPrice) * 100) : 0,
    totalArea: s.totalArea,
  })).sort((a, b) => b.count - a.count)

  return {
    total: data.length,
    cities: [...citySet].sort(),
    byStatus,
    avgRoi,
    totalArea,
    totalValue: totalPrice,
    cityStats,
  }
}
