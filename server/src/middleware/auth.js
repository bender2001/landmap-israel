import { supabaseAdmin } from '../config/supabase.js'

export async function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const token = header.slice(7)

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    req.token = token
    next()
  } catch {
    return res.status(401).json({ error: 'Authentication failed' })
  }
}
