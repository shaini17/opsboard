import pool from '../config/db.js'

export async function writeAuditLog(client, {
  userId,
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = null,
}) {
  await client.query(
    `INSERT INTO audit_logs
      (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      userId || null,
      action,
      entityType,
      entityId,
      JSON.stringify(details),
      ipAddress,
    ]
  )
}

export async function withAudit(req, res, work) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
