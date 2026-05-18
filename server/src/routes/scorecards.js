const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')
const { atLeastDirector } = require('../middleware/requireRole')

// GET /api/scorecards — all active lead measures with last 13 weeks of entries
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT
        lm.id, lm.title, lm.description, lm.status_type, lm.weekly_target,
        lm.team_id, lm.wig_id,
        u.id   AS assigned_to_id,
        u.name AS assigned_to_name,
        w.title AS wig_title,
        t.name  AS team_name,
        t.slug  AS team_slug,
        COALESCE(
          json_agg(
            json_build_object(
              'id',            lme.id,
              'week_start',    lme.week_start,
              'value_numeric', lme.value_numeric,
              'value_text',    lme.value_text,
              'value_boolean', lme.value_boolean,
              'notes',         lme.notes,
              'submitted_at',  lme.submitted_at
            ) ORDER BY lme.week_start ASC
          ) FILTER (WHERE lme.id IS NOT NULL),
          '[]'
        ) AS entries
      FROM lead_measures lm
      LEFT JOIN users  u   ON u.id  = lm.assigned_to
      LEFT JOIN wigs   w   ON w.id  = lm.wig_id
      LEFT JOIN teams  t   ON t.id  = lm.team_id
      LEFT JOIN lead_measure_entries lme
        ON lme.lead_measure_id = lm.id
        AND lme.week_start >= CURRENT_DATE - INTERVAL '13 weeks'
      WHERE lm.active = true
      GROUP BY lm.id, u.id, u.name, w.title, t.name, t.slug
      ORDER BY t.name NULLS LAST, lm.id
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /api/scorecards/lead-measures — management list (directors+)
router.get('/lead-measures', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT lm.*, u.name AS assigned_to_name, w.title AS wig_title, t.name AS team_name
      FROM lead_measures lm
      LEFT JOIN users u ON u.id = lm.assigned_to
      LEFT JOIN wigs  w ON w.id = lm.wig_id
      LEFT JOIN teams t ON t.id = lm.team_id
      ORDER BY t.name NULLS LAST, lm.id
    `)
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/scorecards/lead-measures — create (directors+)
router.post('/lead-measures', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const { title, description, assigned_to, wig_id, team_id, status_type, weekly_target } = req.body
    if (!title) return res.status(400).json({ message: 'title required' })
    const { rows } = await db.query(`
      INSERT INTO lead_measures
        (title, description, assigned_to, wig_id, team_id, status_type, weekly_target, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, description ?? null, assigned_to ?? null, wig_id ?? null, team_id ?? null,
        status_type ?? 'boolean', weekly_target ?? null, req.user.id])
    res.status(201).json(rows[0])
  } catch (err) { next(err) }
})

// PUT /api/scorecards/lead-measures/:id — update (directors+)
router.put('/lead-measures/:id', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    const { title, description, weekly_target, active } = req.body
    const { rows } = await db.query(`
      UPDATE lead_measures SET
        title         = COALESCE($1, title),
        description   = COALESCE($2, description),
        weekly_target = COALESCE($3, weekly_target),
        active        = COALESCE($4, active),
        updated_at    = NOW()
      WHERE id = $5
      RETURNING *
    `, [title ?? null, description ?? null, weekly_target ?? null, active ?? null, req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'Lead measure not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /api/scorecards/entry — upsert a weekly score (any authenticated user)
router.post('/entry', requireAuth, async (req, res, next) => {
  try {
    const { lead_measure_id, week_start, value_numeric, value_text, value_boolean, notes } = req.body
    if (!lead_measure_id || !week_start) {
      return res.status(400).json({ message: 'lead_measure_id and week_start required' })
    }
    const lmRes = await db.query(
      'SELECT id FROM lead_measures WHERE id = $1 AND active = true', [lead_measure_id]
    )
    if (!lmRes.rows[0]) return res.status(404).json({ message: 'Lead measure not found' })

    const { rows } = await db.query(`
      INSERT INTO lead_measure_entries
        (lead_measure_id, week_start, value_numeric, value_text, value_boolean, notes, submitted_by, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (lead_measure_id, week_start) DO UPDATE SET
        value_numeric = EXCLUDED.value_numeric,
        value_text    = EXCLUDED.value_text,
        value_boolean = EXCLUDED.value_boolean,
        notes         = EXCLUDED.notes,
        submitted_by  = EXCLUDED.submitted_by,
        submitted_at  = NOW()
      RETURNING *
    `, [lead_measure_id, week_start,
        value_numeric ?? null, value_text ?? null, value_boolean ?? null,
        notes ?? null, req.user.id])
    res.json(rows[0])
  } catch (err) { next(err) }
})

module.exports = router
