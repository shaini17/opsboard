import pool from '../config/db.js'
import { withAudit, writeAuditLog } from '../utils/audit.js'

const maintenanceSelect = `
  SELECT m.*, s.name AS service_name, u.name AS scheduled_by_name
  FROM maintenance_windows m
  LEFT JOIN services s ON s.id = m.service_id
  LEFT JOIN users u ON u.id = m.scheduled_by
`

const statuses = ['scheduled', 'in_progress', 'completed', 'cancelled']

export async function getMaintenance(req, res) {
  try {
    const result = await pool.query(`${maintenanceSelect} ORDER BY m.start_time ASC`)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get maintenance failed:', error)
    res.status(500).json({ success: false, message: 'Unable to load maintenance windows' })
  }
}

export async function createMaintenance(req, res) {
  const { title, description = '', service_id = null, start_time, end_time } = req.body

  if (!title?.trim() || !start_time || !end_time) {
    return res.status(400).json({ success: false, message: 'Title, start time and end time are required' })
  }
  if (new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ success: false, message: 'End time must be after start time' })
  }

  try {
    const maintenance = await withAudit(req, res, async (client) => {
      const inserted = await client.query(
        `INSERT INTO maintenance_windows
          (title, description, service_id, scheduled_by, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [title.trim(), description, service_id || null, req.user.id, start_time, end_time]
      )
      const id = inserted.rows[0].id

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'created',
        entityType: 'maintenance',
        entityId: id,
        details: { title: title.trim() },
        ipAddress: req.ip,
      })

      const result = await client.query(`${maintenanceSelect} WHERE m.id = $1`, [id])
      return result.rows[0]
    })

    res.status(201).json({ success: true, data: maintenance })
  } catch (error) {
    console.error('Create maintenance failed:', error)
    res.status(error.code === '23503' ? 400 : 500).json({
      success: false,
      message: error.code === '23503' ? 'Selected service does not exist' : 'Unable to create maintenance window',
    })
  }
}

export async function updateMaintenance(req, res) {
  const id = Number(req.params.id)
  const { title, description, service_id, start_time, end_time, status } = req.body

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid maintenance ID' })
  }
  if (status !== undefined && !statuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid maintenance status' })
  }
  if (start_time && end_time && new Date(end_time) <= new Date(start_time)) {
    return res.status(400).json({ success: false, message: 'End time must be after start time' })
  }

  try {
    const maintenance = await withAudit(req, res, async (client) => {
      const updated = await client.query(
        `UPDATE maintenance_windows SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          service_id = CASE WHEN $4::boolean THEN $5::bigint ELSE service_id END,
          start_time = COALESCE($6, start_time),
          end_time = COALESCE($7, end_time),
          status = COALESCE($8, status),
          updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [id, title?.trim() ?? null, description ?? null,
          service_id !== undefined, service_id ?? null,
          start_time ?? null, end_time ?? null, status ?? null]
      )

      if (!updated.rowCount) return null

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'updated',
        entityType: 'maintenance',
        entityId: id,
        details: { changedFields: Object.keys(req.body) },
        ipAddress: req.ip,
      })

      const result = await client.query(`${maintenanceSelect} WHERE m.id = $1`, [id])
      return result.rows[0]
    })

    if (!maintenance) return res.status(404).json({ success: false, message: 'Maintenance window not found' })
    res.json({ success: true, data: maintenance })
  } catch (error) {
    console.error('Update maintenance failed:', error)
    res.status(error.code === '23503' ? 400 : 500).json({
      success: false,
      message: error.code === '23503' ? 'Selected service does not exist' : 'Unable to update maintenance window',
    })
  }
}

export async function deleteMaintenance(req, res) {
  const id = Number(req.params.id)

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid maintenance ID' })
  }

  try {
    const deleted = await withAudit(req, res, async (client) => {
      const result = await client.query(
        'DELETE FROM maintenance_windows WHERE id = $1 RETURNING id, title',
        [id]
      )
      if (!result.rowCount) return null

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'deleted',
        entityType: 'maintenance',
        entityId: id,
        details: { title: result.rows[0].title },
        ipAddress: req.ip,
      })
      return result.rows[0]
    })

    if (!deleted) return res.status(404).json({ success: false, message: 'Maintenance window not found' })
    res.json({ success: true, data: deleted })
  } catch (error) {
    console.error('Delete maintenance failed:', error)
    res.status(500).json({ success: false, message: 'Unable to delete maintenance window' })
  }
}
