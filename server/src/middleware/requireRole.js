/**
 * requireRole(...roles) — middleware that ensures req.user has one of the listed roles.
 * Must be used after requireAuth middleware.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }
    next()
  }
}

/** Admin or CEO only */
const adminOrCEO = requireRole('admin', 'ceo')

/** Admin, CEO, or Director */
const atLeastDirector = requireRole('admin', 'ceo', 'director')

module.exports = { requireRole, adminOrCEO, atLeastDirector }
