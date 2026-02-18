import { supabaseAdmin } from '../config/supabase.js'

export async function getPublishedPlots(filters = {}) {
  let query = supabaseAdmin
    .from('plots')
    .select('*, plot_images(id, url, alt)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })

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

  const { data, error } = await query
  if (error) throw error
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

  return {
    total: data.length,
    cities: [...citySet].sort(),
    byStatus,
    avgRoi,
    totalArea,
    totalValue: totalPrice,
  }
}
