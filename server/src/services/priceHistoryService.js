import { supabaseAdmin } from '../config/supabase.js'

/**
 * Price History Service
 * 
 * Snapshots plot prices daily into a `price_snapshots` table.
 * This enables real price trend charts instead of synthetic data.
 * 
 * Table schema (create via Supabase SQL editor):
 * 
 * CREATE TABLE IF NOT EXISTS price_snapshots (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   plot_id uuid REFERENCES plots(id) ON DELETE CASCADE,
 *   total_price numeric,
 *   price_per_sqm numeric,
 *   snapshot_date date DEFAULT CURRENT_DATE,
 *   created_at timestamptz DEFAULT now(),
 *   UNIQUE(plot_id, snapshot_date)
 * );
 * 
 * CREATE INDEX idx_price_snapshots_plot_date ON price_snapshots(plot_id, snapshot_date);
 */

// ─── Circuit breaker: stop querying after first "table not found" error ───
// Prevents log spam when the table hasn't been created yet.
let _tableMissing = false

function isTableNotFoundError(error) {
  if (!error) return false
  if (error.code === '42P01') return true
  const msg = error.message || ''
  return msg.includes('does not exist') || msg.includes('schema cache')
}

/**
 * Take a daily price snapshot for all published plots.
 * Uses UPSERT to avoid duplicates for the same day.
 * Should be called once daily (e.g., via cron or on first API hit of the day).
 */
export async function takeDailySnapshot() {
  if (_tableMissing) return { skipped: true, reason: 'table_not_created' }
  try {
    // Check if we already snapped today
    const today = new Date().toISOString().slice(0, 10)
    const { count, error: checkErr } = await supabaseAdmin
      .from('price_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('snapshot_date', today)

    if (checkErr && isTableNotFoundError(checkErr)) {
      _tableMissing = true
      return { skipped: true, reason: 'table_not_created' }
    }
    if (checkErr) throw checkErr

    if (count > 0) {
      return { skipped: true, date: today, existing: count }
    }

    // Get all published plots
    const { data: plots, error } = await supabaseAdmin
      .from('plots')
      .select('id, total_price, size_sqm')
      .eq('is_published', true)

    if (error) throw error
    if (!plots || plots.length === 0) return { skipped: true, reason: 'no plots' }

    const rows = plots
      .filter(p => p.total_price > 0)
      .map(p => ({
        plot_id: p.id,
        total_price: p.total_price,
        price_per_sqm: p.size_sqm > 0 ? Math.round((p.total_price / p.size_sqm) * 100) / 100 : null,
        snapshot_date: today,
      }))

    const { error: insertError } = await supabaseAdmin
      .from('price_snapshots')
      .upsert(rows, { onConflict: 'plot_id,snapshot_date' })

    if (insertError) {
      if (isTableNotFoundError(insertError)) {
        _tableMissing = true
        return { skipped: true, reason: 'table_not_created' }
      }
      throw insertError
    }

    return { success: true, date: today, count: rows.length }
  } catch (err) {
    console.error('[priceHistory] snapshot error:', err.message)
    return { error: err.message }
  }
}

/**
 * Get price history for a specific plot.
 * Returns up to 365 days of price data.
 */
export async function getPlotPriceHistory(plotId, days = 365) {
  if (_tableMissing) return []
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('price_snapshots')
    .select('total_price, price_per_sqm, snapshot_date')
    .eq('plot_id', plotId)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true })

  if (error) {
    // Table might not exist yet — return empty gracefully
    if (isTableNotFoundError(error)) {
      _tableMissing = true
      return []
    }
    throw error
  }

  return data || []
}

/**
 * Get aggregated price history for a city (average price/sqm per day).
 */
export async function getCityPriceHistory(city, days = 365) {
  if (_tableMissing) return []
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // Join snapshots with plots to filter by city
  const { data, error } = await supabaseAdmin
    .from('price_snapshots')
    .select('total_price, price_per_sqm, snapshot_date, plots!inner(city)')
    .eq('plots.city', city)
    .gte('snapshot_date', since)
    .order('snapshot_date', { ascending: true })

  if (error) {
    if (isTableNotFoundError(error)) {
      _tableMissing = true
      return []
    }
    throw error
  }

  // Aggregate by date
  const byDate = {}
  for (const row of (data || [])) {
    const d = row.snapshot_date
    if (!byDate[d]) byDate[d] = { totalPsm: 0, count: 0 }
    if (row.price_per_sqm) {
      byDate[d].totalPsm += row.price_per_sqm
      byDate[d].count += 1
    }
  }

  return Object.entries(byDate)
    .map(([date, agg]) => ({
      date,
      avgPriceSqm: agg.count > 0 ? Math.round(agg.totalPsm / agg.count) : 0,
      samples: agg.count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
