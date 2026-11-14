import { Router } from 'express'
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deactivateTeamMember,
} from '../controllers/teamController.js'
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js'

const router = Router()

router.use(authenticateToken)

router.get('/', getTeamMembers)
router.post('/', authorizeRoles('admin', 'manager'), createTeamMember)
router.patch('/:id', authorizeRoles('admin', 'manager'), updateTeamMember)
router.delete('/:id', authorizeRoles('admin', 'manager'), deactivateTeamMember)

export default router
