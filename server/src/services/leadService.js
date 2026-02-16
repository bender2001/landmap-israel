import { supabaseAdmin } from '../config/supabase.js'
import { sendLeadNotification } from './emailService.js'

export async function createLead(leadData) {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .insert({
      ...leadData,
      status: 'new',
    })
    .select(`
      *,
      plots:plot_id(block_number, number, city, total_price)
    `)
    .single()

  if (error) throw error

  // Send email notification (fire and forget)
  sendLeadNotification(data).catch(err =>
    console.error('[email] Failed to send lead notification:', err.message)
  )

  return data
}

export async function getLeads(filters = {}) {
  let query = supabaseAdmin
    .from('leads')
    .select(`
      *,
      plots:plot_id(block_number, number, city)
    `)
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.plot_id) {
    query = query.eq('plot_id', filters.plot_id)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateLeadStatus(id, status, notes) {
  const update = { status, updated_at: new Date().toISOString() }
  if (notes !== undefined) update.notes = notes

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLeadById(id) {
  const { data, error } = await supabaseAdmin
    .from('leads')
    .select(`
      *,
      plots:plot_id(block_number, number, city, total_price)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}
