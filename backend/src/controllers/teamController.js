import pool from '../config/db.js'
import bcrypt from 'bcryptjs'

async function recordAudit(req, action, entityType, entityId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        req.user.id,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        req.ip,
      ]
    )
  } catch (error) {
    console.error('Audit logging failed:', error.message)
  }
}

export async function getTeamMembers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, is_active, created_at
       FROM users
       ORDER BY created_at DESC`
    )

    res.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Get team error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to load team members' })
  }
}

export async function createTeamMember(req, res) {
  try {
    const { name, email, password, role = 'engineer', department = 'Cloud Operations' } = req.body

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and temporary password are required',
      })
    }

    if (name.trim().length > 100 || department.length > 100) {
      return res.status(400).json({ success: false, message: 'Name or department is too long' })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address' })
    }

    if (typeof password !== 'string' ||
        Buffer.byteLength(password, 'utf8') < 8 ||
        Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        message: 'Temporary password must be between 8 and 72 bytes',
      })
    }

    const allowedRoles = req.user.role === 'admin'
      ? ['admin', 'manager', 'engineer', 'viewer']
      : ['engineer', 'viewer']

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'You cannot assign this role' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, department, is_active, created_at`,
      [name.trim(), normalizedEmail, passwordHash, role, department.trim()]
    )

    const member = result.rows[0]

    await recordAudit(req, 'Created team member', 'Team', member.id, {
      email: member.email,
      role: member.role,
    })

    res.status(201).json({ success: true, data: member, message: 'Team member created' })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'This email is already registered' })
    }

    console.error('Create team member error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to create team member' })
  }
}

export async function updateTeamMember(req, res) {
  try {
    const id = Number(req.params.id)
    const { name, role, department, is_active } = req.body

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid team member ID' })
    }

    if (id === Number(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Use Settings to update your own profile. You cannot change your own role or status here.',
      })
    }

    const existing = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    )

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Team member not found' })
    }

    const target = existing.rows[0]
    const allowedRoles = req.user.role === 'admin'
      ? ['admin', 'manager', 'engineer', 'viewer']
      : ['engineer', 'viewer']

    if (role !== undefined && !allowedRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'You cannot assign this role' })
    }

    if (req.user.role === 'manager' && target.role !== 'engineer' && target.role !== 'viewer') {
      return res.status(403).json({ success: false, message: 'Managers cannot modify administrators or other managers' })
    }

    if (name !== undefined && (!name.trim() || name.trim().length > 100)) {
      return res.status(400).json({ success: false, message: 'Enter a valid name (maximum 100 characters)' })
    }

    if (department !== undefined && (typeof department !== 'string' || department.trim().length > 100)) {
      return res.status(400).json({ success: false, message: 'Department cannot exceed 100 characters' })
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active must be true or false' })
    }

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           department = COALESCE($3, department),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, role, department, is_active, created_at`,
      [
        name === undefined ? null : name.trim(),
        role ?? null,
        department === undefined ? null : department.trim(),
        is_active ?? null,
        id,
      ]
    )

    await recordAudit(req, 'Updated team member', 'Team', id, req.body)

    res.json({ success: true, data: result.rows[0], message: 'Team member updated' })
  } catch (error) {
    console.error('Update team member error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to update team member' })
  }
}

export async function deactivateTeamMember(req, res) {
  try {
    const id = Number(req.params.id)

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid team member ID' })
    }

    if (id === Number(req.user.id)) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' })
    }

    const existing = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [id]
    )

    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: 'Team member not found' })
    }

    if (req.user.role === 'manager' &&
        !['engineer', 'viewer'].includes(existing.rows[0].role)) {
      return res.status(403).json({ success: false, message: 'Managers cannot deactivate administrators or other managers' })
    }

    const result = await pool.query(
      `UPDATE users
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, department, is_active`,
      [id]
    )

    await recordAudit(req, 'Deactivated team member', 'Team', id)

    res.json({ success: true, data: result.rows[0], message: 'Team member deactivated' })
  } catch (error) {
    console.error('Deactivate team member error:', error.message)
    res.status(500).json({ success: false, message: 'Unable to deactivate team member' })
  }
}
