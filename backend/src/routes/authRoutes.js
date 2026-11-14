import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login } from '../controllers/authController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
})

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)

router.get('/me', authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  })
})

export default router