const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')
const { atLeastDirector } = require('../middleware/requireRole')

// GET /api/vision — latest version
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT v.*, u.name AS created_by_name FROM vision v LEFT JOIN users u ON u.id = v.created_by ORDER BY v.version DESC LIMIT 1'
    )
    res.json(rows[0] ?? null)
  } catch (err) { next(err) }
})

// GET /api/vision/history — all versions
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, version, created_at, created_by FROM vision ORDER BY version DESC'
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// PUT /api/vision — save a new version (directors+)
router.put('/', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const {
      core_values, core_focus, bhag_text,
      marketing_strategy, three_year_picture,
      one_year_plan, quarterly_priorities,
    } = req.body

    const latest = await db.query('SELECT version FROM vision ORDER BY version DESC LIMIT 1')
    const nextVersion = (latest.rows[0]?.version ?? 0) + 1

    const { rows } = await db.query(`
      INSERT INTO vision
        (core_values, core_focus, bhag_text, marketing_strategy,
         three_year_picture, one_year_plan, quarterly_priorities,
         version, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [core_values ?? null, core_focus ?? null, bhag_text ?? null,
        marketing_strategy ?? null, three_year_picture ?? null,
        one_year_plan ?? null, quarterly_priorities ?? null,
        nextVersion, req.user.id])
    res.json(rows[0])
  } catch (err) { next(err) }
})

module.exports = router
