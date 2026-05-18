const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

const ISSUE_SELECT = `
  SELECT i.*,
    u.name AS logged_by_name,
    r.name AS resolved_by_name,
    t.name AS team_name
  FROM issues i
  LEFT JOIN users u ON u.id = i.logged_by
  LEFT JOIN users r ON r.id = i.resolved_by
  LEFT JOIN teams t ON t.id = i.team_id
`

// GET /api/issues
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, team_id } = req.query
    const conditions = []
    const values = []
    let i = 1

    if (status)  { conditions.push(`i.status = $${i++}`);  values.push(status) }
    if (team_id) { conditions.push(`i.team_id = $${i++}`); values.push(team_id) }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await db.query(
      `${ISSUE_SELECT} ${where} ORDER BY i.priority ASC, i.created_at DESC`,
      values
    )
    res.json(rows)
  } catch (err) { next(err) }
})

// POST /api/issues — log a new issue
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, description, team_id, priority } = req.body
    if (!title?.trim()) return res.status(400).json({ message: 'title required' })

    const { rows } = await db.query(`
      INSERT INTO issues (title, description, logged_by, team_id, priority)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [title.trim(), description ?? null, req.user.id, team_id ?? null, priority ?? 3])

    const { rows: full } = await db.query(`${ISSUE_SELECT} WHERE i.id = $1`, [rows[0].id])
    res.status(201).json(full[0])
  } catch (err) { next(err) }
})

// PUT /api/issues/:id — update title, description, priority, team
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { title, description, priority, team_id } = req.body
    const { rows } = await db.query(`
      UPDATE issues SET
        title       = COALESCE($1, title),
        description = COALESCE($2, description),
        priority    = COALESCE($3, priority),
        team_id     = COALESCE($4, team_id),
        updated_at  = NOW()
      WHERE id = $5
      RETURNING *
    `, [title ?? null, description ?? null, priority ?? null, team_id ?? null, req.params.id])

    if (!rows[0]) return res.status(404).json({ message: 'Issue not found' })
    const { rows: full } = await db.query(`${ISSUE_SELECT} WHERE i.id = $1`, [rows[0].id])
    res.json(full[0])
  } catch (err) { next(err) }
})

// POST /api/issues/:id/progress — advance IDS stage or resolve/reopen
router.post('/:id/progress', requireAuth, async (req, res, next) => {
  try {
    const { notes, action } = req.body

    const issueRes = await db.query('SELECT * FROM issues WHERE id = $1', [req.params.id])
    if (!issueRes.rows[0]) return res.status(404).json({ message: 'Issue not found' })
    const issue = issueRes.rows[0]

    let setClauses, values
    if (action === 'discuss') {
      setClauses = 'stage = $1, status = $2, identify_notes = $3'
      values = ['discuss', 'in_discussion', notes ?? issue.identify_notes, req.params.id]
    } else if (action === 'solve') {
      setClauses = 'stage = $1, discuss_notes = $2'
      values = ['solve', notes ?? issue.discuss_notes, req.params.id]
    } else if (action === 'resolve') {
      setClauses = 'status = $1, solve_notes = $2, resolved_by = $3, resolved_at = NOW()'
      values = ['resolved', notes ?? issue.solve_notes, req.user.id, req.params.id]
    } else if (action === 'reopen') {
      setClauses = 'stage = $1, status = $2, resolved_by = NULL, resolved_at = NULL'
      values = ['identify', 'open', req.params.id]
    } else {
      return res.status(400).json({ message: 'Invalid action. Use: discuss, solve, resolve, reopen' })
    }

    await db.query(
      `UPDATE issues SET ${setClauses}, updated_at = NOW() WHERE id = $${values.length}`,
      values
    )
    const { rows: full } = await db.query(`${ISSUE_SELECT} WHERE i.id = $1`, [req.params.id])
    res.json(full[0])
  } catch (err) { next(err) }
})

// DELETE /api/issues/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM issues WHERE id = $1 RETURNING id', [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'Issue not found' })
    res.json({ message: 'Deleted' })
  } catch (err) { next(err) }
})

module.exports = router
