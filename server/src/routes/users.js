const router = require('express').Router()
const bcrypt = require('bcryptjs')
const db = require('../db')
const requireAuth = require('../middleware/auth')
const { adminOrCEO, atLeastDirector } = require('../middleware/requireRole')

// GET /api/users — admin/CEO see all; directors see their team; staff get 403
router.get('/', requireAuth, atLeastDirector, async (req, res, next) => {
  try {
    let query, params = []

    if (['admin', 'ceo'].includes(req.user.role)) {
      query = `
        SELECT u.id, u.name, u.email, u.role, u.title, u.part_time, u.active,
               u.team_id, t.name AS team_name, u.reports_to,
               s.name AS supervisor_name
        FROM users u
        LEFT JOIN teams t ON t.id = u.team_id
        LEFT JOIN users s ON s.id = u.reports_to
        ORDER BY u.name
      `
    } else {
      // Directors see their own team
      query = `
        SELECT u.id, u.name, u.email, u.role, u.title, u.part_time, u.active,
               u.team_id, t.name AS team_name, u.reports_to,
               s.name AS supervisor_name
        FROM users u
        LEFT JOIN teams t ON t.id = u.team_id
        LEFT JOIN users s ON s.id = u.reports_to
        WHERE u.team_id = (SELECT team_id FROM users WHERE id = $1)
        ORDER BY u.name
      `
      params = [req.user.id]
    }

    const { rows } = await db.query(query, params)
    res.json(rows)
  } catch (err) { next(err) }
})

// GET /api/users/me — current user profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.title, u.part_time,
              u.team_id, t.name AS team_name, u.reports_to,
              s.name AS supervisor_name, s.email AS supervisor_email
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       LEFT JOIN users s ON s.id = u.reports_to
       WHERE u.id = $1`,
      [req.user.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'User not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// GET /api/users/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.title, u.part_time, u.active,
              u.team_id, t.name AS team_name, u.reports_to,
              s.name AS supervisor_name
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       LEFT JOIN users s ON s.id = u.reports_to
       WHERE u.id = $1`,
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'User not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// POST /api/users — admin only
router.post('/', requireAuth, adminOrCEO, async (req, res, next) => {
  try {
    const { name, email, role, title, team_id, reports_to, part_time, password } = req.body
    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: 'name, email, role, and password are required' })
    }
    const hash = await bcrypt.hash(password, 12)
    const { rows } = await db.query(
      `INSERT INTO users (name, email, password_hash, role, title, team_id, reports_to, part_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role, title, team_id, reports_to, part_time`,
      [name, email.toLowerCase().trim(), hash, role, title, team_id || null, reports_to || null, part_time || false]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Email already exists' })
    next(err)
  }
})

// PUT /api/users/:id — admin can update any; users can update their own non-role fields
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id)
    const isSelf = req.user.id === targetId
    const isAdmin = req.user.role === 'admin'
    const isCEO = req.user.role === 'ceo'

    if (!isSelf && !isAdmin && !isCEO) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    const { name, email, title, team_id, reports_to, role, part_time, active, password, current_password } = req.body
    const fields = [], values = []
    let i = 1

    if (name)  { fields.push(`name = $${i++}`);  values.push(name) }
    if (title) { fields.push(`title = $${i++}`); values.push(title) }

    if (email && isSelf) {
      if (!current_password) return res.status(400).json({ message: 'current_password required to change email' })
      const { rows: pw } = await db.query('SELECT password_hash FROM users WHERE id = $1', [targetId])
      if (!await bcrypt.compare(current_password, pw[0]?.password_hash ?? '')) {
        return res.status(401).json({ message: 'Current password is incorrect' })
      }
      fields.push(`email = $${i++}`)
      values.push(email.toLowerCase().trim())
    }

    // Role, team, reports_to, active — admin/CEO only
    if (isAdmin && role)                         { fields.push(`role = $${i++}`);       values.push(role) }
    if (isAdmin && team_id !== undefined)         { fields.push(`team_id = $${i++}`);    values.push(team_id) }
    if (isAdmin && reports_to !== undefined)      { fields.push(`reports_to = $${i++}`); values.push(reports_to) }
    if (isAdmin && active !== undefined)          { fields.push(`active = $${i++}`);     values.push(active) }
    if (isAdmin && part_time !== undefined)       { fields.push(`part_time = $${i++}`);  values.push(part_time) }

    if (password && (isSelf || isAdmin)) {
      if (isSelf && !isAdmin) {
        if (!current_password) return res.status(400).json({ message: 'current_password required to change password' })
        const { rows: pw } = await db.query('SELECT password_hash FROM users WHERE id = $1', [targetId])
        if (!await bcrypt.compare(current_password, pw[0]?.password_hash ?? '')) {
          return res.status(401).json({ message: 'Current password is incorrect' })
        }
      }
      const hash = await bcrypt.hash(password, 12)
      fields.push(`password_hash = $${i++}`)
      values.push(hash)
    }

    if (!fields.length) return res.status(400).json({ message: 'No fields to update' })
    fields.push(`updated_at = NOW()`)
    values.push(targetId)

    const { rows } = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, email, role, title, team_id, reports_to, part_time, active`,
      values
    )
    if (!rows[0]) return res.status(404).json({ message: 'User not found' })
    res.json(rows[0])
  } catch (err) { next(err) }
})

// DELETE /api/users/:id — admin only (soft delete)
router.delete('/:id', requireAuth, adminOrCEO, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'UPDATE users SET active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    )
    if (!rows[0]) return res.status(404).json({ message: 'User not found' })
    res.json({ message: 'User deactivated' })
  } catch (err) { next(err) }
})

// GET /api/users/:id/direct-reports
router.get('/:id/direct-reports', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.title, u.part_time, u.active,
              t.name AS team_name
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.reports_to = $1 AND u.active = true
       ORDER BY u.name`,
      [req.params.id]
    )
    res.json(rows)
  } catch (err) { next(err) }
})

module.exports = router
