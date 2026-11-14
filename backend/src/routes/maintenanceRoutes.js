import { Router } from 'express'
import {
  getMaintenance, createMaintenance, updateMaintenance, deleteMaintenance,
} from '../controllers/maintenanceController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = Router()
router.use(authenticateToken)
router.get('/', getMaintenance)
router.post('/', createMaintenance)
router.patch('/:id', updateMaintenance)
router.delete('/:id', deleteMaintenance)
export default router
