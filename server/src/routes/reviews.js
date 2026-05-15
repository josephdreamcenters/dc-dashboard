const router = require('express').Router()
const requireAuth = require('../middleware/auth')

// GET /reviews
router.get('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// POST /reviews
router.post('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// GET /reviews/:id
router.get('/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// PUT /reviews/:id/employee — employee self-assessment
router.put('/:id/employee', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// PUT /reviews/:id/supervisor — supervisor evaluation
router.put('/:id/supervisor', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

module.exports = router
