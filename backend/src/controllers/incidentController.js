import pool from '../config/db.js'
import { withAudit, writeAuditLog } from '../utils/audit.js'

const incidentSelect = `
  SELECT i.*, s.name AS service_name, u.name AS assignee_name
  FROM incidents i
  LEFT JOIN services s ON s.id = i.service_id
  LEFT JOIN users u ON u.id = i.assigned_to
`

const severities = ['low', 'medium', 'high', 'critical']
const statuses = ['open', 'investigating', 'resolved', 'closed']

export async function getIncidents(req, res) {
  try {
    const result = await pool.query(`${incidentSelect} ORDER BY i.created_at DESC`)
    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get incidents failed:', error)
    res.status(500).json({ success: false, message: 'Unable to load incidents' })
  }
}

export async function createIncident(req, res) {
  const {
    title, description = '', service_id = null,
    severity = 'medium', assigned_to = null,
  } = req.body

  if (!title?.trim()) {
    return res.status(400).json({ success: false, message: 'Incident title is required' })
  }
  if (!severities.includes(severity)) {
    return res.status(400).json({ success: false, message: 'Invalid severity' })
  }

  try {
    const incident = await withAudit(req, res, async (client) => {
      const inserted = await client.query(
        `INSERT INTO incidents (title, description, service_id, severity, assigned_to)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [title.trim(), description, service_id || null, severity, assigned_to || null]
      )
      const id = inserted.rows[0].id

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'created',
        entityType: 'incident',
        entityId: id,
        details: { title: title.trim(), severity },
        ipAddress: req.ip,
      })

      const result = await client.query(`${incidentSelect} WHERE i.id = $1`, [id])
      return result.rows[0]
    })

    res.status(201).json({ success: true, data: incident })
  } catch (error) {
    console.error('Create incident failed:', error)
    res.status(error.code === '23503' ? 400 : 500).json({
      success: false,
      message: error.code === '23503' ? 'Selected service or assignee does not exist' : 'Unable to create incident',
    })
  }
}

export async function updateIncident(req, res) {
  const id = Number(req.params.id)
  const { title, description, service_id, severity, status, assigned_to, resolution_notes } = req.body

  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid incident ID' })
  }
  if (severity !== undefined && !severities.includes(severity)) {
    return res.status(400).json({ success: false, message: 'Invalid severity' })
  }
  if (status !== undefined && !statuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid incident status' })
  }
  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ success: false, message: 'Incident title cannot be empty' })
  }

  try {
    const incident = await withAudit(req, res, async (client) => {
      const updated = await client.query(
        `UPDATE incidents SET
          title = COALESCE($2, title),
          description = COALESCE($3, description),
          service_id = CASE WHEN $4::boolean THEN $5::bigint ELSE service_id END,
          severity = COALESCE($6, severity),
          status = COALESCE($7, status),
          assigned_to = CASE WHEN $8::boolean THEN $9::bigint ELSE assigned_to END,
          resolution_notes = COALESCE($10, resolution_notes),
          resolved_at = CASE
            WHEN $7 = 'resolved' AND status <> 'resolved' THEN NOW()
            WHEN $7 IN ('open', 'investigating') THEN NULL
            ELSE resolved_at
          END,
          updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [id, title?.trim() ?? null, description ?? null,
          service_id !== undefined, service_id ?? null,
          severity ?? null, status ?? null,
          assigned_to !== undefined, assigned_to ?? null,
          resolution_notes ?? null]
      )

      if (!updated.rowCount) return null

      await writeAuditLog(client, {
        userId: req.user.id,
        action: 'updated',
        entityType: 'incident',
        entityId: id,
        details: { changedFields: Object.keys(req.body) },
        ipAddress: req.ip,
      })

      const result = await client.query(`${incidentSelect} WHERE i.id = $1`, [id])
      return result.rows[0]
    })

    if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' })
    res.json({ success: true, data: incident })
  } catch (error) {
    console.error('Update incident failed:', error)
    res.status(error.code === '23503' ? 400 : 500).json({
      success: false,
      message: error.code === '23503' ? 'Selected service or assignee does not exist' : 'Unable to update incident',
    })
  }
}
