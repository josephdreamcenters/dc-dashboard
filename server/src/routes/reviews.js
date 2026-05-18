const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')
const { atLeastDirector, adminOrCEO } = require('../middleware/requireRole')

const REVIEW_SELECT = `
  SELECT r.*,
    e.name  AS employee_name,  e.title AS employee_title,  e.team_id AS employee_team_id,
    s.name  AS supervisor_name
  FROM quarterly_reviews r
  LEFT JOIN users e ON e.id = r.employee_id
  LEFT JOIN users s ON s.id = r.supervisor_id
`

// GET /api/reviews — own reviews, or all if admin/ceo/director
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const isManager = ['admin', 'ceo', 'director'].includes(req.user.role)
    let query, values

    if (isManager) {
      query  = `${REVIEW_SELECT} ORDER BY r.year DESC, r.quarter DESC, e.name`
      values = []
    } else {
      query  = `${REVIEW_SELECT} WHERE r.employee_id = $1 ORDER BY r.year DESC, r.quarter DESC`
      values = [req.user.id]
    }

    const { rows } = await db.query(query, values)
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/reviews — create (admin/ceo/director)
router.post('/', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const { employee_id, supervisor_id, quarter, year } = req.body
    if (!employee_id || !quarter || !year) {
      return res.status(400).json({ message: 'employee_id, quarter, and year required' })
    }
    const { rows } = await db.query(`
      INSERT INTO quarterly_reviews (employee_id, supervisor_id, quarter, year)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (employee_id, quarter, year) DO NOTHING
      RETURNING *
    `, [employee_id, supervisor_id ?? req.user.id, quarter, year])

    if (!rows[0]) return res.status(409).json({ message: 'Review already exists for this employee/quarter/year' })
    const { rows: full } = await db.query(`${REVIEW_SELECT} WHERE r.id = $1`, [rows[0].id])
    res.status(201).json(full[0])
  } catch (err) { next(err) }
})

// GET /api/reviews/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`${REVIEW_SELECT} WHERE r.id = $1`, [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'Review not found' })

    const r = rows[0]
    const isMine = r.employee_id === req.user.id || r.supervisor_id === req.user.id
    const isManager = ['admin', 'ceo', 'director'].includes(req.user.role)
    if (!isMine && !isManager) return res.status(403).json({ message: 'Forbidden' })
    res.json(r)
  } catch (err) { next(err) }
})

// PUT /api/reviews/:id/employee — employee self-assessment
router.put('/:id/employee', requireAuth, async (req, res, next) => {
  try {
    const { rows: existing } = await db.query('SELECT * FROM quarterly_reviews WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ message: 'Review not found' })
    if (existing[0].employee_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' })

    const { section, submit } = req.body
    const now = new Date().toISOString()
    const { rows } = await db.query(`
      UPDATE quarterly_reviews SET
        employee_section      = $1,
        employee_submitted_at = CASE WHEN $2 THEN $3::timestamptz ELSE employee_submitted_at END,
        status                = CASE WHEN $2 THEN 'employee_submitted' ELSE status END,
        updated_at            = NOW()
      WHERE id = $4
      RETURNING *
    `, [JSON.stringify(section), !!submit, now, req.params.id])

    const { rows: full } = await db.query(`${REVIEW_SELECT} WHERE r.id = $1`, [rows[0].id])
    res.json(full[0])
  } catch (err) { next(err) }
})

// PUT /api/reviews/:id/supervisor — supervisor evaluation
router.put('/:id/supervisor', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const { rows: existing } = await db.query('SELECT * FROM quarterly_reviews WHERE id = $1', [req.params.id])
    if (!existing[0]) return res.status(404).json({ message: 'Review not found' })

    const { section, submit } = req.body
    const now = new Date().toISOString()
    const { rows } = await db.query(`
      UPDATE quarterly_reviews SET
        supervisor_section      = $1,
        supervisor_submitted_at = CASE WHEN $2 THEN $3::timestamptz ELSE supervisor_submitted_at END,
        status                  = CASE WHEN $2 THEN 'complete' ELSE status END,
        updated_at              = NOW()
      WHERE id = $4
      RETURNING *
    `, [JSON.stringify(section), !!submit, now, req.params.id])

    const { rows: full } = await db.query(`${REVIEW_SELECT} WHERE r.id = $1`, [rows[0].id])
    res.json(full[0])
  } catch (err) { next(err) }
})

// DELETE /api/reviews/:id — admin/ceo only
router.delete('/:id', requireAuth, adminOrCEO, async (req, res, next) => {
  try {
    await db.query('DELETE FROM quarterly_reviews WHERE id = $1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) { next(err) }
})

module.exports = router
