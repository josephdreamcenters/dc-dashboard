const router = require('express').Router()
const requireAuth = require('../middleware/auth')

// GET /todos
router.get('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// POST /todos
router.post('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// PUT /todos/:id
router.put('/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// DELETE /todos/:id
router.delete('/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

module.exports = router
