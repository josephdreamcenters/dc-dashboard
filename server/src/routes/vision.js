const router = require('express').Router()
const requireAuth = require('../middleware/auth')

// GET /vision
router.get('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// PUT /vision
router.put('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// GET /vision/history
router.get('/history', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

module.exports = router
