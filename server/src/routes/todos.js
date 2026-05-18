const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

const TODO_SELECT = `
  SELECT t.*,
    u.name  AS assigned_to_name,
    c.name  AS created_by_name,
    tm.name AS team_name,
    w.title AS wig_title
  FROM todos t
  LEFT JOIN users u  ON u.id  = t.assigned_to
  LEFT JOIN users c  ON c.id  = t.created_by
  LEFT JOIN teams tm ON tm.id = t.team_id
  LEFT JOIN wigs  w  ON w.id  = t.wig_id
`

// GET /api/todos — filtered by query params
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { mine, team_id, status } = req.query
    const conditions = []
    const values = []
    let i = 1

    if (mine === 'true') {
      conditions.push(`t.assigned_to = $${i++}`)
      values.push(req.user.id)
    }
    if (team_id) {
      conditions.push(`t.team_id = $${i++}`)
      values.push(team_id)
    }
    if (status) {
      conditions.push(`t.status = $${i++}`)
      values.push(status)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await db.query(
      `${TODO_SELECT} ${where} ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
        t.due_date ASC NULLS LAST, t.created_at DESC`,
      values
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/todos — create
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, description, assigned_to, due_date, priority, team_id, wig_id } = req.body
    if (!title?.trim()) return res.status(400).json({ message: 'title required' })

    const { rows } = await db.query(`
      INSERT INTO todos (title, description, assigned_to, created_by, due_date, priority, team_id, wig_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title.trim(), description ?? null, assigned_to ?? null, req.user.id,
        due_date ?? null, priority ?? 'medium', team_id ?? null, wig_id ?? null])

    const { rows: full } = await db.query(`${TODO_SELECT} WHERE t.id = $1`, [rows[0].id])
    res.status(201).json(full[0])
  } catch (err) { next(err) }
})

// PUT /api/todos/:id — update (status, priority, due date, assignment, title)
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, description, assigned_to, due_date, priority, status, team_id, wig_id } = req.body
    const { rows } = await db.query(`
      UPDATE todos SET
        title       = COALESCE($1, title),
        description = COALESCE($2, description),
        assigned_to = COALESCE($3, assigned_to),
        due_date    = COALESCE($4, due_date),
        priority    = COALESCE($5, priority),
        status      = COALESCE($6, status),
        team_id     = COALESCE($7, team_id),
        wig_id      = COALESCE($8, wig_id),
        updated_at  = NOW()
      WHERE id = $9
      RETURNING *
    `, [title ?? null, description ?? null, assigned_to ?? null, due_date ?? null,
        priority ?? null, status ?? null, team_id ?? null, wig_id ?? null, req.params.id])

    if (!rows[0]) return res.status(404).json({ message: 'To-do not found' })
    const { rows: full } = await db.query(`${TODO_SELECT} WHERE t.id = $1`, [rows[0].id])
    res.json(full[0])
  } catch (err) { next(err) }
})

// DELETE /api/todos/:id — hard delete (small team, no audit trail needed)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM todos WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'To-do not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { next(err) }
})

module.exports = router
