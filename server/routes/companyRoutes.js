const express = require('express')
const {
  getCompanies,
  getCompanyByIdOrSlug,
  getMyCompany,
  createCompany,
  updateCompany,
  deleteCompany,
} = require('../controllers/companyController')
const { protect, authorize } = require('../middleware/auth')

const router = express.Router()

router.get('/', getCompanies)
router.get('/me', protect, authorize('recruiter'), getMyCompany)
router.post('/', protect, authorize('recruiter'), createCompany)
router.get('/:idOrSlug', getCompanyByIdOrSlug)
router.put('/:id', protect, authorize('recruiter', 'admin'), updateCompany)
router.delete('/:id', protect, authorize('admin'), deleteCompany)

module.exports = router
