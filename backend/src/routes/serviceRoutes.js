import { Router } from 'express'
import {
  getServices, createService, updateService, deleteService,
} from '../controllers/serviceController.js'
import { authenticateToken } from '../middleware/authMiddleware.js'

const router = Router()
router.use(authenticateToken)
router.get('/', getServices)
router.post('/', createService)
router.patch('/:id', updateService)
router.delete('/:id', deleteService)
export default router
