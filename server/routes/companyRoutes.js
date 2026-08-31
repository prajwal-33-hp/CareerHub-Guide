const express = require('express')
const {
  getCompanies,
  getCompanyByIdOrSlug,
  getMyCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../controllers/companyController')
const {
  getTeamMembers,
  inviteMember,
  cancelInvite,
  updateMemberRole,
  removeMember,
  validateInviteToken,
  acceptInvite,
} = require('../controllers/companyTeamController')
const { protect, authorize, requireApprovedRecruiter } = require('../middleware/auth')

const router = express.Router()

// Team & Recruiter Invitation Management
router.get('/team/members', protect, requireApprovedRecruiter, getTeamMembers)
router.post('/team/invite', protect, requireApprovedRecruiter, inviteMember)
router.delete('/team/invites/:inviteId', protect, requireApprovedRecruiter, cancelInvite)
router.put('/team/members/:memberId/role', protect, requireApprovedRecruiter, updateMemberRole)
router.delete('/team/members/:memberId', protect, requireApprovedRecruiter, removeMember)

// Public & Candidate Invitation Acceptance Endpoints
router.get('/team/invites/validate/:token', validateInviteToken)
router.post('/team/invites/accept', protect, acceptInvite)

// Company Profile Routes
router.get('/', getCompanies)
router.get('/me', protect, requireApprovedRecruiter, getMyCompany)
router.post('/', protect, requireApprovedRecruiter, createCompany)
router.get('/:idOrSlug', getCompanyByIdOrSlug)
router.put('/:id', protect, requireApprovedRecruiter, updateCompany)
router.delete('/:id', protect, authorize('admin'), deleteCompany)

module.exports = router
