export function adminOnly(req, res, next) {
  const role = req.user?.app_metadata?.role
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
