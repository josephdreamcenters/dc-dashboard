const router = require('express').Router()
const requireAuth = require('../middleware/auth')

// GET /issues
router.get('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// POST /issues
router.post('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// PUT /issues/:id
router.put('/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// POST /issues/:id/progress
router.post('/:id/progress', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// DELETE /issues/:id
router.delete('/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

module.exports = router
