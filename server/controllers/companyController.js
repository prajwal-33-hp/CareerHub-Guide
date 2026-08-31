const asyncHandler = require('../utils/asyncHandler')
const slugify = require('../utils/slugify')
const Company = require('../models/Company')
const CompanyMember = require('../models/CompanyMember')

// @route   GET /api/companies
// @access  Public
const getCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find({ verified: true }).sort('-createdAt')
  res.json({ companies })
})

// @route   GET /api/companies/:idOrSlug
// @access  Public
const getCompanyByIdOrSlug = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose')
  const { idOrSlug } = req.params
  const isValidId = mongoose.Types.ObjectId.isValid(idOrSlug)

  const company = await Company.findOne(isValidId ? { _id: idOrSlug } : { slug: idOrSlug })
  if (!company) {
    res.status(404)
    throw new Error('Company not found')
  }
  res.json({ company })
})

// @route   GET /api/companies/me
// @access  Private (recruiter)
const getMyCompany = asyncHandler(async (req, res) => {
  let company = null

  // 1. Direct link on user
  if (req.user.company) {
    company = await Company.findById(req.user.company)
  }

  // 2. Lookup via CompanyMember
  if (!company) {
    const membership = await CompanyMember.findOne({ user: req.user._id, status: 'active' }).populate('company')
    if (membership?.company) {
      company = membership.company
    }
  }

  // 3. Fallback to owner field
  if (!company) {
    company = await Company.findOne({ owner: req.user._id })
  }

  if (!company) {
    res.status(404)
    throw new Error('Company profile not found')
  }

  res.json({ company })
})

// @route   POST /api/companies
// @access  Private (recruiter)
const createCompany = asyncHandler(async (req, res) => {
  const existing = await Company.findOne({ owner: req.user._id })
  if (existing) {
    res.status(400)
    throw new Error('You already have a company profile')
  }

  const baseSlug = slugify(req.body.name)
  let slug = baseSlug
  let suffix = 1
  while (await Company.findOne({ slug })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const company = await Company.create({
    ...req.body,
    slug,
    owner: req.user._id,
    verified: req.user.role === 'admin',
    status: req.user.role === 'admin' ? 'verified' : 'pending',
  })

  // Create CompanyMember record as OWNER
  await CompanyMember.findOneAndUpdate(
    { company: company._id, user: req.user._id },
    {
      company: company._id,
      user: req.user._id,
      companyRole: 'OWNER',
      designation: req.user.designation || 'Company Founder',
      department: req.user.department || 'Executive',
      workEmail: req.user.email,
      status: 'active',
      joinedAt: new Date(),
    },
    { upsert: true, new: true }
  )

  await req.user.updateOne({ company: company._id, companyRole: 'OWNER' })

  res.status(201).json({ company })
})

// @route   PUT /api/companies/:id
// @access  Private (owner, admin, or company admin)
const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id)
  if (!company) {
    res.status(404)
    throw new Error('Company not found')
  }

  // Check if caller is admin or an authorized company member
  const membership = await CompanyMember.findOne({
    company: company._id,
    user: req.user._id,
    status: 'active',
  })

  const isOwner = String(company.owner) === String(req.user._id)
  const isCompanyAdmin = membership && ['OWNER', 'ADMIN'].includes(membership.companyRole)
  const isSystemAdmin = req.user.role === 'admin'

  if (!isOwner && !isCompanyAdmin && !isSystemAdmin) {
    res.status(403)
    throw new Error('You do not have permission to edit this company profile')
  }

  // Prevent modifying critical verification fields from client directly
  const { verified, verifiedAt, verifiedBy, status, ...allowedUpdates } = req.body

  if (isSystemAdmin) {
    if (verified !== undefined) allowedUpdates.verified = verified
    if (status !== undefined) allowedUpdates.status = status
  }

  Object.assign(company, allowedUpdates)
  await company.save()

  res.json({ company })
})

// @route   DELETE /api/companies/:id (admin only -- powers Admin > Companies "Remove")
// @access  Private (admin)
const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id)
  if (!company) {
    res.status(404)
    throw new Error('Company not found')
  }
  await company.deleteOne()
  await CompanyMember.deleteMany({ company: company._id })
  res.json({ message: 'Company removed' })
})

module.exports = { getCompanies, getCompanyByIdOrSlug, getMyCompany, createCompany, updateCompany, deleteCompany }
