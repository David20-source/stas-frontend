'use strict'

const ROLE_LEVELS = { GUEST: 0, CITIZEN: 1, OFFICER: 2, ANALYST: 3, ADMIN: 4 }

/**
 * requireRole(minRole) — middleware factory.
 * Must be used AFTER requireAuth so req.user is set.
 */
function requireRole(minRole) {
  return (req, res, next) => {
    const userRole    = req.user?.role || 'GUEST'
    const userLevel   = ROLE_LEVELS[userRole]   ?? 0
    const neededLevel = ROLE_LEVELS[minRole]     ?? 99

    if (userLevel < neededLevel) {
      return res.status(403).json({
        error: `Access denied — requires ${minRole} role or higher (your role: ${userRole})`,
      })
    }
    next()
  }
}

module.exports = { requireRole }
