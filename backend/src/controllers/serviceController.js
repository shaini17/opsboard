import pool from '../config/db.js'
import { withAudit, writeAuditLog } from '../utils/audit.js'

const serviceSelect = `
  SELECT id, name, description, environment, status, server_name,
         endpoint, cpu_usage, memory_usage, created_at, updated_at
  FROM services
`

const environments = ['development', 'staging', 'production']
const statuses = ['operational', 'degraded', 'down', 'maintenance']

export async function getServices(req, res) {
  try {
    const result = await pool.query(`${serviceSelect} ORDER BY name ASC`)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get services failed:', error)
    res.status(500).json({ success: false, message: 'Unable to load services' })
  }
}

export async function createService(req, res) {
  const {
    name, description = '', environment = 'production',
    status = 'operational', server_name = null, endpoint = null,
  } = req.body

  if (!name?.trim()) {
    return res.status(400).json({ success: false, message: 'Service name is required' })
  }

  if (!environments.includes(environment) || !statuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid environment or status' })
  }

  try {
    const service = await withAudit(req, res, async (client) => {
      const inserted = await client.query(
        `INSERT INTO services
          (name, description, environment, status, server_name, endpoint)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name.trim(), description, environment, status, server_name, endpoint]
      )
      const row = inserted.rows[0]

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'created',
        entityType: 'service',
        entityId: row.id,
        details: { name: row.name },
        ipAddress: req.ip,
      })

      return row
    })

    res.status(201).json({ success: true, data: service })
  } catch (error) {
    console.error('Create service failed:', error)
    const duplicate = error.code === '23505'
    res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate ? 'A service with this name already exists' : 'Unable to create service',
    })
  }
}

export async function updateService(req, res) {
  const id = Number(req.params.id)
  const { name, description, environment, status, server_name, endpoint } = req.body

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid service ID' })
  }
  if (environment !== undefined && !environments.includes(environment)) {
    return res.status(400).json({ success: false, message: 'Invalid environment' })
  }
  if (status !== undefined && !statuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid service status' })
  }
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ success: false, message: 'Service name cannot be empty' })
  }

  try {
    const service = await withAudit(req, res, async (client) => {
      const updated = await client.query(
        `UPDATE services SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          environment = COALESCE($4, environment),
          status = COALESCE($5, status),
          server_name = COALESCE($6, server_name),
          endpoint = COALESCE($7, endpoint),
          updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, name?.trim() ?? null, description ?? null, environment ?? null,
          status ?? null, server_name ?? null, endpoint ?? null]
      )

      if (!updated.rowCount) return null

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'updated',
        entityType: 'service',
        entityId: id,
        details: { changedFields: Object.keys(req.body) },
        ipAddress: req.ip,
      })
      return updated.rows[0]
    })

    if (!service) return res.status(404).json({ success: false, message: 'Service not found' })
    res.json({ success: true, data: service })
  } catch (error) {
    console.error('Update service failed:', error)
    res.status(500).json({ success: false, message: 'Unable to update service' })
  }
}

export async function deleteService(req, res) {
  const id = Number(req.params.id)

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid service ID' })
  }

  try {
    const deleted = await withAudit(req, res, async (client) => {
      const result = await client.query(
        'DELETE FROM services WHERE id = $1 RETURNING id, name',
        [id]
      )
      if (!result.rowCount) return null

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'deleted',
        entityType: 'service',
        entityId: id,
        details: { name: result.rows[0].name },
        ipAddress: req.ip,
      })
      return result.rows[0]
    })

    if (!deleted) return res.status(404).json({ success: false, message: 'Service not found' })
    res.json({ success: true, data: deleted })
  } catch (error) {
    console.error('Delete service failed:', error)
    res.status(500).json({ success: false, message: 'Unable to delete service' })
  }
}
