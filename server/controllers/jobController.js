const mongoose = require('mongoose')
const asyncHandler = require('../utils/asyncHandler')
const slugify = require('../utils/slugify')
const Job = require('../models/Job')
const Company = require('../models/Company')

// @route   GET /api/jobs
// @access  Public
// Supports the filters the frontend's Jobs.jsx already sends: keyword, location,
// jobType (comma-separated), workMode (comma-separated), skills (comma-separated),
// plus pagination (page, limit) and sort (newest | salary).
const getJobs = asyncHandler(async (req, res) => {
  const { keyword, location, jobType, workMode, skills, company, page = 1, limit = 10, sort = 'newest' } = req.query

  const query = { status: 'approved' }

  if (keyword) {
    query.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { skills: { $regex: keyword, $options: 'i' } },
    ]
  }
  if (location) query.location = { $regex: location, $options: 'i' }
  if (jobType) query.jobType = { $in: jobType.split(',') }
  if (workMode) query.workMode = { $in: workMode.split(',') }
  if (skills) query.skills = { $in: skills.split(',') }
  if (company) query.company = company

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
// @access  Private (recruiter)
const createJob = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ owner: req.user._id })
  if (!company) {
    res.status(400)
    throw new Error('Create your company profile before posting a job')
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
