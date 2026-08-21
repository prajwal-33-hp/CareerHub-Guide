const asyncHandler = require('../utils/asyncHandler')
const slugify = require('../utils/slugify')
const Company = require('../models/Company')

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
  const company = await Company.findOne({ owner: req.user._id })
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

  const company = await Company.create({ ...req.body, slug, owner: req.user._id })
  res.status(201).json({ company })
})

// @route   PUT /api/companies/:id
// @access  Private (owner or admin)
const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id)
  if (!company) {
    res.status(404)
    throw new Error('Company not found')
  }
  if (req.user.role !== 'admin' && String(company.owner) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to edit this company')
  }

  Object.assign(company, req.body)
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
  res.json({ message: 'Company removed' })
})

module.exports = { getCompanies, getCompanyByIdOrSlug, getMyCompany, createCompany, updateCompany, deleteCompany }
