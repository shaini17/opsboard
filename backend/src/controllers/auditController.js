import pool from '../config/db.js'

export async function getAuditLogs(req, res) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 250, 1), 500)

    const result = await pool.query(
      `SELECT
         a.id,
         a.action,
         a.entity_type,
         a.entity_id,
         a.details,
         a.ip_address,
         a.created_at,
         u.name AS user_name,
         u.email AS user_email
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    )

    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get audit logs error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to load audit logs' })
  }
}
