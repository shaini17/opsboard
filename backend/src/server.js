import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'

import authRoutes from './routes/authRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'
import deploymentRoutes from './routes/deploymentRoutes.js'
import serviceRoutes from './routes/serviceRoutes.js'
import incidentRoutes from './routes/incidentRoutes.js'
import maintenanceRoutes from './routes/maintenanceRoutes.js'
import teamRoutes from './routes/teamRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}))
app.use(express.json({ limit: '10kb' }))

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

app.use('/api', apiLimiter)

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Welcome to OpsBoard API' })
})

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OpsBoard API is running',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/deployments', deploymentRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/incidents', incidentRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/audit-logs', auditRoutes)
app.use('/api/settings', settingsRoutes)

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' })
})

app.listen(PORT, () => {
  console.log(`OpsBoard API running on port ${PORT}`)
})
