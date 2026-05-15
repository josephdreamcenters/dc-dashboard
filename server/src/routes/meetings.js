const router = require('express').Router()
const requireAuth = require('../middleware/auth')

// GET /meetings
router.get('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// POST /meetings
router.post('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// GET /meetings/:id
router.get('/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// PUT /meetings/:id
router.put('/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// POST /meetings/:id/end
router.post('/:id/end', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

module.exports = router
