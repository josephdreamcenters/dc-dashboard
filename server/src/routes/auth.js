const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../db')

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

    const { rows } = await db.query(
      'SELECT id, name, email, password_hash, role, team_id, reports_to FROM users WHERE email = $1 AND active = true',
      [email.toLowerCase().trim()]
    )
    const user = rows[0]
    if (!user) return res.status(401).json({ message: 'Invalid email or password' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid email or password' })

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, teamId: user.team_id, reportsTo: user.reports_to },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', (_req, res) => res.json({ message: 'Logged out' }))

module.exports = router
