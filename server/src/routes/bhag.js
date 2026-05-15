const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')
const { adminOrCEO } = require('../middleware/requireRole')

// GET /api/bhag
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT b.*, u.name AS last_updated_by_name, o.name AS override_by_name
      FROM bhag b
      LEFT JOIN users u ON u.id = b.last_updated_by
      LEFT JOIN users o ON o.id = b.manual_override_by
      ORDER BY b.id
      LIMIT 1
    `)
    res.json(rows[0] || null)
  } catch (err) { next(err) }
})

// GET /api/bhag/history
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT h.*, u.name AS recorded_by_name
      FROM bhag_history h
      LEFT JOIN users u ON u.id = h.recorded_by
      ORDER BY h.recorded_at DESC
      LIMIT 100
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// PUT /api/bhag — admin/CEO only
router.put('/', requireAuth, adminOrCEO, async (req, res, next) => {
  try {
    const { title, description, start_value, target_value } = req.body
    const { rows } = await db.query(`
      UPDATE bhag SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        start_value = COALESCE($3, start_value),
        target_value = COALESCE($4, target_value),
        updated_at = NOW()
      WHERE id = (SELECT id FROM bhag ORDER BY id LIMIT 1)
      RETURNING *
    `, [title, description, start_value, target_value])
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /api/bhag/values — update current value (manual override)
router.post('/values', requireAuth, adminOrCEO, async (req, res, next) => {
  try {
    const { value, note } = req.body
    if (value === undefined) return res.status(400).json({ message: 'value is required' })

    const bhagRes = await db.query('SELECT id FROM bhag ORDER BY id LIMIT 1')
    const bhagId = bhagRes.rows[0]?.id
    if (!bhagId) return res.status(404).json({ message: 'BHAG not found' })

    await db.query(`
      UPDATE bhag SET
        current_value = $1,
        as_of_date = CURRENT_DATE,
        last_updated_by = $2,
        is_manual_override = true,
        manual_override_by = $2,
        manual_override_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
    `, [value, req.user.id, bhagId])

    await db.query(
      'INSERT INTO bhag_history (bhag_id, value, source, recorded_by, note) VALUES ($1, $2, $3, $4, $5)',
      [bhagId, value, 'manual', req.user.id, note || null]
    )

    const { rows } = await db.query('SELECT * FROM bhag WHERE id = $1', [bhagId])
    res.json(rows[0])
  } catch (err) { next(err) }
})

module.exports = router
