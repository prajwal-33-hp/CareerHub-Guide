const mongoose = require('mongoose')
const asyncHandler = require('../utils/asyncHandler')
const slugify = require('../utils/slugify')
const Job = require('../models/Job')
const Company = require('../models/Company')

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

// @route   GET /api/jobs
// @access  Public
// Supports: keyword, search, q, location, jobType, workMode, skills, skill, company,
// plus pagination (page, limit) and sort (newest | salary).
const getJobs = asyncHandler(async (req, res) => {
  const {
    keyword,
    search,
    q,
    location,
    jobType,
    type,
    workMode,
    skills,
    skill,
    company,
    page = 1,
    limit = 10,
    sort = 'newest',
  } = req.query

  const searchTerm = (keyword || search || q || '').trim()
  const locTerm = (location || '').trim()
  const skillParam = skills || skill
  const typeParam = jobType || type

  const query = { status: 'approved' }

  if (searchTerm) {
    const escapedTerm = escapeRegex(searchTerm)
    const termRegex = new RegExp(escapedTerm, 'i')

    // Find any company matching the search term
    const matchedCompanies = await Company.find({
      name: { $regex: escapedTerm, $options: 'i' },
    }).select('_id')
    const companyIds = matchedCompanies.map((c) => c._id)

    // Handle common spelling variations (e.g., developer vs devoloper)
    const variants = [escapedTerm]
    if (/developer/i.test(searchTerm)) {
      variants.push(escapeRegex(searchTerm.replace(/developer/gi, 'devoloper')))
    } else if (/devoloper/i.test(searchTerm)) {
      variants.push(escapeRegex(searchTerm.replace(/devoloper/gi, 'developer')))
    }

    const orConditions = []
    variants.forEach((v) => {
      const rx = new RegExp(v, 'i')
      orConditions.push(
        { title: rx },
        { description: rx },
        { skills: rx },
        { location: rx },
        { jobType: rx },
        { workMode: rx }
      )
    })

    if (companyIds.length > 0) {
      orConditions.push({ company: { $in: companyIds } })
    }

    query.$or = orConditions
  }

  if (locTerm) {
    query.location = { $regex: escapeRegex(locTerm), $options: 'i' }
  }

  if (typeParam) {
    const types = typeParam.split(',').map((t) => t.trim()).filter(Boolean)
    if (types.length > 0) {
      query.jobType = {
        $in: types.map((t) => new RegExp(`^${escapeRegex(t)}$`, 'i')),
      }
    }
  }

  if (workMode) {
    const modes = workMode.split(',').map((m) => m.trim()).filter(Boolean)
    if (modes.length > 0) {
      query.workMode = {
        $in: modes.map((m) => new RegExp(`^${escapeRegex(m)}$`, 'i')),
      }
    }
  }

  if (skillParam) {
    const skillList = skillParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (skillList.length > 0) {
      query.skills = {
        $in: skillList.map((s) => new RegExp(escapeRegex(s), 'i')),
      }
    }
  }

  if (company) {
    if (mongoose.Types.ObjectId.isValid(company)) {
      query.company = company
    }
  }

  const sortMap = { newest: '-createdAt', salary: '-salary' }
  const sortBy = sortMap[sort] || '-createdAt'

  const pageNum = Math.max(1, parseInt(page, 10))
  const limitNum = Math.max(1, parseInt(limit, 10))

  const [jobs, total] = await Promise.all([
    Job.find(query)
      .populate('company', 'name slug logo location')
      .sort(sortBy)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Job.countDocuments(query),
  ])

  res.json({
    jobs,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
    totalResults: total,
  })
})

// @route   GET /api/jobs/:idOrSlug
// @access  Public
// Accepts either a Mongo ObjectId or a slug, since the frontend routes to
// /jobs/:slug for clean, SEO-friendly URLs.
const getJobByIdOrSlug = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params
  const isValidId = mongoose.Types.ObjectId.isValid(idOrSlug)

  const job = await Job.findOne(isValidId ? { _id: idOrSlug } : { slug: idOrSlug }).populate(
    'company',
    'name slug logo location industry description employees'
  )

  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }

  res.json({ job })
})

// @route   POST /api/jobs
// @access  Private (approved recruiter)
const createJob = asyncHandler(async (req, res) => {
  let company = null

  if (req.user.company) {
    company = await Company.findById(req.user.company)
  }

  if (!company) {
    const CompanyMember = require('../models/CompanyMember')
    const membership = await CompanyMember.findOne({ user: req.user._id, status: 'active' }).populate('company')
    if (membership?.company) {
      company = membership.company
    }
  }

  if (!company) {
    company = await Company.findOne({ owner: req.user._id })
  }

  if (!company) {
    res.status(400)
    throw new Error('You must be linked to a verified company before posting a job')
  }

  const baseSlug = slugify(`${req.body.title}-${req.body.location}`)
  let slug = baseSlug
  let suffix = 1
  while (await Job.findOne({ slug })) {
    slug = `${baseSlug}-${suffix++}`
  }

  const job = await Job.create({
    ...req.body,
    slug,
    company: company._id,
    postedBy: req.user._id,
    status: 'approved', // recruiter postings are immediately active for students
  })

  res.status(201).json({ job })
})

// @route   PUT /api/jobs/:id
// @access  Private (recruiter who owns the job, or admin)
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }

  if (req.user.role !== 'admin' && String(job.postedBy) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to edit this job')
  }

  const { title, location, ...rest } = req.body
  Object.assign(job, req.body)

  // Re-slug if the title or location changed
  if (title || location) {
    job.slug = slugify(`${job.title}-${job.location}`)
  }

  await job.save()
  res.json({ job })
})

// @route   DELETE /api/jobs/:id
// @access  Private (recruiter who owns the job, or admin)
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id)
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }

  if (req.user.role !== 'admin' && String(job.postedBy) !== String(req.user._id)) {
    res.status(403)
    throw new Error('You do not have permission to delete this job')
  }

  await job.deleteOne()
  res.json({ message: 'Job deleted' })
})

// @route   GET /api/jobs/mine
// @access  Private (recruiter)
const getMyJobs = asyncHandler(async (req, res) => {
  const jobs = await Job.find({ postedBy: req.user._id }).populate('company', 'name slug logo').sort('-createdAt')
  res.json({ jobs })
})

// @route   GET /api/jobs/all (admin only -- includes pending/rejected, powers Admin > Jobs)
// @access  Private (admin)
const getAllJobsForAdmin = asyncHandler(async (req, res) => {
  const jobs = await Job.find({}).populate('company', 'name slug logo').sort('-createdAt')
  res.json({ jobs })
})

// @route   PUT /api/jobs/:id/status (admin only -- approve/reject a posting)
// @access  Private (admin)
const updateJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body
  if (!['pending', 'approved', 'rejected', 'closed'].includes(status)) {
    res.status(400)
    throw new Error('Invalid status')
  }

  const job = await Job.findByIdAndUpdate(req.params.id, { status }, { new: true })
  if (!job) {
    res.status(404)
    throw new Error('Job not found')
  }

  res.json({ job })
})

module.exports = {
  getJobs,
  getJobByIdOrSlug,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  getAllJobsForAdmin,
  updateJobStatus,
}
