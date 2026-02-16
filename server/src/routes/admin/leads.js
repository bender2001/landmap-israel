import { Router } from 'express'
import { auth } from '../../middleware/auth.js'
import { adminOnly } from '../../middleware/adminOnly.js'
import { getLeads, getLeadById, updateLeadStatus } from '../../services/leadService.js'

const router = Router()
router.use(auth, adminOnly)

// GET /api/admin/leads
router.get('/', async (req, res, next) => {
  try {
    const leads = await getLeads(req.query)
    res.json(leads)
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/leads/:id
router.get('/:id', async (req, res, next) => {
  try {
    const lead = await getLeadById(req.params.id)
    if (!lead) return res.status(404).json({ error: 'Lead not found' })
    res.json(lead)
  } catch (err) {
    next(err)
  }
})

// PATCH /api/admin/leads/:id/status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status, notes } = req.body
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'closed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const lead = await updateLeadStatus(req.params.id, status, notes)
    res.json(lead)
  } catch (err) {
    next(err)
  }
})

// GET /api/admin/leads/export - Export leads as CSV
router.get('/export', async (req, res, next) => {
  try {
    const leads = await getLeads(req.query)
    const csv = [
      'Name,Phone,Email,Plot,Status,Date',
      ...leads.map(l => {
        const plot = l.plots ? `${l.plots.block_number}/${l.plots.number} ${l.plots.city}` : ''
        return `"${l.name}","${l.phone}","${l.email}","${plot}","${l.status}","${l.created_at}"`
      }),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv')
    res.send('\uFEFF' + csv) // BOM for Hebrew support in Excel
  } catch (err) {
    next(err)
  }
})

export default router
