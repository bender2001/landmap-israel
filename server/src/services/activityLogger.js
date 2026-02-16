import { supabaseAdmin } from '../config/supabase.js'

/**
 * Non-blocking activity log insert.
 * Fire-and-forget — never throws, never blocks the request.
 */
export function logActivity({ action, entityType, entityId, userId = null, description = null, metadata = {} }) {
  supabaseAdmin
    .from('activity_log')
    .insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      description,
      metadata,
    })
    .then(({ error }) => {
      if (error) console.error('[activity-log] Insert failed:', error.message)
    })
    .catch((err) => {
      console.error('[activity-log] Unexpected error:', err.message)
    })
}
