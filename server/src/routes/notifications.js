const router = require('express').Router()
const db = require('../db')
const requireAuth = require('../middleware/auth')

// GET /api/notifications — current user's notifications
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    const unread = rows.filter(n => !n.read).length
    res.json({ notifications: rows, unread_count: unread })
  } catch (err) { next(err) }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await db.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    res.json({ message: 'Marked as read' })
  } catch (err) { next(err) }
})

// PUT /api/notifications/read-all
router.put('/read-all', requireAuth, async (req, res, next) => {
  try {
    await db.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id])
    res.json({ message: 'All notifications marked as read' })
  } catch (err) { next(err) }
})

module.exports = router
