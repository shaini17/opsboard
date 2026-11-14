
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'

const app = express()

const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

// Allow requests from the React frontend
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  })
)

// Parse incoming JSON requests
app.use(express.json())

// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

app.use('/api', apiLimiter)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to OpsBoard API',
  })
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OpsBoard API is running',
    timestamp: new Date().toISOString(),
  })
})

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`OpsBoard API running on http://localhost:${PORT}`)
})
