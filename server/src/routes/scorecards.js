const router = require('express').Router()
const requireAuth = require('../middleware/auth')

// GET /scorecards — by team
router.get('/', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// GET /scorecards/:teamId/week/:week
router.get('/:teamId/week/:week', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// POST /scorecards/entry
router.post('/entry', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

// PUT /scorecards/entry/:id
router.put('/entry/:id', requireAuth, (_req, res) => {
  res.status(501).json({ message: 'Not yet implemented' })
})

module.exports = router
