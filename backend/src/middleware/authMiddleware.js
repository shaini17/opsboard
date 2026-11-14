import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
      })
    }

    const token = authHeader.slice(7)
    const secret = process.env.JWT_SECRET

    if (!secret || secret.length < 32) {
      return res.status(500).json({
        success: false,
        message: 'Authentication configuration error',
      })
    }

    const decoded = jwt.verify(token, secret)

    const result = await pool.query(
      `SELECT id, name, email, role
       FROM users
       WHERE id = $1 AND is_active = TRUE`,
      [decoded.sub]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account is unavailable',
      })
    }

    req.user = result.rows[0]
    next()
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      })
    }

    console.error('Authentication error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    })
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      })
    }

    next()
  }
}