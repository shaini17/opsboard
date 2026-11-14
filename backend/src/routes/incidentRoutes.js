import { Router } from 'express'
import {
  getIncidents, createIncident, updateIncident,
} from '../controllers/incidentController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = Router()
router.use(authenticateToken)
router.get('/', getIncidents)
router.post('/', createIncident)
router.patch('/:id', updateIncident)
export default router
