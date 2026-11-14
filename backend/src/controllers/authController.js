import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

function createToken(user) {
  const secret = process.env.JWT_SECRET

  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters')
  }

  return jwt.sign(
    { sub: String(user.id) },
    secret,
    { expiresIn: '1h' }
  )
}

export async function register(req, res) {
  try {
    const { name, email, password } = req.body

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      })
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot exceed 100 characters',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      })
    }

    if (normalizedEmail.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Email address is too long',
      })
    }

    if (typeof password !== 'string' ||
        Buffer.byteLength(password, 'utf8') < 8 ||
        Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        success: false,
        message: 'Password must be between 8 and 72 bytes',
      })
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    )

    const user = result.rows[0]
    const token = createToken(user)

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user,
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      })
    }

    console.error('Registration error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to register account',
    })
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, is_active
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    )

    const user = result.rows[0]

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      })
    }

    const token = createToken(user)

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to log in',
    })
  }
}