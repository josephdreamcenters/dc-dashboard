const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')
const { adminOrCEO, atLeastDirector } = require('../middleware/requireRole')

// GET /api/wigs — all users see all active WIGs
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT w.*, t.name AS team_name, t.slug AS team_slug,
             u.name AS last_updated_by_name, o.name AS override_by_name
      FROM wigs w
      LEFT JOIN teams t ON t.id = w.team_id
      LEFT JOIN users u ON u.id = w.last_updated_by
      LEFT JOIN users o ON o.id = w.manual_override_by
      WHERE w.active = true
      ORDER BY t.name, w.id
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /api/wigs/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT w.*, t.name AS team_name, t.slug AS team_slug,
             u.name AS last_updated_by_name
      FROM wigs w
      LEFT JOIN teams t ON t.id = w.team_id
      LEFT JOIN users u ON u.id = w.last_updated_by
      WHERE w.id = $1
    `, [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'WIG not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// GET /api/wigs/:id/history
router.get('/:id/history', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT h.*, u.name AS recorded_by_name
      FROM wig_history h
      LEFT JOIN users u ON u.id = h.recorded_by
      WHERE h.wig_id = $1
      ORDER BY h.recorded_at DESC
      LIMIT 50
    `, [req.params.id])
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/wigs — admin/CEO only
router.post('/', requireAuth, adminOrCEO, async (req, res, next) => {
  try {
    const { title, team_id, wig_type, start_value, target_value, external_source } = req.body
    if (!title || !team_id) return res.status(400).json({ message: 'title and team_id required' })
    const { rows } = await db.query(`
      INSERT INTO wigs (title, team_id, wig_type, start_value, target_value, current_value, external_source, as_of_date)
      VALUES ($1, $2, $3, $4, $5, $4, $6, CURRENT_DATE)
      RETURNING *
    `, [title, team_id, wig_type || 'numeric', start_value || null, target_value || null, external_source || null])
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /api/wigs/:id — admin/CEO or team director
router.put('/:id', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const { title, target_value, start_value } = req.body
    const { rows } = await db.query(`
      UPDATE wigs SET
        title = COALESCE($1, title),
        target_value = COALESCE($2, target_value),
        start_value = COALESCE($3, start_value),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [title, target_value, start_value, req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'WIG not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /api/wigs/:id/values — update current value
router.post('/:id/values', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const { value, milestone_status, note, source = 'manual' } = req.body
    const wigId = req.params.id

    const wigRes = await db.query('SELECT * FROM wigs WHERE id = $1', [wigId])
    if (!wigRes.rows[0]) return res.status(404).json({ message: 'WIG not found' })
    const wig = wigRes.rows[0]

    if (wig.wig_type === 'milestone') {
      if (!milestone_status) return res.status(400).json({ message: 'milestone_status required for milestone WIGs' })
      await db.query(`
        UPDATE wigs SET milestone_status = $1, as_of_date = CURRENT_DATE,
          last_updated_by = $2, is_manual_override = true, manual_override_by = $2,
          manual_override_at = NOW(), updated_at = NOW()
        WHERE id = $3
      `, [milestone_status, req.user.id, wigId])
      await db.query(
        'INSERT INTO wig_history (wig_id, milestone_status, source, recorded_by, note) VALUES ($1, $2, $3, $4, $5)',
        [wigId, milestone_status, source, req.user.id, note || null]
      )
    } else {
      if (value === undefined) return res.status(400).json({ message: 'value required' })
      await db.query(`
        UPDATE wigs SET current_value = $1, as_of_date = CURRENT_DATE,
          last_updated_by = $2, is_manual_override = (CASE WHEN $3 = 'manual' THEN true ELSE is_manual_override END),
          manual_override_by = (CASE WHEN $3 = 'manual' THEN $2 ELSE manual_override_by END),
          manual_override_at = (CASE WHEN $3 = 'manual' THEN NOW() ELSE manual_override_at END),
          updated_at = NOW()
        WHERE id = $4
      `, [value, req.user.id, source, wigId])
      await db.query(
        'INSERT INTO wig_history (wig_id, value, source, recorded_by, note) VALUES ($1, $2, $3, $4, $5)',
        [wigId, value, source, req.user.id, note || null]
      )
    }

    const { rows } = await db.query('SELECT * FROM wigs WHERE id = $1', [wigId])
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/wigs/:id — admin/CEO only (soft delete)
router.delete('/:id', requireAuth, adminOrCEO, async (req, res, next) => {
  try {
    await db.query('UPDATE wigs SET active = false, updated_at = NOW() WHERE id = $1', [req.params.id])
    res.json({ message: 'WIG deactivated' })
  } catch (err) { next(err) }
})

module.exports = router
