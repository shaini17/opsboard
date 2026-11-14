import { Router } from 'express'
import {
  getDeployments,
  createDeployment,
  updateDeploymentStatus,
} from '../controllers/deploymentController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = Router()

router.use(authenticateToken)

router.get('/', getDeployments)
router.post('/', createDeployment)
router.patch('/:id/status', updateDeploymentStatus)

export default router
