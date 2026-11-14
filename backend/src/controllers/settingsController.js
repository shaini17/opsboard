import pool from '../config/db.js'

async function recordAudit(req, action, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, 'Settings', $1, $3::jsonb, $4)`,
      [req.user.id, action, JSON.stringify(details), req.ip]
    )
  } catch (error) {
    console.error('Settings audit logging failed:', error.message)
  }
}

export async function getSettings(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, preferences
       FROM users
       WHERE id = $1 AND is_active = TRUE`,
      [req.user.id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Get settings error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to load settings' })
  }
}

export async function updateSettings(req, res) {
  try {
    const { name, department, preferences } = req.body

    if (name !== undefined && (
      typeof name !== 'string' || !name.trim() || name.trim().length > 100
    )) {
      return res.status(400).json({ success: false, message: 'Name must be between 1 and 100 characters' })
    }

    if (department !== undefined && (
      typeof department !== 'string' || department.trim().length > 100
    )) {
      return res.status(400).json({ success: false, message: 'Department cannot exceed 100 characters' })
    }

    const allowedPreferences = [
      'emailAlerts',
      'incidentAlerts',
      'deploymentAlerts',
      'maintenanceAlerts',
      'weeklyReport',
    ]

    if (preferences !== undefined) {
      if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
        return res.status(400).json({ success: false, message: 'Preferences must be an object' })
      }

      for (const [key, value] of Object.entries(preferences)) {
        if (!allowedPreferences.includes(key) || typeof value !== 'boolean') {
          return res.status(400).json({ success: false, message: `Invalid preference: ${key}` })
        }
      }
    }

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           department = COALESCE($2, department),
           preferences = preferences || $3::jsonb,
           updated_at = NOW()
       WHERE id = $4 AND is_active = TRUE
       RETURNING id, name, email, role, department, preferences`,
      [
        name === undefined ? null : name.trim(),
        department === undefined ? null : department.trim(),
        JSON.stringify(preferences || {}),
        req.user.id,
      ]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    await recordAudit(req, 'Updated account settings', {
      nameChanged: name !== undefined,
      departmentChanged: department !== undefined,
      preferencesChanged: preferences !== undefined,
    })

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Settings saved successfully',
    })
  } catch (error) {
    console.error('Update settings error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to save settings' })
  }
}
